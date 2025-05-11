import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Layout from '@/components/Layout';
import LojaHeader from '@/components/LojaHeader';
import Link from 'next/link';
import { FiInfo, FiSave, FiMapPin, FiClock, FiPhone, FiImage, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

export default function InformacoesLoja() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [config, setConfig] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  
  // Formulário
  const [formData, setFormData] = useState({
    nome_loja: '',
    endereco: '',
    telefone: '',
    horario_funcionamento: '',
    politica_troca: '',
    cor_primaria: '#3B82F6',
    cor_secundaria: '#1E3A8A'
  });

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
          setFormData({
            nome_loja: configData.nome_loja || lojaData.nome,
            endereco: configData.endereco || '',
            telefone: configData.telefone || '',
            horario_funcionamento: configData.horario_funcionamento || '',
            politica_troca: configData.politica_troca || '',
            cor_primaria: configData.cor_primaria || '#3B82F6',
            cor_secundaria: configData.cor_secundaria || '#1E3A8A'
          });
          
          // Se tiver logo, definir preview
          if (configData.logo_url) {
            setLogoPreview(configData.logo_url);
          }
        } else {
          // Configuração inicial
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
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
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
  
  // Remover logo
  const removerLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    // Se estiver editando, também limpa a logo atual
    if (config && config.logo_url) {
      setFormData({
        ...formData,
        logo_url: ''
      });
    }
  };
  
  // Upload de logo para o storage
  const uploadLogo = async () => {
    if (!logoFile) return config?.logo_url || '';
    
    try {
      const extensao = logoFile.name.split('.').pop().toLowerCase();
      const fileName = `${lojaId}_logo_${Date.now()}.${extensao}`;
      const filePath = `${lojaId}/logos/${fileName}`;
      
      // Upload do arquivo
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da logo:', error);
      throw error;
    }
  };
  
  // Salvar configurações
  const salvarConfiguracao = async (e) => {
    e.preventDefault();
    
    if (!formData.nome_loja) {
      toast.error('O nome da loja é obrigatório');
      return;
    }
    
    try {
      setSalvando(true);
      
      // Dados a serem salvos
      const dadosConfig = { ...formData };
      
      // Se tiver nova logo, fazer upload
      if (logoFile) {
        const logoUrl = await uploadLogo();
        dadosConfig.logo_url = logoUrl;
      }
      
      // Se estiver editando, atualizar registro
      if (config) {
        const { error } = await supabase
          .from(`${lojaId}_config`)
          .update({
            ...dadosConfig,
            updated_at: new Date().toISOString()
          })
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        // Inserir novo registro
        const { error } = await supabase
          .from(`${lojaId}_config`)
          .insert([{
            ...dadosConfig,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        if (error) throw error;
      }
      
      toast.success('Configurações salvas com sucesso!');
      carregarDados(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };
  
  // Compartilhar informações via WhatsApp
  const compartilharWhatsApp = () => {
    const mensagem = `*${formData.nome_loja}*\n\n`;
    
    let infoLoja = '';
    
    if (formData.endereco) {
      infoLoja += `📍 *Endereço:* ${formData.endereco}\n\n`;
    }
    
    if (formData.telefone) {
      infoLoja += `📞 *Telefone:* ${formData.telefone}\n\n`;
    }
    
    if (formData.horario_funcionamento) {
      infoLoja += `🕒 *Horário de Funcionamento:* ${formData.horario_funcionamento}\n\n`;
    }
    
    if (formData.politica_troca) {
      infoLoja += `ℹ️ *Política de Trocas:* ${formData.politica_troca}\n\n`;
    }
    
    const textoFinal = mensagem + infoLoja;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(textoFinal)}`, '_blank');
  };

  return (
    <Layout title="Informações da Loja">
      <LojaHeader title="Informações da Loja" loja={loja} lojaId={lojaId} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <h2 className="text-xl font-semibold">Configurações Gerais</h2>
        </div>
        
        {carregando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <form onSubmit={salvarConfiguracao} className="max-w-4xl mx-auto space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Identidade da Loja</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label" htmlFor="nome_loja">
                    Nome da Loja <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="nome_loja"
                    name="nome_loja"
                    type="text"
                    className="input w-full"
                    value={formData.nome_loja}
                    onChange={handleChange}
                    placeholder="Ex.: Boutique Fashion"
                    required
                  />
                </div>
                
                <div className="flex flex-col">
                  <label className="label">Logo da Loja</label>
                  
                  <div className="flex items-center">
                    <div className="mr-4 h-20 w-20 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Logo Preview" 
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <FiImage className="text-gray-400 text-3xl" />
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="btn btn-sm btn-primary">
                        <FiImage className="mr-1" />
                        Selecionar Logo
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoChange}
                        />
                      </label>
                      
                      {logoPreview && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost text-red-400"
                          onClick={removerLogo}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Tamanho máximo: 2MB. Formatos: JPG, PNG, SVG
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="label" htmlFor="cor_primaria">
                    Cor Primária
                  </label>
                  <div className="flex items-center">
                    <input
                      id="cor_primaria"
                      name="cor_primaria"
                      type="color"
                      className="w-12 h-10 rounded cursor-pointer mr-2"
                      value={formData.cor_primaria}
                      onChange={handleChange}
                    />
                    <input
                      type="text"
                      className="input"
                      value={formData.cor_primaria}
                      onChange={(e) => setFormData({...formData, cor_primaria: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="label" htmlFor="cor_secundaria">
                    Cor Secundária
                  </label>
                  <div className="flex items-center">
                    <input
                      id="cor_secundaria"
                      name="cor_secundaria"
                      type="color"
                      className="w-12 h-10 rounded cursor-pointer mr-2"
                      value={formData.cor_secundaria}
                      onChange={handleChange}
                    />
                    <input
                      type="text"
                      className="input"
                      value={formData.cor_secundaria}
                      onChange={(e) => setFormData({...formData, cor_secundaria: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Informações de Contato</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label" htmlFor="endereco">
                    Endereço
                  </label>
                  <input
                    id="endereco"
                    name="endereco"
                    type="text"
                    className="input w-full"
                    value={formData.endereco}
                    onChange={handleChange}
                    placeholder="Ex.: Rua das Flores, 123 - Centro"
                  />
                </div>
                
                <div>
                  <label className="label" htmlFor="telefone">
                    Telefone
                  </label>
                  <input
                    id="telefone"
                    name="telefone"
                    type="text"
                    className="input w-full"
                    value={formData.telefone}
                    onChange={handleChange}
                    placeholder="Ex.: (11) 98765-4321"
                  />
                </div>
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Funcionamento e Políticas</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="horario_funcionamento">
                    Horário de Funcionamento
                  </label>
                  <textarea
                    id="horario_funcionamento"
                    name="horario_funcionamento"
                    className="input w-full h-24"
                    value={formData.horario_funcionamento}
                    onChange={handleChange}
                    placeholder="Ex.: Segunda a Sexta: 9h às 18h&#10;Sábado: 9h às 13h&#10;Domingo: Fechado"
                  ></textarea>
                </div>
                
                <div>
                  <label className="label" htmlFor="politica_troca">
                    Política de Trocas e Devoluções
                  </label>
                  <textarea
                    id="politica_troca"
                    name="politica_troca"
                    className="input w-full h-24"
                    value={formData.politica_troca}
                    onChange={handleChange}
                    placeholder="Ex.: Trocas em até 30 dias com a nota fiscal. Produtos com defeito podem ser trocados em até 90 dias."
                  ></textarea>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between">
              <button
                type="button"
                className="btn btn-secondary md:order-2 mb-4 md:mb-0"
                onClick={compartilharWhatsApp}
              >
                <FiRefreshCw className="mr-2" />
                Compartilhar no WhatsApp
              </button>
              
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
                    Salvar Informações
                  </>
                )}
              </button>
            </div>
          </form>
        )}
        
        <div className="mt-8 p-4 bg-gray-800 rounded-lg flex items-start gap-4">
          <FiAlertCircle className="text-primary-400 text-2xl flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Por que estas informações são importantes?</h3>
            <p className="text-gray-300 text-sm mb-2">
              Manter suas informações de loja atualizadas ajuda seus clientes a encontrarem você facilmente e entenderem 
              suas políticas de funcionamento. Isso reduz dúvidas e melhora a experiência do cliente.
            </p>
            <p className="text-gray-300 text-sm">
              Use o botão "Compartilhar no WhatsApp" para enviar essas informações diretamente para seus clientes ou grupos.
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
} 