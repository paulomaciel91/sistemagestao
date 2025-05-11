import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { 
  FiDatabase, FiSettings, FiArrowLeft, FiCheck, 
  FiLoader, FiAlertTriangle, FiImage, FiExternalLink, 
} from 'react-icons/fi';

export default function ConfiguracaoStorage() {
  const router = useRouter();
  const { supabase, credentials, isInitialized } = useSupabase();
  
  const [configurando, setConfigurando] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [instrucoes, setInstrucoes] = useState(null);
  
  // Configurar buckets no Storage do Supabase
  const configurarStorage = async () => {
    if (!supabase || !credentials) {
      toast.error('Supabase não está configurado');
      return;
    }
    
    try {
      setConfigurando(true);
      setResultados(null);
      
      const { supabaseUrl, supabaseKey } = credentials;
      
      const response = await fetch('/api/supabase/configurar-storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supabaseUrl,
          supabaseKey,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.mensagem || 'Erro ao configurar Storage');
      }
      
      const data = await response.json();
      
      setResultados(data.resultados);
      setInstrucoes(data.instrucoes);
      
      toast.success('Configuração do Storage iniciada com sucesso!');
      
    } catch (error) {
      console.error('Erro ao configurar Storage:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setConfigurando(false);
    }
  };
  
  // Verificar buckets existentes
  const verificarBuckets = async () => {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Erro ao verificar buckets:', error);
      return null;
    }
  };
  
  // Verificar buckets ao carregar a página
  useEffect(() => {
    if (supabase) {
      verificarBuckets().then(data => {
        if (data && data.length > 0) {
          const bucketsNomes = data.map(b => b.name).join(', ');
          toast.info(`Buckets existentes: ${bucketsNomes}`);
        }
      });
    }
  }, [supabase]);
  
  // Abrir painel do Supabase
  const abrirPainelSupabase = () => {
    if (!credentials) return;
    
    // Extrair ID do projeto da URL do Supabase
    const match = credentials.supabaseUrl.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/);
    if (match && match[1]) {
      const projectId = match[1];
      window.open(`https://app.supabase.io/project/${projectId}/storage`, '_blank');
    } else {
      window.open('https://app.supabase.io', '_blank');
    }
  };
  
  return (
    <Layout title="Configuração do Storage">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Link href="/configuracao" className="btn btn-ghost mr-4">
            <FiArrowLeft />
          </Link>
          <h1 className="text-xl font-semibold">Configuração do Storage Supabase</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-lg font-semibold mb-6 flex items-center">
                <FiDatabase className="text-primary-500 mr-2" />
                Configuração de Buckets
              </h2>
              
              <p className="text-gray-400 mb-6">
                Esta ferramenta irá configurar automaticamente os buckets do Storage necessários para o funcionamento do sistema:
              </p>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <FiImage className="text-blue-400 mr-2 mt-1" />
                  <div>
                    <strong className="block text-white">produtos</strong>
                    <span className="text-sm text-gray-400">Armazena imagens de produtos</span>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <FiImage className="text-purple-400 mr-2 mt-1" />
                  <div>
                    <strong className="block text-white">logos</strong>
                    <span className="text-sm text-gray-400">Armazena logos das lojas</span>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <FiImage className="text-green-400 mr-2 mt-1" />
                  <div>
                    <strong className="block text-white">perfil</strong>
                    <span className="text-sm text-gray-400">Armazena imagens de perfil</span>
                  </div>
                </li>
              </ul>
              
              <button
                className="btn btn-primary w-full"
                onClick={configurarStorage}
                disabled={configurando || !supabase}
              >
                {configurando ? (
                  <span className="flex items-center justify-center">
                    <FiLoader className="animate-spin mr-2" />
                    Configurando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <FiSettings className="mr-2" />
                    Configurar Storage
                  </span>
                )}
              </button>
              
              <button
                className="btn btn-outline w-full mt-4"
                onClick={abrirPainelSupabase}
                disabled={!credentials}
              >
                <FiExternalLink className="mr-2" />
                Abrir Painel do Supabase
              </button>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            {resultados ? (
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Resultado da Configuração</h2>
                
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Bucket</th>
                        <th>Status</th>
                        <th>Mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((resultado, index) => (
                        <tr key={index}>
                          <td>{resultado.bucket}</td>
                          <td>
                            <span className={`
                              ${resultado.status === 'criado' || resultado.status === 'atualizado' 
                                ? 'text-green-400' 
                                : resultado.status === 'política' 
                                  ? 'text-yellow-400' 
                                  : 'text-red-400'
                              }
                            `}>
                              {resultado.status === 'criado' && <FiCheck className="inline mr-1" />}
                              {resultado.status === 'atualizado' && <FiCheck className="inline mr-1" />}
                              {resultado.status === 'política' && <FiAlertTriangle className="inline mr-1" />}
                              {resultado.status === 'erro' && <FiAlertTriangle className="inline mr-1" />}
                              {resultado.status}
                            </span>
                          </td>
                          <td>{resultado.mensagem}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {instrucoes && (
                  <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                    <h3 className="font-semibold text-yellow-400 mb-2 flex items-center">
                      <FiAlertTriangle className="mr-2" />
                      Configuração Manual Necessária
                    </h3>
                    <div className="text-sm text-gray-300 whitespace-pre-line">
                      {instrucoes}
                    </div>
                    <button
                      className="btn btn-sm btn-warning mt-4"
                      onClick={abrirPainelSupabase}
                    >
                      <FiExternalLink className="mr-1" />
                      Abrir Supabase Storage
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Informações sobre o Storage</h2>
                
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 mb-6">
                  <h3 className="font-semibold text-lg mb-3">O que é o Storage?</h3>
                  <p className="text-gray-300 mb-4">
                    O Supabase Storage é um serviço de armazenamento de arquivos integrado ao Supabase, 
                    permitindo que você armazene imagens, documentos e outros tipos de arquivo de forma 
                    segura e organizada em "buckets".
                  </p>
                  <p className="text-gray-300">
                    Em nosso sistema, usamos o Storage para armazenar imagens de produtos, logos de lojas 
                    e outros recursos visuais necessários para o funcionamento da plataforma.
                  </p>
                </div>
                
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="font-semibold text-lg mb-3">Configuração Manual</h3>
                  <p className="text-gray-300 mb-4">
                    Se preferir configurar manualmente, você pode acessar o painel do Supabase, ir até a seção 
                    "Storage" e criar os seguintes buckets:
                  </p>
                  
                  <ul className="list-disc pl-5 space-y-2 text-gray-300 mb-4">
                    <li><strong>produtos</strong>: Para armazenar imagens de produtos</li>
                    <li><strong>logos</strong>: Para armazenar logos das lojas</li>
                    <li><strong>perfil</strong>: Para armazenar fotos de perfil</li>
                  </ul>
                  
                  <p className="text-gray-300">
                    Lembre-se de configurar as políticas de acesso para permitir leitura pública e upload 
                    somente para usuários autenticados.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 