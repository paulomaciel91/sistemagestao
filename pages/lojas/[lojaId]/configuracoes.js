import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Layout from '@/components/Layout';
import LojaHeader from '@/components/LojaHeader';
import Link from 'next/link';
import { 
  FiSettings, FiSave, FiMapPin, FiClock, FiPhone, 
  FiImage, FiInfo, FiRefreshCw, FiLink, FiGlobe,
  FiMail, FiMessageSquare, FiDatabase, FiLayers,
  FiDownload, FiUpload, FiCreditCard, FiTruck, 
  FiTag, FiPieChart
} from 'react-icons/fi';
import { lojistaConfigFields } from '@/components/LojaConfigFormFields';

export default function ConfiguracoesLoja() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [config, setConfig] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [tabAtiva, setTabAtiva] = useState('informacoes_basicas');
  
  // Formatar lista de campos em um objeto state
  const gerarEstadoInicial = () => {
    const estado = {};
    lojistaConfigFields.forEach(section => {
      section.fields.forEach(field => {
        estado[field.id] = field.defaultValue || '';
      });
    });
    return estado;
  };
  
  const [formData, setFormData] = useState(gerarEstadoInicial());

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
      
      // Tentar carregar configurações da loja
      try {
        const { data: configData, error: configError } = await supabase
          .from(`${lojaId}_config`)
          .select('*')
          .limit(1)
          .maybeSingle();
        
        if (configError && configError.code !== 'PGRST116') {
          throw configError;
        }
        
        if (configData) {
          setConfig(configData);
          
          // Preencher o formulário com os dados existentes
          const novoFormData = { ...formData };
          
          // Para cada campo do formulário, verificar se existe valor salvo
          Object.keys(formData).forEach(key => {
            if (configData[key] !== undefined) {
              novoFormData[key] = configData[key];
            }
          });
          
          setFormData(novoFormData);
          
          // Se tiver logo, definir preview
          if (configData.logo_url) {
            setLogoPreview(configData.logo_url);
          }
          
          // Se tiver banner, definir preview
          if (configData.banner_url) {
            setBannerPreview(configData.banner_url);
          }
        } else {
          // Configuração inicial, usar o nome da loja
          setFormData({
            ...formData,
            nome_loja: lojaData.nome
          });
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast.error('Erro ao carregar configurações da loja');
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  // Lidar com alterações no formulário
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Para checkbox, usar o valor checked
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      });
    } 
    // Para multiselect, tratar diferente se tiver um array de valores
    else if (type === 'select-multiple') {
      const options = Array.from(e.target.options);
      const selectedValues = options
        .filter(option => option.selected)
        .map(option => option.value);
      
      setFormData({
        ...formData,
        [name]: selectedValues
      });
    } 
    // Para outros campos, usar o valor normal
    else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Lidar com seleção de logo
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Verificar tipo de arquivo
    if (!file.type.match('image.*')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }
    
    // Verificar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }
    
    setLogoFile(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Lidar com seleção de banner
  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Verificar tipo de arquivo
    if (!file.type.match('image.*')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }
    
    // Verificar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }
    
    setBannerFile(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setBannerPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Remover logo
  const removerLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setFormData({
      ...formData,
      logo_url: ''
    });
  };
  
  // Remover banner
  const removerBanner = () => {
    setBannerFile(null);
    setBannerPreview('');
    setFormData({
      ...formData,
      banner_url: ''
    });
  };
  
  // Upload da logo
  const uploadLogo = async () => {
    if (!logoFile) return '';
    
    try {
      const fileName = `lojas/${lojaId}/logo_${Date.now()}`;
      
      const { data, error } = await supabase.storage
        .from('public')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) throw error;
      
      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da logo:', error);
      toast.error('Erro ao fazer upload da logo');
      return '';
    }
  };
  
  // Upload do banner
  const uploadBanner = async () => {
    if (!bannerFile) return '';
    
    try {
      const fileName = `lojas/${lojaId}/banner_${Date.now()}`;
      
      const { data, error } = await supabase.storage
        .from('public')
        .upload(fileName, bannerFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) throw error;
      
      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do banner:', error);
      toast.error('Erro ao fazer upload do banner');
      return '';
    }
  };
  
  // Salvar configurações
  const salvarConfiguracoes = async (e) => {
    e.preventDefault();
    
    try {
      setSalvando(true);
      
      // Verificar campos obrigatórios
      const camposObrigatorios = lojistaConfigFields
        .flatMap(section => section.fields)
        .filter(field => field.required)
        .map(field => field.id);
      
      const camposFaltando = camposObrigatorios.filter(campo => !formData[campo]);
      
      if (camposFaltando.length > 0) {
        // Obter os labels dos campos faltantes
        const labelsCamposFaltando = camposFaltando.map(campo => {
          const field = lojistaConfigFields
            .flatMap(section => section.fields)
            .find(f => f.id === campo);
          return field ? field.label : campo;
        });
        
        toast.error(`Preencha os campos obrigatórios: ${labelsCamposFaltando.join(', ')}`);
        setSalvando(false);
        return;
      }
      
      // Fazer upload da logo se houver
      let logoUrl = formData.logo_url;
      if (logoFile) {
        logoUrl = await uploadLogo();
        if (!logoUrl) return;
      }
      
      // Fazer upload do banner se houver
      let bannerUrl = formData.banner_url;
      if (bannerFile) {
        bannerUrl = await uploadBanner();
        if (!bannerUrl) return;
      }
      
      // Dados a serem salvos
      const dadosParaSalvar = {
        ...formData,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        updated_at: new Date().toISOString()
      };
      
      // Verificar se já existe configuração
      if (config) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from(`${lojaId}_config`)
          .update(dadosParaSalvar)
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        // Criar nova configuração
        // Verificar se tabela existe
        try {
          const { error: tableError } = await supabase
            .from(`${lojaId}_config`)
            .select('count');
          
          // Se tabela não existir, criar
          if (tableError && tableError.code === 'PGRST116') {
            await supabase.rpc('criar_tabela_loja_config', {
              p_nome_tabela: `${lojaId}_config`
            });
          }
          
          // Inserir dados
          const { data, error } = await supabase
            .from(`${lojaId}_config`)
            .insert({
              ...dadosParaSalvar,
              created_at: new Date().toISOString()
            });
          
          if (error) throw error;
          
        } catch (error) {
          console.error('Erro ao criar configuração:', error);
          throw error;
        }
      }
      
      toast.success('Configurações salvas com sucesso!');
      setLogoFile(null);
      setBannerFile(null);
      
      // Recarregar dados para obter as informações atualizadas
      await carregarDados();
      
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSalvando(false);
    }
  };

  // Renderizar campos de formulário com base na configuração
  const renderizarCampos = (sectionId) => {
    const secao = lojistaConfigFields.find(s => s.section === sectionId);
    
    if (!secao) return null;
    
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold flex items-center">
          {secao.icon && <span className="text-primary-500 mr-2">{secao.icon}</span>}
          {secao.title}
        </h2>
        
        {secao.description && (
          <p className="text-gray-400 mb-4">{secao.description}</p>
        )}
        
        <div className="grid grid-cols-1 gap-6">
          {secao.fields.map(field => {
            // Renderizar campos diferentes com base no tipo
            switch (field.type) {
              case 'textarea':
                return (
                  <div key={field.id}>
                    <label className="label" htmlFor={field.id}>
                      <div className="flex items-center">
                        {field.icon && <span className="mr-2">{field.icon}</span>}
                        {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                    </label>
                    <textarea
                      id={field.id}
                      name={field.id}
                      className="input w-full min-h-[80px]"
                      value={formData[field.id] || ''}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                    {field.description && (
                      <p className="text-xs text-gray-400 mt-1">{field.description}</p>
                    )}
                  </div>
                );
                
              case 'image':
                if (field.id === 'logo_url') {
                  return (
                    <div key={field.id}>
                      <label className="label" htmlFor={field.id}>
                        <div className="flex items-center">
                          {field.icon && <span className="mr-2">{field.icon}</span>}
                          {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                        </div>
                      </label>
                      <div className="flex items-center gap-4">
                        {logoPreview ? (
                          <div className="relative">
                            <img
                              src={logoPreview}
                              alt="Logo Preview"
                              className="w-20 h-20 object-contain bg-gray-700 rounded"
                            />
                            <button
                              type="button"
                              onClick={removerLogo}
                              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="w-20 h-20 flex items-center justify-center bg-gray-700 rounded">
                            <FiImage className="text-2xl text-gray-400" />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <label className="btn btn-sm btn-outline cursor-pointer">
                            <FiUpload className="mr-2" />
                            Selecionar Logo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoChange}
                            />
                          </label>
                          <p className="text-gray-400 text-xs mt-1">Formato PNG ou JPG (máx. 2MB)</p>
                        </div>
                      </div>
                      {field.description && (
                        <p className="text-xs text-gray-400 mt-1">{field.description}</p>
                      )}
                    </div>
                  );
                } else if (field.id === 'banner_url') {
                  return (
                    <div key={field.id}>
                      <label className="label" htmlFor={field.id}>
                        <div className="flex items-center">
                          {field.icon && <span className="mr-2">{field.icon}</span>}
                          {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                        </div>
                      </label>
                      <div className="flex flex-col gap-4">
                        {bannerPreview ? (
                          <div className="relative">
                            <img
                              src={bannerPreview}
                              alt="Banner Preview"
                              className="w-full max-h-40 object-cover bg-gray-700 rounded"
                            />
                            <button
                              type="button"
                              onClick={removerBanner}
                              className="absolute top-2 right-2 bg-red-500 rounded-full p-1 text-white"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-32 flex items-center justify-center bg-gray-700 rounded">
                            <FiImage className="text-3xl text-gray-400" />
                          </div>
                        )}
                        
                        <div>
                          <label className="btn btn-sm btn-outline cursor-pointer">
                            <FiUpload className="mr-2" />
                            Selecionar Banner
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleBannerChange}
                            />
                          </label>
                          <p className="text-gray-400 text-xs mt-1">Formato PNG ou JPG (máx. 5MB)</p>
                        </div>
                      </div>
                      {field.description && (
                        <p className="text-xs text-gray-400 mt-1">{field.description}</p>
                      )}
                    </div>
                  );
                }
                return null;
                
              case 'color':
                return (
                  <div key={field.id}>
                    <label className="label" htmlFor={field.id}>
                      <div className="flex items-center">
                        {field.icon && <span className="mr-2">{field.icon}</span>}
                        {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                    </label>
                    <div className="flex mt-1">
                      <input
                        type="color"
                        name={field.id}
                        value={formData[field.id] || field.defaultValue || '#000000'}
                        onChange={handleChange}
                        className="h-10 w-10 rounded border border-gray-600"
                      />
                      <input
                        type="text"
                        name={field.id}
                        value={formData[field.id] || field.defaultValue || ''}
                        onChange={handleChange}
                        className="input ml-2 flex-1"
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    </div>
                    {field.description && (
                      <p className="text-xs text-gray-400 mt-1">{field.description}</p>
                    )}
                  </div>
                );
                
              case 'multiselect':
                return (
                  <div key={field.id}>
                    <label className="label" htmlFor={field.id}>
                      <div className="flex items-center">
                        {field.icon && <span className="mr-2">{field.icon}</span>}
                        {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                    </label>
                    <select
                      id={field.id}
                      name={field.id}
                      multiple
                      className="input w-full h-32"
                      value={Array.isArray(formData[field.id]) ? formData[field.id] : []}
                      onChange={handleChange}
                      required={field.required}
                    >
                      {field.options.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {field.description && (
                      <p className="text-xs text-gray-400 mt-1">{field.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Dica: Segure CTRL para selecionar múltiplas opções
                    </p>
                  </div>
                );
                
              // Padrão: campos de texto, email, etc
              default:
                return (
                  <div key={field.id}>
                    <label className="label" htmlFor={field.id}>
                      <div className="flex items-center">
                        {field.icon && <span className="mr-2">{field.icon}</span>}
                        {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                    </label>
                    <input
                      id={field.id}
                      name={field.id}
                      type={field.type}
                      className="input w-full"
                      value={formData[field.id] || ''}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                    {field.description && (
                      <p className="text-xs text-gray-400 mt-1">{field.description}</p>
                    )}
                  </div>
                );
            }
          })}
        </div>
      </div>
    );
  };

  return (
    <Layout title="Configurações da Loja" backHref={`/lojas/${lojaId}`}>
      <LojaHeader loja={loja} activeTab="configuracoes" lojaId={lojaId} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          <div className="flex flex-wrap text-sm font-medium text-center text-gray-400 border-b border-gray-700 overflow-x-auto">
            {lojistaConfigFields.map(section => (
              <button
                key={section.section}
                className={`px-4 py-3 whitespace-nowrap ${tabAtiva === section.section ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
                onClick={() => setTabAtiva(section.section)}
              >
                <div className="flex items-center">
                  {section.icon && <span className="mr-2">{section.icon}</span>}
                  {section.title}
                </div>
              </button>
            ))}
          </div>
          
          <div className="p-6">
            {carregando ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <form onSubmit={salvarConfiguracoes} className="space-y-8">
                {renderizarCampos(tabAtiva)}
                
                {/* Botão de salvar (sempre visível) */}
                <div className="pt-4 border-t border-gray-700 flex justify-end">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={salvando}
                  >
                    {salvando ? (
                      <>
                        <FiRefreshCw className="animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <FiSave className="mr-2" />
                        Salvar Configurações
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
} 