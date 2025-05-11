import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft, FiSave } from 'react-icons/fi';

export default function ConfiguracaoLoja() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [formData, setFormData] = useState({
    nome_loja: '',
    endereco: '',
    telefone: '',
    horario_funcionamento: '',
    politica_troca: '',
    logo_url: '',
    cor_primaria: '#1a73e8',
    cor_secundaria: '#0d47a1'
  });
  
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [loja, setLoja] = useState(null);

  // Verificar se o Supabase está inicializado
  useEffect(() => {
    if (!loading && !isInitialized) {
      router.push('/configuracao');
    }
  }, [isInitialized, loading, router]);

  // Carregar dados da loja quando o ID estiver disponível
  useEffect(() => {
    if (supabase && lojaId) {
      carregarDadosLoja();
    }
  }, [supabase, lojaId]);

  const carregarDadosLoja = async () => {
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
      
      // Carregar configurações da loja
      const { data: configData, error: configError } = await supabase
        .from(`${lojaId}_config`)
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }
      
      if (configData) {
        setFormData({
          nome_loja: configData.nome_loja || lojaData.nome,
          endereco: configData.endereco || '',
          telefone: configData.telefone || '',
          horario_funcionamento: configData.horario_funcionamento || '',
          politica_troca: configData.politica_troca || '',
          logo_url: configData.logo_url || '',
          cor_primaria: configData.cor_primaria || '#1a73e8',
          cor_secundaria: configData.cor_secundaria || '#0d47a1'
        });
      } else {
        // Se não houver configuração, usar o nome da loja
        setFormData({
          ...formData,
          nome_loja: lojaData.nome
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados da loja:', error);
      toast.error('Erro ao carregar dados da loja');
    } finally {
      setCarregando(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    
    try {
      // Verificar se já existe um registro de configuração
      const { data, error: checkError } = await supabase
        .from(`${lojaId}_config`)
        .select('id')
        .limit(1);
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (data && data.length > 0) {
        // Atualizar o registro existente
        const { error } = await supabase
          .from(`${lojaId}_config`)
          .update(formData)
          .eq('id', data[0].id);
        
        if (error) throw error;
      } else {
        // Criar um novo registro
        const { error } = await supabase
          .from(`${lojaId}_config`)
          .insert([formData]);
        
        if (error) throw error;
      }
      
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  if (loading || !isInitialized || carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Configuração da Loja | Sistema de Gestão</title>
      </Head>
      
      <header className="bg-gray-800 shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/dashboard" className="mr-3 text-gray-300 hover:text-white">
              <FiArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold">{loja?.nome || 'Configuração da Loja'}</h1>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-6">Informações da Loja</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label" htmlFor="nome_loja">
                  Nome da Loja
                </label>
                <input
                  id="nome_loja"
                  name="nome_loja"
                  type="text"
                  className="input"
                  value={formData.nome_loja}
                  onChange={handleChange}
                  placeholder="Nome da sua loja"
                  required
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
                  className="input"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(99) 99999-9999"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="label" htmlFor="endereco">
                  Endereço
                </label>
                <input
                  id="endereco"
                  name="endereco"
                  type="text"
                  className="input"
                  value={formData.endereco}
                  onChange={handleChange}
                  placeholder="Endereço completo"
                />
              </div>
              
              <div>
                <label className="label" htmlFor="horario_funcionamento">
                  Horário de Funcionamento
                </label>
                <input
                  id="horario_funcionamento"
                  name="horario_funcionamento"
                  type="text"
                  className="input"
                  value={formData.horario_funcionamento}
                  onChange={handleChange}
                  placeholder="Seg a Sex: 9h às 18h"
                />
              </div>
              
              <div>
                <label className="label" htmlFor="logo_url">
                  URL do Logo
                </label>
                <input
                  id="logo_url"
                  name="logo_url"
                  type="text"
                  className="input"
                  value={formData.logo_url}
                  onChange={handleChange}
                  placeholder="https://exemplo.com/logo.png"
                />
              </div>
              
              <div>
                <label className="label" htmlFor="cor_primaria">
                  Cor Primária
                </label>
                <div className="flex items-center">
                  <input
                    id="cor_primaria"
                    name="cor_primaria"
                    type="color"
                    className="h-10 w-10 mr-2 border border-gray-600 rounded"
                    value={formData.cor_primaria}
                    onChange={handleChange}
                  />
                  <input
                    type="text"
                    className="input flex-1"
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
                    className="h-10 w-10 mr-2 border border-gray-600 rounded"
                    value={formData.cor_secundaria}
                    onChange={handleChange}
                  />
                  <input
                    type="text"
                    className="input flex-1"
                    value={formData.cor_secundaria}
                    onChange={(e) => setFormData({...formData, cor_secundaria: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="label" htmlFor="politica_troca">
                  Política de Troca e Devolução
                </label>
                <textarea
                  id="politica_troca"
                  name="politica_troca"
                  className="input min-h-[120px]"
                  value={formData.politica_troca}
                  onChange={handleChange}
                  placeholder="Descreva aqui a política de troca e devolução da sua loja..."
                ></textarea>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                className="btn btn-primary flex items-center"
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
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
        </div>
        
        <div className="mt-8 flex justify-between">
          <Link 
            href="/dashboard" 
            className="btn btn-secondary"
          >
            Voltar para o Dashboard
          </Link>
          
          <Link 
            href={`/lojas/${lojaId}`} 
            className="btn btn-primary"
          >
            Ver Painel da Loja
          </Link>
        </div>
      </div>
    </div>
  );
} 