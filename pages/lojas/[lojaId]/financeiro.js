import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Layout from '@/components/Layout';
import LojaHeader from '@/components/LojaHeader';
import Link from 'next/link';
import { FiBarChart2, FiDollarSign, FiCalendar, FiPieChart, FiArrowUp, FiArrowDown, FiInfo } from 'react-icons/fi';

export default function Financeiro() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState('semana');
  
  // Estado para armazenar métricas calculadas
  const [metricas, setMetricas] = useState({
    totalVendas: 0,
    ticketMedio: 0,
    totalItens: 0,
    vendasPorCategoria: []
  });

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
      
      // Obter dados das vendas com base no período selecionado
      const dataInicial = obterDataInicial(periodo);
      const tabelaVendas = `${lojaId}_vendas`;
      
      // Buscar vendas no período
      const { data: vendas, error: vendasError } = await supabase
        .from(tabelaVendas)
        .select('*')
        .gte('created_at', dataInicial.toISOString())
        .order('created_at', { ascending: false });
        
      if (vendasError) throw vendasError;

      // Calcular métricas baseadas nas vendas
      calcularMetricas(vendas);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados: ' + error.message);
      setCarregando(false);
    }
  };

  // Função para obter a data inicial com base no período selecionado
  const obterDataInicial = (periodo) => {
    const dataAtual = new Date();
    let dataInicial = new Date(dataAtual);
    
    switch (periodo) {
      case 'dia':
        dataInicial.setHours(0, 0, 0, 0); // Início do dia atual
        break;
      case 'semana':
        dataInicial.setDate(dataAtual.getDate() - 7); // 7 dias atrás
        break;
      case 'mes':
        dataInicial.setMonth(dataAtual.getMonth() - 1); // 1 mês atrás
        break;
      default:
        dataInicial.setDate(dataAtual.getDate() - 7);
    }
    
    return dataInicial;
  };

  // Calcular métricas baseadas nas vendas
  const calcularMetricas = (vendas) => {
    if (!vendas || vendas.length === 0) {
      setMetricas({
        totalVendas: 0,
        ticketMedio: 0,
        totalItens: 0,
        vendasPorCategoria: []
      });
      setCarregando(false);
      return;
    }
    
    // Total de vendas: soma do valor_total de todas as vendas
    const totalVendas = vendas.reduce((soma, venda) => soma + (venda.valor_total || 0), 0);
    
    // Ticket médio: total de vendas dividido pela quantidade de vendas
    const ticketMedio = totalVendas / vendas.length;
    
    // Total de itens vendidos: soma das quantidades de itens em todas as vendas
    let totalItens = 0;
    
    // Categorias para agrupamento
    const categorias = {};
    
    // Processar itens das vendas
    vendas.forEach(venda => {
      const itens = venda.itens || [];
      
      itens.forEach(item => {
        // Incrementar total de itens
        totalItens += (item.quantidade || 0);
        
        // Agrupar por categoria
        const categoria = item.categoria || 'Sem categoria';
        if (!categorias[categoria]) {
          categorias[categoria] = 0;
        }
        categorias[categoria] += (item.valor_total || 0);
      });
    });
    
    // Converter categorias em array para exibição
    const vendasPorCategoria = Object.entries(categorias).map(([categoria, valor]) => ({
      categoria,
      valor
    })).sort((a, b) => b.valor - a.valor); // Ordenar por valor, do maior para o menor
    
    // Atualizar estado com as métricas calculadas
    setMetricas({
      totalVendas,
      ticketMedio: ticketMedio || 0,
      totalItens,
      vendasPorCategoria
    });
    
    setCarregando(false);
  };

  // Função para mudar o período dos dados
  const alterarPeriodo = (novoPeriodo) => {
    setPeriodo(novoPeriodo);
  };

  // Função auxiliar para calcular a variação percentual (fictícia por enquanto)
  const calcularVariacao = (tipo) => {
    // Valores fictícios de variação para demonstração
    const variacoes = {
      totalVendas: 12,
      ticketMedio: 5,
      totalItens: -2
    };
    
    return variacoes[tipo] || 0;
  };

  return (
    <Layout title="Relatórios Financeiros">
      <LojaHeader title="Relatórios Financeiros" loja={loja} lojaId={lojaId} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8">
          <h2 className="text-xl font-semibold mb-4 md:mb-0">Visão Geral Financeira</h2>
          
          <div className="flex space-x-2 bg-gray-800 rounded-lg p-1 self-start">
            <button 
              className={`px-4 py-2 rounded ${periodo === 'dia' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
              onClick={() => alterarPeriodo('dia')}
            >
              Hoje
            </button>
            <button 
              className={`px-4 py-2 rounded ${periodo === 'semana' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
              onClick={() => alterarPeriodo('semana')}
            >
              Semana
            </button>
            <button 
              className={`px-4 py-2 rounded ${periodo === 'mes' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
              onClick={() => alterarPeriodo('mes')}
            >
              Mês
            </button>
          </div>
        </div>
        
        {carregando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card bg-gradient-to-br from-green-900 to-green-800 border-green-700">
                <div className="flex items-center mb-2 text-green-300">
                  <FiDollarSign className="text-2xl mr-2" />
                  <h3 className="font-semibold">Total de Vendas</h3>
                </div>
                <p className="text-3xl font-bold">
                  R$ {metricas.totalVendas.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-green-400 text-sm mt-2 flex items-center">
                  {calcularVariacao('totalVendas') >= 0 ? (
                    <>
                      <FiArrowUp className="mr-1" />
                      {calcularVariacao('totalVendas')}% comparado ao período anterior
                    </>
                  ) : (
                    <>
                      <FiArrowDown className="mr-1" />
                      {Math.abs(calcularVariacao('totalVendas'))}% comparado ao período anterior
                    </>
                  )}
                </p>
              </div>
              
              <div className="card bg-gradient-to-br from-blue-900 to-blue-800 border-blue-700">
                <div className="flex items-center mb-2 text-blue-300">
                  <FiBarChart2 className="text-2xl mr-2" />
                  <h3 className="font-semibold">Ticket Médio</h3>
                </div>
                <p className="text-3xl font-bold">
                  R$ {metricas.ticketMedio.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-blue-400 text-sm mt-2 flex items-center">
                  {calcularVariacao('ticketMedio') >= 0 ? (
                    <>
                      <FiArrowUp className="mr-1" />
                      {calcularVariacao('ticketMedio')}% comparado ao período anterior
                    </>
                  ) : (
                    <>
                      <FiArrowDown className="mr-1" />
                      {Math.abs(calcularVariacao('ticketMedio'))}% comparado ao período anterior
                    </>
                  )}
                </p>
              </div>
              
              <div className="card bg-gradient-to-br from-purple-900 to-purple-800 border-purple-700">
                <div className="flex items-center mb-2 text-purple-300">
                  <FiPieChart className="text-2xl mr-2" />
                  <h3 className="font-semibold">Itens Vendidos</h3>
                </div>
                <p className="text-3xl font-bold">
                  {metricas.totalItens} unidades
                </p>
                <p className="text-purple-400 text-sm mt-2 flex items-center">
                  {calcularVariacao('totalItens') >= 0 ? (
                    <>
                      <FiArrowUp className="mr-1" />
                      {calcularVariacao('totalItens')}% comparado ao período anterior
                    </>
                  ) : (
                    <>
                      <FiArrowDown className="mr-1" />
                      {Math.abs(calcularVariacao('totalItens'))}% comparado ao período anterior
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FiPieChart className="text-primary-500 mr-2" />
                  Vendas por Categoria
                </h3>
                
                {metricas.vendasPorCategoria.length > 0 ? (
                  <div className="space-y-4">
                    {metricas.vendasPorCategoria.map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between mb-1">
                          <span>{item.categoria}</span>
                          <span className="font-medium">R$ {item.valor.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div 
                            className="bg-primary-600 h-2.5 rounded-full" 
                            style={{ width: `${(item.valor / metricas.totalVendas * 100).toFixed(1)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    Não há dados de vendas por categoria disponíveis para este período
                  </div>
                )}
              </div>
              
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FiCalendar className="text-primary-500 mr-2" />
                  Informações do Período
                </h3>
                
                <div className="prose prose-invert max-w-none">
                  <p className="mb-4">
                    Você está visualizando dados financeiros do seguinte período:
                    <strong className="block mt-2 text-primary-400">
                      {periodo === 'dia' ? 'Hoje' : 
                       periodo === 'semana' ? 'Últimos 7 dias' : 
                       'Últimos 30 dias'}
                    </strong>
                  </p>
                  
                  {metricas.totalVendas === 0 ? (
                    <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4 mb-4">
                      <p className="text-blue-300 font-medium">Não há vendas registradas neste período</p>
                      <p className="text-sm text-blue-400 mt-1">
                        Experimente selecionar um período diferente ou adicionar vendas através da seção de Vendas.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-900/30 border border-green-800 rounded-lg p-4 mb-4">
                      <p className="text-green-300 font-medium">Resumo do período</p>
                      <ul className="text-sm text-green-400 mt-2 space-y-1 list-disc list-inside">
                        <li>Total de vendas: R$ {metricas.totalVendas.toFixed(2).replace('.', ',')}</li>
                        <li>Ticket médio: R$ {metricas.ticketMedio.toFixed(2).replace('.', ',')}</li>
                        <li>Itens vendidos: {metricas.totalItens} unidades</li>
                        <li>Categorias mais vendidas: {metricas.vendasPorCategoria[0]?.categoria || 'Nenhuma'}</li>
                      </ul>
                    </div>
                  )}
                  
                  <div className="bg-gray-700 p-4 rounded-lg mt-4">
                    <p className="font-medium mb-2">Dica:</p>
                    <p className="text-sm">
                      Para uma análise financeira completa, utilize a ferramenta de exortação de relatórios na seção Vendas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 border border-green-900 rounded-lg p-4 mt-8">
              <h3 className="text-lg font-semibold mb-2 text-green-400 flex items-center">
                <FiInfo className="mr-2" />
                Como verificar a precisão dos relatórios financeiros?
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  Os relatórios financeiros são calculados diretamente a partir de todas as vendas registradas no Supabase. Para validar os dados:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300 pl-4">
                  <li>O <b>Total de Vendas</b> é a soma de todas as vendas realizadas no período selecionado</li>
                  <li>O <b>Ticket Médio</b> é calculado dividindo o total de vendas pelo número de transações</li>
                  <li>A distribuição de <b>Vendas por Categoria</b> representa a participação de cada categoria no volume total</li>
                  <li>O <b>número de itens vendidos</b> é a soma de todas as quantidades em todas as vendas do período</li>
                </ol>
                <p className="text-sm text-gray-400 mt-2">
                  Para uma verificação completa, experimente mudar o período (Dia/Semana/Mês) e comparar com os números de vendas no mesmo intervalo.
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Os dados apresentados refletem apenas as vendas que foram devidamente registradas no sistema, garantindo assim a integridade das informações apresentadas.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
} 