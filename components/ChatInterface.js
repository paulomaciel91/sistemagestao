import { useState, useEffect, useRef } from 'react';
import { FiSend, FiX, FiPaperclip, FiUser, FiChevronLeft, FiMessageSquare } from 'react-icons/fi';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';

export default function ChatInterface({ cliente, lojaId, onClose }) {
  const [mensagens, setMensagens] = useState([]);
  const [mensagemAtual, setMensagemAtual] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const { supabase } = useSupabase();
  const mensagensContainerRef = useRef(null);

  // Dados de demonstração para mensagens
  const mensagensDemonstracao = [
    {
      id: 1,
      conteudo: `Olá ${cliente?.nome || 'Cliente'}, seja bem-vindo(a)! Como posso ajudar?`,
      enviado_por: 'assistente',
      data_envio: new Date(Date.now() - 3600000).toISOString() // 1 hora atrás
    }
  ];

  // Carregar mensagens ao iniciar
  useEffect(() => {
    const carregarMensagens = async () => {
      try {
        setCarregando(true);
        
        // Verificar se existe a tabela de mensagens
        try {
          const { data, error } = await supabase
            .from(`${lojaId}_mensagens`)
            .select('*')
            .or(`cliente_id.eq.${cliente.id},cliente_telefone.eq.${cliente.telefone}`)
            .order('data_envio', { ascending: true });
            
          if (error && error.code !== 'PGRST116') {
            throw error;
          }
          
          if (data && data.length > 0) {
            setMensagens(data);
          } else {
            // Usar dados de demonstração se não houver mensagens
            setMensagens(mensagensDemonstracao);
          }
        } catch (error) {
          console.error('Erro ao carregar mensagens, usando demonstração:', error);
          setMensagens(mensagensDemonstracao);
        }
        
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        toast.error('Erro ao carregar histórico de mensagens');
      } finally {
        setCarregando(false);
      }
    };
    
    if (cliente) {
      carregarMensagens();
    }
  }, [cliente, lojaId, supabase]);
  
  // Rolar para o final das mensagens quando chegarem novas mensagens
  useEffect(() => {
    if (mensagensContainerRef.current) {
      mensagensContainerRef.current.scrollTop = mensagensContainerRef.current.scrollHeight;
    }
  }, [mensagens]);
  
  // Enviar mensagem
  const enviarMensagem = async (e) => {
    e.preventDefault();
    
    if (!mensagemAtual.trim()) return;
    
    try {
      setEnviando(true);
      
      // Criar objeto de mensagem
      const novaMensagem = {
        conteudo: mensagemAtual.trim(),
        enviado_por: 'lojista',
        data_envio: new Date().toISOString(),
        cliente_id: cliente.id,
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        loja_id: lojaId
      };
      
      // Adicionar à lista local
      setMensagens(prev => [...prev, novaMensagem]);
      
      // Limpar campo de mensagem
      setMensagemAtual('');
      
      try {
        // Tentar salvar no banco
        const { error } = await supabase
          .from(`${lojaId}_mensagens`)
          .insert(novaMensagem);
          
        if (error) throw error;
        
        // Enviar para webhook n8n
        // Esta é apenas uma simulação - você precisará implementar a chamada real para seu webhook
        fetch('/api/enviar-mensagem', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            telefone: cliente.telefone,
            mensagem: novaMensagem.conteudo,
            nome: cliente.nome,
            lojaId: lojaId
          }),
        });
        
        // Simular resposta do assistente após 2 segundos
        setTimeout(() => {
          const respostaAssistente = {
            id: `temp_${Date.now()}`,
            conteudo: 'Obrigado pela sua mensagem! Nosso assistente virtual está processando sua solicitação.',
            enviado_por: 'assistente',
            data_envio: new Date().toISOString(),
            cliente_id: cliente.id,
            cliente_nome: cliente.nome,
            loja_id: lojaId
          };
          
          setMensagens(prev => [...prev, respostaAssistente]);
        }, 2000);
        
      } catch (error) {
        console.error('Erro ao salvar mensagem no banco:', error);
        // Continua com a interface mesmo com erro no banco
      }
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden border border-gray-800">
        {/* Cabeçalho */}
        <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="mr-2 text-gray-400 hover:text-white"
              aria-label="Voltar"
            >
              <FiChevronLeft size={24} />
            </button>
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                {cliente?.nome?.charAt(0) || <FiUser />}
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-white">{cliente?.nome || 'Cliente'}</h3>
                <p className="text-sm text-gray-400">{cliente?.telefone || ''}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Fechar"
          >
            <FiX size={20} />
          </button>
        </div>
        
        {/* Área de mensagens */}
        <div 
          ref={mensagensContainerRef} 
          className="flex-grow overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800"
        >
          {carregando ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-16">
              <FiMessageSquare className="text-5xl text-gray-500 mb-4" />
              <h3 className="text-xl font-medium text-gray-300 mb-2">Nenhuma mensagem ainda</h3>
              <p className="text-gray-400">
                Envie uma mensagem para iniciar a conversa com {cliente?.nome || 'o cliente'}
              </p>
            </div>
          ) : (
            mensagens.map((msg, index) => (
              <div 
                key={msg.id || index} 
                className={`flex ${msg.enviado_por === 'lojista' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    msg.enviado_por === 'lojista' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-700 text-gray-200'
                  }`}
                >
                  <div className="text-sm">{msg.conteudo}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {new Date(msg.data_envio).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Input de mensagem */}
        <form onSubmit={enviarMensagem} className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center">
            <button
              type="button"
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"
              title="Anexar arquivo"
            >
              <FiPaperclip size={20} />
            </button>
            <input
              type="text"
              className="flex-grow mx-3 py-2 px-4 bg-gray-700 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite sua mensagem..."
              value={mensagemAtual}
              onChange={(e) => setMensagemAtual(e.target.value)}
              disabled={enviando}
            />
            <button
              type="submit"
              disabled={enviando || !mensagemAtual.trim()}
              className={`p-2 rounded-full ${
                enviando || !mensagemAtual.trim() 
                ? 'bg-gray-700 text-gray-500' 
                : 'bg-primary-500 text-white hover:bg-primary-600'
              }`}
              title="Enviar mensagem"
            >
              <FiSend size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 