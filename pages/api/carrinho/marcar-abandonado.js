import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { 
      lojaId,
      sessionId,
      carrinhoId,
      supabaseUrl,
      supabaseKey
    } = req.body;

    // Validação básica
    if (!lojaId || (!sessionId && !carrinhoId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Parâmetros obrigatórios não fornecidos',
        detalhes: 'lojaId e (sessionId ou carrinhoId) são obrigatórios'
      });
    }

    // Validar credenciais do Supabase
    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ 
        success: false,
        error: 'Credenciais do Supabase são obrigatórias' 
      });
    }

    // Criar cliente Supabase usando as credenciais fornecidas
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar o carrinho
    let query = supabase
      .from(`${lojaId}_carrinho_compras`)
      .select('*')
      .eq('ativo', true);
    
    if (carrinhoId) {
      query = query.eq('id', carrinhoId);
    } else {
      query = query.eq('session_id', sessionId);
    }

    const { data: carrinho, error: carrinhoError } = await query.maybeSingle();

    if (carrinhoError) {
      throw new Error(`Erro ao buscar carrinho: ${carrinhoError.message}`);
    }

    if (!carrinho) {
      return res.status(404).json({
        success: false,
        error: 'Carrinho não encontrado',
        mensagem: 'Não foi encontrado um carrinho ativo para esta sessão/ID'
      });
    }

    // Marcar carrinho como abandonado
    const { data: carrinhoAtualizado, error: updateError } = await supabase
      .from(`${lojaId}_carrinho_compras`)
      .update({
        ativo: false,
        status: 'abandonado',
        updated_at: new Date().toISOString()
      })
      .eq('id', carrinho.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erro ao marcar carrinho como abandonado: ${updateError.message}`);
    }

    // Retornar sucesso
    return res.status(200).json({
      success: true,
      carrinho: carrinhoAtualizado,
      mensagem: 'Carrinho marcado como abandonado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao marcar carrinho como abandonado:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar requisição',
      detalhes: error.message
    });
  }
} 