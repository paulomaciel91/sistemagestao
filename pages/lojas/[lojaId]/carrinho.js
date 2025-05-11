import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import LojaLayout from '@/components/LojaLayout';
import Link from 'next/link';
import { FiShoppingCart, FiArrowUp, FiArrowDown, FiRefreshCw, FiUser, FiCalendar, FiClock, FiSend, FiCreditCard } from 'react-icons/fi';

export default function Carrinho() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState('7d');
  const [carrinhos, setCarrinhos] = useState([]);
  const [metricas, setMetricas] = useState({
    total: 0,
    recuperados: 0,
    valorTotal: 0,
    taxaRecuperacao: 0
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
      
      // Obter data inicial com base no período selecionado
      const dataInicial = obterDataInicial(periodo);
      
      // Buscar carrinhos abandonados do Supabase
      const { data: carrinhosDados, error: carrinhosError } = await supabase
        .from(`${lojaId}_carrinhos`)
        .select('*')
        .gte('data_abandono', dataInicial.toISOString())
        .order('data_abandono', { ascending: false });
      
      if (carrinhosError) {
        console.error('Erro ao buscar carrinhos:', carrinhosError);
        // Se não conseguir buscar, cai no backup de dados simulados
        const dadosSimulados = gerarDadosSimulados(periodo);
        setCarrinhos(dadosSimulados.carrinhos);
        setMetricas(dadosSimulados.metricas);
        toast.warning('Usando dados simulados devido a erro na consulta');
      } else {
        // Processar dados reais
        if (carrinhosDados && carrinhosDados.length > 0) {
          // Formatar os carrinhos para o formato adequado para a UI
          const carrinhosTratados = carrinhosDados.map(carrinho => {
            // Calcular horas desde o abandono
            const dataAbandono = new Date(carrinho.data_abandono);
            const agora = new Date();
            const diferencaHoras = Math.floor((agora - dataAbandono) / (1000 * 60 * 60));
            
            return {
              id: carrinho.id,
              cliente: {
                nome: carrinho.cliente_nome || 'Cliente Anônimo',
                email: carrinho.cliente_email || 'email@nao.disponivel'
              },
              itens: carrinho.itens || [],
              valor_total: carrinho.valor_total || 0,
              data_abandono: carrinho.data_abandono,
              recuperado: carrinho.recuperado || false,
              recuperacao_enviada: carrinho.mensagens_enviadas > 0,
              status: carrinho.status || 'abandonado',
              tempoAbandono: diferencaHoras
            };
          });
          
          setCarrinhos(carrinhosTratados);
          
          // Calcular métricas
          const totalCarrinhos = carrinhosTratados.length;
          const carrinhosRecuperados = carrinhosTratados.filter(c => c.recuperado).length;
          const valorTotal = carrinhosTratados.reduce((total, c) => total + c.valor_total, 0);
          const taxaRecuperacao = totalCarrinhos > 0 ? (carrinhosRecuperados / totalCarrinhos) * 100 : 0;
          
          setMetricas({
            total: totalCarrinhos,
            recuperados: carrinhosRecuperados,
            valorTotal: valorTotal,
            taxaRecuperacao: taxaRecuperacao
          });
        } else {
          // Sem dados, exibir zeros
          setCarrinhos([]);
          setMetricas({
            total: 0,
            recuperados: 0,
            valorTotal: 0,
            taxaRecuperacao: 0
          });
          
          toast.info('Nenhum carrinho abandonado encontrado para este período');
        }
      }
      
      setCarregando(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados: ' + error.message);
      setCarregando(false);
    }
  };

  // Função para definir a data inicial com base no período
  const obterDataInicial = (periodo) => {
    const dataAtual = new Date();
    
    switch (periodo) {
      case 'hoje':
        dataAtual.setHours(0, 0, 0, 0);
        break;
      case '30d':
        dataAtual.setDate(dataAtual.getDate() - 30);
        break;
      default: // '7d'
        dataAtual.setDate(dataAtual.getDate() - 7);
    }
    
    return dataAtual;
  };

  // Função para gerar dados simulados de carrinhos abandonados (fallback)
  const gerarDadosSimulados = (periodo) => {
    const dataAtual = new Date();
    const nomesClientes = ['Maria Silva', 'João Santos', 'Ana Oliveira', 'Pedro Costa', 
                        'Juliana Lima', 'Carlos Souza', 'Fernanda Pereira', 'Thiago Almeida',
                        'Patricia Ferreira', 'Bruno Carvalho'];
    
    const produtos = ['Camiseta Básica', 'Calça Jeans', 'Vestido Florido', 'Blusa de Moletom',
                    'Tênis Casual', 'Boné Esportivo', 'Jaqueta de Couro', 'Saia Midi',
                    'Shorts Jeans', 'Bolsa de Couro'];
    
    // Definir o período para filtrar os dados
    let diasAtras;
    switch (periodo) {
      case 'hoje':
        diasAtras = 1;
        break;
      case '30d':
        diasAtras = 30;
        break;
      default: // 7d
        diasAtras = 7;
    }
    
    // Gerar entre 5 e 15 carrinhos abandonados
    const numeroCarrinhos = Math.floor(Math.random() * 10) + 5;
    
    const carrinhos = Array.from({ length: numeroCarrinhos }, (_, index) => {
      // Data aleatória dentro do período
      const diasAleatorios = Math.floor(Math.random() * diasAtras);
      const horasAleatorias = Math.floor(Math.random() * 24);
      const dataAbandonado = new Date(dataAtual);
      dataAbandonado.setDate(dataAtual.getDate() - diasAleatorios);
      dataAbandonado.setHours(dataAtual.getHours() - horasAleatorias);
      
      // Cliente aleatório
      const clienteNome = nomesClientes[Math.floor(Math.random() * nomesClientes.length)];
      const email = clienteNome.toLowerCase().replace(' ', '.') + '@email.com';
      
      // Itens aleatórios (1 a 4 itens)
      const numItens = Math.floor(Math.random() * 3) + 1;
      const itens = Array.from({ length: numItens }, (_, i) => {
        const produto = produtos[Math.floor(Math.random() * produtos.length)];
        const preco = parseFloat((Math.random() * 150 + 50).toFixed(2));
        const quantidade = Math.floor(Math.random() * 2) + 1;
        
        return {
          id: `item-${index}-${i}`,
          nome: produto,
          preco: preco,
          quantidade: quantidade,
          subtotal: preco * quantidade
        };
      });
      
      // Calcular valor total do carrinho
      const valorTotal = itens.reduce((total, item) => total + item.subtotal, 0);
      
      // Status (maioria abandonado, alguns recuperados)
      const status = Math.random() > 0.7 ? 'recuperado' : 'abandonado';
      
      return {
        id: `carrinho-${index}`,
        cliente: {
          nome: clienteNome,
          email: email
        },
        itens: itens,
        valor_total: valorTotal,
        data_abandono: dataAbandonado,
        status: status,
        recuperado: status === 'recuperado',
        tempoAbandono: Math.floor(Math.random() * 48) + 1 // horas
      };
    });
    
    // Calcular métricas
    const totalCarrinhos = carrinhos.length;
    const carrinhosRecuperados = carrinhos.filter(c => c.recuperado).length;
    const valorTotal = carrinhos.reduce((total, c) => total + c.valor_total, 0);
    const taxaRecuperacao = totalCarrinhos > 0 ? (carrinhosRecuperados / totalCarrinhos) * 100 : 0;
    
    return {
      carrinhos: carrinhos,
      metricas: {
        total: totalCarrinhos,
        recuperados: carrinhosRecuperados,
        valorTotal: valorTotal,
        taxaRecuperacao: taxaRecuperacao
      }
    };
  };

  // Função para mudar o período dos dados
  const alterarPeriodo = (novoPeriodo) => {
    setPeriodo(novoPeriodo);
  };

  // Enviar mensagem de recuperação
  const enviarRecuperacao = async (carrinhoId) => {
    try {
      // Atualizar status do carrinho no Supabase
      const { error } = await supabase
        .from(`${lojaId}_carrinhos`)
        .update({ 
          mensagens_enviadas: supabase.rpc('increment', { 
            x: 1
          }),
          updated_at: new Date().toISOString()
        })
        .eq('id', carrinhoId);
      
      if (error) throw error;
      
      toast.success('Mensagem de recuperação enviada');
      
      // Atualizar status do carrinho na UI
      setCarrinhos(carrinhos.map(carrinho => {
        if (carrinho.id === carrinhoId) {
          return { ...carrinho, recuperacao_enviada: true };
        }
        return carrinho;
      }));
      
    } catch (error) {
      console.error('Erro ao enviar recuperação:', error);
      toast.error('Erro ao enviar recuperação: ' + error.message);
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
    <LojaLayout title="Carrinhos Abandonados" loja={loja} lojaId={lojaId} icon={<FiShoppingCart className="mr-2 text-indigo-400" />}>
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8">
        <h2 className="text-xl font-semibold mb-4 md:mb-0">Recuperação de Carrinhos</h2>
        
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
      
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card bg-gray-800">
          <div className="flex justify-between items-center">
            <h3 className="text-gray-400 text-sm">Total de Carrinhos</h3>
            <FiShoppingCart className="text-indigo-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{metricas.total}</p>
          <div className="mt-2 text-sm text-gray-400">
            Período: {periodo === 'hoje' ? 'Hoje' : periodo === '7d' ? 'Últimos 7 dias' : 'Últimos 30 dias'}
          </div>
        </div>
        
        <div className="card bg-gray-800">
          <div className="flex justify-between items-center">
            <h3 className="text-gray-400 text-sm">Carrinhos Recuperados</h3>
            <FiRefreshCw className="text-green-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{metricas.recuperados}</p>
          <div className="mt-2 text-sm text-gray-400">
            <span className={metricas.taxaRecuperacao > 20 ? 'text-green-400' : 'text-red-400'}>
              {metricas.taxaRecuperacao.toFixed(1)}% de taxa de recuperação
            </span>
          </div>
        </div>
        
        <div className="card bg-gray-800">
          <div className="flex justify-between items-center">
            <h3 className="text-gray-400 text-sm">Valor Total</h3>
            <FiCreditCard className="text-blue-500" />
          </div>
          <p className="text-3xl font-bold mt-2">R$ {metricas.valorTotal.toFixed(2).replace('.', ',')}</p>
          <div className="mt-2 text-sm text-gray-400">
            Valor em carrinhos abandonados
          </div>
        </div>
        
        <div className="card bg-gray-800">
          <div className="flex justify-between items-center">
            <h3 className="text-gray-400 text-sm">Oportunidades</h3>
            <FiSend className="text-purple-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{metricas.total - metricas.recuperados}</p>
          <div className="mt-2 text-sm text-gray-400">
            Carrinhos que podem ser recuperados
          </div>
        </div>
      </div>
      
      {/* Lista de carrinhos abandonados */}
      <div className="card bg-gray-800 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Carrinhos Abandonados</h3>
          <button 
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded flex items-center"
            onClick={() => carregarDados()}
          >
            <FiRefreshCw className="mr-2" /> Atualizar
          </button>
        </div>
        
        {carrinhos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FiShoppingCart className="text-5xl mx-auto mb-4 opacity-30" />
            <p>Nenhum carrinho abandonado encontrado para este período.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="pb-3 px-4">Cliente</th>
                  <th className="pb-3 px-4">Valor</th>
                  <th className="pb-3 px-4">Data de Abandono</th>
                  <th className="pb-3 px-4">Tempo</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Ação</th>
                </tr>
              </thead>
              <tbody>
                {carrinhos.map((carrinho) => (
                  <tr key={carrinho.id} className="hover:bg-gray-750">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{carrinho.cliente.nome}</span>
                        <span className="text-gray-400 text-xs">{carrinho.cliente.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        R$ {carrinho.valor_total.toFixed(2).replace('.', ',')}
                        <div className="text-xs text-gray-400">{carrinho.itens.length} {carrinho.itens.length === 1 ? 'item' : 'itens'}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span>{new Date(carrinho.data_abandono).toLocaleDateString()}</span>
                        <span className="text-gray-400 text-xs">{new Date(carrinho.data_abandono).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <FiClock className="mr-2 text-gray-400" />
                        <span>{carrinho.tempoAbandono} {carrinho.tempoAbandono === 1 ? 'hora' : 'horas'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {carrinho.recuperado ? (
                        <span className="px-2 py-1 bg-green-800/30 text-green-400 rounded text-xs">Recuperado</span>
                      ) : carrinho.recuperacao_enviada ? (
                        <span className="px-2 py-1 bg-blue-800/30 text-blue-400 rounded text-xs">Tentativa Enviada</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-800/30 text-red-400 rounded text-xs">Abandonado</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button 
                        className={`text-sm px-3 py-1 rounded ${carrinho.recuperado || carrinho.recuperacao_enviada 
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                          : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
                        onClick={() => enviarRecuperacao(carrinho.id)}
                        disabled={carrinho.recuperado || carrinho.recuperacao_enviada}
                      >
                        {carrinho.recuperacao_enviada ? 'Enviado' : 'Recuperar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </LojaLayout>
  );
} 