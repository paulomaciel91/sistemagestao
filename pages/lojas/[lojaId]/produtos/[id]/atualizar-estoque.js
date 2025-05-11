import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiMinus, FiCheck, FiPackage } from 'react-icons/fi';
import Layout from '@/components/Layout';
import LojaHeader from '@/components/LojaHeader';
import { useSupabase } from '@/context/SupabaseContext';

export default function AtualizarEstoque() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const { lojaId, id } = router.query;
  
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [produto, setProduto] = useState(null);
  const [loja, setLoja] = useState(null);
  const [estoque, setEstoque] = useState([]);
  const [estoqueOriginal, setEstoqueOriginal] = useState([]);
  
  useEffect(() => {
    if (supabase && lojaId && id) {
      carregarDados();
    }
  }, [supabase, lojaId, id]);
  
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
      
      // Carregar dados do produto
      const { data: produtoData, error: produtoError } = await supabase
        .from(`${lojaId}_produtos`)
        .select('*')
        .eq('id', id)
        .single();
        
      if (produtoError) {
        throw produtoError;
      }
      
      if (!produtoData) {
        toast.error('Produto não encontrado');
        router.push(`/lojas/${lojaId}/produtos`);
        return;
      }
      
      setProduto(produtoData);
      
      // Carregar estoque do produto
      const { data: estoqueData, error: estoqueError } = await supabase
        .from(`${lojaId}_estoque`)
        .select('*')
        .eq('produto_id', id);
        
      if (estoqueError) {
        throw estoqueError;
      }
      
      if (!estoqueData || estoqueData.length === 0) {
        // Se não houver estoque, criar entradas iniciais
        const novoEstoque = [];
        
        // Para cada combinação de cor e tamanho, criar uma entrada
        produtoData.cores.forEach(cor => {
          produtoData.tamanhos.forEach(tamanho => {
            novoEstoque.push({
              id: `temp_${cor}_${tamanho}`,
              produto_id: id,
              cor,
              tamanho,
              quantidade: 0
            });
          });
        });
        
        setEstoque(novoEstoque);
        setEstoqueOriginal(JSON.parse(JSON.stringify(novoEstoque)));
      } else {
        setEstoque(estoqueData);
        setEstoqueOriginal(JSON.parse(JSON.stringify(estoqueData)));
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error(`Erro ao carregar dados: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };
  
  const alterarQuantidade = (itemIndex, delta) => {
    const novoEstoque = [...estoque];
    const novaQuantidade = Math.max(0, novoEstoque[itemIndex].quantidade + delta);
    novoEstoque[itemIndex].quantidade = novaQuantidade;
    setEstoque(novoEstoque);
  };
  
  const salvarAlteracoes = async () => {
    try {
      setSalvando(true);
      
      // Verificar se houve mudanças
      const houveAlteracoes = estoque.some((item, index) => {
        const itemOriginal = estoqueOriginal[index];
        return item.quantidade !== itemOriginal.quantidade;
      });
      
      if (!houveAlteracoes) {
        toast.info('Nenhuma alteração foi feita no estoque.');
        router.push(`/lojas/${lojaId}/produtos/${id}`);
        return;
      }
      
      // Preparar as atualizações em lote
      const atualizacoes = estoque.map(item => {
        if (item.id.toString().startsWith('temp_')) {
          // Novo item a ser inserido
          return {
            produto_id: id,
            cor: item.cor,
            tamanho: item.tamanho,
            quantidade: parseInt(item.quantidade) || 0
          };
        } else {
          // Item existente a ser atualizado
          return {
            id: item.id,
            produto_id: id, // Garantir que produto_id esteja presente
            cor: item.cor,
            tamanho: item.tamanho,
            quantidade: parseInt(item.quantidade) || 0
          };
        }
      });

      // Separar inserções e atualizações
      const insercoes = atualizacoes.filter(item => item.id && item.id.toString().startsWith('temp_')).map(item => {
        // Remover o id temporário para inserção
        const { id, ...rest } = item;
        return rest;
      });
      
      const atualizacoesExistentes = atualizacoes.filter(item => item.id && !item.id.toString().startsWith('temp_'));

      // Executar inserções em lote
      if (insercoes.length > 0) {
        const { error: insercoesError } = await supabase
          .from(`${lojaId}_estoque`)
          .insert(insercoes);
          
        if (insercoesError) throw insercoesError;
      }

      // Executar atualizações em lote
      if (atualizacoesExistentes.length > 0) {
        for (const item of atualizacoesExistentes) {
          const { error } = await supabase
            .from(`${lojaId}_estoque`)
            .update({ quantidade: item.quantidade })
            .eq('id', item.id);
            
          if (error) throw error;
        }
      }
      
      // Calcular o estoque total do produto somando todas as quantidades
      const estoqueTotal = estoque.reduce((total, item) => total + (parseInt(item.quantidade) || 0), 0);
      
      // Atualizar o campo estoque no produto
      const { error: produtoError } = await supabase
        .from(`${lojaId}_produtos`)
        .update({ 
          estoque: estoqueTotal,
          estoque_total: estoqueTotal, // Garantir que ambos os campos sejam atualizados
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (produtoError) {
        console.error('Erro ao atualizar o produto:', produtoError);
        // Se o campo estoque_total não existir, tentar apenas com o campo estoque
        const { error: fallbackError } = await supabase
          .from(`${lojaId}_produtos`)
          .update({ 
            estoque: estoqueTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
          
        if (fallbackError) throw fallbackError;
      }
      
      toast.success('Estoque atualizado com sucesso!');
      router.push(`/lojas/${lojaId}/produtos/${id}`);
      
    } catch (error) {
      console.error('Erro ao salvar alterações no estoque:', error);
      toast.error(`Erro ao salvar alterações: ${error.message}`);
      setSalvando(false);
    }
  };
  
  if (carregando) {
    return (
      <Layout title="Carregando...">
        <main className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
        </main>
      </Layout>
    );
  }
  
  if (!produto) {
    return (
      <Layout title="Produto não encontrado">
        <main className="container mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <FiPackage className="mx-auto text-5xl mb-4 text-gray-500" />
            <h2 className="text-xl font-semibold mb-4">Produto não encontrado</h2>
            <Link
              href={`/lojas/${lojaId}/produtos`}
              className="btn btn-primary"
            >
              Voltar para lista de produtos
            </Link>
          </div>
        </main>
      </Layout>
    );
  }
  
  return (
    <Layout title={`Atualizar Estoque - ${produto.nome}`}>
      <LojaHeader title="Atualizar Estoque do Produto" loja={loja} lojaId={lojaId} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link 
            href={`/lojas/${lojaId}/produtos/${id}`}
            className="text-gray-400 hover:text-white inline-flex items-center"
          >
            <FiArrowLeft className="mr-1" />
            Voltar para detalhes do produto
          </Link>
        </div>
        
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">{produto.nome}</h1>
            <p className="text-gray-400">Atualize as quantidades em estoque para cada combinação de cor e tamanho.</p>
          </div>
          
          <div className="bg-gray-900 rounded-lg overflow-hidden mb-6">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Cor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tamanho
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {estoque.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 whitespace-nowrap">{item.cor}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{item.tamanho}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span 
                        className={`font-semibold ${
                          item.quantidade <= produto.estoque_minimo
                            ? 'text-yellow-500'
                            : 'text-green-500'
                        }`}
                      >
                        {item.quantidade}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => alterarQuantidade(index, -1)}
                          className="bg-gray-700 hover:bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center text-white"
                          disabled={item.quantidade <= 0}
                        >
                          <FiMinus />
                        </button>
                        <button
                          onClick={() => alterarQuantidade(index, 1)}
                          className="bg-blue-700 hover:bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-white"
                        >
                          <FiPlus />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {estoque.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-4 text-center text-gray-400">
                      Nenhum item de estoque encontrado. Adicione cores e tamanhos ao produto primeiro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              onClick={salvarAlteracoes}
              className="btn btn-primary flex items-center"
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <FiCheck className="mr-2" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </Layout>
  );
} 