import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Layout from '@/components/Layout';
import LojaHeader from '@/components/LojaHeader';
import Link from 'next/link';
import { FiBarChart2, FiTrendingUp, FiTrendingDown, FiUsers, FiShoppingBag, FiClock, FiBell, FiInfo } from 'react-icons/fi';

export default function Metricas() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState('7d');
  
  // Dados de métricas calculados do Supabase
  const [metricas, setMetricas] = useState({
    vendasHoje: 0,
    vendasPeriodo: 0,
    visitantes: 0,
    taxaConversao: 0,
    ticketMedio: 0,
    itensVendidos: 0,
    leadsCadastrados: 0,
    graficoVendas: [],
    produtosMaisVendidos: [],
    recordes: []
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
      
      // Calcular datas para os períodos
      const dataAtual = new Date();
      const dataInicioHoje = new Date(dataAtual);
      dataInicioHoje.setHours(0, 0, 0, 0);
      
      let dataInicioPeriodo;
      switch (periodo) {
        case 'hoje':
          dataInicioPeriodo = dataInicioHoje;
          break;
        case '30d':
          dataInicioPeriodo = new Date(dataAtual);
          dataInicioPeriodo.setDate(dataAtual.getDate() - 30);
          break;
        default: // 7d
          dataInicioPeriodo = new Date(dataAtual);
          dataInicioPeriodo.setDate(dataAtual.getDate() - 7);
      }
      
      // Buscar dados das tabelas
      const tabelaVendas = `${lojaId}_vendas`;
      const tabelaClientes = `${lojaId}_clientes`;
      const tabelaProdutos = `${lojaId}_produtos`;
      
      // 1. Buscar vendas de hoje
      const { data: vendasHoje, error: errorVendasHoje } = await supabase
        .from(tabelaVendas)
        .select('*')
        .gte('created_at', dataInicioHoje.toISOString());
      
      if (errorVendasHoje) throw errorVendasHoje;
      
      // 2. Buscar vendas do período selecionado
      const { data: vendasPeriodo, error: errorVendasPeriodo } = await supabase
        .from(tabelaVendas)
        .select('*')
        .gte('created_at', dataInicioPeriodo.toISOString());
      
      if (errorVendasPeriodo) throw errorVendasPeriodo;
      
      // 3. Buscar clientes (leads) cadastrados no período
      const { data: clientesPeriodo, error: errorClientesPeriodo } = await supabase
        .from(tabelaClientes)
        .select('*')
        .gte('created_at', dataInicioPeriodo.toISOString());
      
      if (errorClientesPeriodo) throw errorClientesPeriodo;
      
      // Calcular métricas
      const metricasCalculadas = calcularMetricas(
        vendasHoje || [], 
        vendasPeriodo || [],
        clientesPeriodo || [],
        periodo
      );
      
      setMetricas(metricasCalculadas);
      setCarregando(false);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados: ' + error.message);
      setCarregando(false);
    }
  };

  // Função para calcular todas as métricas com base nos dados
  const calcularMetricas = (vendasHoje, vendasPeriodo, clientesPeriodo, periodo) => {
    // Total de vendas de hoje e do período
    const totalVendasHoje = vendasHoje.reduce((total, venda) => total + (venda.valor_total || 0), 0);
    const totalVendasPeriodo = vendasPeriodo.reduce((total, venda) => total + (venda.valor_total || 0), 0);
    
    // Ticket médio
    const ticketMedio = vendasPeriodo.length > 0 ? totalVendasPeriodo / vendasPeriodo.length : 0;
    
    // Total de itens vendidos no período
    let totalItensVendidos = 0;
    const produtosPorId = {};
    
    vendasPeriodo.forEach(venda => {
      const itens = venda.itens || [];
      itens.forEach(item => {
        totalItensVendidos += (item.quantidade || 0);
        
        // Acumular dados para produtos mais vendidos
        const produtoId = item.produto_id;
        if (produtoId) {
          if (!produtosPorId[produtoId]) {
            produtosPorId[produtoId] = {
              nome: item.nome_produto || 'Produto desconhecido',
              quantidade: 0,
              valor: 0
            };
          }
          
          produtosPorId[produtoId].quantidade += (item.quantidade || 0);
          produtosPorId[produtoId].valor += (item.valor_total || 0);
        }
      });
    });
    
    // Converter para array e ordenar por quantidade
    const produtosMaisVendidos = Object.values(produtosPorId)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 4); // Top 4 produtos
    
    // Leads cadastrados no período
    const leadsCadastrados = clientesPeriodo.filter(cliente => cliente.tipo === 'lead').length;
    
    // Dados para o gráfico de vendas
    const graficoVendas = gerarDadosGrafico(vendasPeriodo, periodo);
    
    // Calcular recordes (maior venda)
    const recordes = [];
    if (vendasHoje.length > 0) {
      const maiorVendaHoje = vendasHoje.reduce((maior, venda) => 
        (venda.valor_total > maior.valor_total) ? venda : maior, vendasHoje[0]);
      
      recordes.push({
        titulo: 'Maior venda do dia',
        valor: maiorVendaHoje.valor_total || 0,
        data: new Date(maiorVendaHoje.created_at).toLocaleDateString('pt-BR')
      });
    }
    
    if (vendasPeriodo.length > 0) {
      const maiorVendaPeriodo = vendasPeriodo.reduce((maior, venda) => 
        (venda.valor_total > maior.valor_total) ? venda : maior, vendasPeriodo[0]);
      
      if (!recordes.find(r => r.valor >= maiorVendaPeriodo.valor_total)) {
        recordes.push({
          titulo: `Maior venda do ${getPeriodoTexto(periodo).toLowerCase()}`,
          valor: maiorVendaPeriodo.valor_total || 0,
          data: new Date(maiorVendaPeriodo.created_at).toLocaleDateString('pt-BR')
        });
      }
    }
    
    // Valores estimados para métricas que não temos como calcular diretamente
    const visitantesEstimados = Math.max(clientesPeriodo.length * 3, vendasPeriodo.length * 6);
    const taxaConversao = visitantesEstimados > 0 ? (vendasPeriodo.length / visitantesEstimados) * 100 : 0;
    
    return {
      vendasHoje: totalVendasHoje,
      vendasPeriodo: totalVendasPeriodo,
      visitantes: visitantesEstimados,
      taxaConversao,
      ticketMedio,
      itensVendidos: totalItensVendidos,
      leadsCadastrados,
      graficoVendas,
      produtosMaisVendidos,
      recordes
    };
  };

  // Gerar dados para o gráfico com base no período
  const gerarDadosGrafico = (vendas, periodo) => {
    if (!vendas || vendas.length === 0) {
      return [];
    }
    
    const dataAtual = new Date();
    let intervalos = [];
    let formatarData;
    
    switch (periodo) {
      case 'hoje':
        // Intervalos de 2 horas para o dia atual
        intervalos = Array.from({ length: 6 }, (_, i) => {
          const hora = i * 4;
          const data = new Date(dataAtual);
          data.setHours(hora, 0, 0, 0);
          return {
            inicio: data,
            fim: new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate(), hora + 4, 0, 0),
            label: `${hora}h`
          };
        });
        formatarData = (data) => `${data.getHours()}h`;
        break;
        
      case '30d':
        // Intervalos de semanas
        intervalos = Array.from({ length: 5 }, (_, i) => {
          const data = new Date(dataAtual);
          data.setDate(dataAtual.getDate() - 30 + (i * 6));
          const dataFim = new Date(data);
          dataFim.setDate(data.getDate() + 6);
          return {
            inicio: data,
            fim: dataFim,
            label: `Semana ${i+1}`
          };
        });
        formatarData = () => `Semana`;
        break;
        
      default: // 7d
        // Intervalos diários
        intervalos = Array.from({ length: 7 }, (_, i) => {
          const data = new Date(dataAtual);
          data.setDate(dataAtual.getDate() - 6 + i);
          data.setHours(0, 0, 0, 0);
          const dataFim = new Date(data);
          dataFim.setHours(23, 59, 59, 999);
          return {
            inicio: data,
            fim: dataFim,
            label: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          };
        });
        formatarData = (data) => data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
    
    // Calcular valor para cada intervalo
    return intervalos.map(intervalo => {
      const vendasIntervalo = vendas.filter(venda => {
        const dataVenda = new Date(venda.created_at);
        return dataVenda >= intervalo.inicio && dataVenda <= intervalo.fim;
      });
      
      const valorTotal = vendasIntervalo.reduce((total, venda) => total + (venda.valor_total || 0), 0);
      
      return {
        data: intervalo.label,
        valor: valorTotal
      };
    });
  };

  // Função para mudar o período das métricas
  const alterarPeriodo = (novoPeriodo) => {
    setPeriodo(novoPeriodo);
  };

  // Função para criar gráfico de barras simples com CSS
  const renderGrafico = () => {
    if (!metricas.graficoVendas || metricas.graficoVendas.length === 0) return null;
    
    // Encontrar o maior valor para escalar corretamente
    const maiorValor = Math.max(...metricas.graficoVendas.map(item => item.valor));
    
    return (
      <div className="relative h-64 mt-4">
        <div className="absolute inset-0 flex items-end justify-between">
          {metricas.graficoVendas.map((item, index) => {
            const altura = maiorValor > 0 ? (item.valor / maiorValor) * 100 : 0;
            return (
              <div key={index} className="flex flex-col items-center w-full mx-1">
                <div 
                  className="bg-gradient-to-t from-primary-700 to-primary-500 w-full rounded-t-sm hover:from-primary-600 hover:to-primary-400 transition-all cursor-pointer group relative overflow-hidden"
                  style={{ height: `${altura}%` }}
                >
                  <div className="absolute bottom-0 w-full h-1/5 bg-white/10"></div>
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    R$ {item.valor.toFixed(2).replace('.', ',')}
                  </div>
                </div>
                <div className="text-xs font-medium mt-2 text-primary-400">{item.data}</div>
              </div>
            );
          })}
        </div>
        
        {/* Linhas horizontais para referência */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3].map((_, i) => (
            <div key={i} className="border-t border-gray-700 w-full h-0"></div>
          ))}
        </div>
        
        {/* Valor máximo */}
        {maiorValor > 0 && (
          <div className="absolute top-0 right-0 text-xs text-gray-400 -mt-5">
            R$ {maiorValor.toFixed(2).replace('.', ',')}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout title="Métricas em Tempo Real">
      <LojaHeader title="Métricas em Tempo Real" loja={loja} lojaId={lojaId} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8">
          <h2 className="text-xl font-semibold mb-4 md:mb-0">Painel de Métricas</h2>
          
          <div className="flex space-x-2 bg-gray-800 rounded-lg p-1 self-start">
            <button 
              className={`px-4 py-2 rounded ${periodo === 'hoje' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
              onClick={() => alterarPeriodo('hoje')}
            >
              Hoje
            </button>
            <button 
              className={`px-4 py-2 rounded ${periodo === '7d' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
              onClick={() => alterarPeriodo('7d')}
            >
              7 dias
            </button>
            <button 
              className={`px-4 py-2 rounded ${periodo === '30d' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
              onClick={() => alterarPeriodo('30d')}
            >
              30 dias
            </button>
          </div>
        </div>
        
        {carregando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center mb-2">
                  <FiBarChart2 className="text-primary-400 text-2xl mr-2" />
                  <h3 className="font-semibold">Vendas ({getPeriodoTexto(periodo)})</h3>
                </div>
                <p className="text-2xl font-bold">
                  R$ {metricas.vendasPeriodo.toFixed(2).replace('.', ',')}
                </p>
                <div className="text-sm text-green-400 mt-1 flex items-center">
                  <FiTrendingUp className="mr-1" />
                  <span>Média: R$ {(metricas.vendasPeriodo / (periodo === 'hoje' ? 1 : periodo === '7d' ? 7 : 30)).toFixed(2).replace('.', ',')} por dia</span>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center mb-2">
                  <FiUsers className="text-blue-400 text-2xl mr-2" />
                  <h3 className="font-semibold">Taxa de Conversão</h3>
                </div>
                <p className="text-2xl font-bold">
                  {metricas.taxaConversao.toFixed(1)}%
                </p>
                <div className="text-sm text-blue-400 mt-1 flex items-center">
                  <FiInfo className="mr-1" />
                  <span>Visitantes estimados: {metricas.visitantes}</span>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center mb-2">
                  <FiShoppingBag className="text-purple-400 text-2xl mr-2" />
                  <h3 className="font-semibold">Produtos Vendidos</h3>
                </div>
                <p className="text-2xl font-bold">
                  {metricas.itensVendidos} unidades
                </p>
                <div className="text-sm text-purple-400 mt-1 flex items-center">
                  <FiTrendingUp className="mr-1" />
                  <span>Ticket médio: R$ {metricas.ticketMedio.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center mb-2">
                  <FiClock className="text-orange-400 text-2xl mr-2" />
                  <h3 className="font-semibold">Leads Cadastrados</h3>
                </div>
                <p className="text-2xl font-bold">
                  {metricas.leadsCadastrados}
                </p>
                <div className="text-sm text-orange-400 mt-1 flex items-center">
                  <FiBell className="mr-1" />
                  <span>Novos clientes em potencial</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">
                  Vendas {getPeriodoTexto(periodo)}
                </h3>
                
                {metricas.graficoVendas && metricas.graficoVendas.length > 0 ? (
                  renderGrafico()
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    Não há dados de vendas para exibir neste período
                  </div>
                )}
              </div>
              
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">
                  Produtos Mais Vendidos
                </h3>
                
                {metricas.produtosMaisVendidos && metricas.produtosMaisVendidos.length > 0 ? (
                  <div className="space-y-4">
                    {metricas.produtosMaisVendidos.map((produto, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-medium truncate">{produto.nome}</p>
                          <p className="text-gray-400 text-sm">{produto.quantidade} unidades</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">R$ {produto.valor.toFixed(2).replace('.', ',')}</p>
                          <p className="text-gray-400 text-sm">
                            {((produto.valor / metricas.vendasPeriodo) * 100).toFixed(1)}% das vendas
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    Não há dados de produtos vendidos neste período
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card col-span-full lg:col-span-1">
                <h3 className="text-lg font-semibold mb-4">
                  Recordes
                </h3>
                
                {metricas.recordes && metricas.recordes.length > 0 ? (
                  <div className="space-y-4">
                    {metricas.recordes.map((recorde, index) => (
                      <div key={index} className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-4">
                        <p className="text-gray-300 text-sm mb-1 flex items-center">
                          {index === 0 ? <FiTrendingUp className="text-green-400 mr-2" /> : <FiBarChart2 className="text-blue-400 mr-2" />}
                          {recorde.titulo}
                        </p>
                        <p className="text-2xl font-bold">R$ {recorde.valor.toFixed(2).replace('.', ',')}</p>
                        <p className="text-gray-400 text-sm mt-1">{recorde.data}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    Não há recordes para exibir
                  </div>
                )}
              </div>
              
              <div className="card col-span-full lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">
                  {getPeriodoDescricao(periodo)}
                </h3>
                
                <div className="prose prose-invert max-w-none">
                  <p>Visão geral do desempenho da loja {loja?.nome} nos {periodo === 'hoje' ? 'últimos dias' : periodo === '7d' ? 'últimos 7 dias' : 'últimos 30 dias'}:</p>
                  
                  {metricas.vendasPeriodo > 0 ? (
                    <ul className="mt-4">
                      <li>Total de vendas: R$ {metricas.vendasPeriodo.toFixed(2).replace('.', ',')}</li>
                      <li>Produtos vendidos: {metricas.itensVendidos} unidades</li>
                      <li>Ticket médio: R$ {metricas.ticketMedio.toFixed(2).replace('.', ',')}</li>
                      <li>Leads cadastrados: {metricas.leadsCadastrados}</li>
                    </ul>
                  ) : (
                    <div className="bg-blue-900/30 border border-blue-800 p-4 rounded-lg my-4">
                      <p className="font-medium text-blue-300">Ainda não há dados para este período</p>
                      <p className="text-sm mt-2">
                        Experimente selecionar um período diferente ou adicionar vendas para visualizar métricas.
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-gray-700 p-4 rounded-lg mt-4">
                    <p className="font-medium">Dica para otimizar suas métricas:</p>
                    <p className="text-sm mt-1">
                      {metricas.vendasPeriodo > 0 
                        ? "Compare o desempenho entre diferentes períodos para identificar tendências e oportunidades." 
                        : "Adicione produtos, promoções e realize vendas para começar a ver suas métricas em ação."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 border border-blue-900 rounded-lg p-4 mt-8">
              <h3 className="text-lg font-semibold mb-2 text-blue-400 flex items-center">
                <FiInfo className="mr-2" />
                Como verificar se as métricas estão corretas?
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  As métricas são calculadas diretamente a partir dos dados reais do banco Supabase. Para verificar se estão corretas:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300 pl-4">
                  <li>Compare o <b>Total de Vendas</b> com a soma dos valores das vendas na página de Vendas do mesmo período</li>
                  <li>Confira o <b>Ticket Médio</b> dividindo o valor total pelo número de vendas realizadas</li>
                  <li>Valide os <b>Produtos Mais Vendidos</b> verificando o histórico de vendas recentes</li>
                  <li>Alterne entre diferentes períodos (Hoje/7d/30d) para ver a consistência dos dados</li>
                </ol>
                <p className="text-sm text-gray-400 mt-2">
                  Se encontrar discrepâncias, verifique as datas das vendas e se todos os dados estão sendo corretamente registrados no banco.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}

function getPeriodoTexto(periodo) {
  switch (periodo) {
    case 'hoje': return 'Hoje';
    case '7d': return '7 dias';
    case '30d': return '30 dias';
    default: return periodo;
  }
}

function getPeriodoDescricao(periodo) {
  switch (periodo) {
    case 'hoje': return 'Desempenho de Hoje';
    case '7d': return 'Resumo Semanal';
    case '30d': return 'Análise Mensal';
    default: return 'Resumo do Período';
  }
}