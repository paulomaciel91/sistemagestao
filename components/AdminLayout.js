import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { FiSettings, FiLogOut, FiDatabase, FiUsers, FiShoppingBag, FiInfo, FiHelpCircle, FiBookOpen } from 'react-icons/fi';

export default function AdminLayout({ children, title }) {
  const router = useRouter();
  const { isInitialized, loading, connectionError, resetSupabase } = useSupabase();
  
  // Verificar se estamos na página de configuração do Supabase
  const isSupabaseConfigPage = router.pathname === '/configuracao/supabase';

  // Verificar erro de conexão, mas não redirecionar automaticamente
  useEffect(() => {
    if (!loading && connectionError && !isSupabaseConfigPage) {
      toast.error(`Erro de conexão: ${connectionError}`);
    }
  }, [loading, connectionError, isSupabaseConfigPage]);

  // Mostrar tela de erro quando há um problema de conexão
  // Mas não mostrar se estiver na página de configuração do Supabase
  if (connectionError && !isSupabaseConfigPage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
        <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded p-4 mb-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-100 mb-2">Erro de Conexão</h2>
          <p className="text-red-100 mb-4">{connectionError}</p>
          <button 
            className="btn btn-sm bg-red-600 hover:bg-red-700"
            onClick={() => {
              resetSupabase();
              router.push('/configuracao/supabase');
            }}
          >
            Reconfigurar Conexão
          </button>
        </div>
      </div>
    );
  }

  // Exibir loading quando necessário, exceto na página de configuração do Supabase
  if (loading && !isSupabaseConfigPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>{title ? `${title} | Admin` : 'Admin - Sistema de Gestão'}</title>
        <meta name="description" content="Painel administrativo do sistema de gestão" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-purple-900 border-b border-purple-800 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-300 to-white bg-clip-text text-transparent">
            Dashboard Admin
          </h1>
          
          <div className="flex items-center space-x-4">
            <div className="px-3 py-1 rounded-full bg-purple-800 text-xs font-semibold text-purple-200">
              Acesso Admin
            </div>
            <Link href="/configuracao" className="flex items-center text-gray-300 hover:text-white">
              <FiSettings className="mr-1" />
              <span>Configurações</span>
            </Link>
            
            <button
              onClick={() => {
                resetSupabase();
                router.push('/');
              }}
              className="flex items-center text-gray-300 hover:text-white"
            >
              <FiLogOut className="mr-1" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-72px)]">
        <aside className="w-64 bg-gray-800 border-r border-gray-700 hidden lg:block p-4">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
              Administração
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard" 
                className={`flex items-center px-4 py-2 text-sm rounded-lg ${
                  router.pathname === '/dashboard' 
                    ? 'bg-purple-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <FiDatabase className="mr-3" />
                Painel Principal
              </Link>
              
              <Link href="/documentacao" 
                className={`flex items-center px-4 py-2 text-sm rounded-lg ${
                  router.pathname === '/documentacao' 
                    ? 'bg-purple-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <FiBookOpen className="mr-3" />
                Documentação
              </Link>
              
              <Link href="/configuracao/inicial" 
                className={`flex items-center px-4 py-2 text-sm rounded-lg ${
                  router.pathname === '/configuracao/inicial' 
                    ? 'bg-purple-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <FiInfo className="mr-3" />
                Sistema
              </Link>
            </nav>
          </div>
          
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
              Lojas
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard" 
                className={`flex items-center px-4 py-2 text-sm rounded-lg ${
                  router.pathname === '/dashboard' 
                    ? 'bg-purple-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <FiShoppingBag className="mr-3" />
                Gerenciar Lojas
              </Link>
            </nav>
          </div>
        </aside>
        
        <main className="flex-grow p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 