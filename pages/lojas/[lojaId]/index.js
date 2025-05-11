import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Link from 'next/link';
import LojaLayout from '@/components/LojaLayout';
import { FiBarChart2, FiPackage, FiUsers, FiTag, FiShoppingCart, FiPlus, FiGrid } from 'react-icons/fi';
import GraficoVendas from '@/components/GraficoVendas';
import { 
  FiShoppingBag, FiActivity, 
  FiTrendingUp, FiTrendingDown, FiDollarSign, 
  FiCalendar, FiAlertCircle, FiCheck,
  FiFilter 
} from 'react-icons/fi';

export default function PainelLoja() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [config, setConfig] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Verificar se o Supabase está inicializado
  useEffect(() => {
    if (!loading && !isInitialized) {
      router.push('/configuracao');
    }
  }, [isInitialized, loading, router]);

  // Carregar dados da loja quando o ID estiver disponível
  useEffect(() => {
    if (supabase && lojaId) {
      carregarDadosLoja();
    }
  }, [supabase, lojaId]);

  const carregarDadosLoja = async () => {
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
      
      // Carregar configurações da loja
      const { data: configData, error: configError } = await supabase
        .from(`${lojaId}_config`)
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }
      
      if (configData) {
        setConfig(configData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da loja:', error);
      toast.error('Erro ao carregar dados da loja');
    } finally {
      setCarregando(false);
    }
  };

  if (loading || !isInitialized || carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <LojaLayout title="Painel Principal" loja={loja} lojaId={lojaId} icon={<FiGrid className="mr-2 text-blue-400" />}>
      <h2 className="text-xl font-semibold mb-4">Painel Administrativo</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Gestão de Produtos e Estoque */}
        <Link 
          href={`/lojas/${lojaId}/produtos`}
          className="card hover:bg-gray-750 transition-colors duration-200 flex flex-col"
        >
          <div className="flex items-center mb-5">
            <div className="bg-blue-600/90 rounded-full p-4 mr-4 shadow-lg">
              <FiPackage className="text-2xl text-white" />
            </div>
            <h3 className="text-xl font-semibold">Gestão de Produtos e Estoque</h3>
          </div>
          <p className="text-gray-400 mb-4 text-base">
            Upload de fotos, preços, tamanhos e estoque
          </p>
          <div className="bg-gray-700/80 rounded-md p-3.5 mt-auto shadow-sm backdrop-blur-sm border border-gray-600/20">
            <p className="text-sm text-gray-300">
              <span className="font-semibold">Alerta automático</span> de estoque baixo
            </p>
          </div>
        </Link>
        
        {/* Card 2: Dashboard Unificado */}
        <Link 
          href={`/lojas/${lojaId}/dashboard`}
          className="card hover:bg-gray-750 transition-colors duration-200 flex flex-col"
        >
          <div className="flex items-center mb-5">
            <div className="bg-green-600/90 rounded-full p-4 mr-4 shadow-lg">
              <FiBarChart2 className="text-2xl text-white" />
            </div>
            <h3 className="text-xl font-semibold">Dashboard Unificado</h3>
          </div>
          <p className="text-gray-400 mb-4 text-base">
            Relatórios financeiros e métricas em tempo real
          </p>
          <div className="bg-gray-700/80 rounded-md p-3.5 mt-auto shadow-sm backdrop-blur-sm border border-gray-600/20">
            <p className="text-sm text-gray-300">
              <span className="font-semibold">Visão completa</span> do desempenho do negócio
            </p>
          </div>
        </Link>
        
        {/* Card 3: Gestão de Leads e Clientes */}
        <Link 
          href={`/lojas/${lojaId}/clientes`}
          className="card hover:bg-gray-750 transition-colors duration-200 flex flex-col"
        >
          <div className="flex items-center mb-5">
            <div className="bg-purple-600/90 rounded-full p-4 mr-4 shadow-lg">
              <FiUsers className="text-2xl text-white" />
            </div>
            <h3 className="text-xl font-semibold">Gestão de Leads e Clientes</h3>
          </div>
          <p className="text-gray-400 mb-4 text-base">
            Histórico de compras e gerenciamento de contatos
          </p>
          <div className="bg-gray-700/80 rounded-md p-3.5 mt-auto shadow-sm backdrop-blur-sm border border-gray-600/20">
            <p className="text-sm text-gray-300">
              <span className="font-semibold">Automação</span> de follow-up via WhatsApp
            </p>
          </div>
        </Link>
        
        {/* Card 4: Promoções Personalizadas */}
        <Link 
          href={`/lojas/${lojaId}/promocoes`}
          className="card hover:bg-gray-750 transition-colors duration-200 flex flex-col"
        >
          <div className="flex items-center mb-5">
            <div className="bg-yellow-600/90 rounded-full p-4 mr-4 shadow-lg">
              <FiTag className="text-2xl text-white" />
            </div>
            <h3 className="text-xl font-semibold">Promoções Personalizadas</h3>
          </div>
          <p className="text-gray-400 mb-4 text-base">
            Criação de campanhas promocionais segmentadas
          </p>
          <div className="bg-gray-700/80 rounded-md p-3.5 mt-auto shadow-sm backdrop-blur-sm border border-gray-600/20">
            <p className="text-sm text-gray-300">
              <span className="font-semibold">Envio automático</span> via WhatsApp
            </p>
          </div>
        </Link>
        
        {/* Card 5: Vendas e Pedidos */}
        <Link 
          href={`/lojas/${lojaId}/vendas`}
          className="card hover:bg-gray-750 transition-colors duration-200 flex flex-col"
        >
          <div className="flex items-center mb-5">
            <div className="bg-red-600/90 rounded-full p-4 mr-4 shadow-lg">
              <FiShoppingCart className="text-2xl text-white" />
            </div>
            <h3 className="text-xl font-semibold">Vendas e Pedidos</h3>
          </div>
          <p className="text-gray-400 mb-4 text-base">
            Histórico de vendas e status de pedidos
          </p>
          <div className="bg-gray-700/80 rounded-md p-3.5 mt-auto shadow-sm backdrop-blur-sm border border-gray-600/20">
            <p className="text-sm text-gray-300">
              <span className="font-semibold">Acompanhamento</span> em tempo real
            </p>
          </div>
        </Link>
        
        {/* Card 6: Carrinhos Abandonados */}
        <Link 
          href={`/lojas/${lojaId}/carrinho`}
          className="card hover:bg-gray-750 transition-colors duration-200 flex flex-col"
        >
          <div className="flex items-center mb-5">
            <div className="bg-indigo-600/90 rounded-full p-4 mr-4 shadow-lg">
              <FiShoppingCart className="text-2xl text-white" />
            </div>
            <h3 className="text-xl font-semibold">Carrinhos Abandonados</h3>
          </div>
          <p className="text-gray-400 mb-4 text-base">
            Recuperação automática de carrinhos abandonados
          </p>
          <div className="bg-gray-700/80 rounded-md p-3.5 mt-auto shadow-sm backdrop-blur-sm border border-gray-600/20">
            <p className="text-sm text-gray-300">
              <span className="font-semibold">Aumente sua conversão</span> em até 20%
            </p>
          </div>
        </Link>
      </div>
    </LojaLayout>
  );
} 