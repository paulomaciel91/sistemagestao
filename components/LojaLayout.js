import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { 
  FiHome, FiPackage, FiUsers, FiBarChart2, 
  FiTag, FiCreditCard, FiShoppingCart, FiSettings, 
  FiMenu, FiX
} from 'react-icons/fi';

export default function LojaLayout({ children, title, loja, lojaId, icon }) {
  const router = useRouter();
  const { isInitialized, loading, connectionError, resetSupabase, supabase } = useSupabase();
  const [menuAberto, setMenuAberto] = useState(false);
  const [config, setConfig] = useState(null);
  
  // Verificar se o Supabase está inicializado
  useEffect(() => {
    if (!loading && !isInitialized) {
      if (connectionError) {
        toast.error(`Erro de conexão: ${connectionError}`);
      }
      router.push('/configuracao');
    }
  }, [isInitialized, loading, connectionError, router]);

  // Carregar configurações da loja para obter cores personalizadas
  useEffect(() => {
    const carregarConfig = async () => {
      if (supabase && lojaId) {
        try {
          const { data, error } = await supabase
            .from(`${lojaId}_config`)
            .select('*')
            .single();
          
          if (!error && data) {
            setConfig(data);
          }
        } catch (error) {
          console.error('Erro ao carregar configurações:', error);
        }
      }
    };
    
    if (isInitialized && lojaId) {
      carregarConfig();
    }
  }, [isInitialized, lojaId]);

  // Mostrar tela de erro quando há um problema de conexão
  if (connectionError) {
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
  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Definir cores primárias da loja ou usar valor padrão
  const corPrimaria = config?.cor_primaria || '#3B82F6'; // Azul padrão
  const corSecundaria = config?.cor_secundaria || '#1E3A8A'; // Azul escuro padrão

  const isDemoLoja = lojaId === 'loja_demo';
  
  // Define o título da página
  const pageTitle = title ? 
    `${title} | ${config?.nome_loja || loja?.nome || 'Loja'}` : 
    (config?.nome_loja || loja?.nome || 'Loja');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content="Sistema de gestão para loja" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header 
        className="shadow-md py-4 header-fixed"
        style={{ 
          backgroundColor: '#0f172a', /* Corresponde ao bg-gray-950 */
          borderBottom: `1px solid ${corPrimaria}40` // 40 é a opacidade em hex
        }}
      >
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            {router.pathname.includes('/lojas/[lojaId]') && !router.pathname.endsWith('/[lojaId]') ? (
              <Link href={`/lojas/${lojaId}`} className="mr-3 text-gray-300 hover:text-white">
                <FiHome size={20} />
              </Link>
            ) : (
              <Link href="/dashboard" className="mr-4 text-lg font-medium text-gray-300 hover:text-white">
                Dashboard
              </Link>
            )}
            <h1 className="text-2xl font-bold flex items-center">
              {icon}
              {title || config?.nome_loja || (loja ? loja.nome : 'Loja')}
            </h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            {isDemoLoja && (
              <Link 
                href="/configuracao/demo"
                className="text-emerald-400 hover:text-emerald-300 flex items-center"
              >
                <FiTag className="mr-1" />
                <span>Dados Demo</span>
              </Link>
            )}
            <Link 
              href={`/lojas/${lojaId}/configuracoes`}
              className="text-gray-300 hover:text-white flex items-center"
              style={{ color: corPrimaria }}
            >
              <FiSettings className="mr-1" />
              <span>Configurações</span>
            </Link>
          </div>
          
          <button 
            className="md:hidden text-gray-300 hover:text-white"
            onClick={() => setMenuAberto(!menuAberto)}
          >
            {menuAberto ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-72px)]">
        {/* Menu lateral */}
        <aside 
          className={`fixed md:static top-0 left-0 h-full w-64 md:w-64 bg-gray-900/95 backdrop-blur-sm border-r border-gray-700/50 transition-all duration-300 z-50 transform sidebar-fixed ${
            menuAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } md:block py-4 px-4 shadow-lg flex flex-col`}
          style={{ borderColor: `${corPrimaria}30` }}
        >
          {menuAberto && (
            <div className="absolute right-4 top-4 md:hidden">
              <button 
                onClick={() => setMenuAberto(false)}
                className="text-gray-400 hover:text-white"
              >
                <FiX size={24} />
              </button>
            </div>
          )}
          
          <div className="mt-6 md:mt-0 flex-grow">
            <div 
              className="text-xs uppercase tracking-wider mb-5 pb-2 border-b font-medium"
              style={{ 
                color: corPrimaria, 
                borderColor: `${corPrimaria}30` 
              }}
            >
              Loja: {config?.nome_loja || loja?.nome || lojaId}
            </div>
            
            <nav className="space-y-2">
              <Link 
                href={`/lojas/${lojaId}`}
                className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                  router.pathname === `/lojas/${lojaId}` 
                    ? 'text-white font-medium' 
                    : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                }`}
                style={router.pathname === `/lojas/${lojaId}` ? { backgroundColor: corPrimaria } : {}}
                onClick={() => setMenuAberto(false)}
              >
                <FiHome className="mr-3 text-lg" />
                Painel Principal
              </Link>
              
              <Link 
                href={`/lojas/${lojaId}/produtos`}
                className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                  router.pathname.includes(`/lojas/${lojaId}/produtos`) 
                    ? 'text-white font-medium' 
                    : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                }`}
                style={router.pathname.includes(`/lojas/${lojaId}/produtos`) ? { backgroundColor: corPrimaria } : {}}
                onClick={() => setMenuAberto(false)}
              >
                <FiPackage className="mr-3 text-lg" />
                Produtos
              </Link>
              
              <Link 
                href={`/lojas/${lojaId}/clientes`}
                className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                  router.pathname.includes(`/lojas/${lojaId}/clientes`) 
                    ? 'text-white font-medium' 
                    : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                }`}
                style={router.pathname.includes(`/lojas/${lojaId}/clientes`) ? { backgroundColor: corPrimaria } : {}}
                onClick={() => setMenuAberto(false)}
              >
                <FiUsers className="mr-3 text-lg" />
                Clientes
              </Link>
              
              <Link 
                href={`/lojas/${lojaId}/vendas`}
                className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                  router.pathname.includes(`/lojas/${lojaId}/vendas`) 
                    ? 'text-white font-medium' 
                    : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                }`}
                style={router.pathname.includes(`/lojas/${lojaId}/vendas`) ? { backgroundColor: corPrimaria } : {}}
                onClick={() => setMenuAberto(false)}
              >
                <FiShoppingCart className="mr-3 text-lg" />
                Vendas
              </Link>
              
              <Link 
                href={`/lojas/${lojaId}/dashboard`}
                className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                  router.pathname.includes(`/lojas/${lojaId}/metricas`) || router.pathname.includes(`/lojas/${lojaId}/dashboard`)
                    ? 'text-white font-medium' 
                    : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                }`}
                style={router.pathname.includes(`/lojas/${lojaId}/metricas`) || router.pathname.includes(`/lojas/${lojaId}/dashboard`) ? { backgroundColor: corPrimaria } : {}}
                onClick={() => setMenuAberto(false)}
              >
                <FiBarChart2 className="mr-3 text-lg" />
                Métricas
              </Link>
              
              <Link 
                href={`/lojas/${lojaId}/carrinho`}
                className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                  router.pathname.includes(`/lojas/${lojaId}/carrinho`) 
                    ? 'text-white font-medium' 
                    : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                }`}
                style={router.pathname.includes(`/lojas/${lojaId}/carrinho`) ? { backgroundColor: corPrimaria } : {}}
                onClick={() => setMenuAberto(false)}
              >
                <FiShoppingCart className="mr-3 text-lg" />
                Carrinhos
              </Link>
              
              <Link 
                href={`/lojas/${lojaId}/promocoes`}
                className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                  router.pathname.includes(`/lojas/${lojaId}/promocoes`) 
                    ? 'text-white font-medium' 
                    : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                }`}
                style={router.pathname.includes(`/lojas/${lojaId}/promocoes`) ? { backgroundColor: corPrimaria } : {}}
                onClick={() => setMenuAberto(false)}
              >
                <FiTag className="mr-3 text-lg" />
                Promoções
              </Link>
              
              <Link 
                href={`/lojas/${lojaId}/pagamentos`}
                className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                  router.pathname.includes(`/lojas/${lojaId}/pagamentos`) 
                    ? 'text-white font-medium' 
                    : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                }`}
                style={router.pathname.includes(`/lojas/${lojaId}/pagamentos`) ? { backgroundColor: corPrimaria } : {}}
                onClick={() => setMenuAberto(false)}
              >
                <FiCreditCard className="mr-3 text-lg" />
                Pagamentos
              </Link>
              
              <Link 
                href={`/lojas/${lojaId}/configuracoes`}
                className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                  router.pathname.includes(`/lojas/${lojaId}/configuracoes`) 
                    ? 'text-white font-medium' 
                    : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                }`}
                style={router.pathname.includes(`/lojas/${lojaId}/configuracoes`) ? { backgroundColor: corPrimaria } : {}}
                onClick={() => setMenuAberto(false)}
              >
                <FiSettings className="mr-3 text-lg" />
                Configurações
              </Link>
            </nav>
          </div>
          
          {/* Rodapé da barra lateral */}
          <div className="mt-auto pt-4 border-t border-gray-700/30">
            <div className="px-4 py-2 text-xs text-gray-400">
              © {new Date().getFullYear()} Painel Admin
            </div>
            <div className="flex items-center justify-between px-4 pt-2">
              <Link
                href="/configuracao"
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Configurações
              </Link>
              <Link
                href="/ajuda"
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Ajuda
              </Link>
            </div>
          </div>
        </aside>
        
        {/* Overlay para fechar o menu em dispositivos móveis */}
        {menuAberto && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setMenuAberto(false)}
          ></div>
        )}
        
        <main className="flex-grow p-4 md:p-7 w-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
} 