import { withApiAuth } from '@/lib/withApiAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { telefone, mensagem, nome, lojaId } = req.body;

    // Validação de dados
    if (!telefone || !mensagem || !lojaId) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // URL do webhook do n8n (em produção, armazene isso no .env ou nas configurações da loja)
    // Este é apenas um exemplo - substitua pela URL real do seu webhook
    const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.seudominio.com/webhook/chatwoot-mensagem';

    // Enviar para o webhook do n8n
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lojaId,
        clienteNome: nome,
        clienteTelefone: telefone,
        mensagem,
        origem: 'dashboard',
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro na resposta do webhook: ${response.status} ${response.statusText}`);
    }

    // Retornar sucesso
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar mensagem para webhook:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar mensagem', 
      details: error.message 
    });
  }
} 