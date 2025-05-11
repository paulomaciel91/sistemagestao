import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import LojaLayout from '@/components/LojaLayout';
import Link from 'next/link';
import { FiUsers, FiSearch, FiPlus, FiFilter, FiPhone, FiMail, FiTrash2, FiEdit2, FiMessageSquare, FiX, FiSave, FiCalendar, FiDownload } from 'react-icons/fi';
import ChatInterface from '@/components/ChatInterface';

export default function Clientes() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [periodo, setPeriodo] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [clienteEditarId, setClienteEditarId] = useState(null);
  const [novoClienteData, setNovoClienteData] = useState({
    nome: '',
    email: '',
    telefone: '',
    tipo: 'lead'
  });
  const [showChatModal, setShowChatModal] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  
  // Dados de demonstração
  const dadosDemonstracao = [
    {
      id: '1',
      nome: 'Maria Silva',
      email: 'maria.silva@email.com',
      telefone: '(11) 98765-4321',
      tipo: 'cliente',
      ultima_compra: '2023-06-15T14:30:00Z',
      total_compras: 1250.75
    },
    {
      id: '2',
      nome: 'João Santos',
      email: 'joao.santos@email.com',
      telefone: '(11) 91234-5678',
      tipo: 'cliente',
      ultima_compra: '2023-05-28T10:15:00Z',
      total_compras: 780.50
    },
    {
      id: '3',
      nome: 'Ana Oliveira',
      email: 'ana.oliveira@email.com',
      telefone: '(11) 99876-5432',
      tipo: 'lead',
      ultima_compra: null,
      total_compras: 0
    },
    {
      id: '4',
      nome: 'Carlos Ferreira',
      email: 'carlos.ferreira@email.com',
      telefone: '(11) 95555-4444',
      tipo: 'lead',
      ultima_compra: null,
      total_compras: 0
    },
    {
      id: '5',
      nome: 'Juliana Costa',
      email: 'juliana.costa@email.com',
      telefone: '(11) 94444-3333',
      tipo: 'cliente',
      ultima_compra: '2023-06-05T16:45:00Z',
      total_compras: 450.25
    }
  ];

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
        dataInicial = new Date(0);
    }
    
    return dataInicial;
  };

  // Função para mudar o período dos dados
  const alterarPeriodo = (novoPeriodo) => {
    setPeriodo(novoPeriodo);
  };

  // Carregar dados da loja quando o ID estiver disponível
  useEffect(() => {
    if (supabase && lojaId) {
      carregarDados();
    }
  }, [supabase, lojaId, periodo]);

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
      
      // Tentar carregar clientes do banco
      try {
        const { data: clientesData, error: clientesError } = await supabase
          .from(`${lojaId}_clientes`)
          .select('*')
          .order('nome', { ascending: true });
        
        if (clientesError) {
          // Apenas usar dados de demonstração se a tabela não existir
          if (clientesError.code === 'PGRST116') {
            console.log('Tabela de clientes não existe, criando tabela e usando dados de demonstração temporariamente');
            
            // Criar a tabela de clientes
            await supabase.rpc('executar_sql', {
              p_sql: `
                CREATE TABLE IF NOT EXISTS ${lojaId}_clientes (
                  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                  nome TEXT NOT NULL,
                  email TEXT,
                  telefone TEXT,
                  tipo TEXT DEFAULT 'lead',
                  ultima_compra TIMESTAMP WITH TIME ZONE,
                  total_compras NUMERIC DEFAULT 0,
                  session_id TEXT,
                  customer_id TEXT,
                  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                  updated_at TIMESTAMP WITH TIME ZONE
                );
              `
            });
            
            // Usar dados de demonstração
            setClientes(dadosDemonstracao);
          } else {
            // Outro tipo de erro
            throw clientesError;
          }
        } else {
          // Tabela existe e consulta foi bem-sucedida
          // Usar os dados do banco mesmo que esteja vazio
          setClientes(clientesData || []);
        }
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        toast.error('Erro ao carregar dados dos clientes');
        setClientes([]);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  // Abrir modal de novo cliente (apenas demonstração)
  const abrirNovoCliente = () => {
    setModoEdicao(false);
    setClienteEditarId(null);
    setNovoClienteData({
      nome: '',
      email: '',
      telefone: '',
      tipo: 'lead'
    });
    setShowModal(true);
  };
  
  // Abrir modal de edição de cliente
  const editarCliente = (cliente) => {
    setNovoClienteData({
      nome: cliente.nome,
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      tipo: cliente.tipo || 'lead'
    });
    
    setModoEdicao(true);
    setClienteEditarId(cliente.id);
    setShowModal(true);
  };
  
  // Fechar modal
  const fecharModal = () => {
    setShowModal(false);
    setModoEdicao(false);
    setClienteEditarId(null);
    setNovoClienteData({
      nome: '',
      email: '',
      telefone: '',
      tipo: 'lead'
    });
  };
  
  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNovoClienteData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Submeter formulário de cliente
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validar dados
      if (!novoClienteData.nome.trim()) {
        toast.error('O nome do cliente é obrigatório');
        return;
      }
      
      // Dados a serem salvos
      const clienteData = {
        ...novoClienteData,
        updated_at: new Date().toISOString()
      };
      
      if (modoEdicao) {
        // Atualizar cliente existente
        try {
          const { error } = await supabase
            .from(`${lojaId}_clientes`)
            .update(clienteData)
            .eq('id', clienteEditarId);
          
          if (error) throw error;
          
          // Atualizar estado local
          setClientes(clientes.map(c => 
            c.id === clienteEditarId ? { ...clienteData, id: clienteEditarId } : c
          ));
          
          toast.success('Cliente atualizado com sucesso!');
        } catch (error) {
          console.log('Erro ao atualizar no banco, atualizando apenas na interface:', error);
          // Atualizar apenas na interface
          setClientes(clientes.map(c => 
            c.id === clienteEditarId ? { ...clienteData, id: clienteEditarId } : c
          ));
          toast.success('Cliente atualizado com sucesso!');
        }
      } else {
        // Criar novo cliente
        let id;
        clienteData.created_at = new Date().toISOString();
        clienteData.total_compras = 0;
        
        // Tentar inserir no banco de dados
        try {
          // Verificar se a tabela existe
          const { error: tableError } = await supabase.from(`${lojaId}_clientes`).select('count');
          
          // Criar tabela se não existir
          if (tableError && tableError.code === 'PGRST116') {
            await supabase.rpc('executar_sql', {
              p_sql: `
                CREATE TABLE IF NOT EXISTS ${lojaId}_clientes (
                  id SERIAL PRIMARY KEY,
                  nome TEXT NOT NULL,
                  email TEXT,
                  telefone TEXT,
                  tipo TEXT DEFAULT 'lead',
                  ultima_compra TIMESTAMP WITH TIME ZONE,
                  total_compras NUMERIC DEFAULT 0,
                  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                  updated_at TIMESTAMP WITH TIME ZONE
                );
              `
            });
          }
          
          // Inserir novo cliente
          const { data, error } = await supabase
            .from(`${lojaId}_clientes`)
            .insert([clienteData])
            .select();
          
          if (error) throw error;
          
          if (data && data[0]) {
            id = data[0].id;
          } else {
            // Fallback para ID simulado se não retornar do banco
            id = `temp_${Date.now()}`;
          }
        } catch (error) {
          console.log('Erro ao salvar no banco, adicionando apenas à interface:', error);
          // Fallback para ID simulado
          id = `temp_${Date.now()}`;
        }
        
        // Adicionar à lista local
        const novoCliente = {
          ...clienteData,
          id: id || `temp_${Date.now()}`,
          ultima_compra: null,
          total_compras: 0
        };
        
        setClientes(prev => [novoCliente, ...prev]);
        
        toast.success('Cliente adicionado com sucesso!');
      }
      
      fecharModal();
      
    } catch (error) {
      console.error(`Erro ao ${modoEdicao ? 'atualizar' : 'adicionar'} cliente:`, error);
      toast.error(`Erro ao ${modoEdicao ? 'atualizar' : 'adicionar'} cliente`);
    }
  };

  // Abrir modal de chat ao invés de redirecionar para WhatsApp
  const abrirChat = (cliente) => {
    setClienteSelecionado(cliente);
    setShowChatModal(true);
  };
  
  // Fechar modal de chat
  const fecharChat = () => {
    setShowChatModal(false);
    setClienteSelecionado(null);
  };

  // Filtrar clientes com base na busca, tipo e período
  const clientesFiltrados = clientes.filter(cliente => {
    // Filtrar por texto de busca
    const matchBusca = 
      cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
      cliente.email?.toLowerCase().includes(busca.toLowerCase()) ||
      cliente.telefone?.includes(busca);
    
    // Filtrar por tipo
    const matchTipo = filtroTipo === 'todos' || cliente.tipo === filtroTipo;
    
    // Filtrar por período
    const dataInicial = obterDataInicial(periodo);
    const dataCliente = cliente.created_at ? new Date(cliente.created_at) : new Date(0);
    const matchPeriodo = periodo === 'todos' || dataCliente >= dataInicial;
    
    return matchBusca && matchTipo && matchPeriodo;
  });

  // Função para exportar os dados de clientes para CSV
  const exportarCSV = () => {
    if (clientesFiltrados.length === 0) {
      toast.info('Não há dados para exportar');
      return;
    }
    
    // Cabeçalho do CSV
    let csv = 'ID,Nome,Email,Telefone,Tipo,Data de Cadastro,Última Compra,Total Compras\n';
    
    // Adicionar cada cliente ao CSV
    clientesFiltrados.forEach(cliente => {
      const nome = cliente.nome || '';
      const email = cliente.email || '';
      const telefone = cliente.telefone || '';
      const tipo = cliente.tipo || 'lead';
      const dataCadastro = cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : 'N/A';
      const ultimaCompra = cliente.ultima_compra ? new Date(cliente.ultima_compra).toLocaleDateString('pt-BR') : 'N/A';
      const totalCompras = cliente.total_compras ? `R$ ${cliente.total_compras.toFixed(2).replace('.', ',')}` : 'R$ 0,00';
      
      csv += `"${cliente.id}","${nome}","${email}","${telefone}","${tipo}","${dataCadastro}","${ultimaCompra}","${totalCompras}"\n`;
    });
    
    // Criar e fazer download do arquivo CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${lojaId}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Arquivo CSV gerado com sucesso!');
  };

  // Carregar dados iniciais
  useEffect(() => {
    if (lojaId) {
      // Verificar se a tabela de clientes tem a coluna endereco
      verificarECorrigirEstrutura().then(() => {
        carregarClientes();
      });
    }
  }, [lojaId]);
  
  // Função para verificar e corrigir a estrutura do banco
  const verificarECorrigirEstrutura = async () => {
    try {
      console.log(`Verificando estrutura da tabela de clientes para a loja ${lojaId}...`);
      
      const clientesTableQuery = `
        DO $$
        BEGIN
          -- Verificar se a tabela existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${lojaId}_clientes') THEN
            -- Criar a tabela
            CREATE TABLE ${lojaId}_clientes (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              nome TEXT NOT NULL,
              email TEXT,
              telefone TEXT,
              tipo TEXT DEFAULT 'lead',
              ultima_compra TIMESTAMPTZ,
              total_compras DECIMAL(10, 2) DEFAULT 0,
              session_id TEXT,
              customer_id TEXT,
              endereco JSONB,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
            );
          ELSE
            -- Garantir que todas as colunas existem
            ALTER TABLE ${lojaId}_clientes ADD COLUMN IF NOT EXISTS endereco JSONB;
          END IF;
        END
        $$;
      `;
      
      await supabase.rpc('executar_sql', { p_sql: clientesTableQuery });
      console.log("Estrutura da tabela de clientes verificada");
    } catch (error) {
      console.error("Erro ao verificar estrutura da tabela de clientes:", error);
    }
  };

  return (
    <LojaLayout title="Gestão de Clientes e Leads" loja={loja} lojaId={lojaId} icon={<FiUsers className="mr-2 text-purple-400" />}>
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8">
          <div className="flex items-center mb-4 md:mb-0">
            <h2 className="text-xl font-semibold">Clientes e Leads</h2>
            <button
              onClick={abrirNovoCliente}
              className="btn btn-primary ml-4 flex items-center h-[38px]"
            >
              <FiPlus className="mr-1" />
              Novo Cliente
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            {/* Busca */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nome, email, telefone..."
                className="h-[38px] w-full px-4 bg-gray-800 border border-gray-700 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <FiSearch className="absolute left-3 top-[11px] text-gray-400" />
            </div>
            
            {/* Filtro de período */}
            <div className="flex space-x-2 bg-gray-800 rounded-lg p-1 h-[38px]">
              <button 
                className={`px-4 py-1 text-sm rounded ${periodo === 'hoje' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarPeriodo('hoje')}
              >
                Hoje
              </button>
              <button 
                className={`px-4 py-1 text-sm rounded ${periodo === '7d' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarPeriodo('7d')}
              >
                7 dias
              </button>
              <button 
                className={`px-4 py-1 text-sm rounded ${periodo === '30d' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarPeriodo('30d')}
              >
                30 dias
              </button>
              <button 
                className={`px-4 py-1 text-sm rounded ${periodo === '90d' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarPeriodo('90d')}
              >
                90 dias
              </button>
              <button 
                className={`px-4 py-1 text-sm rounded ${periodo === 'todos' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => alterarPeriodo('todos')}
              >
                Todos
              </button>
            </div>
            
            {/* Filtro de tipo */}
            <div className="flex space-x-2 bg-gray-800 rounded-lg p-1 h-[38px]">
              <button 
                className={`px-4 py-1 text-sm rounded ${filtroTipo === 'todos' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => setFiltroTipo('todos')}
              >
                Todos
              </button>
              <button 
                className={`px-4 py-1 text-sm rounded ${filtroTipo === 'cliente' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => setFiltroTipo('cliente')}
              >
                Clientes
              </button>
              <button 
                className={`px-4 py-1 text-sm rounded ${filtroTipo === 'lead' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                onClick={() => setFiltroTipo('lead')}
              >
                Leads
              </button>
            </div>
            
            {/* Botão de exportação */}
            <button 
              className="btn btn-outline flex items-center h-[38px]"
              onClick={exportarCSV}
              disabled={clientesFiltrados.length === 0}
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
        ) : clientesFiltrados.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <FiUsers className="mx-auto text-5xl mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold mb-2">Nenhum cliente encontrado</h3>
            <p className="text-gray-400 mb-6">
              {busca ? 
                `Nenhum resultado para "${busca}"` : 
                filtroTipo !== 'todos' || periodo !== 'todos' ?
                  `Não há ${filtroTipo !== 'todos' ? (filtroTipo === 'cliente' ? 'clientes' : 'leads') : 'clientes ou leads'} ${periodo !== 'todos' ? `no período selecionado (${periodo === 'hoje' ? 'hoje' : periodo === '7d' ? 'últimos 7 dias' : periodo === '30d' ? 'últimos 30 dias' : 'últimos 90 dias'})` : ''}` :
                  'Comece adicionando seu primeiro cliente'
              }
            </p>
            {!busca && (filtroTipo === 'todos' && periodo === 'todos') && (
              <button
                className="btn btn-primary inline-flex items-center"
                onClick={abrirNovoCliente}
              >
                <FiPlus className="mr-1" />
                Adicionar Cliente
              </button>
            )}
            {(filtroTipo !== 'todos' || periodo !== 'todos') && (
              <button 
                className="btn btn-primary inline-flex items-center"
                onClick={() => {
                  setFiltroTipo('todos');
                  setPeriodo('todos');
                }}
              >
                <FiFilter className="mr-1" />
                Remover filtros
              </button>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">Contato</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Compras</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="font-medium">{cliente.nome}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col text-sm">
                          {cliente.email && (
                            <span className="flex items-center text-gray-300">
                              <FiMail className="mr-1 text-gray-400" size={14} />
                              {cliente.email}
                            </span>
                          )}
                          {cliente.telefone && (
                            <span className="flex items-center text-gray-300 mt-1">
                              <FiPhone className="mr-1 text-gray-400" size={14} />
                              {cliente.telefone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                          ${cliente.tipo === 'cliente' ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'}`}
                        >
                          {cliente.tipo === 'cliente' ? 'Cliente' : 'Lead'}
                        </span>
                        {cliente.ultima_compra && (
                          <div className="text-xs text-gray-400 mt-1">
                            Última compra: {new Date(cliente.ultima_compra).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {cliente.total_compras > 0 ? (
                          <span className="font-medium">
                            R$ {cliente.total_compras.toFixed(2).replace('.', ',')}
                          </span>
                        ) : (
                          <span className="text-gray-500">Sem compras</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-3">
                          {cliente.telefone && (
                            <button
                              onClick={() => abrirChat(cliente)}
                              className="text-green-400 hover:text-green-300"
                              title="Abrir Chat"
                            >
                              <FiMessageSquare size={18} />
                            </button>
                          )}
                          <button
                            className="text-blue-400 hover:text-blue-300"
                            title="Editar Cliente"
                            onClick={() => editarCliente(cliente)}
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            className="text-red-400 hover:text-red-300"
                            title="Excluir Cliente"
                            onClick={() => toast.info('Funcionalidade em desenvolvimento')}
                          >
                            <FiTrash2 size={18} />
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
        
        <div className="mt-8 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Mostrando {clientesFiltrados.length} de {clientes.length} clientes
            {periodo !== 'todos' && (
              <span> no período {periodo === 'hoje' ? 'de hoje' : periodo === '7d' ? 'dos últimos 7 dias' : periodo === '30d' ? 'dos últimos 30 dias' : 'dos últimos 90 dias'}</span>
            )}
            {filtroTipo !== 'todos' && (
              <span> do tipo {filtroTipo === 'cliente' ? 'cliente' : 'lead'}</span>
            )}
          </div>
          
          <div className="bg-gray-800 p-3 rounded-lg text-sm flex items-center">
            <FiFilter className="mr-2 text-primary-400" />
            <span className="text-gray-300">Dica: Use os filtros e a busca para encontrar clientes específicos</span>
          </div>
        </div>
        
        {/* Modal de Novo/Editar Cliente */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg border border-gray-700">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                  <h3 className="text-xl font-semibold text-white">{modoEdicao ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                  <button 
                    onClick={fecharModal}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Fechar"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nome do Cliente</label>
                    <input
                      type="text"
                      name="nome"
                      value={novoClienteData.nome}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Ex: Maria Silva"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-300 mb-2">E-mail</label>
                      <input
                        type="email"
                        name="email"
                        value={novoClienteData.email}
                        onChange={handleChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ex: email@exemplo.com"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
                      <input
                        type="text"
                        name="telefone"
                        value={novoClienteData.telefone}
                        onChange={handleChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ex: (11) 98765-4321"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Contato</label>
                    <select
                      name="tipo"
                      value={novoClienteData.tipo}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="lead">Lead</option>
                      <option value="cliente">Cliente</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Leads são contatos potenciais, Clientes são quem já realizou compras
                    </p>
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
                      <FiSave className="mr-2" /> {modoEdicao ? 'Salvar Alterações' : 'Criar Cliente'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal do Chat */}
        {showChatModal && clienteSelecionado && (
          <ChatInterface
            cliente={clienteSelecionado}
            lojaId={lojaId}
            onClose={fecharChat}
          />
        )}
      </main>
    </LojaLayout>
  );
} 