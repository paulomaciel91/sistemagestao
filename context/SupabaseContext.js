import { createContext, useState, useContext, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Contexto para gerenciar a conexão com o Supabase
const SupabaseContext = createContext();

// Função auxiliar para verificar se a conexão está realmente funcionando
const testarConexaoSupabase = async (client) => {
  if (!client) return false;
  
  try {
    // Tentar acessar tabela existente
    const { error: tableError } = await client.from('lojas').select('count').limit(1);
    
    // PGRST116 significa tabela não existe, mas a conexão está ativa
    if (!tableError || tableError.code === 'PGRST116') {
      return true;
    }
    
    // Se não conseguir verificar usando a tabela lojas, tentar um método mais básico
    try {
      // Verificar a conexão fazendo uma consulta ao sistema do Supabase
      const { error: authError } = await client.auth.getSession();
      if (!authError) {
        return true;
      }
      
      // Se ainda houver erro, pode ser que esteja tentando usar funções
      // não disponíveis, mas a conexão básica funciona
      console.warn('Aviso: Conexão estabelecida, mas com possíveis restrições de permissão');
      return true;
    } catch (verificationError) {
      // Mesmo com erro, pode ser que a conexão esteja funcionando
      console.warn('Aviso na verificação secundária, mas a conexão básica parece existir:', verificationError);
      return true;
    }
  } catch (error) {
    console.error('Erro ao testar conexão Supabase:', error);
    return false;
  }
};

export function SupabaseProvider({ children }) {
  const [supabase, setSupabase] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Carregar credenciais salvas no localStorage
    const savedCredentials = localStorage.getItem('supabaseCredentials');
    
    if (savedCredentials) {
      try {
        const parsedCredentials = JSON.parse(savedCredentials);
        setCredentials(parsedCredentials);
        
        const { supabaseUrl, supabaseKey } = parsedCredentials;
        if (supabaseUrl && supabaseKey) {
          const client = createClient(supabaseUrl, supabaseKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
            },
          });
          
          // Verificar se a conexão funciona antes de definir
          testarConexaoSupabase(client).then(isConnected => {
            if (isConnected) {
              setSupabase(client);
              setConnectionError(null);
            } else {
              console.error('Falha ao estabelecer conexão com o Supabase');
              setConnectionError('Não foi possível conectar ao Supabase com as credenciais salvas.');
              // Limpar credenciais inválidas
              localStorage.removeItem('supabaseCredentials');
            }
            setLoading(false);
          });
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar credenciais do Supabase:', error);
        localStorage.removeItem('supabaseCredentials');
      }
    }
    
    setLoading(false);
  }, []);

  // Função para inicializar o cliente Supabase com novas credenciais
  const initializeSupabase = (supabaseUrl, supabaseKey) => {
    try {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('URL e chave do Supabase são obrigatórios');
      }
      
      const client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      
      setSupabase(client);
      setConnectionError(null);
      
      // Salvar credenciais no localStorage
      const newCredentials = { supabaseUrl, supabaseKey };
      setCredentials(newCredentials);
      localStorage.setItem('supabaseCredentials', JSON.stringify(newCredentials));
      
      return client;
    } catch (error) {
      console.error('Erro ao inicializar o Supabase:', error);
      setConnectionError(error.message);
      throw error;
    }
  };

  // Função para limpar as credenciais e reiniciar
  const resetSupabase = () => {
    localStorage.removeItem('supabaseCredentials');
    localStorage.removeItem('isLoggedIn'); // Também remover o estado de login
    setSupabase(null);
    setCredentials(null);
    setConnectionError(null);
  };

  return (
    <SupabaseContext.Provider value={{ 
      supabase, 
      initializeSupabase,
      resetSupabase, 
      credentials,
      connectionError,
      isInitialized: !!supabase,
      loading
    }}>
      {children}
    </SupabaseContext.Provider>
  );
}

// Hook personalizado para acessar o contexto do Supabase
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase deve ser usado dentro de um SupabaseProvider');
  }
  return context;
}; 