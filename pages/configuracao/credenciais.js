import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft, FiPlus, FiTrash2, FiEdit2, FiSave, FiKey } from 'react-icons/fi';

export default function Credenciais() {
  const router = useRouter();
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [credenciais, setCredenciais] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [processando, setProcessando] = useState(false);
  
  const [formData, setFormData] = useState({
    loja_id: '',
    servico: '',
    chave: '',
    valor: ''
  });

  // Opções de serviços disponíveis
  const servicosDisponiveis = [
    { valor: 'mercado_pago', nome: 'Mercado Pago' },
    { valor: 'asaas', nome: 'Asaas' },
    { valor: 'whatsapp', nome: 'WhatsApp' },
    { valor: 'evolution_api', nome: 'Evolution API' },
    { valor: 'email', nome: 'E-mail SMTP' },
    { valor: 'custom', nome: 'Personalizado' }
  ];

  // Chaves específicas para cada serviço
  const chavesEspecificas = {
    asaas: [
      { valor: 'api_key', nome: 'API Key', descricao: 'Chave de API para integração com o Asaas' },
      { valor: 'api_key_sandbox', nome: 'API Key Sandbox', descricao: 'Chave de API para ambiente de testes do Asaas' },
      { valor: 'modo_producao', nome: 'Modo Produção', descricao: 'Determina se o ambiente é de produção (true) ou sandbox (false)' }
    ],
    mercado_pago: [
      { valor: 'access_token', nome: 'Access Token', descricao: 'Token de acesso do Mercado Pago' },
      { valor: 'public_key', nome: 'Chave Pública', descricao: 'Chave pública para checkout do Mercado Pago' }
    ],
    whatsapp: [
      { valor: 'api_token', nome: 'Token API', descricao: 'Token para API de WhatsApp' }
    ],
    evolution_api: [
      { valor: 'api_key', nome: 'API Key', descricao: 'Chave da API Evolution' },
      { valor: 'instance_name', nome: 'Nome da Instância', descricao: 'Nome da instância no Evolution API' }
    ],
    email: [
      { valor: 'smtp_host', nome: 'Servidor SMTP', descricao: 'Endereço do servidor SMTP' },
      { valor: 'smtp_port', nome: 'Porta SMTP', descricao: 'Porta do servidor SMTP' },
      { valor: 'smtp_user', nome: 'Usuário SMTP', descricao: 'Usuário para autenticação SMTP' },
      { valor: 'smtp_pass', nome: 'Senha SMTP', descricao: 'Senha para autenticação SMTP' }
    ]
  };

  // Verificar se o Supabase está inicializado
  useEffect(() => {
    if (!loading && !isInitialized) {
      router.push('/configuracao');
    }
  }, [isInitialized, loading, router]);

  // Carregar dados quando o Supabase estiver pronto
  useEffect(() => {
    if (supabase) {
      carregarDados();
    }
  }, [supabase]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      
      // Carregar credenciais
      const { data: credsData, error: credsError } = await supabase
        .from('credenciais_externas')
        .select('*')
        .order('servico', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (credsError) throw credsError;
      setCredenciais(credsData || []);
      
      // Carregar lojas
      const { data: lojasData, error: lojasError } = await supabase
        .from('lojas')
        .select('*')
        .order('nome', { ascending: true });
      
      if (lojasError) throw lojasError;
      setLojas(lojasData || []);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  const resetForm = () => {
    setFormData({
      loja_id: '',
      servico: '',
      chave: '',
      valor: ''
    });
    setEditando(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const abrirModalEditar = (credencial) => {
    setFormData({
      loja_id: credencial.loja_id,
      servico: credencial.servico,
      chave: credencial.chave,
      valor: credencial.valor
    });
    setEditando(credencial.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessando(true);
    
    try {
      if (!formData.loja_id) {
        toast.error('Selecione uma loja');
        return;
      }
      
      if (!formData.servico) {
        toast.error('Selecione um serviço');
        return;
      }
      
      if (!formData.chave) {
        toast.error('Informe a chave da credencial');
        return;
      }
      
      if (!formData.valor) {
        toast.error('Informe o valor da credencial');
        return;
      }
      
      if (editando) {
        // Atualizar credencial existente
        const { error } = await supabase
          .from('credenciais_externas')
          .update(formData)
          .eq('id', editando);
        
        if (error) throw error;
        toast.success('Credencial atualizada com sucesso!');
      } else {
        // Verificar se já existe uma credencial com a mesma chave para o mesmo serviço e loja
        const { data: existente, error: errorCheck } = await supabase
          .from('credenciais_externas')
          .select('id')
          .eq('loja_id', formData.loja_id)
          .eq('servico', formData.servico)
          .eq('chave', formData.chave)
          .maybeSingle();
        
        if (errorCheck) throw errorCheck;
        
        if (existente) {
          toast.error('Já existe uma credencial com esta chave para este serviço e loja');
          return;
        }
        
        // Criar nova credencial
        const { error } = await supabase
          .from('credenciais_externas')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('Credencial criada com sucesso!');
      }
      
      // Recarregar dados e fechar modal
      await carregarDados();
      setShowModal(false);
      resetForm();
      
    } catch (error) {
      console.error('Erro ao salvar credencial:', error);
      toast.error(`Erro ao salvar credencial: ${error.message}`);
    } finally {
      setProcessando(false);
    }
  };

  const excluirCredencial = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta credencial?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('credenciais_externas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Credencial excluída com sucesso!');
      await carregarDados();
      
    } catch (error) {
      console.error('Erro ao excluir credencial:', error);
      toast.error(`Erro ao excluir credencial: ${error.message}`);
    }
  };

  // Função para mostrar apenas parte do valor da credencial (mascarar)
  const mascaraValor = (valor) => {
    if (!valor) return '';
    if (valor.length <= 4) return '****';
    return '****' + valor.substring(valor.length - 4);
  };

  // Renderizar campos específicos para o serviço selecionado
  const renderCamposEspecificos = () => {
    if (!formData.servico || formData.servico === 'custom') return null;
    
    const chaves = chavesEspecificas[formData.servico];
    if (!chaves) return null;
    
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h3 className="text-md font-semibold mb-3">Configurações específicas para {servicosDisponiveis.find(s => s.valor === formData.servico)?.nome}</h3>
        
        {formData.servico === 'asaas' && (
          <div className="mb-4 text-sm text-gray-600">
            <p>Para obter suas credenciais Asaas:</p>
            <ol className="list-decimal pl-5 mt-2">
              <li>Acesse sua conta Asaas</li>
              <li>Vá para Menu &gt; Configurações &gt; Integrações API</li>
              <li>Copie sua chave API de produção e sandbox</li>
            </ol>
          </div>
        )}
        
        {chaves.map((chave) => (
          <div key={chave.valor} className="mb-3">
            <label className="block text-sm font-medium">
              {chave.nome}
              <div className="text-xs text-gray-500">{chave.descricao}</div>
            </label>
            
            {chave.valor === 'modo_producao' ? (
              <div className="mt-1">
                <select
                  name="valor"
                  value={formData.valor}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                >
                  <option value="false">Sandbox (Ambiente de testes)</option>
                  <option value="true">Produção (Ambiente real)</option>
                </select>
              </div>
            ) : (
              <div className="mt-1">
                <input
                  type="text"
                  name="valor"
                  placeholder={`Informe ${chave.nome}`}
                  value={formData.valor}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                />
              </div>
            )}
            
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  chave: chave.valor
                });
              }}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800"
            >
              Usar esta configuração
            </button>
          </div>
        ))}
      </div>
    );
  };

  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Credenciais Externas | Sistema de Gestão</title>
      </Head>
      
      <header className="bg-gray-800 shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/dashboard" className="mr-3 text-gray-300 hover:text-white">
              <FiArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold">Credenciais Externas</h1>
          </div>
          
          <button
            className="btn btn-primary flex items-center"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <FiPlus className="mr-1" />
            Nova Credencial
          </button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-6">Credenciais Configuradas</h2>
          
          {carregando ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : credenciais.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">Nenhuma credencial configurada</p>
              <button
                className="btn btn-primary inline-flex items-center"
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                <FiPlus className="mr-1" />
                Adicionar Credencial
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-2 text-left">Loja</th>
                    <th className="px-4 py-2 text-left">Serviço</th>
                    <th className="px-4 py-2 text-left">Chave</th>
                    <th className="px-4 py-2 text-left">Valor</th>
                    <th className="px-4 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {credenciais.map((credencial) => {
                    const loja = lojas.find(l => l.identificador === credencial.loja_id);
                    const servico = servicosDisponiveis.find(s => s.valor === credencial.servico);
                    
                    return (
                      <tr key={credencial.id} className="border-b border-gray-700">
                        <td className="px-4 py-3">{loja?.nome || credencial.loja_id}</td>
                        <td className="px-4 py-3">{servico?.nome || credencial.servico}</td>
                        <td className="px-4 py-3">{credencial.chave}</td>
                        <td className="px-4 py-3">{mascaraValor(credencial.valor)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => abrirModalEditar(credencial)}
                            className="text-gray-400 hover:text-white mx-1"
                            title="Editar"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => excluirCredencial(credencial.id)}
                            className="text-red-400 hover:text-red-300 mx-1"
                            title="Excluir"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="mt-8">
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">Sobre as Credenciais Externas</h3>
            <p className="text-gray-400 mb-4">
              As credenciais externas são utilizadas para integrar o sistema com serviços de terceiros.
              Configure cada serviço com suas respectivas chaves e tokens para habilitar as funcionalidades relacionadas.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Mercado Pago / Asaas</h4>
                <p className="text-sm text-gray-400">
                  Configure suas chaves de API para processamento de pagamentos.
                </p>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold mb-2">WhatsApp / Evolution API</h4>
                <p className="text-sm text-gray-400">
                  Adicione credenciais para envio de mensagens automáticas.
                </p>
              </div>
            </div>
          </div>
        
          <Link href="/dashboard" className="btn btn-secondary">
            Voltar para o Dashboard
          </Link>
        </div>
      </main>
      
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">
              {editando ? 'Editar Credencial' : 'Nova Credencial'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Loja</label>
                <select
                  name="loja_id"
                  value={formData.loja_id}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                  disabled={editando}
                >
                  <option value="">Selecione uma loja</option>
                  {lojas.map((loja) => (
                    <option key={loja.id} value={loja.id}>
                      {loja.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Serviço</label>
                <select
                  name="servico"
                  value={formData.servico}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                  disabled={editando}
                >
                  <option value="">Selecione um serviço</option>
                  {servicosDisponiveis.map((servico) => (
                    <option key={servico.valor} value={servico.valor}>
                      {servico.nome}
                    </option>
                  ))}
                </select>
              </div>
              
              {renderCamposEspecificos()}

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Chave</label>
                <input
                  type="text"
                  name="chave"
                  value={formData.chave}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                  disabled={editando}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Valor</label>
                <input
                  type="text"
                  name="valor"
                  value={formData.valor}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={processando}
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  className="btn btn-primary flex items-center"
                  disabled={processando}
                >
                  {processando ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FiSave className="mr-1" />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 