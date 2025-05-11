import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { 
      lojaId, 
      servico,
      supabaseUrl,
      supabaseKey
    } = req.body;

    // Validar parâmetros
    if (!lojaId) {
      return res.status(400).json({ 
        success: false,
        error: 'ID da loja é obrigatório'
      });
    }

    if (!servico) {
      return res.status(400).json({ 
        success: false,
        error: 'Nome do serviço é obrigatório'
      });
    }

    // Validar credenciais do Supabase
    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ 
        success: false,
        error: 'Credenciais do Supabase são obrigatórias' 
      });
    }

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar credenciais
    const { data: credenciais, error } = await supabase
      .from('credenciais_externas')
      .select('*')
      .eq('loja_id', lojaId)
      .eq('servico', servico);

    if (error) {
      throw new Error(`Erro ao buscar credenciais: ${error.message}`);
    }

    if (!credenciais || credenciais.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Credenciais não encontradas',
        mensagem: `Não foram encontradas credenciais para o serviço ${servico} na loja ${lojaId}`
      });
    }

    // Transformar para formato de objeto chave-valor para facilitar o uso
    const credenciaisFormatadas = {};
    credenciais.forEach(cred => {
      credenciaisFormatadas[cred.chave] = cred.valor;
    });

    return res.status(200).json({
      success: true,
      credenciais: credenciaisFormatadas
    });

  } catch (error) {
    console.error('Erro ao buscar credenciais:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar requisição',
      detalhes: error.message
    });
  }
} 