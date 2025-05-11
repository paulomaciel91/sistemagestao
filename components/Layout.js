import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { useEffect } from 'react';
import { toast } from 'react-toastify';

export default function Layout({ children, title, requireAuth = true }) {
  const router = useRouter();
  const { isInitialized, loading, connectionError, resetSupabase } = useSupabase();

  // Verificar se o Supabase está inicializado (caso seja necessário autenticação)
  useEffect(() => {
    if (requireAuth) {
      if (!loading && !isInitialized) {
        if (connectionError) {
          toast.error(`Erro de conexão: ${connectionError}`);
        }
        router.push('/configuracao');
      }
    }
  }, [isInitialized, loading, requireAuth, connectionError, router]);

  // Mostrar tela de erro quando há um problema de conexão
  if (requireAuth && connectionError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
        <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded p-4 mb-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-100 mb-2">Erro de Conexão</h2>
          <p className="text-red-100 mb-4">{connectionError}</p>
          <button 
            className="btn btn-sm bg-red-600 hover:bg-red-700"
            onClick={() => {
              resetSupabase();
              router.push('/configuracao');
            }}
          >
            Reconfigurar Conexão
          </button>
        </div>
      </div>
    );
  }

  // Exibir loading quando necessário
  if (requireAuth && (loading || !isInitialized)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>{title ? `${title} | Sistema de Gestão` : 'Sistema de Gestão para Lojas'}</title>
        <meta name="description" content="Sistema completo de gestão para lojas de roupas" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {children}
    </div>
  );
} 