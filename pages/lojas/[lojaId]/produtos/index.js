import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import LojaLayout from '@/components/LojaLayout';
import TabelaProdutos from '@/components/TabelaProdutos';
import Link from 'next/link';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiTag, FiPackage, FiAlertTriangle, FiEye, FiFilter, FiGrid, FiList, FiRefreshCw, FiArrowRight, FiX, FiImage, FiSave, FiInfo } from 'react-icons/fi';
import { atualizarTabelasProdutos } from '@/lib/supabaseUtils';

export default function Produtos() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [estoqueAlerta, setEstoqueAlerta] = useState([]);
  const [produtosComEstoque, setProdutosComEstoque] = useState([]);
  const [visualizacao, setVisualizacao] = useState('grid'); // 'grid' ou 'lista'
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroCategorias, setFiltroCategorias] = useState([]);
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

  // Listas predefinidas
  const coresPredefinidas = [
    'Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Roxo', 'Cinza', 'Marrom'
  ];

  const tamanhosPredefinidos = [
    'PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', '34', '36', '38', '40', '42', '44', '46', '48', '50'
  ];

  const categoriasPredefinidas = [
    'Camisetas', 'Calças', 'Vestidos', 'Blusas', 'Jaquetas', 'Acessórios', 'Calçados', 'Bolsas'
  ];

  // Carregar dados da loja quando o ID estiver disponível
  useEffect(() => {
    // Recuperar preferência de visualização do localStorage
    const visualizacaoSalva = localStorage.getItem(`${lojaId}_visualizacao`);
    if (visualizacaoSalva) {
      setVisualizacao(visualizacaoSalva);
    }
    
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
      
      // Atualizar a estrutura da tabela de produtos (adicionar coluna estoque se necessário)
      await atualizarTabelasProdutos(supabase, lojaId);
      
      // Carregar produtos
      const { data: produtosData, error: produtosError } = await supabase
        .from(`${lojaId}_produtos`)
        .select('*')
        .order('nome', { ascending: true });
      
      if (produtosError && produtosError.code !== 'PGRST116') {
        throw produtosError;
      }
      
      setProdutos(produtosData || []);
      
      // Extrair categorias únicas para o filtro
      if (produtosData && produtosData.length > 0) {
        const categorias = [...new Set(produtosData.map(p => p.categoria).filter(Boolean))];
        setFiltroCategorias(categorias);
      }
      
      // Carregar estoque para verificar alertas e associar ao produto
      if (produtosData && produtosData.length > 0) {
        const { data: estoqueData, error: estoqueError } = await supabase
          .from(`${lojaId}_estoque`)
          .select('produto_id, tamanho, cor, quantidade');
          
        if (estoqueError && estoqueError.code !== 'PGRST116') {
          throw estoqueError;
        }
        
        // Identificar produtos com estoque baixo
        const alertas = [];
        
        // Calcular estoque total para cada produto
        const produtosEstoque = produtosData.map(produto => {
          // Filtramos os itens de estoque para este produto
          const estoqueItens = estoqueData?.filter(item => item.produto_id === produto.id) || [];
          
          // Somamos as quantidades para obter o estoque total
          const estoqueTotal = estoqueItens.reduce((sum, item) => sum + item.quantidade, 0);
          
          // Verificar alertas de estoque
          estoqueItens.forEach(item => {
            if (item.quantidade <= produto.estoque_minimo) {
              alertas.push({
                produto_id: produto.id,
                produto_nome: produto.nome,
                tamanho: item.tamanho,
                cor: item.cor,
                quantidade: item.quantidade,
                estoque_minimo: produto.estoque_minimo
              });
            }
          });
          
          // Retornamos o produto com a propriedade estoque_total adicionada
          return {
            ...produto,
            estoque_total: estoqueTotal // Esta propriedade é adicionada apenas no estado local, não na tabela
          };
        });
        
        setProdutosComEstoque(produtosEstoque);
        setEstoqueAlerta(alertas);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  const excluirProduto = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      // Atualização otimista: remover o produto da lista local imediatamente
      setProdutos(prevProdutos => prevProdutos.filter(produto => produto.id !== id));
      setProdutosComEstoque(prevProdutos => prevProdutos.filter(produto => produto.id !== id));
      
      // Excluir registros de estoque primeiro
      const { error: estoqueError } = await supabase
        .from(`${lojaId}_estoque`)
        .delete()
        .eq('produto_id', id);
      
      if (estoqueError) throw estoqueError;
      
      // Excluir o produto
      const { error } = await supabase
        .from(`${lojaId}_produtos`)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Produto excluído com sucesso');
      
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
      // Em caso de erro, recarregar os dados para garantir consistência
      carregarDados();
    }
  };

  // Filtrar produtos com base na busca e categoria
  const produtosFiltrados = produtosComEstoque.filter(produto => {
    // Filtro de busca
    const matchBusca = 
      produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
      produto.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      produto.categoria?.toLowerCase().includes(busca.toLowerCase());
      
    // Filtro de categoria
    const matchCategoria = filtroCategoria === 'todas' || produto.categoria === filtroCategoria;
    
    return matchBusca && matchCategoria;
  });

  // Abrir modal de novo produto
  const abrirModalNovoProduto = () => {
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
  
  // Manipular seleção de imagens
  const handleImagemChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Verificar limite de imagens
    if (uploadImagens.length + files.length > 6) {
      toast.warning('Você só pode adicionar até 6 imagens por produto.');
      // Adicionar apenas as primeiras imagens até o limite
      const limiteDisponivel = 6 - uploadImagens.length;
      files.splice(limiteDisponivel);
    }
    
    // Validar arquivos
    const arquivosValidos = files.filter(file => {
      // Verificar tipo de arquivo
      const tipoValido = file.type.match(/image\/(jpeg|jpg|png|webp)/);
      
      // Verificar tamanho (limite de 5MB)
      const tamanhoValido = file.size <= 5 * 1024 * 1024;
      
      if (!tipoValido) {
        toast.error(`Formato inválido: ${file.name}. Use JPG, PNG ou WebP.`);
      }
      
      if (!tamanhoValido) {
        toast.error(`Arquivo muito grande: ${file.name}. Limite de 5MB.`);
      }
      
      return tipoValido && tamanhoValido;
    });
    
    // Adicionar às imagens para upload e criar previews
    setUploadImagens(prev => [...prev, ...arquivosValidos]);
    
    // Criar previews para os arquivos válidos
    arquivosValidos.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImagens(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  // Remover imagem da lista de upload
  const removerImagem = (index) => {
    setUploadImagens(prev => prev.filter((_, i) => i !== index));
    setPreviewImagens(prev => prev.filter((_, i) => i !== index));
  };
  
  // Upload das imagens para o storage
  const uploadImagesStorage = async () => {
    if (uploadImagens.length === 0) return [];
    
    try {
      // Verificar se o bucket 'produtos' existe, se não, criar
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets ? buckets.some(bucket => bucket.name === 'produtos') : false;
      
      if (!bucketExists) {
        const { error: bucketError } = await supabase.storage.createBucket('produtos', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (bucketError) {
          console.error('Erro ao criar bucket:', bucketError);
          toast.error('Erro ao criar área de armazenamento para imagens');
          return [];
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
        } catch (uploadError) {
          console.error(`Erro ao processar imagem ${i + 1}:`, uploadError);
          toast.error(`Erro ao processar imagem ${i + 1}: ${uploadError.message}`);
        }
      }
      
      return imagensUrls;
    } catch (error) {
      console.error('Erro ao fazer upload das imagens:', error);
      toast.error('Erro ao fazer upload das imagens');
      return [];
    }
  };
  
  // Adicionar nova cor
  const adicionarCor = () => {
    if (!novaCor.trim()) return;
    
    if (!novoProdutoData.cores.includes(novaCor.trim())) {
      setNovoProdutoData({
        ...novoProdutoData,
        cores: [...novoProdutoData.cores, novaCor.trim()]
      });
    }
    
    setNovaCor('');
  };
  
  // Manipular tecla Enter no campo de cor
  const handleCorKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarCor();
    }
  };
  
  // Remover cor
  const removerCor = (cor) => {
    setNovoProdutoData({
      ...novoProdutoData,
      cores: novoProdutoData.cores.filter(c => c !== cor)
    });
  };
  
  // Adicionar novo tamanho
  const adicionarTamanho = () => {
    if (!novoTamanho.trim()) return;
    
    if (!novoProdutoData.tamanhos.includes(novoTamanho.trim())) {
      setNovoProdutoData({
        ...novoProdutoData,
        tamanhos: [...novoProdutoData.tamanhos, novoTamanho.trim()]
      });
    }
    
    setNovoTamanho('');
  };
  
  // Manipular tecla Enter no campo de tamanho
  const handleTamanhoKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarTamanho();
    }
  };
  
  // Remover tamanho
  const removerTamanho = (tamanho) => {
    setNovoProdutoData({
      ...novoProdutoData,
      tamanhos: novoProdutoData.tamanhos.filter(t => t !== tamanho)
    });
  };
  
  // Salvar produto (novo ou edição)
  const handleSubmitNovoProduto = async (e) => {
    e.preventDefault();
    
    try {
      setCarregando(true);
      
      console.log('Modo edição:', modoEdicao);
      console.log('ID do produto sendo editado:', produtoEditarId);
      
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
      
      if (uploadImagens.length === 0 && !modoEdicao && previewImagens.length === 0) {
        toast.error('Adicione pelo menos uma imagem para o produto');
        return;
      }
      
      let imagensUrls = [];
      
      // Se não há novas imagens para upload e já existem previews, manter as existentes
      if (uploadImagens.length === 0 && previewImagens.length > 0) {
        // Filtrar apenas as URLs reais (não as que começam com blob: ou data:)
        imagensUrls = previewImagens.filter(url => 
          !url.startsWith('blob:') && !url.startsWith('data:') && !url.includes('objectURL')
        );
      } 
      // Se há novas imagens, fazer upload
      else if (uploadImagens.length > 0) {
        // Upload de imagens
        const novasImagensUrls = await uploadImagesStorage();
        
        // Se o upload foi bem-sucedido e há URLs novas
        if (novasImagensUrls.length > 0) {
          // Se estamos editando e já temos imagens existentes
          if (modoEdicao) {
            // Filtramos as imagens existentes (URLs reais)
            const imagensExistentes = previewImagens.filter(url => 
              !url.startsWith('blob:') && !url.startsWith('data:') && !url.includes('objectURL')
            );
            // Adicionamos as novas às existentes
            imagensUrls = [...imagensExistentes, ...novasImagensUrls];
          } else {
            // Para produto novo, usar apenas as novas URLs
            imagensUrls = novasImagensUrls;
          }
        } else {
          // Se o upload falhou, mas estamos editando e temos imagens existentes
          if (modoEdicao && previewImagens.length > 0) {
            imagensUrls = previewImagens.filter(url => 
              !url.startsWith('blob:') && !url.startsWith('data:') && !url.includes('objectURL')
            );
          }
        }
      }
      
      // Validar se temos pelo menos uma imagem
      if (imagensUrls.length === 0) {
        toast.error('É necessário pelo menos uma imagem para o produto');
        setCarregando(false);
        return;
      }
      
      // Dados para salvar
      const dadosProduto = {
        ...novoProdutoData,
        preco: parseFloat(novoProdutoData.preco),
        imagens: imagensUrls,
        updated_at: new Date().toISOString()
      };
      
      // Garantir que dados numéricos sejam de fato números
      dadosProduto.estoque = parseInt(dadosProduto.estoque) || 0;
      dadosProduto.estoque_minimo = parseInt(dadosProduto.estoque_minimo) || 0;
      
      if (modoEdicao) {
        // Verificar se temos um ID válido
        if (!produtoEditarId) {
          toast.error('ID do produto não identificado');
          setCarregando(false);
          return;
        }
        
        // Remover a propriedade estoque_total do objeto dadosProduto 
        // pois ela não existe na tabela do banco de dados
        const { estoque_total, ...dadosProdutoSemEstoqueTotal } = dadosProduto;
        
        console.log('Dados para atualizar:', dadosProdutoSemEstoqueTotal);
        console.log('Atualizando produto com ID:', produtoEditarId);
        
        // Atualizar produto existente
        const { error } = await supabase
          .from(`${lojaId}_produtos`)
          .update(dadosProdutoSemEstoqueTotal)
          .eq('id', produtoEditarId);
          
        if (error) {
          console.error('Erro ao atualizar produto:', error);
          throw error;
        }
        
        // Verificar se houve alterações nas cores ou tamanhos
        const produtoAtual = produtos.find(p => p.id === produtoEditarId);
        const coresAdicionadas = novoProdutoData.cores.filter(cor => 
          !produtoAtual.cores?.includes(cor));
        const tamanhosAdicionados = novoProdutoData.tamanhos.filter(tamanho => 
          !produtoAtual.tamanhos?.includes(tamanho));
        const coresRemovidas = (produtoAtual.cores || []).filter(cor => 
          !novoProdutoData.cores.includes(cor));
        const tamanhosRemovidos = (produtoAtual.tamanhos || []).filter(tamanho => 
          !novoProdutoData.tamanhos.includes(tamanho));
        
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
        
        // Atualizar estado local com os produtos atualizados
        setProdutos(prevProdutos => 
          prevProdutos.map(p => 
            p.id === produtoEditarId ? {...dadosProduto, id: produtoEditarId} : p
          )
        );
        
        // Recarregar os dados para atualizar corretamente o produtosComEstoque
        await carregarDados();
        
        toast.success('Produto atualizado com sucesso!');
        fecharModal();
      } else {
        // Criar novo produto
        dadosProduto.created_at = new Date().toISOString();
        
        // Remover a propriedade estoque_total se existir
        const { estoque_total, ...dadosProdutoSemEstoqueTotal } = dadosProduto;
        
        // Inserir o produto no banco
        const { data: produtoData, error: produtoError } = await supabase
          .from(`${lojaId}_produtos`)
          .insert([dadosProdutoSemEstoqueTotal])
          .select();

        if (produtoError) throw produtoError;

        // Criar registros de estoque para cada combinação de cor e tamanho
        const estoqueInicial = parseInt(novoProdutoData.estoque) || 0;
        const registrosEstoque = [];

        for (const cor of novoProdutoData.cores) {
          for (const tamanho of novoProdutoData.tamanhos) {
            registrosEstoque.push({
              produto_id: produtoData[0].id,
              cor,
              tamanho,
              quantidade: estoqueInicial
            });
          }
        }

        // Inserir registros de estoque
        const { error: estoqueError } = await supabase
          .from(`${lojaId}_estoque`)
          .insert(registrosEstoque);

        if (estoqueError) throw estoqueError;

        // Recarregar todos os dados para atualizar a lista de produtos
        await carregarDados();
        
        toast.success('Produto criado com sucesso!');
        fecharModal();
      }
      
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast.error('Erro ao salvar produto: ' + error.message);
    } finally {
      setCarregando(false);
    }
  };

  // Abrir modal de edição
  const editarProduto = (produto) => {
    if (!produto || !produto.id) {
      toast.error('Produto inválido');
      return;
    }
    
    // Resetar estados de upload de imagens
    setUploadImagens([]);
    
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
    } else {
      setPreviewImagens([]);
    }
    
    setModoEdicao(true);
    setProdutoEditarId(produto.id);
    setShowModal(true);
    
    console.log('Editando produto ID:', produto.id);
  };

  // Alternar visualização
  const alternarVisualizacao = (modo) => {
    setVisualizacao(modo);
    // Salvar preferência no localStorage
    localStorage.setItem(`${lojaId}_visualizacao`, modo);
  };

  return (
    <LojaLayout title="Gestão de Produtos" loja={loja} lojaId={lojaId} icon={<FiPackage className="mr-2 text-blue-400" />}>
      <main className="container mx-auto px-4 py-8">
        {/* Cabeçalho com ações */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8">
          <div className="flex items-center mb-4 md:mb-0">
            <h2 className="text-xl font-semibold">Produtos</h2>
            <button
              onClick={abrirModalNovoProduto}
              className="btn btn-primary ml-4 flex items-center h-[38px]"
            >
              <FiPlus className="mr-1" />
              Novo Produto
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            {/* Busca */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar produtos..."
                className="h-[38px] w-full px-4 bg-gray-800 border border-gray-700 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <FiSearch className="absolute left-3 top-[11px] text-gray-400" />
            </div>
            
            {/* Filtro de categoria */}
            {filtroCategorias.length > 0 && (
              <div className="relative h-[38px]">
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="h-[38px] appearance-none w-full px-4 bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="todas">Todas as categorias</option>
                  {filtroCategorias.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <FiFilter className="absolute left-3 top-[11px] text-gray-400" />
              </div>
            )}
            
            {/* Alternar visualização */}
            <div className="flex h-[38px] space-x-2 bg-gray-800 rounded-lg p-1 border border-gray-700">
              <button
                onClick={() => alternarVisualizacao('grid')}
                className={`px-4 py-1 text-sm rounded ${visualizacao === 'grid' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                title="Visualização em grid"
              >
                <FiGrid size={16} className="inline mr-1" />
                Grid
              </button>
              <button
                onClick={() => alternarVisualizacao('lista')}
                className={`px-4 py-1 text-sm rounded ${visualizacao === 'lista' ? 'bg-primary-600 text-white' : 'hover:bg-gray-700'}`}
                title="Visualização em lista"
              >
                <FiList size={16} className="inline mr-1" />
                Lista
              </button>
            </div>
            
            {/* Botão atualizar */}
            <button
              onClick={carregarDados}
              className="h-[38px] btn btn-outline flex items-center"
              title="Atualizar dados"
            >
              <FiRefreshCw className="mr-2" />
              Atualizar
            </button>
          </div>
        </div>
        
        {/* Alertas de estoque */}
        {estoqueAlerta.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-3 mb-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FiAlertTriangle className="text-amber-400 mr-2" size={16} />
                <span className="text-amber-300">
                  {estoqueAlerta.length} {estoqueAlerta.length === 1 ? 'produto' : 'produtos'} com estoque baixo
                </span>
              </div>
              <div className="flex items-center">
                <Link
                  href={`/lojas/${lojaId}/produtos/estoque-baixo`}
                  className="text-amber-300 hover:text-amber-200 text-xs mr-3 flex items-center"
                >
                  Ver detalhes <FiArrowRight className="ml-1" size={12} />
                </Link>
                <button
                  onClick={() => setEstoqueAlerta([])}
                  className="text-amber-300 hover:text-amber-200"
                  title="Fechar alerta"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Conteúdo principal */}
        {carregando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : produtos.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-10 text-center">
            <FiPackage className="mx-auto text-5xl mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold mb-2">Nenhum produto cadastrado</h3>
            <p className="text-gray-400 mb-6">Comece adicionando seu primeiro produto à loja</p>
            <button
              onClick={abrirModalNovoProduto}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg inline-flex items-center"
            >
              <FiPlus className="mr-2" />
              Adicionar Produto
            </button>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-10 text-center">
            <FiSearch className="mx-auto text-5xl mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-400 mb-6">Tente modificar os termos da busca ou remover os filtros</p>
            <button
              onClick={() => {setBusca(''); setFiltroCategoria('todas');}}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg inline-flex items-center"
            >
              <FiRefreshCw className="mr-2" />
              Limpar Filtros
            </button>
          </div>
        ) : visualizacao === 'lista' ? (
          // Visualização em lista (tabela)
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 flex items-center">
              <FiPackage className="text-blue-400 mr-2" />
              <h3 className="text-lg font-semibold">
                Produtos {filtroCategoria !== 'todas' ? `(${filtroCategoria})` : ''}
              </h3>
            </div>
            <TabelaProdutos 
              produtos={produtosFiltrados} 
              lojaId={lojaId} 
              onEdit={editarProduto}
              onDelete={excluirProduto} 
            />
          </div>
        ) : (
          // Visualização em grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {produtosFiltrados.map((produto) => (
              <div key={produto.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 flex flex-col">
                <Link href={`/lojas/${lojaId}/produtos/${produto.id}`} className="block h-48 bg-gray-700 relative">
                  {produto.imagens && produto.imagens[0] ? (
                    <img
                      src={produto.imagens[0]}
                      alt={produto.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <FiPackage className="text-5xl text-gray-600" />
                    </div>
                  )}
                  
                  <div className="absolute top-0 left-0 w-full p-2 flex justify-between">
                    {!produto.ativo && (
                      <span className="bg-red-900/70 text-red-200 text-xs py-1 px-2 rounded">
                        Inativo
                      </span>
                    )}
                    {produto.destaque && (
                      <span className="bg-amber-900/70 text-amber-200 text-xs py-1 px-2 rounded ml-auto">
                        Destaque
                      </span>
                    )}
                  </div>
                </Link>
                
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <Link href={`/lojas/${lojaId}/produtos/${produto.id}`} className="hover:text-primary-400">
                      <h3 className="font-semibold text-lg line-clamp-1">{produto.nome}</h3>
                    </Link>
                    <div className="font-medium text-green-400">
                      R$ {parseFloat(produto.preco).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                  
                  {produto.categoria && (
                    <div className="mb-2 flex items-center">
                      <FiTag className="text-gray-400 mr-1" size={14} />
                      <span className="text-sm text-gray-400">{produto.categoria}</span>
                    </div>
                  )}
                  
                  {produto.descricao && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2 flex-grow">
                      {produto.descricao}
                    </p>
                  )}
                  
                  <div className="flex items-center mb-3">
                    <span className="text-sm mr-2">Estoque:</span>
                    <span className={`text-sm font-medium ${
                      produto.estoque_total <= 0 ? 'text-red-400' : 
                      produto.estoque_total <= produto.estoque_minimo ? 'text-amber-400' : 
                      'text-green-400'
                    }`}>
                      {produto.estoque_total} unidades
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {produto.tamanhos && produto.tamanhos.map((tamanho, index) => (
                      <span key={index} className="inline-block bg-gray-700 text-xs text-gray-300 rounded px-2 py-1">
                        {tamanho}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex justify-between mt-auto pt-3 border-t border-gray-700">
                    <Link
                      href={`/lojas/${lojaId}/produtos/${produto.id}`}
                      className="text-primary-400 hover:text-primary-300 text-sm flex items-center"
                    >
                      <FiEye size={16} className="mr-1" />
                      Ver detalhes
                    </Link>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => editarProduto(produto)}
                        className="text-gray-400 hover:text-white"
                        title="Editar"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => excluirProduto(produto.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Excluir"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!carregando && produtosFiltrados.length > 0 && (
          <div className="mt-8 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Mostrando {produtosFiltrados.length} de {produtos.length} produtos
              {filtroCategoria !== 'todas' && (
                <span> na categoria {filtroCategoria}</span>
              )}
            </div>
            
            <div className="bg-gray-800 p-3 rounded-lg text-sm flex items-center">
              <FiFilter className="mr-2 text-primary-400" />
              <span className="text-gray-300">Dica: Use os filtros e a busca para encontrar produtos específicos</span>
            </div>
          </div>
        )}
        
        {/* Modal de Novo Produto */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-lg border border-gray-700">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                  <h3 className="text-xl font-semibold text-white">
                    {modoEdicao ? 'Editar Produto' : 'Novo Produto'}
                  </h3>
                  <button 
                    onClick={fecharModal}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Fechar"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmitNovoProduto} className="space-y-6">
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
                      {modoEdicao ? (
                        <input
                          type="text"
                          name="categoria"
                          value={novoProdutoData.categoria || ''}
                          onChange={handleChange}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Ex: Camisetas"
                        />
                      ) : (
                        <select
                          name="categoria"
                          value={novoProdutoData.categoria}
                          onChange={handleChange}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">Selecione uma categoria</option>
                          {categoriasPredefinidas.map((categoria) => (
                            <option key={categoria} value={categoria}>
                              {categoria}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-group mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                    <textarea
                      name="descricao"
                      value={novoProdutoData.descricao}
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
                      <div className="flex flex-wrap gap-2">
                        {novoProdutoData.cores.map((cor) => (
                          <span
                            key={cor}
                            className="inline-flex items-center bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm"
                          >
                            {cor}
                            <button
                              type="button"
                              onClick={() => {
                                setNovoProdutoData(prev => ({
                                  ...prev,
                                  cores: prev.cores.filter(c => c !== cor)
                                }));
                              }}
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
                      <div className="flex flex-wrap gap-2">
                        {novoProdutoData.tamanhos.map((tamanho) => (
                          <span
                            key={tamanho}
                            className="inline-flex items-center bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm"
                          >
                            {tamanho}
                            <button
                              type="button"
                              onClick={() => {
                                setNovoProdutoData(prev => ({
                                  ...prev,
                                  tamanhos: prev.tamanhos.filter(t => t !== tamanho)
                                }));
                              }}
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
                      {modoEdicao ? (
                        <div className="flex items-center mt-1">
                          <Link 
                            href={`/lojas/${lojaId}/produtos/${produtoEditarId}/atualizar-estoque`}
                            className="w-full bg-blue-700 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                          >
                            <FiPackage size={16} />
                            Gerenciar Estoque por Cor e Tamanho
                          </Link>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-300 mb-1">Estoque Inicial por Variação</label>
                          <input
                            type="number"
                            name="estoque"
                            value={novoProdutoData.estoque}
                            onChange={handleChange}
                            min="0"
                            className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ex: 10"
                          />
                          <p className="text-gray-400 text-sm mt-1">Esta quantidade será aplicada para cada combinação de cor e tamanho</p>
                        </div>
                      )}
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
                          <FiSave className="mr-2" /> {modoEdicao ? 'Salvar Alterações' : 'Criar Produto'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </LojaLayout>
  );
} 