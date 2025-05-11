import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft, FiPlus, FiTrash2, FiEdit2, FiSave } from 'react-icons/fi';

export default function Webhooks() {
  const router = useRouter();
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [webhooks, setWebhooks] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [processando, setProcessando] = useState(false);
  
  const [formData, setFormData] = useState({
    loja_id: '',
    nome: '',
    url: '',
    descricao: ''
  });

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
      
      // Carregar webhooks
      const { data: webhooksData, error: webhooksError } = await supabase
        .from('webhooks_n8n')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (webhooksError) throw webhooksError;
      setWebhooks(webhooksData || []);
      
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
      nome: '',
      url: '',
      descricao: ''
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

  const abrirModalEditar = (webhook) => {
    setFormData({
      loja_id: webhook.loja_id,
      nome: webhook.nome,
      url: webhook.url,
      descricao: webhook.descricao || ''
    });
    setEditando(webhook.id);
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
      
      if (!formData.url) {
        toast.error('A URL do webhook é obrigatória');
        return;
      }
      
      // Validar URL
      try {
        new URL(formData.url);
      } catch (e) {
        toast.error('URL inválida');
        return;
      }
      
      if (editando) {
        // Atualizar webhook existente
        const { error } = await supabase
          .from('webhooks_n8n')
          .update(formData)
          .eq('id', editando);
        
        if (error) throw error;
        toast.success('Webhook atualizado com sucesso!');
      } else {
        // Criar novo webhook
        const { error } = await supabase
          .from('webhooks_n8n')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('Webhook criado com sucesso!');
      }
      
      // Recarregar dados e fechar modal
      await carregarDados();
      setShowModal(false);
      resetForm();
      
    } catch (error) {
      console.error('Erro ao salvar webhook:', error);
      toast.error(`Erro ao salvar webhook: ${error.message}`);
    } finally {
      setProcessando(false);
    }
  };

  const excluirWebhook = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este webhook?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('webhooks_n8n')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Webhook excluído com sucesso!');
      await carregarDados();
      
    } catch (error) {
      console.error('Erro ao excluir webhook:', error);
      toast.error(`Erro ao excluir webhook: ${error.message}`);
    }
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
        <title>Webhooks N8N | Sistema de Gestão</title>
      </Head>
      
      <header className="bg-gray-800 shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/dashboard" className="mr-3 text-gray-300 hover:text-white">
              <FiArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold">Webhooks do N8N</h1>
          </div>
          
          <button
            className="btn btn-primary flex items-center"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <FiPlus className="mr-1" />
            Novo Webhook
          </button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-6">Webhooks Configurados</h2>
          
          {carregando ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">Nenhum webhook configurado</p>
              <button
                className="btn btn-primary inline-flex items-center"
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                <FiPlus className="mr-1" />
                Adicionar Webhook
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-2 text-left">Loja</th>
                    <th className="px-4 py-2 text-left">Nome</th>
                    <th className="px-4 py-2 text-left">URL</th>
                    <th className="px-4 py-2 text-left">Descrição</th>
                    <th className="px-4 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((webhook) => {
                    const loja = lojas.find(l => l.identificador === webhook.loja_id);
                    return (
                      <tr key={webhook.id} className="border-b border-gray-700">
                        <td className="px-4 py-3">{loja?.nome || webhook.loja_id}</td>
                        <td className="px-4 py-3">{webhook.nome}</td>
                        <td className="px-4 py-3">
                          <a 
                            href={webhook.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-400 hover:text-primary-300 truncate block max-w-xs"
                          >
                            {webhook.url}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-gray-400">{webhook.descricao || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => abrirModalEditar(webhook)}
                            className="text-gray-400 hover:text-white mx-1"
                            title="Editar"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => excluirWebhook(webhook.id)}
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
        
        <div className="mt-8 flex">
          <Link href="/dashboard" className="btn btn-secondary">
            Voltar para o Dashboard
          </Link>
        </div>
      </main>
      
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editando ? 'Editar Webhook' : 'Novo Webhook'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="label" htmlFor="loja_id">
                  Loja
                </label>
                <select
                  id="loja_id"
                  name="loja_id"
                  className="input"
                  value={formData.loja_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione uma loja</option>
                  {lojas.map((loja) => (
                    <option key={loja.id} value={loja.identificador}>
                      {loja.nome}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="label" htmlFor="nome">
                  Nome do Webhook
                </label>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  className="input"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Ex.: Alerta de Estoque"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="label" htmlFor="url">
                  URL do Webhook
                </label>
                <input
                  id="url"
                  name="url"
                  type="url"
                  className="input"
                  value={formData.url}
                  onChange={handleChange}
                  placeholder="https://n8n.exemplo.com/webhook/..."
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="label" htmlFor="descricao">
                  Descrição
                </label>
                <textarea
                  id="descricao"
                  name="descricao"
                  className="input"
                  value={formData.descricao}
                  onChange={handleChange}
                  placeholder="Para que serve este webhook"
                  rows="3"
                ></textarea>
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