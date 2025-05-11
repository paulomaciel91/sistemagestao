import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import LojaLayout from '@/components/LojaLayout';
import Link from 'next/link';
import { FiShoppingBag, FiCalendar, FiFilter, FiDownload, FiUser, FiClock, FiDollarSign, FiCheckCircle, FiPlus, FiX, FiMinus, FiTrash, FiSave, FiEdit2 } from 'react-icons/fi';
import { atualizarTabelasProdutos, criarTriggerAtualizacaoEstoque, criarTriggerEstatisticasProduto, corrigirTriggers } from '@/lib/supabaseUtils';

export default function Vendas() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [vendas, setVendas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [clientes, setClientes] = useState({});
  const [periodo, setPeriodo] = useState('7d');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [produtos, setProdutos] = useState([]);
  
  // Estado para nova venda
  const [novaVendaData, setNovaVendaData] = useState({
    cliente_id: '',
    metodo_pagamento: 'Dinheiro',
    status: 'Concluída',
    itens: [],
    observacoes: '',
  });
  
  // Produto temporário sendo adicionado
  const [produtoTemp, setProdutoTemp] = useState({
    produto_id: '',
    quantidade: 1,
    cor: '',
    tamanho: ''
  });
  
  // Estado para armazenar cores e tamanhos do produto selecionado
  const [produtoSelecionadoDetalhes, setProdutoSelecionadoDetalhes] = useState({
    cores: [],
    tamanhos: []
  });
  
  // Estado para modal de edição de produto
  const [showModalEditarProduto, setShowModalEditarProduto] = useState(false);
  const [produtoEditandoIndex, setProdutoEditandoIndex] = useState(-1);
  const [produtoEditandoTemp, setProdutoEditandoTemp] = useState({
    produto_id: '',
    quantidade: 1,
    cor: '',
    tamanho: '',
    nome: '',
    preco: 0
  });
  
  // Adicionar estado para o modal de detalhes da venda
  const [showModalDetalhes, setShowModalDetalhes] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  
  // Calculando valor total com base nos itens
  const valorTotal = novaVendaData.itens.reduce((total, item) => 
    total + (item.preco * item.quantidade), 0);
  
  // Carregar dados da loja quando o ID estiver disponível
  useEffect(() => {
    if (supabase && lojaId) {
      // Corrigir triggers para garantir funcionamento correto 
      verificarECorrigirEstrutura()
        .then(() => {
          carregarDados();
        })
        .catch(err => {
          console.error('Erro ao verificar estrutura:', err);
          // Carregar dados mesmo se houver erro
          carregarDados();
        });
    }
  }, [supabase, lojaId, periodo, filtroStatus]);

  // Função para verificar e corrigir a estrutura do banco
  const verificarECorrigirEstrutura = async () => {
    try {
      console.log(`Verificando estrutura para a loja ${lojaId}...`);
      
      // 1. Verificar e corrigir a tabela de vendas
      const vendasTableQuery = `
        DO $$
        BEGIN
          -- Verificar se a tabela existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${lojaId}_vendas') THEN
            -- Criar a tabela
            CREATE TABLE ${lojaId}_vendas (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              cliente_id UUID,
              valor_total DECIMAL(10, 2) NOT NULL,
              metodo_pagamento TEXT,
              status TEXT NOT NULL,
              itens JSONB NOT NULL DEFAULT '[]'::jsonb,
              observacoes TEXT,
              carrinho_id UUID,
              endereco_entrega JSONB,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
            );
          ELSE
            -- Verificar e corrigir tipo da coluna
            BEGIN
              ALTER TABLE ${lojaId}_vendas 
              ALTER COLUMN itens TYPE JSONB USING CASE 
                WHEN itens IS NULL THEN '[]'::jsonb
                WHEN itens::text = '' THEN '[]'::jsonb
                ELSE itens::jsonb
              END;
            EXCEPTION WHEN OTHERS THEN
              NULL; -- Ignorar erro se a conversão falhar
            END;
            
            -- Garantir que todas as colunas existem
            ALTER TABLE ${lojaId}_vendas ADD COLUMN IF NOT EXISTS observacoes TEXT;
            ALTER TABLE ${lojaId}_vendas ADD COLUMN IF NOT EXISTS carrinho_id UUID;
            ALTER TABLE ${lojaId}_vendas ADD COLUMN IF NOT EXISTS endereco_entrega JSONB;
          END IF;
        END
        $$;
      `;
      
      await supabase.rpc('executar_sql', { p_sql: vendasTableQuery });
      console.log("Estrutura da tabela de vendas verificada");
      
      // 2. Remover triggers problemáticos
      const dropTriggersQuery = `
        DROP TRIGGER IF EXISTS atualizar_estoque_apos_venda_${lojaId} ON ${lojaId}_vendas;
        DROP TRIGGER IF EXISTS atualizar_estatisticas_produto_${lojaId} ON ${lojaId}_vendas;
      `;
      
      await supabase.rpc('executar_sql', { p_sql: dropTriggersQuery });
      console.log("Triggers antigos removidos");
      
      // 3. Corrigir dados inválidos na tabela
      const fixDataQuery = `
        UPDATE ${lojaId}_vendas 
        SET itens = '[]'::jsonb 
        WHERE itens IS NULL OR itens::text = '' OR itens::text = 'null';
      `;
      
      await supabase.rpc('executar_sql', { p_sql: fixDataQuery });
      console.log("Dados de vendas verificados e corrigidos");
      
      return { success: true };
    } catch (error) {
      console.error("Erro ao verificar/corrigir estrutura:", error);
      return { success: false, error };
    }
  };

  // Função para carregar dados da loja
  const carregarDados = async () => {
    try {
      setCarregando(true);
      
      // Verificar se a loja existe
      const { data: lojaData, error: lojaError } = await supabase
        .from('lojas')
        .select('*')
        .eq('identificador', lojaId)
        .single();
      
      if (lojaError) throw lojaError;
      
      if (!lojaData) {
        toast.error('Loja não encontrada');
        router.push('/dashboard');
        return;
      }
      
      setLoja(lojaData);
      
      // Atualizar a estrutura da tabela de produtos para garantir que exista a coluna estoque
      await atualizarTabelasProdutos(supabase, lojaId);
      
      // Carregar vendas
      const dataInicial = obterDataInicial(periodo);
      
      let query = supabase
        .from(`${lojaId}_vendas`)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (dataInicial) {
        query = query.gte('created_at', dataInicial.toISOString());
      }
      
      // Aplicar filtro de status usando a função auxiliar
      if (filtroStatus !== 'todos') {
        const { data: todasVendas, error: vendasError } = await supabase
          .from(`${lojaId}_vendas`)
          .select('*')
          .gte('created_at', dataInicial.toISOString())
          .order('created_at', { ascending: false });
        
        if (vendasError && vendasError.code !== 'PGRST116') {
          throw vendasError;
        }
        
        // Filtrar no lado do cliente para lidar com diferentes formas de escrita do status
        if (todasVendas) {
          const vendasFiltradas = todasVendas.filter(venda => {
            const statusNormalizado = normalizarStatus(venda.status);
            const filtroNormalizado = normalizarStatus(filtroStatus);
            return statusNormalizado === filtroNormalizado;
          });
          
          setVendas(vendasFiltradas || []);
        } else {
          setVendas([]);
        }
      } else {
        const { data: vendasData, error: vendasError } = await query;
        
        if (vendasError) {
          if (vendasError.code === 'PGRST116') {
            // Tabela não existe ainda
            setVendas([]);
          } else {
            throw vendasError;
          }
        } else {
          setVendas(vendasData || []);
        }
      }
      
      // Carregar clientes para exibição de nomes
      try {
        const { data: clientesData, error: clientesError } = await supabase
          .from(`${lojaId}_clientes`)
          .select('id, nome');
        
        if (!clientesError && clientesData) {
          // Transformar em objeto para fácil acesso por id
          const clientesObj = {};
          clientesData.forEach(cliente => {
            clientesObj[cliente.id] = cliente.nome;
          });
          setClientes(clientesObj);
        }
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      }
      
      // Carregar produtos para o modal de nova venda
      try {
        const { data: produtosData, error: produtosError } = await supabase
          .from(`${lojaId}_produtos`)
          .select('id, nome, preco')
          .eq('ativo', true);
        
        if (!produtosError && produtosData) {
          // Processar produtos para garantir que todos os campos necessários existam
          const produtosProcessados = produtosData.map(produto => ({
            ...produto,
            // Garantir que o preço seja um número
            preco: typeof produto.preco === 'number' ? produto.preco : parseFloat(produto.preco) || 0,
            // Adicionar estoque padrão caso não exista
            estoque: produto.estoque !== undefined ? produto.estoque : 100
          }));
          
          setProdutos(produtosProcessados || []);
        } else if (produtosError && produtosError.code !== 'PGRST116') {
          console.error('Erro ao carregar produtos:', produtosError);
        }
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      }
      
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  // Função para obter a data inicial com base no período selecionado
  const obterDataInicial = (periodo) => {
    const dataAtual = new Date();
    let dataInicial = new Date(dataAtual);
    
    switch (periodo) {
      case 'hoje':
        dataInicial.setHours(0, 0, 0, 0); // Início do dia atual
        break;
      case '7d':
        dataInicial.setDate(dataAtual.getDate() - 7); // 7 dias atrás
        break;
      case '30d':
        dataInicial.setMonth(dataAtual.getMonth() - 1); // 1 mês atrás
        break;
      case '90d':
        dataInicial.setMonth(dataAtual.getMonth() - 3); // 3 meses atrás
        break;
      case 'todos':
        dataInicial = new Date(0); // Início do tempo Unix
        break;
      default:
        dataInicial.setDate(dataAtual.getDate() - 7);
    }
    
    return dataInicial;
  };

  // Função para mudar o período dos dados
  const alterarPeriodo = (novoPeriodo) => {
    setPeriodo(novoPeriodo);
  };
  
  // Função para mudar o filtro de status
  const alterarFiltroStatus = (novoStatus) => {
    setFiltroStatus(novoStatus);
  };
  
  // Função auxiliar para normalizar status
  const normalizarStatus = (status) => {
    if (!status) return '';
    
    // Converter para minúsculo e remover acentos para comparação
    const semAcentos = status.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    if (semAcentos.includes("conclu") || semAcentos.includes("finaliz") || semAcentos.includes("complet")) {
      return "concluida";
    } else if (semAcentos.includes("process") || semAcentos.includes("andamento") || semAcentos.includes("pend")) {
      return "em processamento";
    }
    
    return semAcentos;
  };
  
  // Função para formatar a data
  const formatarData = (dataString) => {
    if (!dataString) return '';
    const data = new Date(dataString);
    return `${data.toLocaleDateString('pt-BR')} ${data.getHours()}:${String(data.getMinutes()).padStart(2, '0')}`;
  };
  
  // Função para exportar os dados de vendas para CSV
  const exportarCSV = () => {
    if (vendas.length === 0) {
      toast.info('Não há dados para exportar');
      return;
    }
    
    // Cabeçalho do CSV
    let csv = 'ID,Data,Cliente,Valor Total,Método de Pagamento,Status,Itens\n';
    
    // Adicionar cada venda ao CSV
    vendas.forEach(venda => {
      const clienteNome = venda.cliente_id ? (clientes[venda.cliente_id] || 'Cliente não encontrado') : 'Venda sem cliente';
      const data = formatarData(venda.created_at);
      const valor = venda.valor_total || 0;
      const metodoPagamento = venda.metodo_pagamento || 'Não especificado';
      const status = venda.status || 'Não especificado';
      const itens = venda.itens ? venda.itens.length : 0;
      
      csv += `"${venda.id}","${data}","${clienteNome}","R$ ${valor.toFixed(2).replace('.', ',')}","${metodoPagamento}","${status}","${itens}"\n`;
    });
    
    // Criar e fazer download do arquivo CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `vendas_${lojaId}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Arquivo CSV gerado com sucesso!');
  };

  // Função para criar uma venda de demonstração
  const criarVendaDemonstracao = async () => {
    try {
      setCarregando(true);
      
      const nomeTabela = `${lojaId}_vendas`;
      
      // Verificar se a tabela de vendas existe, caso contrário, criá-la
      try {
        const { error: tableCheckError } = await supabase
          .from(nomeTabela)
          .select('count')
          .limit(1);
          
        if (tableCheckError && tableCheckError.code === 'PGRST116') {
          // A tabela não existe, criar
          await supabase.rpc('criar_tabela_vendas', { 
            p_nome_tabela: nomeTabela 
          });
        } else {
          // A tabela existe, verificar se tem as colunas necessárias
          await verificarECorrigirEstrutura();
        }
      } catch (tableError) {
        console.error('Erro ao verificar/criar tabela de vendas:', tableError);
      }
      
      // Verificar se a tabela de clientes existe, caso contrário, criá-la
      try {
        const { error: clientesTableError } = await supabase
          .from(`${lojaId}_clientes`)
          .select('count')
          .limit(1);
          
        if (clientesTableError && clientesTableError.code === 'PGRST116') {
          // A tabela não existe, criar
          await supabase.rpc('criar_tabela_clientes', { 
            p_nome_tabela: `${lojaId}_clientes` 
          });
        } else {
          // Verificar se tem a coluna endereco
          await supabase.rpc('executar_sql', {
            p_sql: `
              ALTER TABLE ${lojaId}_clientes
              ADD COLUMN IF NOT EXISTS endereco JSONB;
            `
          });
        }
      } catch (clientesTableError) {
        console.error('Erro ao verificar/criar tabela de clientes:', clientesTableError);
      }
      
      // Verificar clientes existentes ou criar um cliente de demonstração
      const { data: clientesExistentes, error: clientesError } = await supabase
        .from(`${lojaId}_clientes`)
        .select('id')
        .limit(1);
      
      let clienteId = null;
      
      if (clientesError || !clientesExistentes || clientesExistentes.length === 0) {
        // Criar um cliente de demonstração
        try {
          const { data: novoCliente, error: novoClienteError } = await supabase
            .from(`${lojaId}_clientes`)
            .insert([{
              nome: 'Cliente Demonstração',
              email: 'demo@exemplo.com',
              telefone: '(11) 99999-9999',
              tipo: 'lead',
              session_id: `session_${Math.random().toString(36).substring(2, 15)}`,
              customer_id: `cus_${Math.random().toString(36).substring(2, 15)}`,
              created_at: new Date().toISOString()
            }])
            .select();
          
          if (novoClienteError) {
            console.error('Erro ao criar cliente de demonstração:', novoClienteError);
            throw novoClienteError;
          } else {
            clienteId = novoCliente[0].id;
          }
        } catch (insertError) {
          console.error('Erro ao inserir cliente de demonstração:', insertError);
          toast.error('Erro ao criar cliente de demonstração. Verifique os logs.');
          setCarregando(false);
          return;
        }
      } else {
        clienteId = clientesExistentes[0].id;
      }
      
      // Criar vendas de demonstração com diferentes status
      const vendasDemo = [
        {
          cliente_id: clienteId,
          valor_total: 159.90,
          metodo_pagamento: 'Cartão de Crédito',
          status: 'Concluída',
          itens: [
            { id: 1, nome: 'Produto A', quantidade: 2, preco: 49.95, total: 99.90 },
            { id: 2, nome: 'Produto B', quantidade: 1, preco: 60.00, total: 60.00 }
          ],
          created_at: new Date().toISOString()
        },
        {
          cliente_id: clienteId,
          valor_total: 89.90,
          metodo_pagamento: 'PIX',
          status: 'Em processamento',
          itens: [
            { id: 3, nome: 'Produto C', quantidade: 1, preco: 89.90, total: 89.90 }
          ],
          created_at: new Date().toISOString()
        },
        {
          cliente_id: clienteId,
          valor_total: 129.80,
          metodo_pagamento: 'Boleto',
          status: 'Pendente',
          itens: [
            { id: 4, nome: 'Produto D', quantidade: 2, preco: 64.90, total: 129.80 }
          ],
          created_at: new Date(Date.now() - 86400000).toISOString() // 1 dia atrás
        }
      ];
      
      // Inserir vendas de demonstração
      try {
        const { error: insertError } = await supabase
          .from(nomeTabela)
          .insert(vendasDemo);
        
        if (insertError) throw insertError;
        
        toast.success('Dados de demonstração criados com sucesso!');
        
        // Atualizar o tipo do cliente criado para 'cliente' após a venda
        await supabase
          .from(`${lojaId}_clientes`)
          .update({ 
            tipo: 'cliente',
            ultima_compra: new Date().toISOString(),
            total_compras: 159.90 + 89.90 + 129.80
          })
          .eq('id', clienteId);
          
        carregarDados();
      } catch (insertVendasError) {
        console.error('Erro ao inserir vendas de demonstração:', insertVendasError);
        toast.error('Erro ao criar vendas de demonstração.');
        setCarregando(false);
      }
      
    } catch (error) {
      console.error('Erro ao criar dados de demonstração:', error);
      toast.error('Erro ao criar dados de demonstração: ' + error.message);
      setCarregando(false);
    }
  };

  // Abrir modal de nova venda
  const abrirModalNovaVenda = () => {
    setNovaVendaData({
      cliente_id: '',
      metodo_pagamento: 'Dinheiro',
      status: 'Concluída',
      itens: [],
      observacoes: '',
    });
    setProdutoTemp({
      produto_id: '',
      quantidade: 1,
      cor: '',
      tamanho: ''
    });
    setProdutoSelecionadoDetalhes({
      cores: [],
      tamanhos: []
    });
    setShowModal(true);
  };
  
  // Fechar modal
  const fecharModal = () => {
    setShowModal(false);
  };
  
  // Manipular mudanças no formulário principal
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNovaVendaData(prev => ({ ...prev, [name]: value }));
  };
  
  // Manipular mudanças no produto temporário
  const handleProdutoTempChange = async (e) => {
    const { name, value } = e.target;
    setProdutoTemp(prev => ({ ...prev, [name]: name === 'quantidade' ? parseInt(value) || 1 : value }));
    
    // Se o produto foi alterado, carregar as cores e tamanhos
    if (name === 'produto_id' && value) {
      const produtoSelecionado = produtos.find(p => p.id.toString() === value.toString());
      
      if (produtoSelecionado) {
        // Verificar se o produto já tem cores e tamanhos na memória
        if (produtoSelecionado.cores && produtoSelecionado.tamanhos) {
          setProdutoSelecionadoDetalhes({
            cores: produtoSelecionado.cores || [],
            tamanhos: produtoSelecionado.tamanhos || []
          });
        } else {
          // Buscar produto completo do banco de dados
          try {
            const { data: produtoCompleto, error } = await supabase
              .from(`${lojaId}_produtos`)
              .select('*')
              .eq('id', value)
              .single();
            
            if (error) throw error;
            
            if (produtoCompleto) {
              // Atualizar o produto na lista local para uso futuro
              const produtosAtualizados = produtos.map(p => 
                p.id.toString() === value.toString() 
                  ? { ...p, cores: produtoCompleto.cores, tamanhos: produtoCompleto.tamanhos }
                  : p
              );
              setProdutos(produtosAtualizados);
              
              // Definir as cores e tamanhos para seleção
              setProdutoSelecionadoDetalhes({
                cores: produtoCompleto.cores || [],
                tamanhos: produtoCompleto.tamanhos || []
              });
            } else {
              setProdutoSelecionadoDetalhes({ cores: [], tamanhos: [] });
            }
          } catch (error) {
            console.error('Erro ao carregar detalhes do produto:', error);
            setProdutoSelecionadoDetalhes({ cores: [], tamanhos: [] });
          }
        }
        
        // Resetar cor e tamanho quando um novo produto é selecionado
        setProdutoTemp(prev => ({ ...prev, cor: '', tamanho: '' }));
      }
    }
  };
  
  // Verificar estoque disponível
  const verificarEstoqueDisponivel = async (produtoId, cor, tamanho, quantidade) => {
    try {
      // Buscar o estoque atual do produto com a cor e tamanho especificados
      const { data, error } = await supabase
        .from(`${lojaId}_estoque`)
        .select('quantidade')
        .eq('produto_id', produtoId)
        .eq('cor', cor)
        .eq('tamanho', tamanho)
        .single();
      
      if (error) {
        console.error('Erro ao verificar estoque:', error);
        return false;
      }
      
      // Verificar se há estoque suficiente
      if (!data || data.quantidade < quantidade) {
        const estoqueDisponivel = data ? data.quantidade : 0;
        toast.error(`Estoque insuficiente. Disponível: ${estoqueDisponivel} unidades.`);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Erro ao verificar estoque disponível:', err);
      return false;
    }
  };

  // Adicionar produto à venda
  const adicionarProduto = async () => {
    if (!produtoTemp.produto_id) {
      toast.error('Selecione um produto');
      return;
    }
    
    // Verificar se cor e tamanho foram selecionados quando disponíveis
    const produtoSelecionado = produtos.find(p => p.id.toString() === produtoTemp.produto_id.toString());
    
    if (!produtoSelecionado) {
      toast.error('Produto não encontrado');
      return;
    }
    
    const temCores = produtoSelecionado.cores && produtoSelecionado.cores.length > 0;
    const temTamanhos = produtoSelecionado.tamanhos && produtoSelecionado.tamanhos.length > 0;
    
    if (temCores && !produtoTemp.cor) {
      toast.error('Selecione uma cor para o produto');
      return;
    }
    
    if (temTamanhos && !produtoTemp.tamanho) {
      toast.error('Selecione um tamanho para o produto');
      return;
    }
    
    // Verificar se há estoque disponível
    if (produtoTemp.cor && produtoTemp.tamanho) {
      const estoqueDisponivel = await verificarEstoqueDisponivel(
        produtoTemp.produto_id, 
        produtoTemp.cor, 
        produtoTemp.tamanho, 
        produtoTemp.quantidade
      );
      
      if (!estoqueDisponivel) {
        toast.error('Estoque insuficiente para este produto');
        return;
      }
    }
    
    // Verificar se já existe esse produto com a mesma cor e tamanho no carrinho
    const itemExistenteIndex = novaVendaData.itens.findIndex(item => 
      item.produto_id.toString() === produtoTemp.produto_id.toString() && 
      item.cor === produtoTemp.cor && 
      item.tamanho === produtoTemp.tamanho
    );
    
    if (itemExistenteIndex >= 0) {
      // Atualizar quantidade se já existe o mesmo produto com mesma cor e tamanho
      const novosItens = [...novaVendaData.itens];
      const novaQuantidade = novosItens[itemExistenteIndex].quantidade + produtoTemp.quantidade;
      
      // Verificar novamente se há estoque suficiente para a nova quantidade total
      if (produtoTemp.cor && produtoTemp.tamanho) {
        const estoqueDisponivel = await verificarEstoqueDisponivel(
          produtoTemp.produto_id, 
          produtoTemp.cor, 
          produtoTemp.tamanho, 
          novaQuantidade
        );
        
        if (!estoqueDisponivel) {
          toast.error('Estoque insuficiente para a quantidade total');
          return;
        }
      }
      
      novosItens[itemExistenteIndex].quantidade = novaQuantidade;
      setNovaVendaData(prev => ({ ...prev, itens: novosItens }));
      toast.success('Quantidade atualizada no carrinho');
    } else {
      // Adicionar novo item
      const novoItem = {
        produto_id: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        preco: produtoSelecionado.preco,
        quantidade: parseInt(produtoTemp.quantidade),
        cor: produtoTemp.cor || null,
        tamanho: produtoTemp.tamanho || null,
        valor_total: produtoSelecionado.preco * parseInt(produtoTemp.quantidade)
      };
      
      setNovaVendaData(prev => ({ 
        ...prev, 
        itens: [...prev.itens, novoItem]
      }));
      
      toast.success('Produto adicionado ao carrinho');
    }
    
    // Limpar produto temporário, mas manter o produto selecionado
    setProdutoTemp(prev => ({
      ...prev,
      quantidade: 1,
      cor: '',
      tamanho: ''
    }));
  };
  
  // Remover item da lista
  const removerItem = (index) => {
    const novosItens = [...novaVendaData.itens];
    novosItens.splice(index, 1);
    setNovaVendaData(prev => ({ ...prev, itens: novosItens }));
  };
  
  // Alterar quantidade de um item na venda
  const alterarQuantidade = async (index, incremento) => {
    const item = novaVendaData.itens[index];
    const novaQuantidade = Math.max(1, item.quantidade + incremento);
    
    // Se estamos aumentando a quantidade, verificar estoque
    if (incremento > 0 && item.cor && item.tamanho) {
      const estoqueDisponivel = await verificarEstoqueDisponivel(
        item.produto_id,
        item.cor,
        item.tamanho,
        novaQuantidade
      );
      
      if (!estoqueDisponivel) {
        toast.error('Estoque insuficiente para esta quantidade');
        return;
      }
    }
    
    // Atualizar a quantidade
    const novosItens = [...novaVendaData.itens];
    novosItens[index].quantidade = novaQuantidade;
    setNovaVendaData(prev => ({ ...prev, itens: novosItens }));
  };
  
  // Enviar formulário de nova venda
  const handleSubmitNovaVenda = async (e) => {
    e.preventDefault();
    
    if (!novaVendaData.cliente_id) {
      toast.error('Selecione um cliente');
      return;
    }
    
    if (novaVendaData.itens.length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }
    
    try {
      setCarregando(true);
      
      // Preparar dados da venda
      const itensJSON = JSON.stringify(novaVendaData.itens.map(item => ({
        produto_id: item.produto_id,
        nome: item.nome,
        quantidade: parseInt(item.quantidade),
        preco: parseFloat(item.preco),
        cor: item.cor || null,
        tamanho: item.tamanho || null,
        valor_total: parseFloat(item.preco) * parseInt(item.quantidade)
      })));
      
      // Usar SQL direto para garantir que a inserção funcione
      const sql = `
        INSERT INTO ${lojaId}_vendas (
          cliente_id, 
          valor_total, 
          metodo_pagamento, 
          status, 
          itens, 
          observacoes, 
          created_at, 
          updated_at
        ) VALUES (
          '${novaVendaData.cliente_id}', 
          ${valorTotal},
          '${novaVendaData.metodo_pagamento}',
          '${novaVendaData.status}',
          '${itensJSON}'::jsonb,
          '${novaVendaData.observacoes || ''}',
          NOW(),
          NOW()
        );
      `;
      
      // Executar SQL diretamente
      const { error: sqlError } = await supabase.rpc('executar_sql', {
        p_sql: sql
      });
      
      if (sqlError) {
        console.error('Erro ao executar SQL para inserir venda:', sqlError);
        throw sqlError;
      }
      
      // Atualizar estoque manualmente para cada item
      for (const item of novaVendaData.itens) {
        try {
          if (item.cor && item.tamanho) {
            // Buscar o registro de estoque para este item específico
            const { data: estoqueData, error: estoqueError } = await supabase
              .from(`${lojaId}_estoque`)
              .select('*')
              .eq('produto_id', item.produto_id)
              .eq('cor', item.cor)
              .eq('tamanho', item.tamanho)
              .single();
            
            if (estoqueError && estoqueError.code !== 'PGRST116') {
              console.error('Erro ao buscar estoque:', estoqueError);
              continue;
            }
            
            if (estoqueData) {
              // Calcular nova quantidade
              const novaQuantidade = Math.max(0, estoqueData.quantidade - item.quantidade);
              
              // Atualizar o estoque
              const { error: updateError } = await supabase
                .from(`${lojaId}_estoque`)
                .update({ quantidade: novaQuantidade })
                .eq('id', estoqueData.id);
              
              if (updateError) {
                console.error('Erro ao atualizar estoque:', updateError);
              }
            }
          }
        } catch (estoqueErr) {
          console.error('Erro ao processar estoque do item:', estoqueErr);
        }
      }
      
      // Verificar e atualizar o tipo do cliente
      try {
        // Verificar o tipo atual do cliente
        const { data: clienteData, error: clienteError } = await supabase
          .from(`${lojaId}_clientes`)
          .select('tipo, total_compras')
          .eq('id', novaVendaData.cliente_id)
          .single();
          
        if (!clienteError && clienteData) {
          // Somente atualizar se o cliente for do tipo 'lead'
          if (clienteData.tipo === 'lead') {
            const { error: updateClienteError } = await supabase
              .from(`${lojaId}_clientes`)
              .update({ 
                tipo: 'cliente',
                ultima_compra: new Date().toISOString(),
                total_compras: parseFloat((clienteData.total_compras || 0) + valorTotal),
                updated_at: new Date().toISOString()
              })
              .eq('id', novaVendaData.cliente_id);
            
            if (updateClienteError) {
              console.error('Erro ao atualizar tipo do cliente:', updateClienteError);
            }
          } else {
            // Atualizar apenas a última compra e o total de compras
            const { error: updateClienteError } = await supabase
              .from(`${lojaId}_clientes`)
              .update({ 
                ultima_compra: new Date().toISOString(),
                total_compras: parseFloat((clienteData.total_compras || 0) + valorTotal),
                updated_at: new Date().toISOString()
              })
              .eq('id', novaVendaData.cliente_id);
            
            if (updateClienteError) {
              console.error('Erro ao atualizar dados do cliente:', updateClienteError);
            }
          }
        }
      } catch (clienteErr) {
        console.error('Erro ao processar atualização do cliente:', clienteErr);
      }
      
      toast.success('Venda registrada com sucesso!');
      fecharModal();
      carregarDados(); // Recarregar dados
      
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      toast.error('Erro ao registrar venda: ' + error.message);
    } finally {
      setCarregando(false);
    }
  };

  // Editar um produto no carrinho
  const editarProdutoNoCarrinho = async (index) => {
    const item = novaVendaData.itens[index];
    const produtoOriginal = produtos.find(p => p.id.toString() === item.produto_id.toString());
    
    setProdutoEditandoTemp({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      cor: item.cor || '',
      tamanho: item.tamanho || '',
      nome: item.nome,
      preco: item.preco
    });
    
    setProdutoEditandoIndex(index);
    
    // Carregar cores e tamanhos do produto
    if (produtoOriginal && produtoOriginal.cores && produtoOriginal.tamanhos) {
      // Se o produto já tem cores e tamanhos na lista atual
      setProdutoSelecionadoDetalhes({
        cores: produtoOriginal.cores || [],
        tamanhos: produtoOriginal.tamanhos || []
      });
    } else {
      // Buscar o produto completo do banco de dados para obter cores e tamanhos
      try {
        const { data: produtoCompleto, error } = await supabase
          .from(`${lojaId}_produtos`)
          .select('*')
          .eq('id', item.produto_id)
          .single();
        
        if (error) throw error;
        
        if (produtoCompleto) {
          setProdutoSelecionadoDetalhes({
            cores: produtoCompleto.cores || [],
            tamanhos: produtoCompleto.tamanhos || []
          });
        } else {
          // Caso não encontre o produto, usar arrays vazios
          setProdutoSelecionadoDetalhes({
            cores: [],
            tamanhos: []
          });
          toast.warning('Detalhes do produto não encontrados');
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do produto:', error);
        setProdutoSelecionadoDetalhes({
          cores: [],
          tamanhos: []
        });
      }
    }
    
    setShowModalEditarProduto(true);
  };

  // Fechar modal de edição de produto
  const fecharModalEditarProduto = () => {
    setShowModalEditarProduto(false);
    setProdutoEditandoIndex(-1);
    setProdutoEditandoTemp({
      produto_id: '',
      quantidade: 1,
      cor: '',
      tamanho: '',
      nome: '',
      preco: 0
    });
  };

  // Manipular mudanças no produto sendo editado
  const handleProdutoEditandoChange = (e) => {
    const { name, value } = e.target;
    setProdutoEditandoTemp(prev => ({ 
      ...prev, 
      [name]: name === 'quantidade' ? parseInt(value) || 1 : value 
    }));
  };

  // Salvar alterações do produto editado
  const salvarEdicaoProduto = async () => {
    if (produtoEditandoIndex === -1) return;
    
    // Verificar estoque disponível para a combinação de cor e tamanho
    if (produtoEditandoTemp.cor && produtoEditandoTemp.tamanho) {
      const estoqueDisponivel = await verificarEstoqueDisponivel(
        produtoEditandoTemp.produto_id,
        produtoEditandoTemp.cor,
        produtoEditandoTemp.tamanho,
        produtoEditandoTemp.quantidade
      );
      
      if (!estoqueDisponivel) {
        toast.error('Estoque insuficiente para esta combinação de cor e tamanho');
        return;
      }
    }
    
    // Atualizar o item na lista
    const novosItens = [...novaVendaData.itens];
    novosItens[produtoEditandoIndex] = {
      ...novosItens[produtoEditandoIndex],
      quantidade: produtoEditandoTemp.quantidade,
      cor: produtoEditandoTemp.cor,
      tamanho: produtoEditandoTemp.tamanho
    };
    
    setNovaVendaData(prev => ({
      ...prev,
      itens: novosItens
    }));
    
    toast.success('Produto atualizado no carrinho');
    fecharModalEditarProduto();
  };

  // Abrir modal de detalhes da venda
  const abrirModalDetalhes = async (vendaId) => {
    try {
      // Buscar dados completos da venda
      const { data: vendaData, error } = await supabase
        .from(`${lojaId}_vendas`)
        .select('*')
        .eq('id', vendaId)
        .single();
      
      if (error) throw error;
      
      if (!vendaData) {
        toast.error('Venda não encontrada');
        return;
      }
      
      // Garantir que o campo itens seja um objeto válido
      let itens = [];
      try {
        if (typeof vendaData.itens === 'string') {
          // Tenta fazer parse se for string
          itens = JSON.parse(vendaData.itens);
        } else {
          // Se já for objeto, usa diretamente
          itens = vendaData.itens;
        }
      } catch (e) {
        console.error('Erro ao processar itens da venda:', e);
        itens = [];
      }
      
      // Atualizar dados da venda com itens processados
      setVendaSelecionada({
        ...vendaData,
        itens: Array.isArray(itens) ? itens : []
      });
      
      // Abrir modal
      setShowModalDetalhes(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes da venda:', error);
      toast.error('Erro ao carregar detalhes da venda: ' + error.message);
    }
  };

  // Fechar modal de detalhes
  const fecharModalDetalhes = () => {
    setShowModalDetalhes(false);
    setVendaSelecionada(null);
  };

  return (
    <LojaLayout title="Vendas" loja={loja} lojaId={lojaId} icon={<FiShoppingBag className="mr-2 text-purple-400" />}>
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8">
          <div className="flex items-center mb-4 md:mb-0">
            <h2 className="text-xl font-semibold">Histórico de Vendas</h2>
            <button
              onClick={abrirModalNovaVenda}
              className="btn btn-primary ml-4 flex items-center"
            >
              <FiPlus className="mr-1" />
              Nova Venda
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filtro de período */}
            <div className="flex space-x-2 bg-gray-800 rounded-lg p-1">
              <button 
                className={`px-3 py-2 text-sm rounded ${periodo === 'hoje' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarPeriodo('hoje')}
              >
                Hoje
              </button>
              <button 
                className={`px-3 py-2 text-sm rounded ${periodo === '7d' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarPeriodo('7d')}
              >
                7 dias
              </button>
              <button 
                className={`px-3 py-2 text-sm rounded ${periodo === '30d' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarPeriodo('30d')}
              >
                30 dias
              </button>
              <button 
                className={`px-3 py-2 text-sm rounded ${periodo === '90d' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarPeriodo('90d')}
              >
                90 dias
              </button>
              <button 
                className={`px-3 py-2 text-sm rounded ${periodo === 'todos' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarPeriodo('todos')}
              >
                Todos
              </button>
            </div>
            
            {/* Filtro de status */}
            <div className="flex space-x-2 bg-gray-800 rounded-lg p-1">
              <button 
                className={`px-3 py-2 text-sm rounded ${filtroStatus === 'todos' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarFiltroStatus('todos')}
              >
                Todos
              </button>
              <button 
                className={`px-3 py-2 text-sm rounded ${filtroStatus === 'Concluída' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarFiltroStatus('Concluída')}
              >
                Concluídas
              </button>
              <button 
                className={`px-3 py-2 text-sm rounded ${filtroStatus === 'Em processamento' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarFiltroStatus('Em processamento')}
              >
                Em processamento
              </button>
            </div>
            
            {/* Botão de exportação */}
            <button 
              className="btn btn-outline flex items-center"
              onClick={exportarCSV}
              disabled={vendas.length === 0}
            >
              <FiDownload className="mr-2" />
              Exportar CSV
            </button>
          </div>
        </div>
        
        {carregando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : vendas.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <FiShoppingBag className="mx-auto text-5xl mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma venda encontrada</h3>
            <p className="text-gray-400 mb-6">
              {filtroStatus !== 'todos' ? 
                `Não há vendas com status "${filtroStatus}" no período selecionado` :
                'Não há vendas registradas para o período selecionado'}
            </p>
            {filtroStatus !== 'todos' && (
              <button 
                className="btn btn-primary inline-flex items-center"
                onClick={() => alterarFiltroStatus('todos')}
              >
                <FiFilter className="mr-1" />
                Ver todas as vendas
              </button>
            )}
            {filtroStatus === 'todos' && periodo === 'todos' && (
              <button 
                className="btn btn-primary inline-flex items-center"
                onClick={criarVendaDemonstracao}
              >
                <FiPlus className="mr-1" />
                Criar dados de demonstração
              </button>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 flex items-center">
              <FiShoppingBag className="text-purple-400 mr-2" />
              <h3 className="text-lg font-semibold">
                Vendas {filtroStatus !== 'todos' ? `(${filtroStatus})` : ''}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Valor</th>
                    <th className="px-4 py-3 text-left">Método</th>
                    <th className="px-4 py-3 text-left">Itens</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map(venda => (
                    <tr key={venda.id} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiCalendar className="text-gray-400 mr-2" size={14} />
                          {formatarData(venda.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FiUser className="text-gray-400 mr-2" size={14} />
                          {venda.cliente_id ? 
                            (clientes[venda.cliente_id] || 'Cliente não encontrado') : 
                            'Venda sem cliente'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FiDollarSign className="text-green-400 mr-2" size={14} />
                          <span className="font-medium">
                            R$ {(venda.valor_total || 0).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {venda.metodo_pagamento || 'Não especificado'}
                      </td>
                      <td className="px-4 py-3">
                        {venda.itens ? venda.itens.length : 0} itens
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          venda.status === 'Concluída' || venda.status === 'Concluida' || venda.status === 'concluída' || venda.status === 'concluida' || 
                          venda.status === 'Finalizada' || venda.status === 'Completa' ? 
                            'bg-green-900 text-green-200' :
                          venda.status === 'Em processamento' || venda.status === 'Processando' || venda.status === 'Pendente' || 
                          venda.status === 'em processamento' || venda.status === 'processando' || venda.status === 'pendente' ? 
                            'bg-blue-900 text-blue-200' :
                          'bg-yellow-900 text-yellow-200'
                        }`}>
                          {venda.status || 'Em processamento'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <button 
                            className="text-blue-400 hover:text-blue-300"
                            onClick={() => abrirModalDetalhes(venda.id)}
                          >
                            <FiEdit2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Resumo de vendas */}
        {!carregando && vendas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="card">
              <div className="flex items-center mb-2">
                <FiDollarSign className="text-primary-400 text-2xl mr-2" />
                <h3 className="font-semibold">Total de Vendas</h3>
              </div>
              <p className="text-3xl font-bold">
                R$ {vendas.reduce((total, venda) => total + (venda.valor_total || 0), 0).toFixed(2).replace('.', ',')}
              </p>
              <p className="text-green-400 text-sm mt-2">
                {vendas.length} {vendas.length === 1 ? 'venda' : 'vendas'} no período
              </p>
            </div>
            
            <div className="card">
              <div className="flex items-center mb-2">
                <FiClock className="text-primary-400 text-2xl mr-2" />
                <h3 className="font-semibold">Ticket Médio</h3>
              </div>
              <p className="text-3xl font-bold">
                R$ {(vendas.reduce((total, venda) => total + (venda.valor_total || 0), 0) / vendas.length).toFixed(2).replace('.', ',')}
              </p>
              <p className="text-blue-400 text-sm mt-2">
                Média de valor por venda
              </p>
            </div>
            
            <div className="card">
              <div className="flex items-center mb-2">
                <FiCheckCircle className="text-primary-400 text-2xl mr-2" />
                <h3 className="font-semibold">Taxa de Conclusão</h3>
              </div>
              <p className="text-3xl font-bold">
                {(vendas.filter(v => {
                  const status = v.status ? v.status.toLowerCase() : '';
                  return status.includes('conclu') || status.includes('finaliz') || status.includes('complet');
                }).length / vendas.length * 100).toFixed(1)}%
              </p>
              <p className="text-purple-400 text-sm mt-2">
                {vendas.filter(v => {
                  const status = v.status ? v.status.toLowerCase() : '';
                  return status.includes('conclu') || status.includes('finaliz') || status.includes('complet');
                }).length} vendas concluídas
              </p>
            </div>
          </div>
        )}
        
        {!carregando && vendas.length > 0 && (
          <div className="mt-8 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Mostrando {vendas.length} vendas no período selecionado
            </div>
            
            <div className="bg-gray-800 p-3 rounded-lg text-sm flex items-center">
              <FiFilter className="mr-2 text-primary-400" />
              <span className="text-gray-300">Dica: Use os filtros acima para visualizar vendas específicas</span>
            </div>
          </div>
        )}
        
        {/* Modal de Nova Venda */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-lg border border-gray-700">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                  <h3 className="text-xl font-semibold text-white">Nova Venda</h3>
                  <button 
                    onClick={fecharModal}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Fechar"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmitNovaVenda} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Cliente</label>
                      <select
                        name="cliente_id"
                        value={novaVendaData.cliente_id}
                        onChange={handleChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione um cliente</option>
                        {Object.entries(clientes).map(([id, nome]) => (
                          <option key={id} value={id}>{nome}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Método de Pagamento</label>
                      <select
                        name="metodo_pagamento"
                        value={novaVendaData.metodo_pagamento}
                        onChange={handleChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="PIX">PIX</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Transferência">Transferência</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Adicionar produtos */}
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Adicionar Produtos</label>
                    <div className="flex flex-col gap-3">
                      <select
                        name="produto_id"
                        value={produtoTemp.produto_id}
                        onChange={handleProdutoTempChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Selecione um produto</option>
                        {produtos.map((produto) => (
                          <option key={produto.id} value={produto.id}>
                            {produto.nome} - R$ {produto.preco.toFixed(2).replace('.', ',')}
                          </option>
                        ))}
                      </select>
                      
                      {produtoTemp.produto_id && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <select
                            name="cor"
                            value={produtoTemp.cor}
                            onChange={handleProdutoTempChange}
                            className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">Selecione a cor</option>
                            {produtoSelecionadoDetalhes.cores.map((cor) => (
                              <option key={cor} value={cor}>{cor}</option>
                            ))}
                          </select>
                          
                          <select
                            name="tamanho"
                            value={produtoTemp.tamanho}
                            onChange={handleProdutoTempChange}
                            className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">Selecione o tamanho</option>
                            {produtoSelecionadoDetalhes.tamanhos.map((tamanho) => (
                              <option key={tamanho} value={tamanho}>{tamanho}</option>
                            ))}
                          </select>
                          
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              name="quantidade"
                              value={produtoTemp.quantidade}
                              onChange={handleProdutoTempChange}
                              min="1"
                              className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="Qtd"
                            />
                            
                            <button
                              type="button"
                              onClick={adicionarProduto}
                              className="whitespace-nowrap bg-blue-700 hover:bg-blue-600 text-white rounded-md py-2 px-3 transition-colors"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Lista de produtos adicionados */}
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Produtos na Venda</label>
                    {novaVendaData.itens.length > 0 ? (
                      <div className="bg-gray-800 border border-gray-700 rounded-md overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-750">
                            <tr className="text-left text-sm">
                              <th className="py-2 px-3">Produto</th>
                              <th className="py-2 px-3">Cor</th>
                              <th className="py-2 px-3">Tamanho</th>
                              <th className="py-2 px-3 text-center">Preço</th>
                              <th className="py-2 px-3 text-center">Qtd</th>
                              <th className="py-2 px-3 text-right">Subtotal</th>
                              <th className="py-2 px-3 w-16"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {novaVendaData.itens.map((item, index) => (
                              <tr key={index} className="text-sm">
                                <td className="py-2 px-3">{item.nome}</td>
                                <td className="py-2 px-3">{item.cor || '-'}</td>
                                <td className="py-2 px-3">{item.tamanho || '-'}</td>
                                <td className="py-2 px-3 text-center">
                                  R$ {item.preco.toFixed(2).replace('.', ',')}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <div className="flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => alterarQuantidade(index, -1)}
                                      className="text-gray-400 hover:text-white p-1"
                                    >
                                      <FiMinus size={14} />
                                    </button>
                                    <span className="mx-2">{item.quantidade}</span>
                                    <button
                                      type="button"
                                      onClick={() => alterarQuantidade(index, 1)}
                                      className="text-gray-400 hover:text-white p-1"
                                    >
                                      <FiPlus size={14} />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right">
                                  R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => editarProdutoNoCarrinho(index)}
                                      className="text-blue-400 hover:text-blue-300 p-1"
                                      title="Editar"
                                    >
                                      <FiEdit2 size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removerItem(index)}
                                      className="text-red-400 hover:text-red-300 p-1"
                                      title="Remover"
                                    >
                                      <FiTrash size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-primary-900/20 font-medium">
                              <td colSpan="5" className="py-2 px-3 text-right">Total:</td>
                              <td className="py-2 px-3 text-right">
                                R$ {valorTotal.toFixed(2).replace('.', ',')}
                              </td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-gray-800 border border-gray-700 rounded-md p-4 text-center text-gray-400">
                        <p>Nenhum produto adicionado à venda</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status da Venda</label>
                    <select
                      name="status"
                      value={novaVendaData.status}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="Concluída">Concluída</option>
                      <option value="Em processamento">Em processamento</option>
                      <option value="Pendente">Pendente</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                    <textarea
                      name="observacoes"
                      value={novaVendaData.observacoes}
                      onChange={handleChange}
                      rows="3"
                      className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Observações adicionais sobre a venda..."
                    ></textarea>
                  </div>
                  
                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-800 mt-4">
                    <button
                      type="button"
                      onClick={fecharModal}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors flex items-center"
                    >
                      <FiSave className="mr-2" /> Registrar Venda
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Editar Produto */}
        {showModalEditarProduto && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg border border-gray-700">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                  <h3 className="text-xl font-semibold text-white">Editar Produto</h3>
                  <button 
                    onClick={fecharModalEditarProduto}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Fechar"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Produto</label>
                    <div className="p-3 bg-gray-800 border border-gray-700 rounded-md">
                      <p className="text-lg font-medium">{produtoEditandoTemp.nome}</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Preço: R$ {produtoEditandoTemp.preco.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Cor</label>
                    <select
                      name="cor"
                      value={produtoEditandoTemp.cor}
                      onChange={handleProdutoEditandoChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Selecione a cor</option>
                      {produtoSelecionadoDetalhes.cores.map((cor) => (
                        <option key={cor} value={cor}>{cor}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tamanho</label>
                    <select
                      name="tamanho"
                      value={produtoEditandoTemp.tamanho}
                      onChange={handleProdutoEditandoChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Selecione o tamanho</option>
                      {produtoSelecionadoDetalhes.tamanhos.map((tamanho) => (
                        <option key={tamanho} value={tamanho}>{tamanho}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade</label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setProdutoEditandoTemp(prev => ({ ...prev, quantidade: Math.max(1, prev.quantidade - 1) }))}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-l-md transition-colors"
                      >
                        <FiMinus size={16} />
                      </button>
                      <input
                        type="number"
                        name="quantidade"
                        value={produtoEditandoTemp.quantidade}
                        onChange={handleProdutoEditandoChange}
                        min="1"
                        className="w-full text-center bg-gray-800 border-y border-gray-700 py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setProdutoEditandoTemp(prev => ({ ...prev, quantidade: prev.quantidade + 1 }))}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-r-md transition-colors"
                      >
                        <FiPlus size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-800 mt-4">
                    <button
                      type="button"
                      onClick={fecharModalEditarProduto}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={salvarEdicaoProduto}
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors flex items-center"
                    >
                      <FiSave className="mr-2" /> Salvar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Detalhes da Venda */}
        {showModalDetalhes && vendaSelecionada && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-lg border border-gray-700">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                  <h3 className="text-xl font-semibold text-white">Detalhes da Venda</h3>
                  <button 
                    onClick={fecharModalDetalhes}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Fechar"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-gray-400 mb-2 text-sm">Informações da Venda</h4>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="mb-3">
                        <p className="text-sm text-gray-400">ID da Venda</p>
                        <p className="font-medium">{vendaSelecionada.id}</p>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm text-gray-400">Data</p>
                        <p className="font-medium">{formatarData(vendaSelecionada.created_at)}</p>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm text-gray-400">Valor Total</p>
                        <p className="font-medium text-green-400">R$ {parseFloat(vendaSelecionada.valor_total).toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm text-gray-400">Método de Pagamento</p>
                        <p className="font-medium">{vendaSelecionada.metodo_pagamento || 'Não informado'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vendaSelecionada.status === 'Concluída' || vendaSelecionada.status === 'Concluida' || 
                          vendaSelecionada.status === 'concluída' || vendaSelecionada.status === 'concluida' || 
                          vendaSelecionada.status === 'Finalizada' || vendaSelecionada.status === 'Completa' ? 
                            'bg-green-900 text-green-200' :
                          vendaSelecionada.status === 'Em processamento' || vendaSelecionada.status === 'Processando' || 
                          vendaSelecionada.status === 'Pendente' || vendaSelecionada.status === 'em processamento' || 
                          vendaSelecionada.status === 'processando' || vendaSelecionada.status === 'pendente' ? 
                            'bg-blue-900 text-blue-200' :
                          'bg-yellow-900 text-yellow-200'
                        }`}>
                          {vendaSelecionada.status || 'Não informado'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-gray-400 mb-2 text-sm">Cliente</h4>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="mb-3 flex items-center">
                        <FiUser className="text-primary-400 mr-2" size={16} />
                        <p className="font-medium">
                          {vendaSelecionada.cliente_id ? 
                            (clientes[vendaSelecionada.cliente_id] || 'Cliente não encontrado') : 
                            'Venda sem cliente'}
                        </p>
                      </div>
                      
                      {vendaSelecionada.observacoes && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-400 mb-1">Observações</p>
                          <p className="text-sm">{vendaSelecionada.observacoes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <h4 className="text-gray-400 mb-2 text-sm">Itens da Venda</h4>
                <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-6">
                  <table className="w-full">
                    <thead className="bg-gray-750">
                      <tr className="text-left text-sm">
                        <th className="py-2 px-3">Produto</th>
                        <th className="py-2 px-3">Cor</th>
                        <th className="py-2 px-3">Tamanho</th>
                        <th className="py-2 px-3 text-center">Preço</th>
                        <th className="py-2 px-3 text-center">Qtd</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {vendaSelecionada.itens.length > 0 ? (
                        vendaSelecionada.itens.map((item, index) => (
                          <tr key={index} className="text-sm">
                            <td className="py-2 px-3">{item.nome}</td>
                            <td className="py-2 px-3">{item.cor || '-'}</td>
                            <td className="py-2 px-3">{item.tamanho || '-'}</td>
                            <td className="py-2 px-3 text-center">
                              R$ {parseFloat(item.preco).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="py-2 px-3 text-center">{item.quantidade}</td>
                            <td className="py-2 px-3 text-right">
                              R$ {(parseFloat(item.preco) * parseInt(item.quantidade)).toFixed(2).replace('.', ',')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-4 px-3 text-center text-gray-400">
                            Nenhum item encontrado para esta venda
                          </td>
                        </tr>
                      )}
                      <tr className="bg-primary-900/20 font-medium">
                        <td colSpan="5" className="py-2 px-3 text-right">Total:</td>
                        <td className="py-2 px-3 text-right">
                          R$ {parseFloat(vendaSelecionada.valor_total).toFixed(2).replace('.', ',')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-800 mt-4">
                  <button
                    type="button"
                    onClick={fecharModalDetalhes}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </LojaLayout>
  );
} 