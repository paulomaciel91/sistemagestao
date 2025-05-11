import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FiArrowLeft, FiDatabase, FiServer, FiKey, 
  FiCheck, FiX, FiInfo, FiExternalLink, 
  FiCode, FiCopy, FiLoader, FiGrid
} from 'react-icons/fi';

export default function ConfiguracaoInicial() {
  const router = useRouter();
  const { supabase, credentials, resetSupabase } = useSupabase();
  
  const [verificandoTabelas, setVerificandoTabelas] = useState(false);
  const [statusTabelas, setStatusTabelas] = useState({
    lojas: { existe: false, verificado: false },
    webhooks_n8n: { existe: false, verificado: false },
    credenciais_externas: { existe: false, verificado: false },
    funcoes: { existe: false, verificado: false },
  });
  const [mostrarSQL, setMostrarSQL] = useState(false);
  
  // Verificar estado das tabelas quando o supabase estiver disponível
  useEffect(() => {
    if (supabase) {
      verificarTabelasExistentes();
    }
  }, [supabase]);
  
  // Verificar se as tabelas existem
  const verificarTabelasExistentes = async () => {
    if (!supabase) return;
    
    setVerificandoTabelas(true);
    
    try {
      // Verificar tabela lojas
      const { error: errorLojas } = await supabase.from('lojas').select('count').limit(1);
      setStatusTabelas(prev => ({
        ...prev,
        lojas: { existe: !errorLojas, verificado: true }
      }));
      
      // Verificar tabela webhooks_n8n
      const { error: errorWebhooks } = await supabase.from('webhooks_n8n').select('count').limit(1);
      setStatusTabelas(prev => ({
        ...prev,
        webhooks_n8n: { existe: !errorWebhooks, verificado: true }
      }));
      
      // Verificar tabela credenciais_externas
      const { error: errorCredenciais } = await supabase.from('credenciais_externas').select('count').limit(1);
      setStatusTabelas(prev => ({
        ...prev,
        credenciais_externas: { existe: !errorCredenciais, verificado: true }
      }));
      
      // Verificar função executar_sql
      try {
        const { error: errorFuncao } = await supabase.rpc('executar_sql', { p_sql: 'SELECT 1' });
        setStatusTabelas(prev => ({
          ...prev,
          funcoes: { existe: !errorFuncao, verificado: true }
        }));
      } catch (funcError) {
        // Caso a função não exista, marcar como não existente mas verificada
        setStatusTabelas(prev => ({
          ...prev,
          funcoes: { existe: false, verificado: true }
        }));
      }
      
    } catch (error) {
      console.error('Erro ao verificar tabelas:', error);
      // Mesmo com erro, consideramos verificado mas não existente
      setStatusTabelas({
        lojas: { existe: false, verificado: true },
        webhooks_n8n: { existe: false, verificado: true },
        credenciais_externas: { existe: false, verificado: true },
        funcoes: { existe: false, verificado: true },
      });
    } finally {
      setVerificandoTabelas(false);
    }
  };
  
  const todasTabelasExistem = Object.values(statusTabelas).every(status => status.existe);
  const todasVerificadas = Object.values(statusTabelas).every(status => status.verificado);
  
  // Script SQL para criar todas as estruturas necessárias
  const sqlScript = `
-- Habilitar a extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função para executar SQL dinamicamente
CREATE OR REPLACE FUNCTION executar_sql(p_sql TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE p_sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar tabela de configuração da loja
CREATE OR REPLACE FUNCTION criar_tabela_loja_config(p_nome_tabela TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nome_loja TEXT NOT NULL,
      endereco TEXT,
      telefone TEXT,
      horario_funcionamento TEXT,
      politica_troca TEXT,
      logo_url TEXT,
      cor_primaria TEXT,
      cor_secundaria TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )', p_nome_tabela);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar tabela de produtos
CREATE OR REPLACE FUNCTION criar_tabela_produtos(p_nome_tabela TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )', p_nome_tabela);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar tabela de estoque
CREATE OR REPLACE FUNCTION criar_tabela_estoque(p_nome_tabela TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      produto_id UUID NOT NULL,
      tamanho TEXT NOT NULL,
      cor TEXT NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )', p_nome_tabela);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar tabela de vendas
CREATE OR REPLACE FUNCTION criar_tabela_vendas(p_nome_tabela TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      cliente_id UUID,
      valor_total DECIMAL(10, 2) NOT NULL,
      metodo_pagamento TEXT,
      status TEXT NOT NULL,
      itens JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )', p_nome_tabela);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar tabela de clientes
CREATE OR REPLACE FUNCTION criar_tabela_clientes(p_nome_tabela TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nome TEXT NOT NULL,
      email TEXT,
      telefone TEXT,
      tipo TEXT DEFAULT ''lead'',
      ultima_compra TIMESTAMP WITH TIME ZONE,
      total_compras DECIMAL(10, 2) DEFAULT 0,
      session_id TEXT,
      customer_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )', p_nome_tabela);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar tabela de promoções
CREATE OR REPLACE FUNCTION criar_tabela_promocoes(p_nome_tabela TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nome TEXT NOT NULL,
      descricao TEXT,
      desconto DECIMAL(5, 2) NOT NULL,
      tipo_desconto TEXT NOT NULL,
      produtos_ids UUID[],
      categorias TEXT[],
      data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
      data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )', p_nome_tabela);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar tabela de carrinhos
CREATE OR REPLACE FUNCTION criar_tabela_carrinhos(p_nome_tabela TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      cliente_id UUID,
      cliente_email TEXT,
      cliente_nome TEXT,
      valor_total DECIMAL(10, 2) NOT NULL,
      itens JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT ''abandonado'',
      mensagens_enviadas INTEGER DEFAULT 0,
      recuperado BOOLEAN DEFAULT false,
      session_id TEXT,
      data_abandono TIMESTAMP WITH TIME ZONE DEFAULT now(),
      data_recuperacao TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )', p_nome_tabela);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar tabela global de lojas
CREATE TABLE IF NOT EXISTS lojas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  identificador TEXT NOT NULL UNIQUE,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ativo BOOLEAN DEFAULT true
);

-- Criar tabela de webhooks do n8n
CREATE TABLE IF NOT EXISTS webhooks_n8n (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de credenciais externas
CREATE TABLE IF NOT EXISTS credenciais_externas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id TEXT NOT NULL,
  servico TEXT NOT NULL,
  chave TEXT NOT NULL,
  valor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);`;
  
  // Copiar o SQL para a área de transferência
  const copiarSql = () => {
    navigator.clipboard.writeText(sqlScript);
    toast.success('SQL copiado para a área de transferência!');
  };
  
  // Resetar o supabase e redirecionar para configuração
  const reiniciarConfiguracao = () => {
    resetSupabase();
    router.push('/configuracao');
  };
  
  // Criar todas as tabelas e funções necessárias
  const criarTodasTabelas = async () => {
    if (!supabase) {
      toast.error('Supabase não inicializado');
      return;
    }
    
    try {
      toast.info('Iniciando criação de estruturas do banco de dados...');
      
      // 1. Criar função executar_sql (necessária para as outras funções)
      const { error: errorExecSql } = await supabase.rpc('executar_sql', {
        p_sql: `
          CREATE OR REPLACE FUNCTION public.executar_sql(p_sql text)
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE p_sql;
          END;
          $$;
        `
      }).catch(e => ({ error: e }));
      
      if (errorExecSql) {
        console.error('Erro ao criar função executar_sql:', errorExecSql);
        toast.warning('Criando funções SQL diretamente...');
        
        // Executar o script SQL completo usando a função executar_sql do próprio script
        const resultadoScript = await executarScriptSQL();
        
        // Verificar resultado do script
        if (!resultadoScript.success) {
          throw new Error(`Erro ao executar script SQL: ${resultadoScript.error}`);
        }
        
        toast.success('Script SQL executado com sucesso!');
        verificarTabelasExistentes();
        return;
      }
      
      // 2. Criar outras funções SQL
      const funcoesSql = [
        { 
          nome: 'criar_tabela_loja_config', 
          sql: `
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
          `
        },
        { 
          nome: 'criar_tabela_produtos', 
          sql: `
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
          `
        },
        { 
          nome: 'criar_tabela_estoque', 
          sql: `
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
          `
        },
        { 
          nome: 'criar_tabela_vendas', 
          sql: `
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
                  itens JSONB NOT NULL DEFAULT ''[]''::jsonb,
                  observacoes TEXT,
                  carrinho_id UUID,
                  endereco_entrega JSONB,
                  created_at TIMESTAMPTZ DEFAULT now(),
                  updated_at TIMESTAMPTZ DEFAULT now()
                )', p_nome_tabela);
                
              -- Verificar se a tabela já existe e corrigir coluna itens se necessário
              EXECUTE format('
                DO $$
                BEGIN
                  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = ''%I'') THEN
                    BEGIN
                      ALTER TABLE %I ALTER COLUMN itens TYPE JSONB USING itens::jsonb;
                      ALTER TABLE %I ADD COLUMN IF NOT EXISTS carrinho_id UUID;
                      ALTER TABLE %I ADD COLUMN IF NOT EXISTS endereco_entrega JSONB;
                    EXCEPTION WHEN OTHERS THEN
                      NULL; -- Ignora erro se a coluna já for do tipo JSONB
                    END;
                  END IF;
                END$$;
              ', p_nome_tabela, p_nome_tabela, p_nome_tabela, p_nome_tabela);
            END;
            $$;
          `
        },
        { 
          nome: 'criar_tabela_clientes', 
          sql: `
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
                  session_id TEXT,
                  customer_id TEXT,
                  endereco JSONB,
                  created_at TIMESTAMPTZ DEFAULT now(),
                  updated_at TIMESTAMPTZ DEFAULT now()
                )', p_nome_tabela);
                
              -- Verificar se a tabela já existe e adicionar coluna endereco se necessário
              EXECUTE format('
                DO $$
                BEGIN
                  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = ''%I'') THEN
                    BEGIN
                      ALTER TABLE %I ADD COLUMN IF NOT EXISTS endereco JSONB;
                    EXCEPTION WHEN OTHERS THEN
                      NULL; -- Ignora erro
                    END;
                  END IF;
                END$$;
              ', p_nome_tabela, p_nome_tabela);
            END;
            $$;
          `
        },
        { 
          nome: 'criar_tabela_promocoes', 
          sql: `
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
          `
        },
        { 
          nome: 'criar_tabela_carrinhos', 
          sql: `
            CREATE OR REPLACE FUNCTION public.criar_tabela_carrinhos(p_nome_tabela text)
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  cliente_id UUID,
                  cliente_email TEXT,
                  cliente_nome TEXT,
                  valor_total DECIMAL(10, 2) NOT NULL,
                  itens JSONB NOT NULL,
                  status TEXT NOT NULL DEFAULT ''abandonado'',
                  mensagens_enviadas INTEGER DEFAULT 0,
                  recuperado BOOLEAN DEFAULT false,
                  session_id TEXT,
                  data_abandono TIMESTAMPTZ DEFAULT now(),
                  data_recuperacao TIMESTAMPTZ,
                  created_at TIMESTAMPTZ DEFAULT now(),
                  updated_at TIMESTAMPTZ DEFAULT now()
                )', p_nome_tabela);
            END;
            $$;
          `
        },
        { 
          nome: 'criar_tabela_carrinho_compras', 
          sql: `
            CREATE OR REPLACE FUNCTION public.criar_tabela_carrinho_compras(p_nome_tabela text)
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  cliente_id UUID,
                  session_id TEXT,
                  itens JSONB NOT NULL DEFAULT ''[]''::jsonb,
                  valor_total DECIMAL(10, 2) DEFAULT 0,
                  quantidade_itens INTEGER DEFAULT 0,
                  ativo BOOLEAN DEFAULT true,
                  status TEXT DEFAULT ''ativo'',
                  observacoes TEXT,
                  created_at TIMESTAMPTZ DEFAULT now(),
                  updated_at TIMESTAMPTZ DEFAULT now()
                )', p_nome_tabela);
            END;
            $$;
          `
        }
      ];
      
      // Criar cada função
      for (const func of funcoesSql) {
        const { error } = await supabase.rpc('executar_sql', {
          p_sql: func.sql
        });
        
        if (error) {
          console.error(`Erro ao criar função ${func.nome}:`, error);
          throw new Error(`Erro ao criar função ${func.nome}: ${error.message}`);
        }
      }
      
      // 3. Criar tabelas globais
      const tabelasGlobais = [
        {
          nome: 'lojas',
          sql: `
            CREATE TABLE IF NOT EXISTS public.lojas (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              nome TEXT NOT NULL,
              identificador TEXT NOT NULL UNIQUE,
              data_criacao TIMESTAMPTZ DEFAULT now(),
              ativo BOOLEAN DEFAULT true
            );
          `
        },
        {
          nome: 'webhooks_n8n',
          sql: `
            CREATE TABLE IF NOT EXISTS public.webhooks_n8n (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              loja_id TEXT NOT NULL,
              nome TEXT NOT NULL,
              url TEXT NOT NULL,
              descricao TEXT,
              created_at TIMESTAMPTZ DEFAULT now()
            );
          `
        },
        {
          nome: 'credenciais_externas',
          sql: `
            CREATE TABLE IF NOT EXISTS public.credenciais_externas (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              loja_id TEXT NOT NULL,
              servico TEXT NOT NULL,
              chave TEXT NOT NULL,
              valor TEXT NOT NULL,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
            );
          `
        }
      ];
      
      // Criar cada tabela global
      for (const tabela of tabelasGlobais) {
        const { error } = await supabase.rpc('executar_sql', {
          p_sql: tabela.sql
        });
        
        if (error) {
          console.error(`Erro ao criar tabela ${tabela.nome}:`, error);
          throw new Error(`Erro ao criar tabela ${tabela.nome}: ${error.message}`);
        }
      }
      
      // 4. Atualizar o status das tabelas
      toast.success('Banco de dados configurado com sucesso!');
      verificarTabelasExistentes();
      
    } catch (error) {
      console.error('Erro ao criar tabelas:', error);
      toast.error(`Erro ao criar estruturas: ${error.message}`);
    }
  };

  // Executar script SQL completo diretamente
  const executarScriptSQL = async () => {
    try {
      const { error } = await supabase.rpc('executar_sql', {
        p_sql: sqlScript
      }).catch(e => ({ error: e }));
      
      if (error) {
        console.error('Erro ao executar script SQL:', error);
        return { success: false, error: error.message };
      }
      
      // Criar loja de demonstração
      await criarLojaDemonstracao();
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao executar script SQL:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Criar loja de demonstração
  const criarLojaDemonstracao = async () => {
    if (!supabase) {
      toast.error('Supabase não inicializado');
      return;
    }
    
    try {
      toast.info('Criando loja de demonstração...');
      
      // Nome da loja
      const nomeLoja = 'Loja Demonstração';
      const lojaId = 'loja_demo';
      
      // Inserir registro na tabela de lojas
      const { error: errorLoja } = await supabase
        .from('lojas')
        .insert([{ 
          nome: nomeLoja, 
          identificador: lojaId,
          data_criacao: new Date().toISOString()
        }]);
      
      if (errorLoja) {
        console.error('Erro ao criar registro da loja:', errorLoja);
        throw new Error(`Erro ao criar loja: ${errorLoja.message}`);
      }
      
      // Criar tabelas específicas da loja
      const tabelas = [
        { funcao: 'criar_tabela_loja_config', tabela: `${lojaId}_config` },
        { funcao: 'criar_tabela_produtos', tabela: `${lojaId}_produtos` },
        { funcao: 'criar_tabela_estoque', tabela: `${lojaId}_estoque` },
        { funcao: 'criar_tabela_vendas', tabela: `${lojaId}_vendas` },
        { funcao: 'criar_tabela_clientes', tabela: `${lojaId}_clientes` },
        { funcao: 'criar_tabela_promocoes', tabela: `${lojaId}_promocoes` },
        { funcao: 'criar_tabela_carrinhos', tabela: `${lojaId}_carrinhos` },
        { funcao: 'criar_tabela_carrinho_compras', tabela: `${lojaId}_carrinho_compras` }
      ];
      
      for (const t of tabelas) {
        const { error } = await supabase.rpc(t.funcao, { p_nome_tabela: t.tabela });
        
        if (error) {
          console.error(`Erro ao criar tabela ${t.tabela}:`, error);
          throw new Error(`Erro ao criar tabela ${t.tabela}: ${error.message}`);
        }
      }
      
      // Verificar explicitamente que as colunas session_id e customer_id existem na tabela de clientes
      try {
        console.log(`Verificando e garantindo colunas na tabela ${lojaId}_clientes...`);
        
        await supabase.rpc('executar_sql', {
          p_sql: `
            ALTER TABLE ${lojaId}_clientes
            ADD COLUMN IF NOT EXISTS session_id TEXT,
            ADD COLUMN IF NOT EXISTS customer_id TEXT;
          `
        });
        
        console.log('Colunas verificadas e atualizadas com sucesso.');
      } catch (e) {
        console.error('Erro ao verificar ou adicionar colunas:', e);
        // Não vamos interromper o processo por causa desse erro
      }
      
      // Adicionar algumas configurações básicas
      const { error: errorConfig } = await supabase
        .from(`${lojaId}_config`)
        .insert([{
          nome_loja: nomeLoja,
          cor_primaria: '#3B82F6',
          cor_secundaria: '#1E3A8A'
        }]);
      
      if (errorConfig) {
        console.error('Erro ao adicionar configurações da loja:', errorConfig);
      }
      
      toast.success('Loja de demonstração criada com sucesso!');
      
      // Redirecionar para o dashboard após criar a loja
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Erro ao criar loja de demonstração:', error);
      toast.error(`Erro ao criar loja de demonstração: ${error.message}`);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Configuração Inicial | Sistema de Gestão para Lojas</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Link href="/" className="btn btn-circle btn-ghost mr-3">
            <FiArrowLeft className="text-xl" />
          </Link>
          <h1 className="text-2xl font-bold">Configuração Inicial do Sistema</h1>
        </div>
        
        {/* Adicionar alerta informativo quando as tabelas não existirem */}
        {todasVerificadas && !todasTabelasExistem && (
          <div className="alert alert-info mb-6 shadow-lg">
            <FiInfo className="h-6 w-6 flex-shrink-0" />
            <div>
              <h3 className="font-bold">Banco de dados não configurado</h3>
              <div className="text-sm">É necessário criar a estrutura do banco de dados. Use o botão "Criar Tabelas" abaixo.</div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna de status */}
          <div className="lg:col-span-1">
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FiDatabase className="text-primary-500 mr-2" />
                Status do Banco de Dados
              </h2>
              
              <ul className="space-y-4">
                <li className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FiGrid className="text-gray-400 mr-2" />
                    Tabela de Lojas
                  </span>
                  
                  {!statusTabelas.lojas.verificado ? (
                    <span className="text-gray-500 flex items-center">
                      <FiLoader className="animate-spin mr-1" />
                      Verificando...
                    </span>
                  ) : statusTabelas.lojas.existe ? (
                    <span className="text-green-500 flex items-center">
                      <FiCheck className="mr-1" />
                      OK
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center">
                      <FiX className="mr-1" />
                      Não encontrada
                    </span>
                  )}
                </li>
                
                <li className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FiGrid className="text-gray-400 mr-2" />
                    Tabela de Webhooks
                  </span>
                  
                  {!statusTabelas.webhooks_n8n.verificado ? (
                    <span className="text-gray-500 flex items-center">
                      <FiLoader className="animate-spin mr-1" />
                      Verificando...
                    </span>
                  ) : statusTabelas.webhooks_n8n.existe ? (
                    <span className="text-green-500 flex items-center">
                      <FiCheck className="mr-1" />
                      OK
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center">
                      <FiX className="mr-1" />
                      Não encontrada
                    </span>
                  )}
                </li>
                
                <li className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FiGrid className="text-gray-400 mr-2" />
                    Tabela de Credenciais
                  </span>
                  
                  {!statusTabelas.credenciais_externas.verificado ? (
                    <span className="text-gray-500 flex items-center">
                      <FiLoader className="animate-spin mr-1" />
                      Verificando...
                    </span>
                  ) : statusTabelas.credenciais_externas.existe ? (
                    <span className="text-green-500 flex items-center">
                      <FiCheck className="mr-1" />
                      OK
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center">
                      <FiX className="mr-1" />
                      Não encontrada
                    </span>
                  )}
                </li>
                
                <li className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FiCode className="text-gray-400 mr-2" />
                    Funções SQL
                  </span>
                  
                  {!statusTabelas.funcoes.verificado ? (
                    <span className="text-gray-500 flex items-center">
                      <FiLoader className="animate-spin mr-1" />
                      Verificando...
                    </span>
                  ) : statusTabelas.funcoes.existe ? (
                    <span className="text-green-500 flex items-center">
                      <FiCheck className="mr-1" />
                      OK
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center">
                      <FiX className="mr-1" />
                      Não encontradas
                    </span>
                  )}
                </li>
              </ul>
              
              <div className="mt-6">
                <button 
                  className="btn btn-primary w-full"
                  onClick={verificarTabelasExistentes}
                  disabled={verificandoTabelas}
                >
                  {verificandoTabelas ? (
                    <span className="flex items-center justify-center">
                      <FiLoader className="animate-spin mr-2" />
                      Verificando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <FiDatabase className="mr-2" />
                      Verificar Novamente
                    </span>
                  )}
                </button>
              </div>
              
              <div className="mt-4">
                {todasVerificadas && (
                  todasTabelasExistem ? (
                    <div className="p-4 rounded-lg bg-green-900 bg-opacity-20 border border-green-700">
                      <h3 className="font-semibold text-green-400 mb-2 flex items-center">
                        <FiCheck className="mr-2" />
                        Tudo Configurado!
                      </h3>
                      <p className="text-sm text-gray-300">
                        O banco de dados está configurado corretamente. Você pode começar a usar o sistema.
                      </p>
                      <button 
                        className="btn btn-success btn-sm mt-3"
                        onClick={() => router.push('/dashboard')}
                      >
                        Ir para o Dashboard
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-red-900 bg-opacity-20 border border-red-700">
                      <h3 className="font-semibold text-red-400 mb-2 flex items-center">
                        <FiX className="mr-2" />
                        Configuração Incompleta
                      </h3>
                      <p className="text-sm text-gray-300 mb-3">
                        Uma ou mais estruturas necessárias não foram encontradas. Você precisa executar o script SQL para configurar o sistema.
                      </p>
                      <button 
                        className="btn btn-error btn-sm"
                        onClick={() => setMostrarSQL(true)}
                      >
                        Ver Instruções SQL
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
            
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FiKey className="text-primary-500 mr-2" />
                Conexão Supabase
              </h2>
              
              {credentials ? (
                <div>
                  <p className="text-sm mb-2">
                    <strong>URL:</strong> {credentials.supabaseUrl}
                  </p>
                  <p className="text-sm mb-4">
                    <strong>Chave:</strong> ••••••••••••••••••••••
                  </p>
                  
                  <div className="flex space-x-3">
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => router.push('/configuracao/supabase')}
                    >
                      Editar Configuração
                    </button>
                    
                    <button 
                      className="btn btn-sm btn-error"
                      onClick={reiniciarConfiguracao}
                    >
                      Resetar Credenciais
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-red-400 mb-4">
                    Credenciais do Supabase não configuradas.
                  </p>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => router.push('/configuracao')}
                  >
                    Configurar Supabase
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Coluna de instruções */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <FiInfo className="text-primary-500 mr-2" />
                Guia de Configuração
              </h2>
              
              <div className="space-y-6">
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="font-semibold text-lg mb-2 flex items-center">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">1</span>
                    Criar um Projeto no Supabase
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Primeiro, você precisa criar um projeto no Supabase para hospedar seu banco de dados.
                  </p>
                  <ol className="list-decimal list-inside text-sm text-gray-300 space-y-2 ml-6">
                    <li>Acesse <a href="https://app.supabase.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center inline-flex">app.supabase.io <FiExternalLink className="ml-1 text-xs" /></a></li>
                    <li>Faça login ou crie uma conta</li>
                    <li>Clique em "New Project"</li>
                    <li>Preencha as informações do projeto</li>
                    <li>Aguarde a criação do projeto</li>
                  </ol>
                </div>
                
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="font-semibold text-lg mb-2 flex items-center">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">2</span>
                    Obter Credenciais do Supabase
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Você precisa obter a URL e a chave do seu projeto para conectar o sistema ao Supabase.
                  </p>
                  <ol className="list-decimal list-inside text-sm text-gray-300 space-y-2 ml-6">
                    <li>No painel do Supabase, acesse "Project Settings"</li>
                    <li>Clique em "API" no menu lateral</li>
                    <li>Copie a "Project URL"</li>
                    <li>Copie a "service_role secret" (não a anon)</li>
                    <li>Configure estas credenciais na página de <Link href="/configuracao" className="text-blue-400 hover:underline">Configuração</Link></li>
                  </ol>
                </div>
                
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="font-semibold text-lg mb-2 flex items-center">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">3</span>
                    Executar Script SQL Inicial
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Execute o script SQL para criar as tabelas e funções necessárias para o sistema.
                  </p>
                  <ol className="list-decimal list-inside text-sm text-gray-300 space-y-2 ml-6">
                    <li>No painel do Supabase, acesse "SQL Editor"</li>
                    <li>Clique em "New Query"</li>
                    <li>Cole o script SQL (clique no botão abaixo)</li>
                    <li>Clique em "Run" para executar o script</li>
                    <li>Verifique o status das tabelas novamente nesta página</li>
                  </ol>
                  <div className="mt-4">
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setMostrarSQL(true)}
                    >
                      <FiCode className="mr-2" />
                      Ver Script SQL
                    </button>
                  </div>
                </div>
                
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="font-semibold text-lg mb-2 flex items-center">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">4</span>
                    Começar a Usar o Sistema
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Após configurar o Supabase e executar o script SQL, você pode começar a usar o sistema.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    {!todasTabelasExistem && (
                      <div className="mt-6 space-y-4">
                        <button
                          type="button"
                          className="btn btn-primary w-full"
                          onClick={criarTodasTabelas}
                          disabled={verificandoTabelas || !supabase}
                        >
                          {verificandoTabelas ? (
                            <span className="flex items-center">
                              <FiLoader className="animate-spin mr-2" />
                              Configurando...
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <FiDatabase className="mr-2" />
                              Inicializar Banco de Dados
                            </span>
                          )}
                        </button>
                        
                        <div className="text-sm text-center text-gray-400">
                          Este botão irá criar todas as tabelas e funções necessárias automaticamente.
                        </div>
                      </div>
                    )}
                    
                    {todasTabelasExistem && (
                      <div className="mt-6 space-y-4">
                        <button
                          type="button"
                          className="btn btn-success w-full"
                          onClick={criarLojaDemonstracao}
                          disabled={verificandoTabelas || !supabase}
                        >
                          {verificandoTabelas ? (
                            <span className="flex items-center">
                              <FiLoader className="animate-spin mr-2" />
                              Processando...
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <FiGrid className="mr-2" />
                              Criar Loja de Demonstração
                            </span>
                          )}
                        </button>
                        
                        <div className="text-sm text-center text-gray-400">
                          Cria uma loja de demonstração pronta para uso, com todas as tabelas necessárias.
                        </div>
                        
                        <div className="flex justify-center mt-4">
                          <Link href="/configuracao/demo" className="btn btn-info">
                            Criar Loja com Dados Completos
                          </Link>
                        </div>
                        <p className="text-xs text-center mt-2 text-gray-400">
                          Mais opções de personalização e criação de dados fictícios.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Modal para exibir o SQL */}
        {mostrarSQL && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-5xl my-8">
              <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-3">
                <h2 className="text-2xl font-bold flex items-center">
                  <FiCode className="text-yellow-400 text-3xl mr-3" />
                  Script SQL de Configuração
                </h2>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setMostrarSQL(false)}
                >
                  &times;
                </button>
              </div>
              
              <div className="bg-gray-900 p-4 rounded-lg mb-6 overflow-auto max-h-96 shadow-inner border border-gray-700">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{sqlScript}</pre>
              </div>
              
              <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-blue-400 mb-2">Instruções:</h3>
                <ol className="text-gray-200 space-y-2 list-decimal list-inside">
                  <li>Acesse o painel do Supabase em <a href="https://app.supabase.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">app.supabase.io</a></li>
                  <li>Selecione seu projeto</li>
                  <li>No menu lateral, clique em "SQL Editor"</li>
                  <li>Clique em "New Query" (ou "Nova Consulta")</li>
                  <li>Cole o SQL acima completo no editor</li>
                  <li>Clique em "Run" (ou "Executar")</li>
                  <li>Aguarde a execução completar</li>
                  <li>Volte para esta página e clique em "Verificar Novamente"</li>
                </ol>
              </div>
              
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <button
                    className="btn btn-warning flex items-center"
                    onClick={copiarSql}
                  >
                    <FiCopy className="mr-2" />
                    Copiar SQL para Área de Transferência
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://app.supabase.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    <FiExternalLink className="mr-2" />
                    Abrir Supabase
                  </a>
                  
                  <button
                    className="btn btn-ghost"
                    onClick={() => setMostrarSQL(false)}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 