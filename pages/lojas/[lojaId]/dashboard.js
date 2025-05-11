import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import LojaLayout from '@/components/LojaLayout';
import GraficoVendas from '@/components/GraficoVendas';
import { 
  FiShoppingBag, FiUsers, FiBarChart2, FiActivity, 
  FiTrendingUp, FiTrendingDown, FiDollarSign, 
  FiCalendar, FiPackage, FiAlertCircle, FiCheck,
  FiFilter 
} from 'react-icons/fi';

export default function DashboardLoja() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized } = useSupabase();
  
  const [loading, setLoading] = useState(true);
  const [dadosLoja, setDadosLoja] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [vendasRecentes, setVendasRecentes] = useState([]);
  const [clientesRecentes, setClientesRecentes] = useState([]);
  const [topProdutos, setTopProdutos] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [alertasEstoque, setAlertasEstoque] = useState([]);
  const [todasVendas, setTodasVendas] = useState([]);
  const [periodoGrafico, setPeriodoGrafico] = useState('semana');
  const [tipoGrafico, setTipoGrafico] = useState('line');
  const [estatisticas, setEstatisticas] = useState({
    totalVendas: 0,
    totalClientes: 0,
    vendasHoje: 0,
    ticketMedio: 0,
    produtosAtivos: 0,
    crescimento: 0
  });
  
  useEffect(() => {
    if (isInitialized && lojaId) {
      carregarDados();
    }
  }, [isInitialized, lojaId]);
  
  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar configurações da loja
      const { data: configData, error: configError } = await supabase
        .from(`${lojaId}_config`)
        .select('*')
        .single();
      
      if (configError) {
        console.error('Erro ao carregar configurações da loja:', configError);
        toast.error('Erro ao carregar configurações da loja. Verifique o console para mais detalhes.');
      }
      
      setDadosLoja(configData || {});
      
      // Carregar produtos
      const { data: produtosData, error: produtosError } = await supabase
        .from(`${lojaId}_produtos`)
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (produtosError) {
        console.error('Erro ao carregar produtos:', produtosError);
        toast.error('Erro ao carregar produtos. Verifique o console para mais detalhes.');
        setProdutos([]);
      } else {
        setProdutos(produtosData || []);
      }
      
      // Verificar estoque para alertas
      let alertasEstoqueBaixo = [];
      
      // Buscar dados de estoque para verificar alertas
      const { data: estoqueData, error: estoqueError } = await supabase
        .from(`${lojaId}_estoque`)
        .select('produto_id, tamanho, cor, quantidade');
        
      if (!estoqueError && estoqueData && estoqueData.length > 0) {
        // Calculamos o estoque total para cada produto com base nos dados da tabela de estoque
        const estoquePorProduto = {};
        
        // Calcular o estoque total por produto
        estoqueData.forEach(item => {
          if (item.produto_id) {
            if (!estoquePorProduto[item.produto_id]) {
              estoquePorProduto[item.produto_id] = 0;
            }
            estoquePorProduto[item.produto_id] += (parseInt(item.quantidade) || 0);
          }
        });
        
        // Atualizar os produtos com o estoque total calculado
        const produtosAtualizados = (produtosData || []).map(produto => {
          const estoqueTotal = estoquePorProduto[produto.id] || 0;
          
          // Verificar se o estoque está abaixo do mínimo
          if (estoqueTotal <= (produto.estoque_minimo || 5)) {
            alertasEstoqueBaixo.push({
              ...produto,
              estoque_total: estoqueTotal,
              estoque: estoqueTotal  // Atualizar ambos os campos para compatibilidade
            });
          }
          
          return {
            ...produto,
            estoque_total: estoqueTotal,
            estoque: estoqueTotal  // Atualizar ambos os campos para compatibilidade
          };
        });
        
        // Atualizar a lista de produtos com o estoque atualizado
        setProdutos(produtosAtualizados);
        
        // Relacionar estoque com produtos para alertas específicos por tamanho e cor
        const alertasDetalhados = [];
        for (const produto of (produtosData || [])) {
          const estoqueItens = estoqueData.filter(item => item.produto_id === produto.id);
          
          estoqueItens.forEach(item => {
            if ((item.quantidade || 0) <= (produto.estoque_minimo || 5)) {
              alertasDetalhados.push({
                ...produto,
                tamanho: item.tamanho,
                cor: item.cor,
                estoque: item.quantidade,
                estoque_total: estoquePorProduto[produto.id] || 0
              });
            }
          });
        }
        
        // Se encontrarmos alertas detalhados, usá-los em vez dos alertas gerais
        if (alertasDetalhados.length > 0) {
          alertasEstoqueBaixo = alertasDetalhados;
        }
      } else {
        console.log('Usando método de fallback para alertas de estoque');
        // Fallback para método anterior se não houver tabela de estoque
        alertasEstoqueBaixo = (produtosData || []).filter(produto => 
          produto.estoque !== undefined && 
          produto.estoque_minimo !== undefined && 
          produto.estoque <= produto.estoque_minimo
        );
      }
      
      setAlertasEstoque(alertasEstoqueBaixo);
      
      // Carregar vendas (todas para o gráfico)
      const { data: todasVendasData, error: vendasError } = await supabase
        .from(`${lojaId}_vendas`)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (vendasError) {
        console.error('Erro ao carregar vendas:', vendasError);
        toast.error('Erro ao carregar dados de vendas. Verifique o console para mais detalhes.');
        setTodasVendas([]);
        setVendasRecentes([]);
      } else {
        setTodasVendas(todasVendasData || []);
        
        // Vendas recentes para mostrar na tabela
        const vendasRecentes = (todasVendasData || []).slice(0, 10);
        setVendasRecentes(vendasRecentes);
      }
      
      // Carregar clientes
      let clientesData = [];
      try {
        const { data: todosClientesData, error: clientesGeraisError } = await supabase
          .from(`${lojaId}_clientes`)
          .select('*');
          
        if (clientesGeraisError) {
          console.error('Erro ao carregar todos os clientes:', clientesGeraisError);
        } else {
          clientesData = todosClientesData || [];
          
          // Buscar apenas os clientes recentes para exibição (limitado a 10)
          const clientesRecentes = clientesData
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10);
          
          setClientesRecentes(clientesRecentes);
        }
      } catch (clientesError) {
        console.error('Erro ao processar clientes:', clientesError);
        clientesData = [];
        setClientesRecentes([]);
      }
      
      // Agora que temos todos os dados necessários, calcular estatísticas
      if (todasVendasData && clientesData && produtosData) {
        calcularEstatisticas(todasVendasData, clientesData, produtosData);
        calcularTopProdutos(todasVendasData, produtosData);
        calcularTopClientes(todasVendasData, clientesData);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error(`Erro ao carregar dados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };
  
  // Função para calcular estatísticas
  const calcularEstatisticas = (vendasData, clientesData, produtosData) => {
    try {
      if (!Array.isArray(vendasData)) vendasData = [];
      if (!Array.isArray(clientesData)) clientesData = [];
      if (!Array.isArray(produtosData)) produtosData = [];
      
      // Dados para hoje
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const vendasHoje = vendasData.filter(v => 
        v && v.created_at && new Date(v.created_at) >= hoje
      );
      
      const totalVendasHoje = vendasHoje.reduce((total, v) => {
        const valor = typeof v.valor_total === 'number' ? v.valor_total : 
                     parseFloat(v.valor_total || 0);
        return total + valor;
      }, 0);
      
      // Ticket médio - verificar se há vendas antes de calcular
      let ticketMedio = 0;
      if (vendasData.length > 0) {
        const totalVendas = vendasData.reduce((total, v) => {
          const valor = typeof v.valor_total === 'number' ? v.valor_total : 
                       parseFloat(v.valor_total || 0);
          return total + valor;
        }, 0);
        ticketMedio = totalVendas / vendasData.length;
      }
      
      // Crescimento (comparando vendas dos últimos 7 dias com os 7 dias anteriores)
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(hoje.getDate() - 7);
      
      const quatorzeDiasAtras = new Date();
      quatorzeDiasAtras.setDate(hoje.getDate() - 14);
      
      const vendasUltimaSemana = vendasData.filter(v => 
        v && v.created_at && 
        new Date(v.created_at) >= seteDiasAtras && 
        new Date(v.created_at) < hoje
      );
      
      const vendasSemanaAnterior = vendasData.filter(v => 
        v && v.created_at && 
        new Date(v.created_at) >= quatorzeDiasAtras && 
        new Date(v.created_at) < seteDiasAtras
      );
      
      const totalUltimaSemana = vendasUltimaSemana.reduce((total, v) => {
        const valor = typeof v.valor_total === 'number' ? v.valor_total : 
                     parseFloat(v.valor_total || 0);
        return total + valor;
      }, 0);
      
      const totalSemanaAnterior = vendasSemanaAnterior.reduce((total, v) => {
        const valor = typeof v.valor_total === 'number' ? v.valor_total : 
                     parseFloat(v.valor_total || 0);
        return total + valor;
      }, 0);
      
      // Calcular crescimento percentual
      let crescimento = 0;
      if (totalSemanaAnterior > 0) {
        crescimento = ((totalUltimaSemana - totalSemanaAnterior) / totalSemanaAnterior) * 100;
      } else if (totalUltimaSemana > 0) {
        crescimento = 100; // Crescimento de 100% se não havia vendas na semana anterior
      }
      
      // Calcular o total de clientes válidos (excluindo registros sem dados essenciais)
      const totalClientesValidos = clientesData.filter(c => c && c.id).length;
      
      // Calcular produtos ativos
      const produtosAtivos = produtosData.filter(p => p && p.ativo === true).length;
      
      console.log('Estatísticas calculadas:', {
        totalVendas: vendasData.length,
        totalClientes: totalClientesValidos,
        vendasHoje: totalVendasHoje,
        ticketMedio: ticketMedio,
        produtosAtivos: produtosAtivos,
        crescimento: crescimento
      });
      
      setEstatisticas({
        totalVendas: vendasData.length,
        totalClientes: totalClientesValidos,
        vendasHoje: totalVendasHoje,
        ticketMedio: ticketMedio,
        produtosAtivos: produtosAtivos,
        crescimento: crescimento
      });
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
      // Manter as estatísticas existentes ou definir valores padrão
      setEstatisticas({
        totalVendas: 0,
        totalClientes: 0,
        vendasHoje: 0,
        ticketMedio: 0,
        produtosAtivos: 0,
        crescimento: 0
      });
    }
  };
  
  // Função para calcular os produtos mais vendidos
  const calcularTopProdutos = (vendasData, produtosData) => {
    try {
      // Mapa para armazenar a contagem de produtos vendidos
      const produtosVendidos = {};
      
      // Processar todas as vendas e seus itens
      vendasData.forEach(venda => {
        try {
          const itens = venda.itens || [];
          if (!Array.isArray(itens)) return;
          
          itens.forEach(item => {
            if (!item || !item.produto_id) return;
            
            const produtoId = item.produto_id;
            const quantidade = parseInt(item.quantidade) || 1;
            const preco = parseFloat(item.preco) || 0;
            
            if (produtosVendidos[produtoId]) {
              produtosVendidos[produtoId].quantidade += quantidade;
              produtosVendidos[produtoId].total += preco * quantidade;
            } else {
              produtosVendidos[produtoId] = {
                produto_id: produtoId,
                nome: item.nome || 'Produto sem nome',
                quantidade: quantidade,
                total: preco * quantidade
              };
            }
          });
        } catch (error) {
          console.error('Erro ao processar itens da venda:', error, venda);
        }
      });
      
      // Converter para array e ordenar
      const topProdutosList = Object.values(produtosVendidos)
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);
      
      // Buscar informações adicionais dos produtos se necessário
      const produtosComDetalhes = topProdutosList.map(produto => {
        const produtoCompleto = produtosData.find(p => p.id === produto.produto_id);
        if (produtoCompleto) {
          return {
            ...produto,
            categoria: produtoCompleto.categoria,
            imagem: produtoCompleto.imagens && produtoCompleto.imagens[0]
          };
        }
        return produto;
      });
      
      setTopProdutos(produtosComDetalhes);
    } catch (error) {
      console.error('Erro ao calcular top produtos:', error);
      setTopProdutos([]);
    }
  };
  
  // Função para calcular os melhores clientes
  const calcularTopClientes = async (vendasData, clientesData) => {
    try {
      // Mapa para armazenar dados de compra por cliente
      const clientesCompras = {};
      
      // Processar todas as vendas
      vendasData.forEach(venda => {
        if (!venda.cliente_id) return;
        
        const clienteId = venda.cliente_id;
        const valorTotal = parseFloat(venda.valor_total) || 0;
        
        if (clientesCompras[clienteId]) {
          clientesCompras[clienteId].total += valorTotal;
          clientesCompras[clienteId].compras += 1;
        } else {
          clientesCompras[clienteId] = {
            cliente_id: clienteId,
            total: valorTotal,
            compras: 1
          };
        }
      });
      
      // Selecionar os top 5 clientes por valor de compra
      const topClientesIds = Object.values(clientesCompras)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      
      // Juntar com informações dos clientes
      const topClientesCompletos = topClientesIds.map(cliente => {
        const dadosCliente = clientesData.find(c => c.id === cliente.cliente_id);
        
        if (dadosCliente) {
          return {
            ...cliente,
            nome: dadosCliente.nome || 'Cliente',
            email: dadosCliente.email || '-',
            telefone: dadosCliente.telefone || '-'
          };
        }
        
        // Cliente não encontrado nos dados carregados
        return {
          ...cliente,
          nome: 'Cliente não encontrado',
          email: '-',
          telefone: '-'
        };
      });
      
      setTopClientes(topClientesCompletos);
    } catch (error) {
      console.error('Erro ao calcular top clientes:', error);
      setTopClientes([]);
    }
  };
  
  if (!lojaId || loading) {
    return (
      <LojaLayout title="Dashboard Unificado" icon={<FiBarChart2 className="mr-2" />} lojaId={lojaId}>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </LojaLayout>
    );
  }
  
  return (
    <LojaLayout 
      title="Dashboard Unificado" 
      icon={<FiBarChart2 className="mr-2" />}
      lojaId={lojaId}
      loja={dadosLoja}
    >
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-6">Visão Geral do Negócio</h2>
        
        {/* Cards de Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-500 bg-opacity-30 p-3 mr-4">
                <FiDollarSign className="text-xl text-white" />
              </div>
              <div>
                <p className="text-blue-200 text-sm font-medium">Vendas Hoje</p>
                <h3 className="text-2xl font-bold text-white">{formatarMoeda(estatisticas.vendasHoje)}</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-center">
              <div className="rounded-full bg-green-500 bg-opacity-30 p-3 mr-4">
                <FiShoppingBag className="text-xl text-white" />
              </div>
              <div>
                <p className="text-green-200 text-sm font-medium">Total de Vendas</p>
                <h3 className="text-2xl font-bold text-white">{estatisticas.totalVendas}</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-center">
              <div className="rounded-full bg-purple-500 bg-opacity-30 p-3 mr-4">
                <FiUsers className="text-xl text-white" />
              </div>
              <div>
                <p className="text-purple-200 text-sm font-medium">Total de Clientes</p>
                <h3 className="text-2xl font-bold text-white">{estatisticas.totalClientes}</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-center">
              <div className="rounded-full bg-amber-500 bg-opacity-30 p-3 mr-4">
                <FiActivity className="text-xl text-white" />
              </div>
              <div>
                <p className="text-amber-200 text-sm font-medium">Ticket Médio</p>
                <h3 className="text-2xl font-bold text-white">{formatarMoeda(estatisticas.ticketMedio)}</h3>
              </div>
            </div>
          </div>
        </div>
        
        {/* Gráfico de Vendas */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FiBarChart2 className="mr-2 text-blue-400" />
              Evolução das Vendas
            </h3>
            
            <div className="flex space-x-2">
              <div className="flex space-x-1">
                <button 
                  onClick={() => setTipoGrafico('line')}
                  className={`px-2 py-1 rounded text-xs ${
                    tipoGrafico === 'line' 
                      ? 'bg-blue-700 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Linha
                </button>
                <button 
                  onClick={() => setTipoGrafico('bar')}
                  className={`px-2 py-1 rounded text-xs ${
                    tipoGrafico === 'bar' 
                      ? 'bg-blue-700 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Barra
                </button>
              </div>
              
              <div className="flex items-center text-gray-400 text-xs">
                <FiFilter className="mr-1" />
                <select 
                  value={periodoGrafico} 
                  onChange={(e) => setPeriodoGrafico(e.target.value)}
                  className="bg-gray-700 border-none rounded px-2 py-1 text-gray-200 text-xs"
                >
                  <option value="semana">Última Semana</option>
                  <option value="mes">Último Mês</option>
                  <option value="ano">Último Ano</option>
                </select>
              </div>
            </div>
          </div>
          
          {Array.isArray(todasVendas) ? (
            <GraficoVendas 
              vendas={todasVendas} 
              tipo={tipoGrafico} 
              periodo={periodoGrafico}
              altura={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] bg-gray-800 rounded-lg">
              <p className="text-gray-400">Carregando dados de vendas...</p>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Produtos Mais Vendidos */}
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FiTrendingUp className="mr-2 text-green-400" />
              Produtos Mais Vendidos
            </h3>
            
            <div className="space-y-4">
              {topProdutos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2">Produto</th>
                        <th className="text-right py-2">Qtd.</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProdutos.map((produto, index) => (
                        <tr key={index} className="border-b border-gray-700 last:border-0">
                          <td className="py-2">{produto.nome}</td>
                          <td className="text-right py-2">{produto.quantidade}</td>
                          <td className="text-right py-2">{formatarMoeda(produto.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">Nenhum produto vendido ainda.</p>
              )}
            </div>
          </div>
          
          {/* Clientes Mais Ativos */}
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FiUsers className="mr-2 text-blue-400" />
              Melhores Clientes
            </h3>
            
            <div className="space-y-4">
              {topClientes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2">Cliente</th>
                        <th className="text-right py-2">Compras</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topClientes.map((cliente, index) => (
                        <tr key={index} className="border-b border-gray-700 last:border-0">
                          <td className="py-2">{cliente.nome}</td>
                          <td className="text-right py-2">{cliente.compras}</td>
                          <td className="text-right py-2">{formatarMoeda(cliente.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">Nenhuma compra registrada.</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alertas de Estoque */}
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FiAlertCircle className="mr-2 text-amber-400" />
              Alertas de Estoque Baixo
            </h3>
            
            <div className="space-y-2">
              {alertasEstoque.length > 0 ? (
                alertasEstoque.slice(0, 6).map((produto, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-700 bg-opacity-50 rounded">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-amber-800 rounded-full flex items-center justify-center mr-3">
                        <FiPackage className="text-amber-300" />
                      </div>
                      <div>
                        <p className="font-medium">{produto.nome}</p>
                        <p className="text-xs text-gray-400">
                          {produto.cor && produto.tamanho 
                            ? `${produto.cor}, ${produto.tamanho}: ${produto.estoque} unid.` 
                            : `Estoque: ${produto.estoque} unid.`}
                        </p>
                      </div>
                    </div>
                    <span className="bg-amber-900 text-amber-100 text-xs px-2 py-1 rounded">Baixo</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center p-4 bg-gray-700 bg-opacity-30 rounded">
                  <FiCheck className="text-green-400 mr-2" />
                  <p className="text-gray-400">Todos os produtos com estoque adequado.</p>
                </div>
              )}
              
              {alertasEstoque.length > 6 && (
                <div className="text-center mt-2">
                  <button 
                    onClick={() => router.push(`/lojas/${lojaId}/produtos/estoque-baixo`)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Ver mais {alertasEstoque.length - 6} alertas
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Vendas Recentes */}
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FiCalendar className="mr-2 text-blue-400" />
              Vendas Recentes
            </h3>
            
            <div className="space-y-4">
              {vendasRecentes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2">Data</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-right py-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendasRecentes.slice(0, 5).map((venda, index) => (
                        <tr key={index} className="border-b border-gray-700 last:border-0">
                          <td className="py-2">
                            {new Date(venda.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              venda.status === 'concluida' ? 'bg-green-900 text-green-200' : 
                              venda.status === 'pendente' ? 'bg-amber-900 text-amber-200' :
                              'bg-blue-900 text-blue-200'
                            }`}>
                              {venda.status === 'concluida' ? 'Concluída' : 
                               venda.status === 'pendente' ? 'Pendente' : venda.status}
                            </span>
                          </td>
                          <td className="text-right py-2">{formatarMoeda(venda.valor_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {vendasRecentes.length > 5 && (
                    <div className="text-center mt-3">
                      <button 
                        onClick={() => router.push(`/lojas/${lojaId}/vendas`)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Ver todas as vendas
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">Nenhuma venda registrada.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </LojaLayout>
  );
} 