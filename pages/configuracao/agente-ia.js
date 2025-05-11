import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiSend } from 'react-icons/fi';

export default function AgenteIA() {
  const router = useRouter();
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [lojas, setLojas] = useState([]);
  const [lojaAtual, setLojaAtual] = useState('');
  const [credenciais, setCredenciais] = useState({
    openai_api_key: ''
  });
  
  const [promptSistema, setPromptSistema] = useState(`Você é um assistente de atendimento para uma loja de roupas.
Sua tarefa é analisar a mensagem do cliente e extrair as seguintes informações:

1. Tipo de solicitação (busca de produtos, informação sobre pedido, dúvida geral)
2. Produtos mencionados (tipos de roupa, categorias)
3. Filtros mencionados (cor, tamanho, gênero, faixa de preço)
4. Nível de urgência (baixo, médio, alto)

Responda apenas em formato JSON com os campos: tipo_solicitacao, produtos, filtros (objeto com cor, tamanho, genero, preco_min, preco_max), urgencia.
Não inclua explicações, apenas o JSON.`);

  const [mensagemTeste, setMensagemTeste] = useState('');
  const [resultadoTeste, setResultadoTeste] = useState(null);

  // Verificar se o Supabase está inicializado
  useEffect(() => {
    if (!loading && !isInitialized) {
      router.push('/configuracao');
    }
  }, [isInitialized, loading, router]);

  // Carregar dados quando o Supabase estiver pronto
  useEffect(() => {
    if (supabase) {
      carregarDados();
    }
  }, [supabase]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      
      // Carregar lojas
      const { data: lojasData, error: lojasError } = await supabase
        .from('lojas')
        .select('*')
        .order('nome', { ascending: true });
      
      if (lojasError) throw lojasError;
      setLojas(lojasData || []);
      
      if (lojasData && lojasData.length > 0) {
        setLojaAtual(lojasData[0].identificador);
        
        // Carregar configurações do agente para a loja selecionada
        await carregarConfiguracoesAgente(lojasData[0].identificador);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  const carregarConfiguracoesAgente = async (lojaId) => {
    try {
      // Carregar credenciais da OpenAI
      const { data: credsData, error: credsError } = await supabase
        .from('credenciais_externas')
        .select('chave, valor')
        .eq('loja_id', lojaId)
        .eq('servico', 'openai');
      
      if (credsError) throw credsError;
      
      const novasCredenciais = { ...credenciais };
      
      if (credsData && credsData.length > 0) {
        credsData.forEach(cred => {
          if (cred.chave === 'api_key') {
            novasCredenciais.openai_api_key = cred.valor;
          }
        });
      }
      
      setCredenciais(novasCredenciais);
      
      // Carregar prompt do sistema
      const { data: promptData, error: promptError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('loja_id', lojaId)
        .eq('chave', 'prompt_agente_ia')
        .single();
      
      if (!promptError && promptData) {
        setPromptSistema(promptData.valor);
      }
      
    } catch (error) {
      console.error('Erro ao carregar configurações do agente:', error);
      toast.error('Erro ao carregar configurações do agente');
    }
  };

  const handleLojaChange = async (e) => {
    const novaLojaId = e.target.value;
    setLojaAtual(novaLojaId);
    await carregarConfiguracoesAgente(novaLojaId);
  };

  const salvarConfiguracoes = async () => {
    try {
      setSalvando(true);
      
      // Salvar API key da OpenAI
      const { error: deleteError } = await supabase
        .from('credenciais_externas')
        .delete()
        .eq('loja_id', lojaAtual)
        .eq('servico', 'openai')
        .eq('chave', 'api_key');
      
      if (deleteError) throw deleteError;
      
      if (credenciais.openai_api_key) {
        const { error: insertError } = await supabase
          .from('credenciais_externas')
          .insert({
            loja_id: lojaAtual,
            servico: 'openai',
            chave: 'api_key',
            valor: credenciais.openai_api_key
          });
        
        if (insertError) throw insertError;
      }
      
      // Salvar prompt do sistema
      const { data: existingPrompt, error: checkError } = await supabase
        .from('configuracoes')
        .select('id')
        .eq('loja_id', lojaAtual)
        .eq('chave', 'prompt_agente_ia');
      
      if (checkError) throw checkError;
      
      if (existingPrompt && existingPrompt.length > 0) {
        // Atualizar configuração existente
        const { error: updateError } = await supabase
          .from('configuracoes')
          .update({ valor: promptSistema })
          .eq('loja_id', lojaAtual)
          .eq('chave', 'prompt_agente_ia');
        
        if (updateError) throw updateError;
      } else {
        // Criar nova configuração
        const { error: insertError } = await supabase
          .from('configuracoes')
          .insert({
            loja_id: lojaAtual,
            chave: 'prompt_agente_ia',
            valor: promptSistema
          });
        
        if (insertError) throw insertError;
      }
      
      toast.success('Configurações salvas com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const testarAgente = async () => {
    if (!mensagemTeste.trim()) {
      toast.error('Digite uma mensagem para testar');
      return;
    }
    
    try {
      setTestando(true);
      setResultadoTeste(null);
      
      // Obter URL e chave do Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = await getSupabaseAnonKey();
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Credenciais do Supabase não disponíveis');
      }
      
      // Fazer requisição para o endpoint de processamento de mensagem
      const response = await fetch('/api/processar-mensagem-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lojaId: lojaAtual,
          mensagem: mensagemTeste,
          telefone: '5511999999999', // Número de teste
          nomeCliente: 'Cliente Teste',
          supabaseUrl,
          supabaseKey,
          openaiApiKey: credenciais.openai_api_key
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar mensagem');
      }
      
      setResultadoTeste(data);
      toast.success('Teste realizado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao testar agente:', error);
      toast.error(`Erro ao testar agente: ${error.message}`);
    } finally {
      setTestando(false);
    }
  };

  // Função auxiliar para obter a chave anônima do Supabase
  const getSupabaseAnonKey = async () => {
    // Em um ambiente real, você pode armazenar isso em uma variável de ambiente
    // ou obter de alguma outra forma segura
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  };

  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Configuração do Agente IA | Sistema de Gestão</title>
      </Head>
      
      <header className="bg-gray-800 shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/configuracao" className="mr-3 text-gray-300 hover:text-white">
              <FiArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold">Configuração do Agente IA</h1>
          </div>
          
          <button
            className="btn btn-primary flex items-center"
            onClick={salvarConfiguracoes}
            disabled={salvando}
          >
            <FiSave className="mr-1" />
            {salvando ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {carregando ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna de configurações */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-6">Configurações do Agente</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Selecione a Loja</label>
                <select
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
                  value={lojaAtual}
                  onChange={handleLojaChange}
                >
                  {lojas.map(loja => (
                    <option key={loja.identificador} value={loja.identificador}>
                      {loja.nome}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">API Key da OpenAI</label>
                <input
                  type="password"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
                  value={credenciais.openai_api_key}
                  onChange={(e) => setCredenciais({ ...credenciais, openai_api_key: e.target.value })}
                  placeholder="sk-..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Sua chave API será armazenada com segurança e usada apenas para processar mensagens.
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Prompt do Sistema</label>
                <textarea
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white h-64 font-mono"
                  value={promptSistema}
                  onChange={(e) => setPromptSistema(e.target.value)}
                ></textarea>
                <p className="text-xs text-gray-400 mt-1">
                  Este prompt será usado para instruir o modelo de IA sobre como extrair informações das mensagens dos clientes.
                </p>
              </div>
            </div>
            
            {/* Coluna de teste */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-6">Testar Agente</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Mensagem de Teste</label>
                <textarea
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white h-32"
                  value={mensagemTeste}
                  onChange={(e) => setMensagemTeste(e.target.value)}
                  placeholder="Digite uma mensagem como se fosse um cliente..."
                ></textarea>
              </div>
              
              <div className="mb-6">
                <button
                  className="btn btn-primary flex items-center"
                  onClick={testarAgente}
                  disabled={testando || !credenciais.openai_api_key}
                >
                  <FiSend className="mr-1" />
                  {testando ? 'Processando...' : 'Testar Agente'}
                </button>
              </div>
              
              {resultadoTeste && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Resultado do Teste</h3>
                  
                  <div className="bg-gray-700 rounded-md p-4 overflow-auto">
                    <pre className="text-sm text-white whitespace-pre-wrap">
                      {JSON.stringify(resultadoTeste, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 