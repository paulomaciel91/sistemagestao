import { useState } from 'react';
import Head from 'next/head';
import { FiAlertTriangle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { useSupabase } from '@/context/SupabaseContext';

export default function ResetDatabase() {
  const { supabase, isInitialized } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const resetarBancoDados = async () => {
    // Confirmar ação com o usuário
    if (!confirm('ATENÇÃO: Esta ação vai apagar TODAS as tabelas e dados do banco. Tem certeza que deseja continuar?')) {
      return;
    }
    
    try {
      setLoading(true);
      setErro(null);
      setResultado(null);
      
      // 1. Primeiro vamos listar todas as lojas para podermos apagar suas tabelas específicas
      const { data: lojas, error: lojasError } = await supabase
        .from('lojas')
        .select('identificador');
      
      if (lojasError) throw lojasError;
      
      const resultados = [];
      
      // 2. Para cada loja, vamos tentar apagar as tabelas específicas
      if (lojas) {
        for (const loja of lojas) {
          const lojaId = loja.identificador;
          
          // Tabelas por loja
          const tabelas = [
            `${lojaId}_config`,
            `${lojaId}_produtos`,
            `${lojaId}_estoque`,
            `${lojaId}_vendas`,
            `${lojaId}_clientes`,
            `${lojaId}_promocoes`
          ];
          
          for (const tabela of tabelas) {
            try {
              const { error } = await supabase.rpc('executar_sql', {
                p_sql: `DROP TABLE IF EXISTS ${tabela}`
              });
              
              resultados.push({
                tabela,
                status: error ? 'erro' : 'sucesso',
                mensagem: error ? error.message : 'Tabela removida'
              });
            } catch (error) {
              resultados.push({
                tabela,
                status: 'erro',
                mensagem: error.message
              });
            }
          }
        }
      }
      
      // 3. Apagar tabelas globais
      const tabelasGlobais = [
        'lojas',
        'webhooks_n8n',
        'credenciais_externas'
      ];
      
      for (const tabela of tabelasGlobais) {
        try {
          const { error } = await supabase.rpc('executar_sql', {
            p_sql: `DROP TABLE IF EXISTS ${tabela}`
          });
          
          resultados.push({
            tabela,
            status: error ? 'erro' : 'sucesso',
            mensagem: error ? error.message : 'Tabela removida'
          });
        } catch (error) {
          resultados.push({
            tabela,
            status: 'erro',
            mensagem: error.message
          });
        }
      }
      
      // 4. Apagar funções
      const funcoes = [
        'criar_tabela_loja_config',
        'criar_tabela_produtos',
        'criar_tabela_estoque',
        'criar_tabela_vendas',
        'criar_tabela_clientes',
        'criar_tabela_promocoes',
        'executar_sql'
      ];
      
      for (const funcao of funcoes) {
        try {
          const { error } = await supabase.rpc('executar_sql', {
            p_sql: `DROP FUNCTION IF EXISTS ${funcao}`
          });
          
          resultados.push({
            funcao,
            status: error ? 'erro' : 'sucesso',
            mensagem: error ? error.message : 'Função removida'
          });
        } catch (error) {
          resultados.push({
            funcao,
            status: 'erro',
            mensagem: error.message
          });
        }
      }
      
      // Finalizar
      setResultado({
        timestamp: new Date().toISOString(),
        resultados
      });
      
    } catch (error) {
      console.error('Erro ao resetar banco:', error);
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Head>
        <title>Reset do Banco de Dados</title>
      </Head>

      <main className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center">Resetar Banco de Dados</h1>
            
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 mb-8">
              <div className="flex items-start">
                <FiAlertTriangle className="text-red-500 text-2xl mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h2 className="text-xl font-semibold text-red-400 mb-2">Atenção: Área de Perigo!</h2>
                  <p className="mb-3">
                    Esta operação vai <strong>apagar permanentemente</strong> todas as tabelas e dados 
                    do seu banco de dados do Supabase. Isso inclui:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mb-4">
                    <li>Tabelas de todas as lojas cadastradas</li>
                    <li>Configurações, produtos, estoque, vendas, clientes e promoções</li>
                    <li>Tabelas globais de lojas, webhooks e credenciais</li>
                    <li>Funções SQL utilizadas pelo sistema</li>
                  </ul>
                  <p className="text-sm text-red-300">
                    Use esta função apenas em ambiente de desenvolvimento ou quando quiser reinicializar 
                    completamente o sistema.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={resetarBancoDados}
                disabled={loading || !isInitialized}
                className="btn btn-lg btn-error flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin mr-2">
                      <FiRefreshCw />
                    </div>
                    Resetando banco de dados...
                  </>
                ) : (
                  <>
                    <FiAlertTriangle className="mr-2" />
                    Resetar Banco de Dados
                  </>
                )}
              </button>
            </div>
            
            {erro && (
              <div className="mt-8 bg-red-900/30 border border-red-700 rounded-lg p-4">
                <p className="font-medium text-red-400">Erro ao resetar banco de dados:</p>
                <p className="mt-1">{erro}</p>
              </div>
            )}
            
            {resultado && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <FiCheckCircle className="text-green-500 mr-2" />
                  Processo de Reset Concluído
                </h3>
                
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-700 flex justify-between">
                    <span className="font-medium">Item</span>
                    <span className="font-medium">Resultado</span>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {resultado.resultados.map((item, index) => (
                      <div 
                        key={index} 
                        className="p-3 border-b border-gray-700 flex justify-between items-center"
                      >
                        <span>
                          {item.tabela || item.funcao}
                        </span>
                        <span className={item.status === 'sucesso' ? 'text-green-400' : 'text-red-400'}>
                          {item.status === 'sucesso' ? 'Removido' : 'Erro'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <p className="mt-6 text-center">
                  Banco de dados resetado com sucesso. Você pode agora reinicializar o sistema.
                </p>
                
                <div className="flex justify-center mt-4">
                  <a href="/configuracao/inicial" className="btn btn-primary">
                    Ir para Configuração Inicial
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 