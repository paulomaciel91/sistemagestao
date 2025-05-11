import { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiEdit2, FiPackage, FiTag, FiCheck, FiX, FiAlertTriangle, FiChevronLeft, FiChevronRight, FiEye, FiImage, FiSave, FiPlus, FiMinus, FiInfo } from 'react-icons/fi';
import Layout from '@/components/Layout';
import LojaHeader from '@/components/LojaHeader';
import { useSupabase } from '@/context/SupabaseContext';
import { atualizarTabelasProdutos } from '@/lib/supabaseUtils';

export default function DetalhesProduto() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const { lojaId, id } = router.query;
  
  const [carregando, setCarregando] = useState(true);
  const [produto, setProduto] = useState(null);
  const [loja, setLoja] = useState(null);
  const [estoque, setEstoque] = useState([]);
  const [imagemAtual, setImagemAtual] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [produtoEditarId, setProdutoEditarId] = useState(null);
  const [uploadImagens, setUploadImagens] = useState([]);
  const [previewImagens, setPreviewImagens] = useState([]);
  const [novoProdutoData, setNovoProdutoData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: '',
    estoque: 10,
    estoque_minimo: 5,
    cores: [],
    tamanhos: [],
    ativo: true,
    destaque: false
  });

  // Para cores e tamanhos novos
  const [novaCor, setNovaCor] = useState('');
  const [novoTamanho, setNovoTamanho] = useState('');
  
  // Cores e tamanhos predefinidos para o modal
  const coresPredefinidas = ["Preto", "Branco", "Azul", "Vermelho", "Verde", "Amarelo", "Rosa", "Roxo", "Laranja", "Marrom", "Cinza"];
  const tamanhosPredefinidos = ["PP", "P", "M", "G", "GG", "XG", "XXG", "36", "38", "40", "42", "44", "46", "48", "50", "Único"];
  
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
      
      setEstoque(estoqueData || []);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error(`Erro ao carregar dados: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };
  
  const proximaImagem = () => {
    if (produto?.imagens?.length > 0) {
      setImagemAtual((atual) => (atual + 1) % produto.imagens.length);
    }
  };
  
  const imagemAnterior = () => {
    if (produto?.imagens?.length > 0) {
      setImagemAtual((atual) => (atual - 1 + produto.imagens.length) % produto.imagens.length);
    }
  };
  
  // Abrir modal de edição
  const editarProduto = () => {
    // Resetar estados de upload de imagens
    setUploadImagens([]);
    setPreviewImagens([]);
    
    // Definir dados do produto
    setNovoProdutoData({
      ...produto,
      cores: produto.cores || [],
      tamanhos: produto.tamanhos || []
    });
    
    // Mostrar imagens existentes se houver
    if (produto.imagens && produto.imagens.length > 0) {
      // Como são URLs existentes (não File objects), usamos direto como preview
      setPreviewImagens(produto.imagens);
    }
    
    setModoEdicao(true);
    setProdutoEditarId(produto.id);
    setShowModal(true);
  };

  // Fechar modal
  const fecharModal = () => {
    setShowModal(false);
    setModoEdicao(false);
    setProdutoEditarId(null);
    setNovoProdutoData({
      nome: '',
      descricao: '',
      preco: '',
      categoria: '',
      estoque: 10,
      estoque_minimo: 5,
      cores: [],
      tamanhos: [],
      ativo: true,
      destaque: false
    });
    setNovaCor('');
    setNovoTamanho('');
    setUploadImagens([]);
    setPreviewImagens([]);
  };

  // Manipular alterações nos campos do formulário
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Para campos checkbox, usar o valor checked
    if (type === 'checkbox') {
      setNovoProdutoData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    // Para campo de preço, garantir que seja um número válido
    if (name === 'preco') {
      // Remover caracteres não numéricos, exceto ponto e vírgula
      const valorLimpo = value.replace(/[^\d,.]/g, '');
      // Substituir vírgula por ponto para cálculos
      const valorFinal = valorLimpo.replace(',', '.');
      setNovoProdutoData(prev => ({ ...prev, [name]: valorFinal }));
      return;
    }
    
    setNovoProdutoData(prev => ({ ...prev, [name]: value }));
  };

  // Adicionar nova cor
  const adicionarCor = () => {
    if (!novaCor.trim()) return;
    
    if (!novoProdutoData.cores.includes(novaCor.trim())) {
      setNovoProdutoData(prev => ({
        ...prev,
        cores: [...prev.cores, novaCor.trim()]
      }));
    }
    
    setNovaCor('');
  };

  // Remover cor
  const removerCor = (cor) => {
    setNovoProdutoData(prev => ({
      ...prev,
      cores: prev.cores.filter(c => c !== cor)
    }));
  };

  // Adicionar novo tamanho
  const adicionarTamanho = () => {
    if (!novoTamanho.trim()) return;
    
    if (!novoProdutoData.tamanhos.includes(novoTamanho.trim())) {
      setNovoProdutoData(prev => ({
        ...prev,
        tamanhos: [...prev.tamanhos, novoTamanho.trim()]
      }));
    }
    
    setNovoTamanho('');
  };

  // Remover tamanho
  const removerTamanho = (tamanho) => {
    setNovoProdutoData(prev => ({
      ...prev,
      tamanhos: prev.tamanhos.filter(t => t !== tamanho)
    }));
  };

  // Manipular seleção de imagens
  const handleImagemChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Verificar limite de imagens (considerando previews existentes)
    const totalImagens = previewImagens.length + files.length;
    if (totalImagens > 6) {
      toast.error('Máximo de 6 imagens permitido');
      return;
    }
    
    // Verificar cada arquivo
    const arquivosValidos = files.filter(file => {
      // Verificar tipo
      if (!file.type.match('image.*')) {
        toast.error(`Arquivo "${file.name}" não é uma imagem válida`);
        return false;
      }
      
      // Verificar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Imagem "${file.name}" excede o limite de 5MB`);
        return false;
      }
      
      return true;
    });
    
    // Adicionar arquivos válidos
    setUploadImagens(prev => [...prev, ...arquivosValidos]);
    
    // Criar previews para novos arquivos
    const novasPreviewsUrls = arquivosValidos.map(file => URL.createObjectURL(file));
    setPreviewImagens(prev => [...prev, ...novasPreviewsUrls]);
  };

  // Remover imagem
  const removerImagem = (index) => {
    // Se estamos em modo de edição e é uma imagem existente do produto
    const isExistingImage = index < (produto?.imagens?.length || 0) && modoEdicao;
    
    if (isExistingImage) {
      // Se for imagem existente (URL do storage), apenas remover do preview
      // e atualizar as imagens do produto ao salvar
      const novosPreviews = [...previewImagens];
      novosPreviews.splice(index, 1);
      setPreviewImagens(novosPreviews);
      
      // Atualizar as imagens no estado do produto sendo editado
      setNovoProdutoData(prev => ({
        ...prev,
        imagens: novosPreviews
      }));
    } else {
      // Se for uma nova imagem sendo adicionada agora
      const indexNoUpload = index - (modoEdicao ? (produto?.imagens?.length || 0) : 0);
      
      if (indexNoUpload >= 0 && indexNoUpload < uploadImagens.length) {
        // Remover do array de upload
        const novasImagens = [...uploadImagens];
        novasImagens.splice(indexNoUpload, 1);
        setUploadImagens(novasImagens);
      }
      
      // Remover preview
      const novosPreviews = [...previewImagens];
      // Revogar URL para evitar memory leaks
      if (previewImagens[index] && previewImagens[index].startsWith('blob:')) {
        URL.revokeObjectURL(previewImagens[index]);
      }
      novosPreviews.splice(index, 1);
      setPreviewImagens(novosPreviews);
    }
  };

  // Upload das imagens para o storage
  const uploadImagesStorage = async () => {
    if (uploadImagens.length === 0) return [];
    
    try {
      // Verificar se o bucket 'produtos' existe, se não, criar
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets.some(bucket => bucket.name === 'produtos');
      
      if (!bucketExists) {
        const { error: bucketError } = await supabase.storage.createBucket('produtos', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (bucketError) {
          throw new Error(`Erro ao criar bucket de armazenamento: ${bucketError.message}`);
        }
      }
      
      // Criar pasta para a loja se não existir
      const timestamp = Date.now();
      const folderPath = `${lojaId}/produtos/${timestamp}`;
      const imagensUrls = [];
      
      // Upload de cada imagem
      for (let i = 0; i < uploadImagens.length; i++) {
        const file = uploadImagens[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${i + 1}.${fileExt}`;
        const filePath = `${folderPath}/${fileName}`;
        
        try {
          // Upload para o bucket 'produtos' no storage do Supabase
          const { data, error } = await supabase.storage
            .from('produtos')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type
            });
          
          if (error) {
            console.error('Erro ao fazer upload:', error);
            toast.error(`Erro ao enviar imagem ${i + 1}: ${error.message}`);
            continue;
          }
          
          // Obter URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('produtos')
            .getPublicUrl(filePath);
          
          // Adicionar URL à lista
          imagensUrls.push(publicUrl);
          
          console.log(`Imagem ${i + 1} enviada com sucesso:`, publicUrl);
        } catch (uploadError) {
          console.error(`Erro ao processar imagem ${i + 1}:`, uploadError);
          toast.error(`Erro ao processar imagem ${i + 1}: ${uploadError.message}`);
        }
      }
      
      return imagensUrls;
    } catch (error) {
      console.error('Erro ao fazer upload das imagens:', error);
      throw error;
    }
  };

  // Salvar alterações do produto
  const salvarProduto = async (e) => {
    e.preventDefault();
    
    // Validar dados
    if (!novoProdutoData.nome.trim()) {
      toast.error('O nome do produto é obrigatório');
      return;
    }
    
    if (!novoProdutoData.preco || isNaN(novoProdutoData.preco) || parseFloat(novoProdutoData.preco) <= 0) {
      toast.error('Informe um preço válido para o produto');
      return;
    }
    
    if (novoProdutoData.cores.length === 0) {
      toast.error('Adicione pelo menos uma cor para o produto');
      return;
    }
    
    if (novoProdutoData.tamanhos.length === 0) {
      toast.error('Adicione pelo menos um tamanho para o produto');
      return;
    }
    
    try {
      setCarregando(true);
      
      // Determinar quais imagens usar
      let imagensFinais = [];
      
      // Se não há novas imagens para upload e já existem previews, manter as existentes
      if (uploadImagens.length === 0 && previewImagens.length > 0) {
        // Usar as imagens do preview (que podem ser as originais ou um subconjunto delas)
        imagensFinais = previewImagens;
      } 
      // Se há novas imagens, fazer upload
      else if (uploadImagens.length > 0) {
        const novasImagensUrls = await uploadImagesStorage();
        
        // Se o upload foi bem-sucedido e há URLs novas
        if (novasImagensUrls.length > 0) {
          // Se estamos editando e já temos previews de imagens existentes
          if (modoEdicao && previewImagens.length > uploadImagens.length) {
            // Combinar imagens existentes (que não são novas uploads) com as novas
            // Pegamos as imagens existentes que não são uploads novos
            const imagensExistentes = previewImagens.filter(url => 
              !url.startsWith('blob:') && !url.includes('objectURL')
            );
            imagensFinais = [...imagensExistentes, ...novasImagensUrls];
          } else {
            // Caso contrário, usar apenas as novas URLs
            imagensFinais = novasImagensUrls;
          }
        } else {
          // Se o upload falhou mas temos previews, usar os previews
          if (previewImagens.length > 0) {
            imagensFinais = previewImagens.filter(url => 
              !url.startsWith('blob:') && !url.includes('objectURL')
            );
          }
        }
      }
      
      // Validar se temos pelo menos uma imagem
      if (imagensFinais.length === 0) {
        toast.error('É necessário pelo menos uma imagem para o produto');
        setCarregando(false);
        return;
      }
      
      // Dados para atualizar
      const produtoData = {
        ...novoProdutoData,
        preco: parseFloat(novoProdutoData.preco),
        imagens: imagensFinais,
        updated_at: new Date().toISOString()
      };
      
      // Garantir que dados numéricos sejam de fato números
      produtoData.estoque = parseInt(produtoData.estoque) || 0;
      produtoData.estoque_minimo = parseInt(produtoData.estoque_minimo) || 0;
      
      // Atualizar produto no banco
      const { error } = await supabase
        .from(`${lojaId}_produtos`)
        .update(produtoData)
        .eq('id', produtoEditarId);
      
      if (error) {
        console.error('Erro ao salvar no Supabase:', error);
        throw error;
      }
      
      // Atualizar estado local com ID
      setProduto({...produtoData, id: produtoEditarId});
      
      // Verificar se houve alterações nas cores ou tamanhos
      const coresAdicionadas = novoProdutoData.cores.filter(cor => !produto.cores?.includes(cor));
      const tamanhosAdicionados = novoProdutoData.tamanhos.filter(tamanho => !produto.tamanhos?.includes(tamanho));
      const coresRemovidas = (produto.cores || []).filter(cor => !novoProdutoData.cores.includes(cor));
      const tamanhosRemovidos = (produto.tamanhos || []).filter(tamanho => !novoProdutoData.tamanhos.includes(tamanho));
      
      // Se houve alterações nas cores ou tamanhos, atualizar o estoque
      if (coresAdicionadas.length > 0 || tamanhosAdicionados.length > 0 || 
          coresRemovidas.length > 0 || tamanhosRemovidos.length > 0) {
        // Para novas combinações, criar registros de estoque
        const registrosEstoque = [];
        
        // Criar estoque para novas combinações de cores e tamanhos
        for (const cor of coresAdicionadas) {
          for (const tamanho of novoProdutoData.tamanhos) {
            registrosEstoque.push({
              produto_id: produtoEditarId,
              cor,
              tamanho,
              quantidade: parseInt(novoProdutoData.estoque) || 0
            });
          }
        }
        
        for (const tamanho of tamanhosAdicionados) {
          for (const cor of novoProdutoData.cores.filter(c => !coresAdicionadas.includes(c))) {
            registrosEstoque.push({
              produto_id: produtoEditarId,
              cor,
              tamanho,
              quantidade: parseInt(novoProdutoData.estoque) || 0
            });
          }
        }
        
        // Inserir novos registros de estoque
        if (registrosEstoque.length > 0) {
          try {
            const { error: estoqueError } = await supabase
              .from(`${lojaId}_estoque`)
              .insert(registrosEstoque);
              
            if (estoqueError) {
              console.error('Erro ao criar novos registros de estoque:', estoqueError);
            }
          } catch (estoqueErr) {
            console.error('Erro na inserção de estoque:', estoqueErr);
          }
        }
        
        // Remover registros de estoque para combinações excluídas
        for (const cor of coresRemovidas) {
          try {
            const { error: deleteError } = await supabase
              .from(`${lojaId}_estoque`)
              .delete()
              .eq('produto_id', produtoEditarId)
              .eq('cor', cor);
              
            if (deleteError) {
              console.error('Erro ao excluir registros de estoque:', deleteError);
            }
          } catch (deleteErr) {
            console.error('Erro na exclusão de estoque:', deleteErr);
          }
        }
        
        for (const tamanho of tamanhosRemovidos) {
          try {
            const { error: deleteError } = await supabase
              .from(`${lojaId}_estoque`)
              .delete()
              .eq('produto_id', produtoEditarId)
              .eq('tamanho', tamanho);
              
            if (deleteError) {
              console.error('Erro ao excluir registros de estoque:', deleteError);
            }
          } catch (deleteErr) {
            console.error('Erro na exclusão de estoque:', deleteErr);
          }
        }
      }
      
      // Recarregar os dados para atualizar o estoque
      await carregarDados();
      
      // Produto atualizado com sucesso
      toast.success('Produto atualizado com sucesso!');
      fecharModal();
      
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast.error(`Erro ao atualizar produto: ${error.message}`);
    } finally {
      setCarregando(false);
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
  
  // Verificar se existem produtos com estoque baixo
  const estoqueBaixo = estoque.some(item => item.quantidade <= produto.estoque_minimo);
  
  return (
    <Layout title={produto.nome}>
      <LojaHeader title="Detalhes do Produto" loja={loja} lojaId={lojaId} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link 
            href={`/lojas/${lojaId}/produtos`}
            className="text-gray-400 hover:text-white inline-flex items-center"
          >
            <FiArrowLeft className="mr-1" />
            Voltar para lista de produtos
          </Link>
        </div>
        
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
            {/* Galeria de imagens */}
            <div className="relative">
              <div className="bg-gray-900 rounded-lg overflow-hidden h-[350px] flex items-center justify-center">
                {produto.imagens && produto.imagens.length > 0 ? (
                  <img
                    src={produto.imagens[imagemAtual]}
                    alt={produto.nome}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <FiPackage className="text-8xl text-gray-600" />
                )}
                
                {produto.imagens && produto.imagens.length > 1 && (
                  <>
                    <button
                      onClick={imagemAnterior}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-2 text-white"
                    >
                      <FiChevronLeft />
                    </button>
                    <button
                      onClick={proximaImagem}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-2 text-white"
                    >
                      <FiChevronRight />
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1">
                      {produto.imagens.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setImagemAtual(index)}
                          className={`w-2 h-2 rounded-full ${
                            index === imagemAtual ? 'bg-white' : 'bg-gray-500'
                          }`}
                        ></button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              {produto.imagens && produto.imagens.length > 1 && (
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {produto.imagens.map((img, index) => (
                    <div
                      key={index}
                      onClick={() => setImagemAtual(index)}
                      className={`cursor-pointer bg-gray-900 rounded-md overflow-hidden h-16 ${
                        index === imagemAtual ? 'ring-2 ring-primary-500' : ''
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${produto.nome} - imagem ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Informações do produto */}
            <div>
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-2xl font-bold">{produto.nome}</h1>
                <button
                  onClick={editarProduto}
                  className="btn btn-sm btn-secondary flex items-center"
                >
                  <FiEdit2 className="mr-1" />
                  Editar
                </button>
              </div>
              
              <div className="mb-4">
                <div className="text-2xl font-semibold text-green-500 mb-1">
                  R$ {parseFloat(produto.preco).toFixed(2).replace('.', ',')}
                </div>
                {produto.categoria && (
                  <div className="flex items-center text-gray-400">
                    <FiTag className="mr-1" size={14} />
                    <span>{produto.categoria}</span>
                  </div>
                )}
              </div>
              
              {produto.descricao && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Descrição</h3>
                  <p className="text-gray-300 whitespace-pre-line">{produto.descricao}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Cores disponíveis</h3>
                  <div className="flex flex-wrap gap-2">
                    {produto.cores && produto.cores.map((cor, index) => (
                      <span
                        key={index}
                        className="bg-gray-700 px-3 py-1 rounded-full text-sm"
                      >
                        {cor}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Tamanhos disponíveis</h3>
                  <div className="flex flex-wrap gap-2">
                    {produto.tamanhos && produto.tamanhos.map((tamanho, index) => (
                      <span
                        key={index}
                        className="bg-gray-700 px-3 py-1 rounded-full text-sm"
                      >
                        {tamanho}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">Estoque</h3>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-400 mr-2">Estoque mínimo: {produto.estoque_minimo}</span>
                    {estoqueBaixo && (
                      <div className="flex items-center text-yellow-500">
                        <FiAlertTriangle className="mr-1" size={16} />
                        <span className="text-sm">Estoque baixo</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Cor
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Tamanho
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Quantidade
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {estoque.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap">{item.cor}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{item.tamanho}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-right">
                            {item.quantidade}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-center">
                            {item.quantidade <= produto.estoque_minimo ? (
                              <span className="text-yellow-500">
                                <FiAlertTriangle />
                              </span>
                            ) : (
                              <span className="text-green-500">
                                <FiCheck />
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-6">
                <div className="flex items-center bg-gray-900 px-3 py-2 rounded-md">
                  <span className="text-sm mr-2">Status:</span>
                  {produto.ativo ? (
                    <span className="flex items-center text-green-500">
                      <FiCheck className="mr-1" />
                      Ativo
                    </span>
                  ) : (
                    <span className="flex items-center text-red-500">
                      <FiX className="mr-1" />
                      Inativo
                    </span>
                  )}
                </div>
                
                {produto.destaque && (
                  <div className="bg-yellow-900 text-yellow-400 px-3 py-2 rounded-md text-sm flex items-center">
                    <FiTag className="mr-1" />
                    Em destaque
                  </div>
                )}
              </div>
              
              <div className="flex justify-center mt-6">
                <Link
                  href={`/lojas/${lojaId}/produtos/${id}/atualizar-estoque`}
                  className="btn btn-primary"
                >
                  Atualizar Quantidades em Estoque
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-lg border border-gray-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h3 className="text-xl font-semibold text-white">
                  Editar Produto
                </h3>
                <button 
                  onClick={fecharModal}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Fechar"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <form onSubmit={salvarProduto} className="space-y-6">
                <div className="form-group mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome do Produto</label>
                  <input
                    type="text"
                    name="nome"
                    value={novoProdutoData.nome}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ex: Camiseta Estampada"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Preço (R$)</label>
                    <input
                      type="text"
                      name="preco"
                      value={novoProdutoData.preco}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Ex: 99,90"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Categoria</label>
                    <input
                      type="text"
                      name="categoria"
                      value={novoProdutoData.categoria || ''}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Ex: Camisetas"
                    />
                  </div>
                </div>
                
                <div className="form-group mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                  <textarea
                    name="descricao"
                    value={novoProdutoData.descricao || ''}
                    onChange={handleChange}
                    rows="3"
                    className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Descreva o produto..."
                  ></textarea>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Cores</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {coresPredefinidas.map((cor) => (
                        <button
                          key={cor}
                          type="button"
                          onClick={() => {
                            if (!novoProdutoData.cores.includes(cor)) {
                              setNovoProdutoData(prev => ({
                                ...prev,
                                cores: [...prev.cores, cor]
                              }));
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-sm ${
                            novoProdutoData.cores.includes(cor)
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {cor}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center mt-2">
                      <input
                        type="text"
                        value={novaCor}
                        onChange={(e) => setNovaCor(e.target.value)}
                        onKeyPress={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            adicionarCor();
                          }
                        }}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Outra cor..."
                      />
                      <button
                        type="button"
                        onClick={adicionarCor}
                        className="ml-2 px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-md transition-colors"
                      >
                        <FiPlus size={16} />
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      {novoProdutoData.cores.map((cor) => (
                        <span
                          key={cor}
                          className="inline-flex items-center bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm"
                        >
                          {cor}
                          <button
                            type="button"
                            onClick={() => removerCor(cor)}
                            className="ml-2 text-gray-400 hover:text-white"
                          >
                            <FiX size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tamanhos</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tamanhosPredefinidos.map((tamanho) => (
                        <button
                          key={tamanho}
                          type="button"
                          onClick={() => {
                            if (!novoProdutoData.tamanhos.includes(tamanho)) {
                              setNovoProdutoData(prev => ({
                                ...prev,
                                tamanhos: [...prev.tamanhos, tamanho]
                              }));
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-sm ${
                            novoProdutoData.tamanhos.includes(tamanho)
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {tamanho}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center mt-2">
                      <input
                        type="text"
                        value={novoTamanho}
                        onChange={(e) => setNovoTamanho(e.target.value)}
                        onKeyPress={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            adicionarTamanho();
                          }
                        }}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Outro tamanho..."
                      />
                      <button
                        type="button"
                        onClick={adicionarTamanho}
                        className="ml-2 px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-md transition-colors"
                      >
                        <FiPlus size={16} />
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      {novoProdutoData.tamanhos.map((tamanho) => (
                        <span
                          key={tamanho}
                          className="inline-flex items-center bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm"
                        >
                          {tamanho}
                          <button
                            type="button"
                            onClick={() => removerTamanho(tamanho)}
                            className="ml-2 text-gray-400 hover:text-white"
                          >
                            <FiX size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Estoque Mínimo (para alertas)</label>
                    <input
                      type="number"
                      name="estoque_minimo"
                      value={novoProdutoData.estoque_minimo}
                      onChange={handleChange}
                      min="0"
                      className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-gray-400 text-sm mt-1">Você receberá alertas quando o estoque ficar abaixo deste valor</p>
                  </div>
                  
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Estoque</label>
                    <div className="flex items-center mt-1">
                      <Link 
                        href={`/lojas/${lojaId}/produtos/${produtoEditarId}/atualizar-estoque`}
                        className="w-full bg-blue-700 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                      >
                        <FiPackage size={16} />
                        Gerenciar Estoque por Cor e Tamanho
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="form-group mb-6">
                  <div className="flex items-center space-x-8">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="ativo"
                        checked={novoProdutoData.ativo}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-500 rounded border-gray-700 bg-gray-800 focus:ring-primary-500"
                      />
                      <span className="text-gray-300">Produto ativo</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="destaque"
                        checked={novoProdutoData.destaque}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-500 rounded border-gray-700 bg-gray-800 focus:ring-primary-500"
                      />
                      <span className="text-gray-300">Destaque</span>
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Imagens do Produto <span className="text-red-500">*</span></label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-700 border-dashed rounded-md hover:border-gray-500 transition-colors">
                    <div className="space-y-1 text-center">
                      <FiImage className="mx-auto h-12 w-12 text-gray-500" />
                      <div className="flex text-sm text-gray-400">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-primary-500 hover:text-primary-400 focus-within:outline-none">
                          <span>Selecionar imagens</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handleImagemChange}
                          />
                        </label>
                        <p className="pl-1">ou arraste e solte</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, WebP até 5MB (máximo 6 imagens)
                      </p>
                    </div>
                  </div>
                  
                  {previewImagens.length === 0 && (
                    <p className="text-red-400 text-sm mt-2">Adicione pelo menos uma imagem</p>
                  )}
                  
                  {/* Exibir previews das imagens */}
                  {previewImagens.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {previewImagens.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index}`}
                            className="h-24 w-full object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removerImagem(index)}
                            className="absolute top-1 right-1 bg-red-800 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-800 mt-4">
                  <button
                    type="button"
                    onClick={fecharModal}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors flex items-center"
                    disabled={carregando}
                  >
                    {carregando ? (
                      <>
                        <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <FiSave className="mr-2" /> Salvar Alterações
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 