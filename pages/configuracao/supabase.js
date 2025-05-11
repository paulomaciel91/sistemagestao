import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiRefreshCw, FiDatabase, FiServer, FiKey } from 'react-icons/fi';
import AdminLayout from '@/components/AdminLayout';

export default function ConfiguracaoSupabase() {
  const router = useRouter();
  const { supabase, credentials, initializeSupabase, isInitialized, loading } = useSupabase();
  
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [testando, setTestando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [tabAtiva, setTabAtiva] = useState('credenciais');

  // Carregar credenciais existentes
  useEffect(() => {
    if (credentials) {
      setSupabaseUrl(credentials.supabaseUrl || '');
      // Não exibimos a chave atual por segurança
      setSupabaseKey('');
    }
  }, [credentials]);

  // Verificar conexão com o Supabase
  const verificarConexao = async (client) => {
    try {
      // Tentar acessar tabela existente
      const { error: tableError } = await client.from('lojas').select('count').limit(1);
      
      // PGRST116 geralmente significa que a tabela não existe, o que é esperado na primeira execução
      if (!tableError || tableError.code === 'PGRST116') {
        return { success: true };
      }
      
      // Se não conseguir verificar usando a tabela lojas, tentar um método mais básico
      try {
        // Verificar a conexão fazendo uma consulta ao sistema do Supabase
        const { error: authError } = await client.auth.getSession();
        if (!authError) {
          return { success: true };
        }
        
        // Tentar com health check
        const { data, error: healthError } = await client.rpc('get_service_role');
        if (!healthError) {
          return { success: true };
        }
        
        // Se nenhum dos métodos funcionou, tentar com uma consulta básica
        return { 
          success: false, 
          error: `Erro de acesso ao banco: Verifique se a URL e a chave estão corretas e se a chave tem permissões suficientes.` 
        };
      } catch (verificationError) {
        // Mesmo com erro, pode ser que a conexão esteja funcionando, apenas não temos as permissões corretas
        console.log('Aviso: Erro na verificação secundária, mas a conexão parece existir:', verificationError);
        return { success: true, warning: true };
      }
    } catch (error) {
      console.error('Erro durante verificação de conexão:', error);
      return { 
        success: false, 
        error: `Não foi possível estabelecer conexão: ${error.message}` 
      };
    }
  };

  const testarConexao = async () => {
    // Verificar se temos pelo menos a URL
    if (!supabaseUrl) {
      toast.error('A URL do Supabase é obrigatória');
      return;
    }
    
    // Se não tiver chave e não tivermos credenciais existentes, exigir a chave
    const chaveParaUsar = supabaseKey || (credentials?.supabaseKey || '');
    if (!chaveParaUsar) {
      toast.error('A chave do Supabase é obrigatória');
      return;
    }
    
    setTestando(true);
    setErro(null);
    
    try {
      // Não salvamos ainda, apenas testamos
      const client = createClient(supabaseUrl, chaveParaUsar, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      
      const conexao = await verificarConexao(client);
      
      if (conexao.success) {
        if (conexao.warning) {
          toast.warning('Conexão estabelecida, mas com permissões limitadas. Algumas funcionalidades podem não funcionar corretamente.');
        } else {
          toast.success('Conexão com o Supabase testada com sucesso!');
        }
      } else {
        setErro(conexao.error || 'Erro de conexão com o Supabase');
        toast.error(`Falha no teste de conexão: ${conexao.error}`);
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setErro(error.message);
      toast.error(`Erro ao testar conexão: ${error.message}`);
    } finally {
      setTestando(false);
    }
  };

  const salvarConfiguracao = async (e) => {
    e.preventDefault();
    
    if (!supabaseUrl) {
      toast.error('A URL do Supabase é obrigatória');
      return;
    }
    
    if (!supabaseUrl.startsWith('https://')) {
      toast.error('URL do Supabase deve começar com https://');
      return;
    }
    
    // Se a chave estiver vazia e já tivermos credenciais, usar a chave existente
    const chaveParaUsar = supabaseKey || (credentials?.supabaseKey || '');
    
    if (!chaveParaUsar) {
      toast.error('A chave do Supabase é obrigatória');
      return;
    }
    
    setSalvando(true);
    setErro(null);
    
    try {
      // Primeiro testar a conexão
      const client = createClient(supabaseUrl, chaveParaUsar, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      
      const conexao = await verificarConexao(client);
      
      if (!conexao.success) {
        setErro(conexao.error || 'Erro de conexão com o Supabase');
        toast.error(`Falha ao verificar conexão: ${conexao.error}`);
        return;
      }
      
      // Se a conexão for bem-sucedida, inicializar o Supabase
      await initializeSupabase(supabaseUrl, chaveParaUsar);
      
      toast.success('Configuração do Supabase atualizada com sucesso!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      setErro(error.message);
      toast.error(`Erro ao salvar configuração: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AdminLayout title="Configuração do Supabase">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/configuracao" className="mr-4 text-purple-400 hover:text-purple-300">
            <FiArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold">Configuração do Supabase</h1>
        </div>
      </div>

      {/* Navegação entre abas */}
      <div className="mb-6 border-b border-gray-700">
        <div className="flex overflow-x-auto">
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              tabAtiva === 'credenciais'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setTabAtiva('credenciais')}
          >
            <div className="flex items-center">
              <FiKey className="mr-2" />
              Credenciais
            </div>
          </button>
          
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              tabAtiva === 'info'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setTabAtiva('info')}
          >
            <div className="flex items-center">
              <FiDatabase className="mr-2" />
              Informações
            </div>
          </button>
        </div>
      </div>

      {tabAtiva === 'credenciais' && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center text-xl font-semibold mb-4">
            <FiDatabase className="text-purple-400 mr-2" /> 
            Configurações de Conexão
          </div>
          
          {erro && (
            <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded-md">
              <p className="text-red-200">{erro}</p>
            </div>
          )}
          
          <form onSubmit={salvarConfiguracao}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1" htmlFor="supabaseUrl">
                URL do Supabase
              </label>
              <input
                id="supabaseUrl"
                type="text"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://exemplo.supabase.co"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Encontrado no Painel do Supabase em: Configurações do Projeto &gt; API
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1" htmlFor="supabaseKey">
                Chave Service Role {credentials ? "(opcional para atualização)" : "(obrigatória)"}
              </label>
              <input
                id="supabaseKey"
                type="password"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder={credentials ? "••••••••••• (Deixe em branco para manter a chave atual)" : "Insira a chave service_role"}
                required={!credentials}
              />
              <p className="text-xs text-gray-400 mt-1">
                Recomendamos usar a chave <strong>service_role</strong> para ter permissões completas.
                Encontrada em: Configurações do Projeto &gt; API &gt; service_role secret
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md flex items-center"
                onClick={testarConexao}
                disabled={testando || salvando}
              >
                {testando ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                    Testando...
                  </>
                ) : (
                  <>
                    <FiRefreshCw className="mr-2" />
                    Testar Conexão
                  </>
                )}
              </button>
              
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center"
                disabled={testando || salvando}
              >
                {salvando ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" />
                    Salvar Configuração
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {tabAtiva === 'info' && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center text-xl font-semibold mb-4">
            <FiServer className="text-purple-400 mr-2" /> 
            Informações do Supabase
          </div>
          
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-purple-900 bg-opacity-30 border border-purple-700 rounded">
              <h3 className="font-semibold text-purple-300 mb-2">O que é o Supabase?</h3>
              <p className="text-gray-300">
                Supabase é uma plataforma de desenvolvimento que fornece uma alternativa open source ao Firebase.
                Ele inclui banco de dados PostgreSQL, autenticação, APIs REST e realtime, funções de armazenamento
                e muito mais.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Status da Conexão</h3>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{isInitialized ? 'Conectado' : 'Desconectado'}</span>
              </div>
              {credentials && (
                <div className="mt-2">
                  <p className="text-gray-400">URL Atual: {credentials.supabaseUrl}</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded">
              <h3 className="font-semibold text-yellow-300 mb-2">Importante</h3>
              <p className="text-gray-300">
                Para o funcionamento correto do sistema, é necessário usar a chave <strong>service_role</strong>
                que possui permissões avançadas para criar tabelas, funções e triggers no banco de dados.
              </p>
              <p className="text-gray-300 mt-2">
                Não compartilhe esta chave ou a exponha publicamente, pois ela concede acesso total ao seu banco de dados.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Links Úteis</h3>
              <ul className="space-y-1 list-disc list-inside text-purple-400">
                <li><a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="hover:underline">Acessar Dashboard do Supabase</a></li>
                <li><a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer" className="hover:underline">Documentação do Supabase</a></li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 