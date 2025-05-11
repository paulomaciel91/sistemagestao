import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Criar cliente Supabase usando as variáveis de ambiente diretamente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Configuração do Supabase não encontrada' });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { 
      lojaId,
      clienteId,
      clienteNome, 
      clienteTelefone, 
      mensagem, 
      origem,
      timestamp 
    } = req.body;

    // Validação básica
    if (!lojaId || !clienteTelefone || !mensagem) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios não fornecidos' });
    }

    // Formatar a mensagem para salvar
    const novaMensagem = {
      conteudo: mensagem,
      enviado_por: origem === 'cliente' ? 'cliente' : 'assistente', 
      data_envio: timestamp || new Date().toISOString(),
      cliente_id: clienteId || null, // Pode ser nulo se o cliente não estiver cadastrado
      cliente_nome: clienteNome,
      cliente_telefone: clienteTelefone,
      loja_id: lojaId,
      processado: true,
    };

    // Verificar se o cliente existe e buscá-lo se necessário
    if (!clienteId && clienteTelefone) {
      // Tenta encontrar o cliente pelo telefone
      const { data: clienteExistente } = await supabase
        .from(`${lojaId}_clientes`)
        .select('id, nome')
        .eq('telefone', clienteTelefone)
        .limit(1);
        
      if (clienteExistente && clienteExistente.length > 0) {
        novaMensagem.cliente_id = clienteExistente[0].id;
        if (!clienteNome) {
          novaMensagem.cliente_nome = clienteExistente[0].nome;
        }
      } else if (clienteNome) {
        // Se não existe cliente com o telefone, mas temos o nome, podemos criar um lead
        const { data: novoCliente, error } = await supabase
          .from(`${lojaId}_clientes`)
          .insert({
            nome: clienteNome,
            telefone: clienteTelefone,
            tipo: 'lead',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
          
        if (!error && novoCliente && novoCliente.length > 0) {
          novaMensagem.cliente_id = novoCliente[0].id;
        }
      }
    }

    // Salvar a mensagem no banco
    const { error } = await supabase
      .from(`${lojaId}_mensagens`)
      .insert(novaMensagem);

    if (error) {
      throw error;
    }

    // Evento para WebSockets aqui caso implemente notificações

    return res.status(200).json({ 
      success: true, 
      message: 'Mensagem recebida e processada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao processar mensagem recebida:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar mensagem',
      details: error.message
    });
  }
} 