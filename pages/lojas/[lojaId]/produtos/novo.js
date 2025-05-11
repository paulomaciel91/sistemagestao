import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Layout from '@/components/Layout';
import LojaHeader from '@/components/LojaHeader';
import Link from 'next/link';
import { FiSave, FiX, FiImage, FiAlertCircle, FiPlus, FiMinus } from 'react-icons/fi';
import { atualizarTabelasProdutos } from '@/lib/supabaseUtils';

export default function NovoProduto() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [uploadImagens, setUploadImagens] = useState([]);
  const [previewImagens, setPreviewImagens] = useState([]);
  const [quantidadesEstoque, setQuantidadesEstoque] = useState([]);
  const [mostrarQuantidades, setMostrarQuantidades] = useState(false);
  const [quantidadeGeral, setQuantidadeGeral] = useState(10);
  
  // Dados do produto
  const [produto, setProduto] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: '',
    cores: [],
    tamanhos: [],
    estoque_minimo: 5,
    ativo: true,
    destaque: false
  });
  
  // Novos valores para cores e tamanhos
  const [novaCor, setNovaCor] = useState('');
  const [novoTamanho, setNovoTamanho] = useState('');
  
  // Carregar dados da loja quando o ID estiver disponível
  useEffect(() => {
    if (lojaId && supabase) {
      carregarDados();
    }
  }, [lojaId, supabase]);
  
  // Atualizar quantidades quando cores ou tamanhos mudam
  useEffect(() => {
    atualizarQuantidadesEstoque();
  }, [produto.cores, produto.tamanhos]);
  
  const atualizarQuantidadesEstoque = () => {
    const novasQuantidades = [];
    
    // Para cada combinação de cor e tamanho, criar um item no array de quantidades
    produto.cores.forEach(cor => {
      produto.tamanhos.forEach(tamanho => {
        // Procurar se já existe essa combinação para manter o valor
        const itemExistente = quantidadesEstoque.find(
          item => item.cor === cor && item.tamanho === tamanho
        );
        
        novasQuantidades.push({
          cor,
          tamanho,
          quantidade: itemExistente ? itemExistente.quantidade : quantidadeGeral
        });
      });
    });
    
    setQuantidadesEstoque(novasQuantidades);
  };
  
  const carregarDados = async () => {
    try {
      setSalvando(true);
      
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
      
      // Atualizar a estrutura da tabela de produtos
      await atualizarTabelasProdutos(supabase, lojaId);
      
    } catch (error) {
      console.error('Erro ao carregar loja:', error);
      toast.error('Erro ao carregar informações da loja');
    } finally {
      setSalvando(false);
    }
  };
  
  // Manipular alterações nos campos do formulário
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Para campos checkbox, usar o valor checked
    if (type === 'checkbox') {
      setProduto({ ...produto, [name]: checked });
      return;
    }
    
    // Para campo de preço, garantir que seja um número válido
    if (name === 'preco') {
      // Remover caracteres não numéricos, exceto ponto e vírgula
      const valorLimpo = value.replace(/[^\d,.]/g, '');
      // Substituir vírgula por ponto para cálculos
      const valorFinal = valorLimpo.replace(',', '.');
      setProduto({ ...produto, [name]: valorFinal });
      return;
    }
    
    setProduto({ ...produto, [name]: value });
  };
  
  // Adicionar nova cor
  const adicionarCor = () => {
    if (!novaCor.trim()) return;
    
    if (!produto.cores.includes(novaCor.trim())) {
      setProduto({
        ...produto,
        cores: [...produto.cores, novaCor.trim()]
      });
    }
    
    setNovaCor('');
  };
  
  // Remover cor
  const removerCor = (cor) => {
    setProduto({
      ...produto,
      cores: produto.cores.filter(c => c !== cor)
    });
  };
  
  // Adicionar novo tamanho
  const adicionarTamanho = () => {
    if (!novoTamanho.trim()) return;
    
    if (!produto.tamanhos.includes(novoTamanho.trim())) {
      setProduto({
        ...produto,
        tamanhos: [...produto.tamanhos, novoTamanho.trim()]
      });
    }
    
    setNovoTamanho('');
  };
  
  // Remover tamanho
  const removerTamanho = (tamanho) => {
    setProduto({
      ...produto,
      tamanhos: produto.tamanhos.filter(t => t !== tamanho)
    });
  };
  
  // Alterar quantidade de estoque para um item específico
  const alterarQuantidade = (index, delta) => {
    const novasQuantidades = [...quantidadesEstoque];
    // Não permitir quantidade negativa
    novasQuantidades[index].quantidade = Math.max(0, novasQuantidades[index].quantidade + delta);
    setQuantidadesEstoque(novasQuantidades);
  };
  
  // Alterar quantidade geral e aplicar a todos os itens
  const aplicarQuantidadeGeral = () => {
    const novasQuantidades = quantidadesEstoque.map(item => ({
      ...item,
      quantidade: quantidadeGeral
    }));
    setQuantidadesEstoque(novasQuantidades);
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
      const tamanhoValido = file.size <= 5 * 1024 * 1024; // 5MB em bytes
      
      if (!tamanhoValido) {
        toast.error(`Imagem ${file.name} excede o limite de 5MB`);
      }
      
      return tipoValido && tamanhoValido;
    });
    
    if (arquivosValidos.length !== files.length) {
      toast.warning('Alguns arquivos foram ignorados. Use apenas imagens JPG, PNG ou WebP até 5MB.');
    }
    
    // Adicionar aos arquivos existentes
    setUploadImagens([...uploadImagens, ...arquivosValidos]);
    
    // Criar URLs de preview
    const novasPreviewsUrls = arquivosValidos.map(file => URL.createObjectURL(file));
    setPreviewImagens([...previewImagens, ...novasPreviewsUrls]);
  };
  
  // Remover imagem
  const removerImagem = (index) => {
    const novasImagens = [...uploadImagens];
    const novosPreviews = [...previewImagens];
    
    // Remover a URL do objeto
    URL.revokeObjectURL(previewImagens[index]);
    
    novasImagens.splice(index, 1);
    novosPreviews.splice(index, 1);
    
    setUploadImagens(novasImagens);
    setPreviewImagens(novosPreviews);
  };
  
  // Fazer upload das imagens para o armazenamento
  const uploadImagesStorage = async () => {
    if (uploadImagens.length === 0) return [];
    
    const imagensUrls = [];
    
    // Criar pasta se não existir
    const timestamp = Date.now();
    const pastaImagens = `${lojaId}/produtos/${timestamp}`;
    
    for (let i = 0; i < uploadImagens.length; i++) {
      const file = uploadImagens[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${i + 1}.${fileExt}`;
      const filePath = `${pastaImagens}/${fileName}`;
      
      try {
        // Upload para o bucket 'produtos' no storage do Supabase
        const { data, error } = await supabase.storage
          .from('produtos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type // Garantir que o tipo de conteúdo seja preservado
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
  };
  
  // Salvar novo produto
  const salvarProduto = async (e) => {
    e.preventDefault();
    
    // Validar dados
    if (!produto.nome.trim()) {
      toast.error('O nome do produto é obrigatório');
      return;
    }
    
    if (!produto.preco || isNaN(produto.preco) || parseFloat(produto.preco) <= 0) {
      toast.error('Informe um preço válido para o produto');
      return;
    }
    
    if (produto.cores.length === 0) {
      toast.error('Adicione pelo menos uma cor para o produto');
      return;
    }
    
    if (produto.tamanhos.length === 0) {
      toast.error('Adicione pelo menos um tamanho para o produto');
      return;
    }
    
    if (uploadImagens.length === 0) {
      toast.error('Adicione pelo menos uma imagem para o produto');
      return;
    }
    
    try {
      setSalvando(true);
      
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
      
      // Upload de imagens
      const imagensUrls = await uploadImagesStorage();
      
      if (imagensUrls.length === 0) {
        throw new Error('Não foi possível fazer o upload das imagens. Verifique o formato e tamanho dos arquivos.');
      }
      
      // Dados para inserir
      const produtoData = {
        ...produto,
        preco: parseFloat(produto.preco),
        imagens: imagensUrls,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Inserir produto no banco
      const { data, error } = await supabase
        .from(`${lojaId}_produtos`)
        .insert([produtoData])
        .select();
      
      if (error) throw error;
      
      // Produto criado com sucesso
      toast.success('Produto cadastrado com sucesso!');
      
      // Criar registros de estoque com as quantidades definidas
      if (data && data[0]) {
        const produtoId = data[0].id;
        const estoqueBatch = [];
        
        // Usar as quantidades definidas pelo usuário
        for (const item of quantidadesEstoque) {
          estoqueBatch.push({
            produto_id: produtoId,
            tamanho: item.tamanho,
            cor: item.cor,
            quantidade: item.quantidade
          });
        }
        
        // Inserir registros de estoque
        const { error: estoqueError } = await supabase
          .from(`${lojaId}_estoque`)
          .insert(estoqueBatch);
        
        if (estoqueError) {
          console.error('Erro ao criar registro de estoque:', estoqueError);
          toast.warning('Produto cadastrado, mas houve um erro ao inicializar o controle de estoque');
        }
      }
      
      // Redirecionar para lista de produtos
      router.push(`/lojas/${lojaId}/produtos`);
      
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast.error(`Erro ao cadastrar produto: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };
  
  return (
    <Layout title="Novo Produto">
      <LojaHeader title="Cadastrar Novo Produto" loja={loja} lojaId={lojaId} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <Link href={`/lojas/${lojaId}/produtos`} className="btn btn-ghost mr-2">
            <FiX className="text-xl" />
          </Link>
          <h2 className="text-xl font-semibold">Novo Produto</h2>
        </div>
        
        <form onSubmit={salvarProduto} className="space-y-6 max-w-4xl mx-auto">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="label" htmlFor="nome">
                  Nome do Produto <span className="text-red-500">*</span>
                </label>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  className="input w-full"
                  value={produto.nome}
                  onChange={handleChange}
                  placeholder="Ex.: Camiseta Estampada"
                  required
                />
              </div>
              
              <div>
                <label className="label" htmlFor="preco">
                  Preço <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3">R$</span>
                  <input
                    id="preco"
                    name="preco"
                    type="text"
                    className="input w-full pl-10"
                    value={produto.preco}
                    onChange={handleChange}
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="label" htmlFor="categoria">
                  Categoria
                </label>
                <input
                  id="categoria"
                  name="categoria"
                  type="text"
                  className="input w-full"
                  value={produto.categoria}
                  onChange={handleChange}
                  placeholder="Ex.: Camisetas"
                />
              </div>
              
              <div className="col-span-2">
                <label className="label" htmlFor="descricao">
                  Descrição
                </label>
                <textarea
                  id="descricao"
                  name="descricao"
                  className="input w-full h-24"
                  value={produto.descricao}
                  onChange={handleChange}
                  placeholder="Descreva detalhes do produto..."
                ></textarea>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Cores e Tamanhos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">
                  Cores do Produto <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    className="input flex-grow"
                    value={novaCor}
                    onChange={(e) => setNovaCor(e.target.value)}
                    placeholder="Ex.: Azul"
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={adicionarCor}
                  >
                    Adicionar
                  </button>
                </div>
                
                {produto.cores.length === 0 && (
                  <p className="text-red-400 text-sm mt-2 flex items-center">
                    <FiAlertCircle className="mr-1" size={14} />
                    Adicione pelo menos uma cor
                  </p>
                )}
                
                <div className="mt-3 flex flex-wrap gap-2">
                  {produto.cores.map((cor, index) => (
                    <div key={index} className="bg-gray-700 rounded-full py-1 px-3 flex items-center">
                      <span className="text-sm">{cor}</span>
                      <button
                        type="button"
                        className="ml-2 text-gray-400 hover:text-red-400"
                        onClick={() => removerCor(cor)}
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="label">
                  Tamanhos Disponíveis <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    className="input flex-grow"
                    value={novoTamanho}
                    onChange={(e) => setNovoTamanho(e.target.value)}
                    placeholder="Ex.: M"
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={adicionarTamanho}
                  >
                    Adicionar
                  </button>
                </div>
                
                {produto.tamanhos.length === 0 && (
                  <p className="text-red-400 text-sm mt-2 flex items-center">
                    <FiAlertCircle className="mr-1" size={14} />
                    Adicione pelo menos um tamanho
                  </p>
                )}
                
                <div className="mt-3 flex flex-wrap gap-2">
                  {produto.tamanhos.map((tamanho, index) => (
                    <div key={index} className="bg-gray-700 rounded-full py-1 px-3 flex items-center">
                      <span className="text-sm">{tamanho}</span>
                      <button
                        type="button"
                        className="ml-2 text-gray-400 hover:text-red-400"
                        onClick={() => removerTamanho(tamanho)}
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="label" htmlFor="estoque_minimo">
                Estoque Mínimo (para alertas)
              </label>
              <input
                id="estoque_minimo"
                name="estoque_minimo"
                type="number"
                min="0"
                className="input w-full md:w-1/3"
                value={produto.estoque_minimo}
                onChange={handleChange}
              />
              <p className="text-sm text-gray-400 mt-1">
                Você receberá alertas quando o estoque ficar abaixo deste valor
              </p>
            </div>
            
            {/* Gestão de quantidade */}
            <div className="mt-6 border-t border-gray-700 pt-6">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">Quantidade em Estoque</h4>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => setMostrarQuantidades(!mostrarQuantidades)}
                >
                  {mostrarQuantidades ? 'Ocultar Quantidades' : 'Configurar Quantidades'}
                </button>
              </div>
              
              {mostrarQuantidades && (
                <>
                  <div className="bg-gray-700 p-4 rounded-lg mb-4">
                    <div className="flex items-center space-x-4 mb-4">
                      <label className="flex-shrink-0">Quantidade Geral:</label>
                      <input
                        type="number"
                        min="0"
                        className="input"
                        value={quantidadeGeral}
                        onChange={(e) => setQuantidadeGeral(parseInt(e.target.value) || 0)}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={aplicarQuantidadeGeral}
                      >
                        Aplicar a Todos
                      </button>
                    </div>
                    
                    {produto.cores.length > 0 && produto.tamanhos.length > 0 ? (
                      <div className="bg-gray-800 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-700">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Cor
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Tamanho
                              </th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Quantidade
                              </th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {quantidadesEstoque.map((item, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 whitespace-nowrap">{item.cor}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{item.tamanho}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-center">
                                  <span className="font-semibold">
                                    {item.quantidade}
                                  </span>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => alterarQuantidade(index, -1)}
                                      className="bg-gray-600 hover:bg-gray-500 rounded-full w-8 h-8 flex items-center justify-center text-white"
                                      disabled={item.quantidade <= 0}
                                    >
                                      <FiMinus />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => alterarQuantidade(index, 1)}
                                      className="bg-blue-700 hover:bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-white"
                                    >
                                      <FiPlus />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-yellow-400 text-sm flex items-center">
                        <FiAlertCircle className="mr-1" size={14} />
                        Adicione cores e tamanhos para definir as quantidades
                      </p>
                    )}
                  </div>
                </>
              )}
              
              {!mostrarQuantidades && (
                <p className="text-gray-400 text-sm">
                  Clique em "Configurar Quantidades" para definir a quantidade em estoque inicial de cada variação do produto.
                </p>
              )}
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Imagens do Produto</h3>
            
            <div className="mb-4">
              <label className={`btn ${uploadImagens.length >= 6 ? 'btn-disabled' : 'btn-outline'}`}>
                <FiImage className="mr-2" />
                {uploadImagens.length >= 6 ? 'Limite de 6 imagens atingido' : 'Selecionar Imagens'}
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImagemChange}
                  disabled={uploadImagens.length >= 6}
                />
              </label>
              <p className="text-sm text-gray-400 mt-1">
                Selecione até 6 imagens nos formatos JPG, PNG ou WebP (máx. 5MB cada)
              </p>
              
              {uploadImagens.length === 0 && (
                <p className="text-red-400 text-sm mt-2 flex items-center">
                  <FiAlertCircle className="mr-1" size={14} />
                  Adicione pelo menos uma imagem do produto
                </p>
              )}
            </div>
            
            {previewImagens.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
                {previewImagens.map((src, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={src}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-700"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 text-xs">
                      Imagem {index + 1}
                      {index === 0 && " (principal)"}
                    </div>
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removerImagem(index)}
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Opções Adicionais</h3>
            
            <div className="flex items-center space-x-8">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="ativo"
                  className="checkbox"
                  checked={produto.ativo}
                  onChange={handleChange}
                />
                <span>Produto Ativo</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="destaque"
                  className="checkbox"
                  checked={produto.destaque}
                  onChange={handleChange}
                />
                <span>Produto em Destaque</span>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Link
              href={`/lojas/${lojaId}/produtos`}
              className="btn btn-secondary"
            >
              Cancelar
            </Link>
            
            <button
              type="submit"
              className="btn btn-primary"
              disabled={salvando}
            >
              {salvando ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Salvando...
                </span>
              ) : (
                <>
                  <FiSave className="mr-2" />
                  Salvar Produto
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </Layout>
  );
} 