import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Verificar se é uma requisição POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  // Obter credenciais, ID da loja e status desejado da requisição
  const { supabaseUrl, supabaseKey, lojaId, ativo } = req.body;
  
  // Validar parâmetros
  if (!supabaseUrl || !supabaseKey || !lojaId || ativo === undefined) {
    return res.status(400).json({ 
      error: 'Parâmetros inválidos', 
      mensagem: 'É necessário fornecer supabaseUrl, supabaseKey, lojaId e ativo' 
    });
  }
  
  try {
    // Inicializar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar se a loja existe
    const { data: loja, error: lojaError } = await supabase
      .from('lojas')
      .select('*')
      .eq('identificador', lojaId)
      .single();
    
    if (lojaError) {
      return res.status(404).json({ 
        error: 'Loja não encontrada', 
        mensagem: `Não foi possível encontrar a loja com ID ${lojaId}. Erro: ${lojaError.message}` 
      });
    }
    
    // Atualizar o status da loja
    const { error: updateError } = await supabase
      .from('lojas')
      .update({ ativo: ativo })
      .eq('identificador', lojaId);
    
    if (updateError) {
      return res.status(500).json({
        error: 'Erro ao atualizar status da loja',
        mensagem: updateError.message
      });
    }
    
    return res.status(200).json({
      success: true,
      mensagem: `Loja ${loja.nome} ${ativo ? 'ativada' : 'desativada'} com sucesso`,
      loja: {
        ...loja,
        ativo: ativo
      }
    });
    
  } catch (error) {
    console.error('Erro ao alterar status da loja:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      mensagem: error.message
    });
  }
} 