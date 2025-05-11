import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Layout from '@/components/Layout';
import LojaHeader from '@/components/LojaHeader';
import Link from 'next/link';
import { FiCreditCard, FiCheck, FiX, FiPlus, FiExternalLink, FiLink, FiInfo, FiRefreshCw } from 'react-icons/fi';

export default function Pagamentos() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [integracoes, setIntegracoes] = useState([]);
  
  // Integrações disponíveis
  const integracoesDisponiveis = [
    {
      id: 'mercadopago',
      nome: 'Mercado Pago',
      descricao: 'Processamento de pagamentos via cartões, boleto, PIX e Mercado Pago.',
      logo: 'https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo-0.png',
      conectado: false,
      credenciais: {},
      cor: '#009EE3'
    },
    {
      id: 'pagseguro',
      nome: 'PagSeguro',
      descricao: 'Solução completa para pagamentos online e via maquininha.',
      logo: 'https://logodownload.org/wp-content/uploads/2017/06/pagseguro-logo-5.png',
      conectado: false,
      credenciais: {},
      cor: '#4AB040'
    },
    {
      id: 'stripe',
      nome: 'Stripe',
      descricao: 'Plataforma de pagamentos para comércio eletrônico.',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/1200px-Stripe_Logo%2C_revised_2016.svg.png',
      conectado: false,
      credenciais: {},
      cor: '#6772E5'
    },
    {
      id: 'paypal',
      nome: 'PayPal',
      descricao: 'Carteiras digitais e pagamentos internacionais.',
      logo: 'https://logodownload.org/wp-content/uploads/2014/10/paypal-logo-0.png',
      conectado: false,
      credenciais: {},
      cor: '#003087'
    }
  ];

  // Carregar dados da loja quando o ID estiver disponível
  useEffect(() => {
    if (supabase && lojaId) {
      carregarDados();
    }
  }, [supabase, lojaId]);

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
      
      // Tentar carregar credenciais de integração existentes
      try {
        const { data: credenciaisData, error: credenciaisError } = await supabase
          .from('credenciais_externas')
          .select('*')
          .eq('loja_id', lojaId)
          .eq('servico', 'pagamento');
        
        if (credenciaisError && credenciaisError.code !== 'PGRST116') {
          throw credenciaisError;
        }
        
        // Se houver credenciais, atualizar o status das integrações
        if (credenciaisData && credenciaisData.length > 0) {
          // Associar credenciais às integrações disponíveis
          const integracoesAtualizadas = integracoesDisponiveis.map(integracao => {
            const credencial = credenciaisData.find(
              cred => cred.chave.startsWith(integracao.id)
            );
            
            if (credencial) {
              return {
                ...integracao,
                conectado: true,
                credenciais: {
                  id: credencial.id,
                  chave: credencial.chave,
                  valor: credencial.valor
                }
              };
            }
            
            return integracao;
          });
          
          setIntegracoes(integracoesAtualizadas);
        } else {
          setIntegracoes(integracoesDisponiveis);
        }
      } catch (error) {
        console.error('Erro ao carregar credenciais:', error);
        setIntegracoes(integracoesDisponiveis);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  // Mostrar modal de configuração da integração
  const abrirConfiguracao = (integracaoId) => {
    // Esta é apenas uma simulação para demonstração
    // Em uma implementação real, abriria um modal/formulário de configuração
    toast.info(`Funcionalidade de configuração do ${integracaoId} em desenvolvimento.`);
  };
  
  // Conectar integração (simulação)
  const conectarIntegracao = (integracaoId) => {
    // Simulação de conexão - em produção, seria um processo de OAuth ou API Key
    const novasIntegracoes = integracoes.map(integracao => {
      if (integracao.id === integracaoId) {
        return {
          ...integracao,
          conectado: true,
          credenciais: {
            id: `demo-${Date.now()}`,
            chave: `${integracaoId}_api_key`,
            valor: `sk_demo_${Math.random().toString(36).substring(2, 15)}`
          }
        };
      }
      return integracao;
    });
    
    setIntegracoes(novasIntegracoes);
    toast.success(`Integração com ${integracaoId} conectada com sucesso!`);
  };
  
  // Desconectar integração (simulação)
  const desconectarIntegracao = (integracaoId) => {
    if (!confirm(`Tem certeza que deseja desconectar a integração com ${integracaoId}?`)) {
      return;
    }
    
    const novasIntegracoes = integracoes.map(integracao => {
      if (integracao.id === integracaoId) {
        return {
          ...integracao,
          conectado: false,
          credenciais: {}
        };
      }
      return integracao;
    });
    
    setIntegracoes(novasIntegracoes);
    toast.success(`Integração com ${integracaoId} desconectada.`);
  };
  
  // Testar conexão (simulação)
  const testarConexao = (integracaoId) => {
    toast.success(`Conexão com ${integracaoId} testada com sucesso!`);
  };

  return (
    <Layout title="Integrações de Pagamento">
      <LojaHeader title="Integrações de Pagamento" loja={loja} lojaId={lojaId} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Gateways de Pagamento</h2>
        </div>
        
        {carregando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {integracoes.map((integracao) => (
                <div 
                  key={integracao.id} 
                  className={`card hover:shadow-lg transition-shadow duration-300 border-l-4`}
                  style={{ borderLeftColor: integracao.cor }}
                >
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center mr-4">
                        <img 
                          src={integracao.logo} 
                          alt={`${integracao.nome} logo`} 
                          className="max-w-full max-h-full"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{integracao.nome}</h3>
                        <p className="text-sm text-gray-400">{integracao.descricao}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      {integracao.conectado ? (
                        <span className="flex items-center text-green-400 text-sm font-medium">
                          <FiCheck className="mr-1" />
                          Conectado
                        </span>
                      ) : (
                        <span className="flex items-center text-gray-400 text-sm font-medium">
                          <FiX className="mr-1" />
                          Não Conectado
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between">
                    {integracao.conectado ? (
                      <div className="space-x-2">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => abrirConfiguracao(integracao.id)}
                        >
                          <FiCreditCard className="mr-1" />
                          Configurar
                        </button>
                        
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => testarConexao(integracao.id)}
                        >
                          <FiRefreshCw className="mr-1" />
                          Testar
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => conectarIntegracao(integracao.id)}
                      >
                        <FiPlus className="mr-1" />
                        Conectar
                      </button>
                    )}
                    
                    {integracao.conectado && (
                      <button
                        className="btn btn-sm btn-outline text-red-400 hover:text-red-300 hover:border-red-400"
                        onClick={() => desconectarIntegracao(integracao.id)}
                      >
                        Desconectar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="card mt-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FiLink className="text-primary-400 mr-2" />
                Links de Pagamento Rápido
              </h3>
              
              <p className="text-sm text-gray-300 mb-4">
                Crie links de pagamento para enviar aos seus clientes diretamente pelo WhatsApp, 
                e-mail ou redes sociais.
              </p>
              
              <button 
                className="btn btn-primary"
                onClick={() => toast.info('Funcionalidade de links de pagamento em desenvolvimento.')}
              >
                <FiPlus className="mr-2" />
                Criar Link de Pagamento
              </button>
            </div>
          </>
        )}
        
        <div className="mt-8 p-4 bg-gray-800 rounded-lg flex items-start gap-4">
          <FiInfo className="text-primary-400 text-2xl flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Sobre Integrações de Pagamento</h3>
            <p className="text-gray-300 text-sm mb-2">
              Esta é uma página de demonstração. Em uma implementação completa, você pode:
            </p>
            <ul className="text-gray-300 text-sm space-y-1 list-disc pl-5">
              <li>Conectar com múltiplos gateways de pagamento</li>
              <li>Gerar links de pagamento para produtos específicos</li>
              <li>Acompanhar pagamentos e transações em tempo real</li>
              <li>Configurar parcelamentos e descontos</li>
              <li>Gerenciar reembolsos e cancelamentos</li>
            </ul>
            
            <div className="flex mt-4">
              <Link 
                href="https://mercadopago.com.br/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline text-primary-400 border-primary-400 mr-2"
              >
                <FiExternalLink className="mr-1" />
                Documentação Mercado Pago
              </Link>
              
              <Link 
                href="https://stripe.com/docs/api"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline text-primary-400 border-primary-400"
              >
                <FiExternalLink className="mr-1" />
                Documentação Stripe
              </Link>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
} 