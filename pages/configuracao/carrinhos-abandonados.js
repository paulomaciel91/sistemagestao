import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft, FiSettings, FiCheck, FiClock, FiShoppingCart } from 'react-icons/fi';

export default function CarrinhosAbandonados() {
  const router = useRouter();
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [lojas, setLojas] = useState([]);
  const [lojaSelecionada, setLojaSelecionada] = useState('');
  const [tempoAbandonoHoras, setTempoAbandonoHoras] = useState(24);
  const [configuracoes, setConfiguracoes] = useState({});

  // Verificar se o Supabase está inicializado
  useEffect(() => {
    if (!loading && !isInitialized) {
      router.push('/configuracao');
    }
  }, [isInitialized, loading, router]);

  // Carregar dados quando o Supabase estiver pronto
  useEffect(() => {
    if (supabase) {
      carregarDados();
    }
  }, [supabase]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      
      // Carregar lojas
      const { data: lojasData, error: lojasError } = await supabase
        .from('lojas')
        .select('*')
        .order('nome', { ascending: true });
      
      if (lojasError) throw lojasError;
      setLojas(lojasData || []);
      
      // Carregar configurações existentes
      const { data: configData, error: configError } = await supabase
        .from('configuracoes_sistema')
        .select('*')
        .eq('tipo', 'carrinho_abandonado');
      
      if (configError) throw configError;
      
      // Organizar configurações por loja
      const configPorLoja = {};
      if (configData) {
        configData.forEach(config => {
          configPorLoja[config.loja_id] = config;
        });
      }
      
      setConfiguracoes(configPorLoja);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setCarregando(false);
    }
  };

  const configurarTrigger = async () => {
    if (!lojaSelecionada) {
      toast.error('Selecione uma loja para configurar');
      return;
    }
    
    if (tempoAbandonoHoras < 1) {
      toast.error('O tempo de abandono deve ser pelo menos 1 hora');
      return;
    }
    
    try {
      setProcessando(true);
      
      // Obter credenciais do Supabase
      const { data: supabaseCredsData, error: supabaseCredsError } = await supabase
        .from('credenciais_externas')
        .select('chave, valor')
        .eq('servico', 'supabase')
        .in('chave', ['url', 'anon_key'])
        .eq('loja_id', lojaSelecionada);
      
      if (supabaseCredsError) throw supabaseCredsError;
      
      if (!supabaseCredsData || supabaseCredsData.length < 2) {
        throw new Error('Credenciais do Supabase não configuradas para esta loja');
      }
      
      // Formatar credenciais
      const supabaseUrl = supabaseCredsData.find(c => c.chave === 'url')?.valor;
      const supabaseKey = supabaseCredsData.find(c => c.chave === 'anon_key')?.valor;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Credenciais do Supabase incompletas');
      }
      
      // Chamar API para configurar o trigger
      const response = await fetch('/api/supabase/carrinho-abandonado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lojaId: lojaSelecionada,
          horasAbandonado: tempoAbandonoHoras,
          supabaseUrl,
          supabaseKey
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao configurar trigger');
      }
      
      // Salvar/atualizar configuração
      const lojaSelecionadaConfig = configuracoes[lojaSelecionada];
      
      if (lojaSelecionadaConfig) {
        // Atualizar configuração existente
        await supabase
          .from('configuracoes_sistema')
          .update({
            valor: { 
              horas_abandono: tempoAbandonoHoras,
              trigger_nome: result.detalhes.trigger,
              funcao_nome: result.detalhes.funcao
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', lojaSelecionadaConfig.id);
      } else {
        // Criar nova configuração
        await supabase
          .from('configuracoes_sistema')
          .insert({
            loja_id: lojaSelecionada,
            tipo: 'carrinho_abandonado',
            valor: { 
              horas_abandono: tempoAbandonoHoras,
              trigger_nome: result.detalhes.trigger,
              funcao_nome: result.detalhes.funcao
            }
          });
      }
      
      toast.success('Configuração de carrinhos abandonados salva com sucesso');
      carregarDados();
      
    } catch (error) {
      console.error('Erro ao configurar trigger:', error);
      toast.error('Erro ao configurar: ' + error.message);
    } finally {
      setProcessando(false);
    }
  };

  // Reutilizar a função existente no Supabase para executar a detecção manualmente
  const executarDeteccaoManual = async () => {
    if (!lojaSelecionada) {
      toast.error('Selecione uma loja primeiro');
      return;
    }
    
    try {
      setProcessando(true);
      
      const config = configuracoes[lojaSelecionada];
      if (!config || !config.valor || !config.valor.funcao_nome) {
        toast.error('Configure o trigger de carrinhos abandonados primeiro');
        return;
      }
      
      // Executar a função manualmente
      const { error } = await supabase
        .rpc('executar_sql', { 
          p_sql: `SELECT ${config.valor.funcao_nome}()` 
        });
      
      if (error) throw error;
      
      toast.success('Detecção de carrinhos abandonados executada com sucesso');
      
    } catch (error) {
      console.error('Erro ao executar detecção manual:', error);
      toast.error('Erro: ' + error.message);
    } finally {
      setProcessando(false);
    }
  };

  if (loading || !isInitialized) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Configuração de Carrinhos Abandonados</title>
      </Head>

      <div className="container mx-auto p-4">
        <div className="mb-6">
          <Link href="/configuracao" className="flex items-center text-blue-500 hover:text-blue-700">
            <FiArrowLeft className="mr-2" /> Voltar para Configurações
          </Link>
          <h1 className="text-2xl font-bold mt-4 mb-6">Configuração de Carrinhos Abandonados</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <FiShoppingCart className="text-2xl text-blue-500 mr-2" />
            <h2 className="text-xl font-semibold">Configurar Detecção de Carrinhos Abandonados</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Esta função configura um processo automático que detecta carrinhos de compras que foram abandonados pelos clientes.
            Um carrinho é considerado abandonado quando permanece inativo por um determinado período de tempo.
            Após serem marcados como abandonados, estes carrinhos podem ser usados para campanhas de recuperação.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Selecione a Loja</label>
              <select
                value={lojaSelecionada}
                onChange={(e) => {
                  setLojaSelecionada(e.target.value);
                  // Restaurar as configurações da loja selecionada, se existirem
                  if (configuracoes[e.target.value]) {
                    setTempoAbandonoHoras(configuracoes[e.target.value].valor?.horas_abandono || 24);
                  }
                }}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              >
                <option value="">Selecione uma loja</option>
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tempo para considerar carrinho abandonado</label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={tempoAbandonoHoras}
                  onChange={(e) => setTempoAbandonoHoras(Number(e.target.value))}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 mr-2"
                />
                <span className="text-gray-600">horas</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Recomendado: 24 horas para e-commerce B2C, 48-72 horas para B2B.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-6">
              <button
                onClick={configurarTrigger}
                disabled={!lojaSelecionada || processando}
                className={`flex items-center px-4 py-2 rounded-md ${
                  !lojaSelecionada || processando
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <FiSettings className="mr-2" />
                {configuracoes[lojaSelecionada] 
                  ? 'Atualizar Configuração' 
                  : 'Configurar Trigger'}
              </button>
              
              <button
                onClick={executarDeteccaoManual}
                disabled={!lojaSelecionada || !configuracoes[lojaSelecionada] || processando}
                className={`flex items-center px-4 py-2 rounded-md ${
                  !lojaSelecionada || !configuracoes[lojaSelecionada] || processando
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <FiClock className="mr-2" />
                Executar Detecção Manualmente
              </button>
            </div>
          </div>
        </div>

        {/* Status das configurações por loja */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Status das Configurações</h2>
          
          {carregando ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : lojas.length === 0 ? (
            <p className="text-gray-600">Nenhuma loja cadastrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loja
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tempo de Abandono
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última Atualização
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lojas.map((loja) => {
                    const config = configuracoes[loja.id];
                    return (
                      <tr key={loja.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{loja.nome}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {config ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              <FiCheck className="mr-1" /> Configurado
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Não configurado
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {config ? (
                            <div className="text-sm text-gray-900">
                              {config.valor?.horas_abandono || 24} horas
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">—</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {config ? (
                            <div className="text-sm text-gray-900">
                              {new Date(config.updated_at).toLocaleString('pt-BR')}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">—</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 