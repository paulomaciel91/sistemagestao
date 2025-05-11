import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import AdminLayout from '@/components/AdminLayout';
import { FiDatabase, FiServer, FiCode, FiSettings, FiSave, FiRefreshCw, FiCheck, FiLink, FiMessageSquare, FiKey } from 'react-icons/fi';

export default function ConfiguracaoBackendLoja() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [tabAtiva, setTabAtiva] = useState('n8n');
  
  // Estado para configurações de API e Integrações
  const [configuracoes, setConfiguracoes] = useState({
    // n8n
    n8n_webhook_url: '',
    n8n_api_url: '',
    n8n_api_key: '',
    // Chatwoot
    chatwoot_url: '',
    chatwoot_api_key: '',
    chatwoot_account_id: '',
    chatwoot_inbox_id: '',
    // Evolution API (WhatsApp)
    evolution_api_url: '',
    evolution_api_key: '',
    evolution_instance_name: '',
    // Webhooks
    webhook_novo_cliente: '',
    webhook_nova_venda: '',
    webhook_estoque_baixo: '',
    // Banco de dados
    supabase_url_loja: '',
    supabase_key_loja: '',
    // Notificações
    email_notificacao: ''
  });

  useEffect(() => {
    if (supabase && lojaId) {
      carregarDados();
    }
  }, [supabase, lojaId]);

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
      
      // Carregar configurações de integrações
      try {
        const { data: configData, error: configError } = await supabase
          .from('credenciais_externas')
          .select('*')
          .eq('loja_id', lojaId);
        
        if (configError) throw configError;
        
        if (configData && configData.length > 0) {
          const novasConfiguracoes = { ...configuracoes };
          
          configData.forEach(item => {
            novasConfiguracoes[item.chave] = item.valor;
          });
          
          setConfiguracoes(novasConfiguracoes);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações de integrações:', error);
        toast.error('Erro ao carregar configurações de integrações');
      }
      
      // Carregar webhooks
      try {
        const { data: webhooksData, error: webhooksError } = await supabase
          .from('webhooks_n8n')
          .select('*')
          .eq('loja_id', lojaId);
        
        if (webhooksError) throw webhooksError;
        
        if (webhooksData && webhooksData.length > 0) {
          const novasConfiguracoes = { ...configuracoes };
          
          webhooksData.forEach(webhook => {
            if (webhook.nome === 'novo_cliente') {
              novasConfiguracoes.webhook_novo_cliente = webhook.url;
            } else if (webhook.nome === 'nova_venda') {
              novasConfiguracoes.webhook_nova_venda = webhook.url;
            } else if (webhook.nome === 'estoque_baixo') {
              novasConfiguracoes.webhook_estoque_baixo = webhook.url;
            }
          });
          
          setConfiguracoes(novasConfiguracoes);
        }
      } catch (error) {
        console.error('Erro ao carregar webhooks:', error);
        toast.error('Erro ao carregar webhooks');
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfiguracoes({
      ...configuracoes,
      [name]: value
    });
  };

  const salvarConfiguracoes = async (e) => {
    e.preventDefault();
    
    try {
      setSalvando(true);
      
      // Salvar configurações na tabela credenciais_externas
      const configsParaSalvar = Object.entries(configuracoes)
        .filter(([chave, valor]) => valor.trim() !== '' && !chave.startsWith('webhook_'));
      
      // Deletar configurações existentes antes de inserir novas
      await supabase
        .from('credenciais_externas')
        .delete()
        .eq('loja_id', lojaId);
      
      // Inserir novas configurações
      if (configsParaSalvar.length > 0) {
        const { error: configError } = await supabase
          .from('credenciais_externas')
          .insert(
            configsParaSalvar.map(([chave, valor]) => ({
              loja_id: lojaId,
              servico: chave.split('_')[0], // Pega a primeira parte da chave como nome do serviço
              chave: chave,
              valor: valor,
              created_at: new Date(),
              updated_at: new Date()
            }))
          );
        
        if (configError) throw configError;
      }
      
      // Salvar webhooks
      const webhooksParaSalvar = [
        { nome: 'novo_cliente', url: configuracoes.webhook_novo_cliente },
        { nome: 'nova_venda', url: configuracoes.webhook_nova_venda },
        { nome: 'estoque_baixo', url: configuracoes.webhook_estoque_baixo }
      ].filter(webhook => webhook.url.trim() !== '');
      
      // Deletar webhooks existentes
      await supabase
        .from('webhooks_n8n')
        .delete()
        .eq('loja_id', lojaId);
      
      // Inserir novos webhooks
      if (webhooksParaSalvar.length > 0) {
        const { error: webhookError } = await supabase
          .from('webhooks_n8n')
          .insert(
            webhooksParaSalvar.map(webhook => ({
              loja_id: lojaId,
              nome: webhook.nome,
              url: webhook.url,
              descricao: `Webhook para ${webhook.nome.replace('_', ' ')}`,
              created_at: new Date()
            }))
          );
        
        if (webhookError) throw webhookError;
      }
      
      toast.success('Configurações de backend salvas com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações de backend');
    } finally {
      setSalvando(false);
    }
  };

  const testarConexao = async (tipo) => {
    try {
      toast.info(`Testando conexão com ${tipo}...`);
      
      let url, headers;
      
      switch (tipo) {
        case 'n8n':
          url = configuracoes.n8n_api_url;
          headers = { 'X-N8N-API-KEY': configuracoes.n8n_api_key };
          break;
        case 'chatwoot':
          url = `${configuracoes.chatwoot_url}/api/v1/accounts/${configuracoes.chatwoot_account_id}/inboxes`;
          headers = { 'api_access_token': configuracoes.chatwoot_api_key };
          break;
        case 'evolution':
          url = configuracoes.evolution_api_url;
          headers = { 'apikey': configuracoes.evolution_api_key };
          break;
        default:
          throw new Error('Tipo de conexão inválido');
      }
      
      if (!url) {
        throw new Error('URL não configurada');
      }
      
      const response = await fetch(url, { headers });
      
      if (response.ok) {
        toast.success(`Conexão com ${tipo} estabelecida com sucesso!`);
      } else {
        throw new Error(`Status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Erro ao testar conexão com ${tipo}:`, error);
      toast.error(`Erro ao testar conexão com ${tipo}: ${error.message}`);
    }
  };

  if (carregando) {
    return (
      <AdminLayout title="Configuração de Backend" icon={<FiServer className="mr-2" />}>
        <div className="flex justify-center items-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Backend: ${loja?.nome || 'Loja'}`} icon={<FiServer className="mr-2" />}>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          <div className="flex flex-wrap text-sm font-medium text-center text-gray-400 border-b border-gray-700">
            <button
              className={`px-4 py-3 ${tabAtiva === 'n8n' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
              onClick={() => setTabAtiva('n8n')}
            >
              <div className="flex items-center">
                <FiCode className="mr-2" />
                n8n & Automações
              </div>
            </button>
            <button
              className={`px-4 py-3 ${tabAtiva === 'chatwoot' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
              onClick={() => setTabAtiva('chatwoot')}
            >
              <div className="flex items-center">
                <FiMessageSquare className="mr-2" />
                Chatwoot & WhatsApp
              </div>
            </button>
            <button
              className={`px-4 py-3 ${tabAtiva === 'webhooks' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
              onClick={() => setTabAtiva('webhooks')}
            >
              <div className="flex items-center">
                <FiLink className="mr-2" />
                Webhooks
              </div>
            </button>
            <button
              className={`px-4 py-3 ${tabAtiva === 'database' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
              onClick={() => setTabAtiva('database')}
            >
              <div className="flex items-center">
                <FiDatabase className="mr-2" />
                Banco de Dados
              </div>
            </button>
          </div>
          
          <form onSubmit={salvarConfiguracoes} className="p-6">
            {/* Configurações do n8n */}
            {tabAtiva === 'n8n' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold flex items-center">
                  <FiCode className="text-primary-500 mr-2" />
                  Configurações do n8n
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label" htmlFor="n8n_api_url">
                      URL da API do n8n
                    </label>
                    <input
                      id="n8n_api_url"
                      name="n8n_api_url"
                      type="url"
                      className="input w-full"
                      value={configuracoes.n8n_api_url}
                      onChange={handleChange}
                      placeholder="https://n8n.seuservidor.com/api/v1"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      URL base para acessar a API do n8n
                    </p>
                  </div>
                  
                  <div>
                    <label className="label" htmlFor="n8n_api_key">
                      Chave de API do n8n
                    </label>
                    <input
                      id="n8n_api_key"
                      name="n8n_api_key"
                      type="password"
                      className="input w-full"
                      value={configuracoes.n8n_api_key}
                      onChange={handleChange}
                      placeholder="sua-chave-de-api-secreta"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Chave para autenticação na API do n8n
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="label" htmlFor="n8n_webhook_url">
                    URL principal do Webhook do n8n
                  </label>
                  <input
                    id="n8n_webhook_url"
                    name="n8n_webhook_url"
                    type="url"
                    className="input w-full"
                    value={configuracoes.n8n_webhook_url}
                    onChange={handleChange}
                    placeholder="https://n8n.seuservidor.com/webhook/abc123"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    URL principal para onde serão enviados os eventos desta loja
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => testarConexao('n8n')}
                  >
                    <FiCheck className="mr-2" />
                    Testar Conexão
                  </button>
                </div>
              </div>
            )}
            
            {/* Configurações do Chatwoot e WhatsApp */}
            {tabAtiva === 'chatwoot' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold flex items-center">
                  <FiMessageSquare className="text-primary-500 mr-2" />
                  Chatwoot e Evolution API (WhatsApp)
                </h2>
                
                {/* Chatwoot */}
                <div className="card border border-gray-700 p-4">
                  <h3 className="text-md font-medium mb-4">Chatwoot</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="label" htmlFor="chatwoot_url">
                        URL do Chatwoot
                      </label>
                      <input
                        id="chatwoot_url"
                        name="chatwoot_url"
                        type="url"
                        className="input w-full"
                        value={configuracoes.chatwoot_url}
                        onChange={handleChange}
                        placeholder="https://chatwoot.seuservidor.com"
                      />
                    </div>
                    
                    <div>
                      <label className="label" htmlFor="chatwoot_api_key">
                        Chave de API do Chatwoot
                      </label>
                      <input
                        id="chatwoot_api_key"
                        name="chatwoot_api_key"
                        type="password"
                        className="input w-full"
                        value={configuracoes.chatwoot_api_key}
                        onChange={handleChange}
                        placeholder="sua-chave-de-api-chatwoot"
                      />
                    </div>
                    
                    <div>
                      <label className="label" htmlFor="chatwoot_account_id">
                        ID da Conta no Chatwoot
                      </label>
                      <input
                        id="chatwoot_account_id"
                        name="chatwoot_account_id"
                        type="text"
                        className="input w-full"
                        value={configuracoes.chatwoot_account_id}
                        onChange={handleChange}
                        placeholder="1"
                      />
                    </div>
                    
                    <div>
                      <label className="label" htmlFor="chatwoot_inbox_id">
                        ID da Caixa de Entrada
                      </label>
                      <input
                        id="chatwoot_inbox_id"
                        name="chatwoot_inbox_id"
                        type="text"
                        className="input w-full"
                        value={configuracoes.chatwoot_inbox_id}
                        onChange={handleChange}
                        placeholder="1"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => testarConexao('chatwoot')}
                    >
                      <FiCheck className="mr-2" />
                      Testar Chatwoot
                    </button>
                  </div>
                </div>
                
                {/* Evolution API (WhatsApp) */}
                <div className="card border border-gray-700 p-4">
                  <h3 className="text-md font-medium mb-4">Evolution API (WhatsApp)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="label" htmlFor="evolution_api_url">
                        URL da Evolution API
                      </label>
                      <input
                        id="evolution_api_url"
                        name="evolution_api_url"
                        type="url"
                        className="input w-full"
                        value={configuracoes.evolution_api_url}
                        onChange={handleChange}
                        placeholder="https://evolution-api.seuservidor.com"
                      />
                    </div>
                    
                    <div>
                      <label className="label" htmlFor="evolution_api_key">
                        Chave da Evolution API
                      </label>
                      <input
                        id="evolution_api_key"
                        name="evolution_api_key"
                        type="password"
                        className="input w-full"
                        value={configuracoes.evolution_api_key}
                        onChange={handleChange}
                        placeholder="sua-chave-evolution-api"
                      />
                    </div>
                    
                    <div>
                      <label className="label" htmlFor="evolution_instance_name">
                        Nome da Instância
                      </label>
                      <input
                        id="evolution_instance_name"
                        name="evolution_instance_name"
                        type="text"
                        className="input w-full"
                        value={configuracoes.evolution_instance_name}
                        onChange={handleChange}
                        placeholder="loja1"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Nome da instância no servidor Evolution API
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => testarConexao('evolution')}
                    >
                      <FiCheck className="mr-2" />
                      Testar WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Webhooks */}
            {tabAtiva === 'webhooks' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold flex items-center">
                  <FiLink className="text-primary-500 mr-2" />
                  Webhooks
                </h2>
                
                <p className="text-gray-400 mb-4">
                  Configure webhooks para eventos específicos desta loja. Estes endpoints serão chamados pelo sistema quando ocorrerem ações.
                </p>
                
                <div>
                  <label className="label" htmlFor="webhook_novo_cliente">
                    Webhook para Novo Cliente
                  </label>
                  <input
                    id="webhook_novo_cliente"
                    name="webhook_novo_cliente"
                    type="url"
                    className="input w-full"
                    value={configuracoes.webhook_novo_cliente}
                    onChange={handleChange}
                    placeholder="https://n8n.seuservidor.com/webhook/novo-cliente"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Disparado quando um novo cliente é cadastrado
                  </p>
                </div>
                
                <div>
                  <label className="label" htmlFor="webhook_nova_venda">
                    Webhook para Nova Venda
                  </label>
                  <input
                    id="webhook_nova_venda"
                    name="webhook_nova_venda"
                    type="url"
                    className="input w-full"
                    value={configuracoes.webhook_nova_venda}
                    onChange={handleChange}
                    placeholder="https://n8n.seuservidor.com/webhook/nova-venda"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Disparado quando uma nova venda é realizada
                  </p>
                </div>
                
                <div>
                  <label className="label" htmlFor="webhook_estoque_baixo">
                    Webhook para Estoque Baixo
                  </label>
                  <input
                    id="webhook_estoque_baixo"
                    name="webhook_estoque_baixo"
                    type="url"
                    className="input w-full"
                    value={configuracoes.webhook_estoque_baixo}
                    onChange={handleChange}
                    placeholder="https://n8n.seuservidor.com/webhook/estoque-baixo"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Disparado quando um produto atinge o estoque mínimo
                  </p>
                </div>
              </div>
            )}
            
            {/* Configurações de Banco de Dados */}
            {tabAtiva === 'database' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold flex items-center">
                  <FiDatabase className="text-primary-500 mr-2" />
                  Banco de Dados da Loja
                </h2>
                
                <div className="bg-yellow-900 bg-opacity-20 border border-yellow-800 rounded-md p-4 mb-4">
                  <p className="text-yellow-300 text-sm">
                    <strong>Atenção:</strong> Estas são configurações avançadas e geralmente não devem ser alteradas.
                    Apenas modifique se souber o que está fazendo.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label" htmlFor="supabase_url_loja">
                      URL do Supabase (Loja)
                    </label>
                    <input
                      id="supabase_url_loja"
                      name="supabase_url_loja"
                      type="url"
                      className="input w-full"
                      value={configuracoes.supabase_url_loja}
                      onChange={handleChange}
                      placeholder="https://abcdefghijklm.supabase.co"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      URL do projeto Supabase específico para esta loja (se diferente do principal)
                    </p>
                  </div>
                  
                  <div>
                    <label className="label" htmlFor="supabase_key_loja">
                      Chave do Supabase (Loja)
                    </label>
                    <input
                      id="supabase_key_loja"
                      name="supabase_key_loja"
                      type="password"
                      className="input w-full"
                      value={configuracoes.supabase_key_loja}
                      onChange={handleChange}
                      placeholder="sua-chave-supabase-loja"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Chave de API do projeto Supabase específico para esta loja
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="label" htmlFor="email_notificacao">
                    Email para Notificações Técnicas
                  </label>
                  <input
                    id="email_notificacao"
                    name="email_notificacao"
                    type="email"
                    className="input w-full"
                    value={configuracoes.email_notificacao}
                    onChange={handleChange}
                    placeholder="admin@exemplo.com"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Email para receber alertas técnicos (erros, problemas de conexão, etc.)
                  </p>
                </div>
              </div>
            )}
            
            {/* Botão de salvar (sempre visível) */}
            <div className="mt-8 pt-4 border-t border-gray-700 flex justify-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <FiRefreshCw className="animate-spin mr-2" />
                    Salvando configurações...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" />
                    Salvar Configurações de Backend
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
} 