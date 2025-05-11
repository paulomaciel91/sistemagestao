import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import LojaLayout from '@/components/LojaLayout';
import Link from 'next/link';
import { FiAlertTriangle, FiTag, FiPackage, FiArrowLeft, FiPlus, FiEdit2, FiRefreshCw, FiInfo } from 'react-icons/fi';

export default function EstoqueBaixo() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [alertas, setAlertas] = useState([]);

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
      
      // Carregar produtos
      const { data: produtosData, error: produtosError } = await supabase
        .from(`${lojaId}_produtos`)
        .select('id, nome, estoque_minimo')
        .order('nome', { ascending: true });
      
      if (produtosError && produtosError.code !== 'PGRST116') {
        throw produtosError;
      }
      
      // Carregar estoque para verificar alertas
      if (produtosData && produtosData.length > 0) {
        const { data: estoqueData, error: estoqueError } = await supabase
          .from(`${lojaId}_estoque`)
          .select('produto_id, tamanho, cor, quantidade');
          
        if (estoqueError && estoqueError.code !== 'PGRST116') {
          throw estoqueError;
        }
        
        // Identificar produtos com estoque baixo
        const alertasEstoque = [];
        
        // Verificar alertas de estoque
        produtosData.forEach(produto => {
          const estoqueItens = estoqueData?.filter(item => item.produto_id === produto.id) || [];
          
          estoqueItens.forEach(item => {
            if (item.quantidade <= produto.estoque_minimo) {
              alertasEstoque.push({
                produto_id: produto.id,
                produto_nome: produto.nome,
                tamanho: item.tamanho,
                cor: item.cor,
                quantidade: item.quantidade,
                estoque_minimo: produto.estoque_minimo
              });
            }
          });
        });
        
        setAlertas(alertasEstoque);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <LojaLayout title="Alertas de Estoque Baixo" loja={loja} lojaId={lojaId} icon={<FiAlertTriangle className="mr-2 text-amber-400" />}>
      <main className="container mx-auto px-4 py-8">
        {/* Cabeçalho com ações */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 lg:mb-0">
            <h2 className="text-xl font-semibold flex items-center">
              <FiAlertTriangle className="mr-2 text-amber-400" />
              Alertas de Estoque Baixo
            </h2>
            <Link
              href={`/lojas/${lojaId}/produtos`}
              className="text-gray-300 hover:text-white flex items-center"
            >
              <FiArrowLeft className="mr-1" />
              Voltar para produtos
            </Link>
          </div>
          
          <button
            onClick={carregarDados}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center text-sm"
          >
            <FiRefreshCw className="mr-1.5" />
            Atualizar dados
          </button>
        </div>
        
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <FiInfo className="text-blue-400 mt-1 mr-3 flex-shrink-0" />
            <div>
              <p className="text-blue-100 font-medium">Sobre os alertas de estoque baixo</p>
              <p className="text-blue-200/80 text-sm mt-1">
                Esta página exibe todos os produtos que estão com quantidade em estoque menor ou igual ao estoque mínimo configurado.
                Recomendamos que você verifique esta lista regularmente e faça a reposição dos itens para evitar a indisponibilidade de produtos.
              </p>
            </div>
          </div>
        </div>
        
        {/* Lista de alertas */}
        {carregando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : alertas.length > 0 ? (
          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Produto
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Cor
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tamanho
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Quantidade Atual
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Mínimo
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {alertas.map((alerta, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{alerta.produto_nome}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{alerta.cor}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{alerta.tamanho}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-red-400">{alerta.quantidade}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{alerta.estoque_minimo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/lojas/${lojaId}/produtos/${alerta.produto_id}/atualizar-estoque`}
                          className="text-primary-400 hover:text-primary-300 mr-3"
                        >
                          <FiEdit2 className="inline mr-1" />
                          Atualizar Estoque
                        </Link>
                        <Link
                          href={`/lojas/${lojaId}/produtos/${alerta.produto_id}`}
                          className="text-amber-400 hover:text-amber-300"
                        >
                          <FiTag className="inline mr-1" />
                          Ver Produto
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-10 text-center">
            <FiPackage className="text-6xl mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-medium mb-2">Nenhum alerta de estoque</h3>
            <p className="text-gray-400 mb-6">
              Todos os seus produtos estão com estoque acima do nível mínimo configurado.
            </p>
            <Link
              href={`/lojas/${lojaId}/produtos`}
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <FiArrowLeft className="mr-2" />
              Voltar para produtos
            </Link>
          </div>
        )}
      </main>
    </LojaLayout>
  );
} 