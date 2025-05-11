import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { FiPlus, FiSettings, FiLogOut, FiShoppingBag, FiUsers, FiBarChart2, FiCalendar, FiMessageSquare, FiDatabase, FiCopy, FiInfo, FiTrash2, FiEyeOff, FiGrid, FiCheck, FiServer } from 'react-icons/fi';
import { useConfirmDialog } from './_app';

export default function Dashboard() {
  const router = useRouter();
  const { supabase, isInitialized, loading, resetSupabase, credentials } = useSupabase();
  const [lojas, setLojas] = useState([]);
  const [loadingLojas, setLoadingLojas] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [novaLoja, setNovaLoja] = useState('');
  const [criandoLoja, setCriandoLoja] = useState(false);
  const [criandoDemo, setCriandoDemo] = useState(false);
  const [configError, setConfigError] = useState(null);
  const [sqlScript, setSqlScript] = useState('');
  const { confirm } = useConfirmDialog();

  // Não redirecionar automaticamente se o Supabase não estiver inicializado
  // Em vez disso, mostraremos uma UI para configuração

  // Carregar lojas existentes se o Supabase estiver inicializado
  useEffect(() => {
    if (supabase && isInitialized) {
      carregarLojas();
    } else if (!loading) {
      setLoadingLojas(false);
    }
  }, [supabase, isInitialized, loading]);

  const carregarLojas = async () => {
    try {
      setLoadingLojas(true);
      
      // Verificar se a tabela lojas existe
      const { error } = await supabase.from('lojas').select('count');
      
      // Se houver erro específico de "relation does not exist"
      if (error && error.message && error.message.includes('relation "public.lojas" does not exist')) {
        console.error('A tabela lojas não existe. Mostrando instruções SQL...');
        mostrarInstrucoesSQL();
        setLojas([]);
        return;
      }
      
      // Se não houver erro, carregar normalmente
      const { data } = await supabase
        .from('lojas')
        .select('*')
        .order('ativo', { ascending: false }) // Ordenar lojas ativas primeiro
        .order('data_criacao', { ascending: false });

      setLojas(data || []);
    } catch (error) {
      console.error('Erro ao carregar lojas:', error);
      
      // Se for erro específico de relação não existente
      if (error.message && error.message.includes('relation "public.lojas" does not exist')) {
        mostrarInstrucoesSQL();
      } else {
        toast.error('Erro ao carregar lojas: ' + error.message);
      }
      
      setLojas([]);
    } finally {
      setLoadingLojas(false);
    }
  };

  // Função para mostrar instruções SQL manuais
  const mostrarInstrucoesSQL = async () => {
    const sqlScript = `
-- Executar este script no SQL Editor do Supabase

-- 1. Criar a tabela de lojas
CREATE TABLE IF NOT EXISTS public.lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  identificador TEXT NOT NULL UNIQUE,
  data_criacao TIMESTAMPTZ DEFAULT now(),
  ativo BOOLEAN DEFAULT true
);

-- 2. Criar a tabela de webhooks
CREATE TABLE IF NOT EXISTS public.webhooks_n8n (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Criar a tabela de credenciais externas
CREATE TABLE IF NOT EXISTS public.credenciais_externas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id TEXT NOT NULL,
  servico TEXT NOT NULL,
  chave TEXT NOT NULL,
  valor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Criar a função para executar SQL dinamicamente
CREATE OR REPLACE FUNCTION public.executar_sql(p_sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE p_sql;
END;
$$;

-- 5. Criar função para gerar tabela de configuração da loja
CREATE OR REPLACE FUNCTION public.criar_tabela_loja_config(p_nome_tabela text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome_loja TEXT NOT NULL,
      endereco TEXT,
      telefone TEXT,
      horario_funcionamento TEXT,
      politica_troca TEXT,
      logo_url TEXT,
      cor_primaria TEXT,
      cor_secundaria TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )', p_nome_tabela);
END;
$$;

-- 6. Criar função para tabela de produtos
CREATE OR REPLACE FUNCTION public.criar_tabela_produtos(p_nome_tabela text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT NOT NULL,
      descricao TEXT,
      preco DECIMAL(10, 2) NOT NULL,
      categoria TEXT,
      imagens TEXT[],
      cores TEXT[],
      tamanhos TEXT[],
      estoque_minimo INTEGER DEFAULT 5,
      ativo BOOLEAN DEFAULT true,
      destaque BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )', p_nome_tabela);
END;
$$;

-- 7. Criar função para tabela de estoque
CREATE OR REPLACE FUNCTION public.criar_tabela_estoque(p_nome_tabela text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      produto_id UUID NOT NULL,
      tamanho TEXT NOT NULL,
      cor TEXT NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )', p_nome_tabela);
END;
$$;

-- 8. Criar função para tabela de vendas
CREATE OR REPLACE FUNCTION public.criar_tabela_vendas(p_nome_tabela text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id UUID,
      valor_total DECIMAL(10, 2) NOT NULL,
      metodo_pagamento TEXT,
      status TEXT NOT NULL,
      itens JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )', p_nome_tabela);
END;
$$;

-- 9. Criar função para tabela de clientes
CREATE OR REPLACE FUNCTION public.criar_tabela_clientes(p_nome_tabela text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT NOT NULL,
      email TEXT,
      telefone TEXT,
      tipo TEXT DEFAULT ''lead'',
      ultima_compra TIMESTAMPTZ,
      total_compras DECIMAL(10, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )', p_nome_tabela);
END;
$$;

-- 10. Criar função para tabela de promoções
CREATE OR REPLACE FUNCTION public.criar_tabela_promocoes(p_nome_tabela text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT NOT NULL,
      descricao TEXT,
      desconto DECIMAL(5, 2) NOT NULL,
      tipo_desconto TEXT NOT NULL,
      produtos_ids UUID[],
      categorias TEXT[],
      data_inicio TIMESTAMPTZ NOT NULL,
      data_fim TIMESTAMPTZ NOT NULL,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )', p_nome_tabela);
END;
$$;

-- Verificação final para confirmar que tudo funcionou:
SELECT * FROM public.lojas LIMIT 1;
    `;
    
    setConfigError({
      title: 'Configuração inicial necessária',
      message: 'O sistema detectou que as tabelas necessárias não existem no banco de dados Supabase. Siga os passos abaixo para configurar o banco de dados:'
    });
    setSqlScript(sqlScript);
    setShowSqlModal(true);
  };

  // Função para copiar o SQL para a área de transferência
  const copiarSql = () => {
    navigator.clipboard.writeText(sqlScript);
    toast.success('SQL copiado para a área de transferência!');
  };

  // Função para garantir que a tabela de lojas existe
  const criarTabelaLojasSeNecessario = async () => {
    try {
      // Tentar acessar a tabela de lojas para ver se ela existe
      const { error } = await supabase.from('lojas').select('count');
      
      // Se não houver erro, a tabela existe e está funcionando
      if (!error) return;
      
      // Se o erro for PGRST116, significa que a tabela não existe
      if (error.code === 'PGRST116') {
        console.log('Tabela de lojas não encontrada. Criando...');
        
        try {
          // Importar as funções necessárias
          const { 
            criarFuncaoExecutarSQL,
            criarTabelaLojas,
            criarEstruturasIniciais
          } = await import('@/lib/supabaseUtils');
          
          // Tentar criar todas as estruturas de uma vez
          const resultadoEstruturas = await criarEstruturasIniciais(supabase);
          
          if (resultadoEstruturas.success) {
            toast.success('Estruturas iniciais criadas com sucesso!');
            return;
          }
          
          // Se não conseguiu criar todas, tentar apenas a tabela de lojas
          const result = await criarTabelaLojas(supabase);
          
          if (result.success) {
            return;
          }
          
          // Se for manual, armazenar o SQL para mostrar ao usuário
          if (result.manual) {
            setConfigError({
              title: 'Configuração incompleta',
              message: 'Não foi possível criar automaticamente as tabelas necessárias. Você precisa executar o seguinte SQL no painel do Supabase:',
              suggestion: result.suggestion
            });
            setSqlScript(result.sql);
            setShowSqlModal(true);
            throw new Error('Configuração manual necessária');
          }
          
          // Falha completa
          throw new Error(result.error || 'Não foi possível criar a tabela de lojas');
        } catch (funcError) {
          console.error('Erro ao criar estruturas necessárias:', funcError);
          
          if (!showSqlModal) {
            // Mostrar mensagem e redirecionar para configuração do Supabase
            toast.warning('É necessário configurar corretamente o Supabase. Redirecionando...');
            setTimeout(() => {
              router.push('/configuracao/supabase');
            }, 2000);
          }
          
          throw new Error('É necessário configurar o Supabase com uma chave que tenha permissões adequadas');
        }
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao verificar/criar tabela de lojas:', error);
      throw new Error('Não foi possível criar a tabela de lojas: ' + error.message);
    }
  };

  const criarNovaLoja = async (e) => {
    e.preventDefault();
    
    if (!novaLoja.trim()) {
      toast.error('Por favor, informe o nome da loja');
      return;
    }
    
    setCriandoLoja(true);
    
    try {
      // Verificar se a tabela lojas existe
      const { error: checkError } = await supabase.from('lojas').select('count');
      
      // Se houver erro específico de "relation does not exist"
      if (checkError && checkError.message && checkError.message.includes('relation "public.lojas" does not exist')) {
        mostrarInstrucoesSQL();
        throw new Error('É necessário criar as tabelas no Supabase primeiro');
      }
      
      // Verificar se já existe uma loja com este nome
      const { data, error } = await supabase
        .from('lojas')
        .select('id')
        .eq('nome', novaLoja)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        toast.error('Já existe uma loja com este nome');
        return;
      }
      
      // Importar a função apenas quando necessário para evitar problemas de SSR
      const { criarTabelasLoja } = await import('@/lib/supabaseUtils');
      
      // Criar tabelas para a nova loja
      const resultado = await criarTabelasLoja(supabase, novaLoja);
      
      if (!resultado.success) {
        throw new Error(resultado.error || 'Erro ao criar loja');
      }
      
      toast.success(`Loja "${novaLoja}" criada com sucesso!`);
      setShowModal(false);
      setNovaLoja('');
      
      // Redirecionar para a página de configuração da loja
      router.push(`/lojas/${resultado.lojaId}/configuracao`);
    } catch (error) {
      console.error('Erro ao criar loja:', error);
      
      // Se for erro relacionado à relação não existente, já tratamos acima
      if (!error.message.includes('criar as tabelas no Supabase')) {
        toast.error(`Erro ao criar loja: ${error.message}`);
      }
    } finally {
      setCriandoLoja(false);
    }
  };

  const excluirLoja = async (lojaId, nomeLoja) => {
    try {
      // Confirmação direta de exclusão
      const confirmExclusao = await confirm({
        title: 'Excluir loja',
        message: `Tem certeza que deseja excluir a loja "${nomeLoja}"?\n\nEsta ação é IRREVERSÍVEL e excluirá todos os dados relacionados a esta loja.`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        type: 'danger'
      });
      
      if (!confirmExclusao) return;
      
      setLoadingLojas(true);
      
      // Atualizar a lista de lojas para remover a loja sendo excluída
      setLojas(lojas => lojas.filter(loja => loja.identificador !== lojaId));
      
      // Utilizar o endpoint de API dedicado para exclusão de lojas
      if (!credentials) {
        throw new Error('Credenciais do Supabase não encontradas. Por favor, reconfigure o acesso.');
      }
      
      const { supabaseUrl, supabaseKey } = credentials;
      
      // Construir o corpo da requisição incluindo a lista completa de tabelas
      const tabelas = [
        `${lojaId}_config`,
        `${lojaId}_produtos`,
        `${lojaId}_estoque`,
        `${lojaId}_vendas`,
        `${lojaId}_clientes`,
        `${lojaId}_promocoes`,
        `${lojaId}_carrinhos`,
        `${lojaId}_carrinho_compras`
      ];
      
      const response = await fetch('/api/lojas/excluir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supabaseUrl,
          supabaseKey,
          lojaId,
          tabelas
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Se houver erro, recarregar a lista original
        toast.error(result.mensagem || result.error || 'Erro ao excluir loja');
        carregarLojas();
        throw new Error(result.mensagem || result.error || 'Erro ao excluir loja');
      }
      
      toast.success(`Loja "${nomeLoja}" excluída com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao excluir loja:', error);
      toast.error(`Erro ao excluir loja: ${error.message}`);
    } finally {
      setLoadingLojas(false);
    }
  };

  // Função para desativar a loja
  const desativarLoja = async (lojaId, nomeLoja) => {
    // Pedir confirmação
    const confirmDesativar = await confirm({
      title: 'Desativar loja',
      message: `Tem certeza que deseja DESATIVAR a loja "${nomeLoja}"?\nA loja não será mais visível para uso, mas seus dados serão mantidos.`,
      confirmText: 'Sim, desativar',
      cancelText: 'Cancelar',
      type: 'warning'
    });
    
    if (!confirmDesativar) return;
    
    try {
      setLoadingLojas(true);
      
      // Atualizar a interface imediatamente
      setLojas(lojas => lojas.map(loja => 
        loja.identificador === lojaId 
          ? { ...loja, ativo: false } 
          : loja
      ));
      
      // Verificar credenciais
      if (!credentials) {
        throw new Error('Credenciais do Supabase não encontradas. Por favor, reconfigure o acesso.');
      }
      
      const { supabaseUrl, supabaseKey } = credentials;
      
      // Usar o endpoint de API para alterar o status da loja
      const response = await fetch('/api/lojas/alterarStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supabaseUrl,
          supabaseKey,
          lojaId,
          ativo: false
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Se houver erro, recarregar a lista original
        toast.error(result.mensagem || result.error || 'Erro ao desativar loja');
        carregarLojas();
        throw new Error(result.mensagem || result.error || 'Erro ao desativar loja');
      }
      
      toast.success(`Loja "${nomeLoja}" desativada com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao desativar loja:', error);
      toast.error(`Erro ao desativar loja: ${error.message}`);
    } finally {
      setLoadingLojas(false);
    }
  };

  // Função para reativar uma loja
  const reativarLoja = async (lojaId, nomeLoja) => {
    // Pedir confirmação
    const confirmReativar = await confirm({
      title: 'Reativar loja',
      message: `Deseja reativar a loja "${nomeLoja}"?`,
      confirmText: 'Sim, reativar',
      cancelText: 'Cancelar',
      type: 'info'
    });
    
    if (!confirmReativar) return;
    
    try {
      setLoadingLojas(true);
      
      // Atualizar a interface imediatamente
      setLojas(lojas => lojas.map(loja => 
        loja.identificador === lojaId 
          ? { ...loja, ativo: true } 
          : loja
      ));
      
      // Verificar credenciais
      if (!credentials) {
        throw new Error('Credenciais do Supabase não encontradas. Por favor, reconfigure o acesso.');
      }
      
      const { supabaseUrl, supabaseKey } = credentials;
      
      // Usar o endpoint de API para alterar o status da loja
      const response = await fetch('/api/lojas/alterarStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supabaseUrl,
          supabaseKey,
          lojaId,
          ativo: true
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Se houver erro, recarregar a lista original
        toast.error(result.mensagem || result.error || 'Erro ao reativar loja');
        carregarLojas();
        throw new Error(result.mensagem || result.error || 'Erro ao reativar loja');
      }
      
      toast.success(`Loja "${nomeLoja}" reativada com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao reativar loja:', error);
      toast.error(`Erro ao reativar loja: ${error.message}`);
    } finally {
      setLoadingLojas(false);
    }
  };

  // Função para criar loja de demonstração
  const criarLojaDemo = async () => {
    // Apenas redirecionar para a página de criação de loja demo
    router.push('/configuracao/demo');
  };

  // Função para criar o trigger de atualização de cliente para uma loja existente
  const criarTriggerAtualizacaoCliente = async (lojaId, nomeLoja) => {
    try {
      // Perguntar se quer mesmo criar o trigger
      const confirmarCriacao = await confirm({
        title: 'Criar Trigger de Atualização',
        message: `Deseja criar um trigger automático para a loja "${nomeLoja}" que atualizará leads para clientes quando fizerem uma compra?`,
        confirmText: 'Sim, criar',
        cancelText: 'Cancelar'
      });
      
      if (!confirmarCriacao) return;
      
      // Criar a função que será executada pelo trigger
      await supabase.rpc('executar_sql', {
        p_sql: `
          CREATE OR REPLACE FUNCTION atualizar_cliente_apos_venda_${lojaId}()
          RETURNS TRIGGER AS $$
          DECLARE
            cliente_atual RECORD;
            total_atual NUMERIC;
          BEGIN
            -- Verificar se existe cliente_id na venda
            IF NEW.cliente_id IS NULL THEN
              RETURN NEW;
            END IF;
            
            -- Buscar informações atuais do cliente
            SELECT * INTO cliente_atual FROM ${lojaId}_clientes WHERE id = NEW.cliente_id;
            
            IF cliente_atual IS NULL THEN
              -- Cliente não encontrado, não fazer nada
              RETURN NEW;
            END IF;
            
            -- Definir valor total atual ou usar 0 se for NULL
            total_atual := COALESCE(cliente_atual.total_compras, 0);
            
            -- Atualizar cliente
            UPDATE ${lojaId}_clientes
            SET 
              tipo = CASE WHEN cliente_atual.tipo = 'lead' THEN 'cliente' ELSE cliente_atual.tipo END,
              ultima_compra = NOW(),
              total_compras = total_atual + COALESCE(NEW.valor_total, 0),
              updated_at = NOW()
            WHERE id = NEW.cliente_id;
            
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `
      });
      
      // Criar o trigger que vai executar a função após inserção na tabela de vendas
      await supabase.rpc('executar_sql', {
        p_sql: `
          DROP TRIGGER IF EXISTS atualizar_cliente_apos_venda_${lojaId} ON ${lojaId}_vendas;
          
          CREATE TRIGGER atualizar_cliente_apos_venda_${lojaId}
          AFTER INSERT ON ${lojaId}_vendas
          FOR EACH ROW
          EXECUTE FUNCTION atualizar_cliente_apos_venda_${lojaId}();
        `
      });
      
      toast.success(`Trigger de atualização de clientes criado com sucesso para a loja "${nomeLoja}"`);
    } catch (error) {
      console.error('Erro ao criar trigger de atualização de cliente:', error);
      toast.error('Erro ao criar trigger: ' + error.message);
    }
  };

  // Função para criar todos os triggers automáticos para uma loja
  const criarTodosTriggersAutomaticos = async (lojaId, nomeLoja) => {
    try {
      // Perguntar se quer mesmo criar todos os triggers
      const confirmarCriacao = await confirm({
        title: 'Criar Todos os Triggers Automáticos',
        message: `Deseja criar todos os triggers automáticos para a loja "${nomeLoja}"? Isso incluirá:\n\n- Atualização de leads para clientes\n- Atualização de estoque\n- Conversão de carrinhos abandonados\n- Estatísticas de produtos\n- Aplicação de promoções`,
        confirmText: 'Sim, criar todos',
        cancelText: 'Cancelar'
      });
      
      if (!confirmarCriacao) return;
      
      // Mostrar loading
      toast.info('Criando triggers automáticos, aguarde...');
      
      // Importar a função necessária
      const { criarTodosTriggersAutomaticos } = await import('@/lib/supabaseUtils');
      
      // Criar todos os triggers
      const resultado = await criarTodosTriggersAutomaticos(supabase, lojaId);
      
      if (resultado.success) {
        toast.success(`Todos os triggers automáticos foram criados com sucesso para a loja "${nomeLoja}"`);
      } else {
        throw new Error(resultado.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao criar triggers automáticos:', error);
      toast.error('Erro ao criar triggers: ' + error.message);
    }
  };

  // Renderizar conteúdo diferente com base no estado do Supabase
  if (!loading && !isInitialized) {
    return (
      <AdminLayout title="Configuração Necessária">
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <FiDatabase className="text-5xl text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Configuração do Banco de Dados</h2>
            <p className="text-gray-400">
              É necessário configurar o Supabase antes de começar a usar o sistema.
            </p>
          </div>
          
          <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <FiInfo className="text-yellow-400 text-xl mr-3 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-300 mb-1">
                  Configuração inicial necessária
                </h3>
                <p className="text-yellow-200 text-sm">
                  Para usar o sistema, você precisa configurar a conexão com o banco de dados Supabase.
                  Este é um passo obrigatório para o funcionamento correto de todas as funcionalidades.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link href="/configuracao/supabase" className="btn btn-primary flex-1">
              <FiDatabase className="mr-2" />
              Configurar Supabase
            </Link>
            
            <Link href="/configuracao" className="btn btn-outline flex-1">
              <FiSettings className="mr-2" />
              Todas as Configurações
            </Link>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Precisa de ajuda? Consulte a <Link href="#" className="text-blue-400 hover:underline">documentação</Link> ou <Link href="#" className="text-blue-400 hover:underline">entre em contato</Link> com o suporte.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (loading || loadingLojas) {
    return (
      <AdminLayout title="Carregando">
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard de Lojas" icon={<FiGrid className="mr-2" />}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8">
          <h2 className="text-2xl font-bold mb-4 md:mb-0">Suas Lojas</h2>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button 
              onClick={() => setShowModal(true)}
              className="btn btn-primary flex items-center justify-center"
              disabled={loadingLojas}
            >
              <FiPlus className="mr-2" />
              Nova Loja
            </button>
            
            <button 
              onClick={() => {
                setCriandoDemo(true);
                criarLojaDemo();
              }}
              className="btn btn-secondary flex items-center justify-center"
              disabled={loadingLojas || criandoDemo}
            >
              {criandoDemo ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                  Acessando Demo...
                </>
              ) : (
                <>
                  <FiGrid className="mr-2" />
                  Acessar Demo
                </>
              )}
            </button>
          </div>
        </div>
        
        {!loadingLojas && lojas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg border border-blue-700 p-6 shadow-lg">
              <div className="flex items-center text-blue-300 mb-2">
                <FiShoppingBag className="text-2xl mr-2" />
                <h3 className="font-semibold">Total de Lojas</h3>
              </div>
              <p className="text-3xl font-bold text-white">{lojas.length}</p>
              <p className="text-sm text-blue-300 mt-2">
                {lojas.filter(l => l.ativo).length} lojas ativas
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg border border-purple-700 p-6 shadow-lg">
              <div className="flex items-center text-purple-300 mb-2">
                <FiBarChart2 className="text-2xl mr-2" />
                <h3 className="font-semibold">Última Atualização</h3>
              </div>
              <p className="text-3xl font-bold text-white">
                {new Date().toLocaleDateString('pt-BR')}
              </p>
              <p className="text-sm text-purple-300 mt-2">
                {new Date().toLocaleTimeString('pt-BR')}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg border border-green-700 p-6 shadow-lg">
              <div className="flex items-center text-green-300 mb-2">
                <FiUsers className="text-2xl mr-2" />
                <h3 className="font-semibold">Status do Sistema</h3>
              </div>
              <p className="text-xl font-bold text-white">Online</p>
              <p className="text-sm text-green-300 mt-2">
                Todos os serviços operacionais
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-lg border border-yellow-700 p-6 shadow-lg">
              <div className="flex items-center text-yellow-300 mb-2">
                <FiDatabase className="text-2xl mr-2" />
                <h3 className="font-semibold">Banco de Dados</h3>
              </div>
              <p className="text-xl font-bold text-white">Conectado</p>
              <p className="text-sm text-yellow-300 mt-2">
                Conexão com Supabase estabelecida
              </p>
            </div>
          </div>
        )}
        
        {configError && (
          <div className="bg-red-900 border border-red-800 p-4 rounded-lg mb-6 flex items-start">
            <FiInfo className="text-red-400 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-400">Erro de Configuração</h3>
              <p className="text-gray-200 mt-1">{configError}</p>
            </div>
          </div>
        )}
        
        {loadingLojas ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : lojas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-4 py-3 text-left">Nome da Loja</th>
                  <th className="px-4 py-3 text-left">Identificador</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Data de Criação</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lojas.map((loja) => (
                  <tr key={loja.id} className="border-t border-gray-700 hover:bg-gray-750">
                    <td className="px-4 py-3 font-medium">
                      {loja.nome}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {loja.identificador}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${loja.ativo ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}
                      >
                        {loja.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">
                      {new Date(loja.data_criacao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-3">
                        <Link href={`/lojas/${loja.identificador}`} legacyBehavior>
                          <a className="text-blue-400 hover:text-blue-300" title="Acessar loja">
                            <FiShoppingBag size={18} />
                          </a>
                        </Link>
                        
                        <Link href={`/admin/lojas/${loja.identificador}/backend`} legacyBehavior>
                          <a className="text-yellow-400 hover:text-yellow-300" title="Configurações de Backend">
                            <FiServer size={18} />
                          </a>
                        </Link>
                        
                        {loja.ativo ? (
                          <button
                            onClick={() => desativarLoja(loja.identificador, loja.nome)}
                            className="text-orange-400 hover:text-orange-300"
                            title="Desativar loja"
                          >
                            <FiEyeOff size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => reativarLoja(loja.identificador, loja.nome)}
                            className="text-green-400 hover:text-green-300"
                            title="Reativar loja"
                          >
                            <FiCheck size={18} />
                          </button>
                        )}
                        
                        <button
                          onClick={() => excluirLoja(loja.identificador, loja.nome)}
                          className="text-red-400 hover:text-red-300"
                          title="Excluir loja"
                        >
                          <FiTrash2 size={18} />
                        </button>

                        <button 
                          onClick={() => criarTodosTriggersAutomaticos(loja.identificador, loja.nome)}
                          className="text-green-400 hover:text-green-300"
                          title="Criar todos os triggers automáticos (atualização de clientes, estoque, estatísticas, etc.)"
                        >
                          <FiServer size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card border border-gray-700 text-center py-8">
            <h3 className="text-lg font-semibold mb-2">Nenhuma loja cadastrada</h3>
            <p className="text-gray-400 mb-6">
              Comece criando uma nova loja para gerenciar seus produtos, clientes e vendas.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary mx-auto"
            >
              <FiPlus className="mr-1" />
              Criar Loja
            </button>
          </div>
        )}
      </div>
      
      {/* Modal para criar nova loja */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Criar Nova Loja</h3>
            
            <form onSubmit={criarNovaLoja}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="nomeLoja">
                  Nome da Loja
                </label>
                <input
                  type="text"
                  id="nomeLoja"
                  className="input w-full"
                  placeholder="Ex: Minha Loja de Roupas"
                  value={novaLoja}
                  onChange={(e) => setNovaLoja(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Um ID único será gerado automaticamente a partir do nome da loja.
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                  disabled={criandoLoja}
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={criandoLoja}
                >
                  {criandoLoja ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                      Criando...
                    </>
                  ) : (
                    <>Criar Loja</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal para mostrar script SQL */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">
                Configuração do Banco de Dados
              </h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowSqlModal(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="bg-indigo-900/30 border border-indigo-700 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-indigo-300 mb-2">Instruções</h4>
              <ol className="list-decimal pl-5 text-gray-300 space-y-2">
                <li>Acesse o painel do Supabase em <a href="https://app.supabase.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">app.supabase.io</a></li>
                <li>Selecione seu projeto</li>
                <li>No menu lateral, clique em "SQL Editor"</li>
                <li>Clique em "New Query" (ou "Nova Consulta")</li>
                <li>Cole o SQL abaixo completo no editor</li>
                <li>Clique em "Run" (ou "Executar")</li>
                <li>Aguarde a execução completar</li>
                <li>Volte para esta página e atualize-a (F5)</li>
              </ol>
              <p className="text-xs text-gray-400 mt-3">
                Observação: Isso só precisa ser feito uma vez. Certifique-se de estar usando uma chave "service_role" 
                nas configurações do Supabase para que o sistema tenha todas as permissões necessárias.
              </p>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-300">
                  Script SQL para criar as tabelas básicas:
                </p>
                <button onClick={copiarSql} className="btn btn-sm btn-primary">
                  <FiCopy className="mr-1" />
                  Copiar SQL
                </button>
              </div>
              
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs whitespace-pre-wrap border border-gray-700">
                {sqlScript}
              </pre>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <Link href="/configuracao" className="text-blue-400 hover:text-blue-300 flex items-center">
                <FiSettings className="mr-1" />
                Ir para Configurações
              </Link>
              
              <button className="btn btn-primary" onClick={() => setShowSqlModal(false)}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 