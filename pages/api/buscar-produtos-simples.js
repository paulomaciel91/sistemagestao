import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { lojaId, supabaseUrl, supabaseKey } = req.body;

    // Validação básica
    if (!lojaId) {
      return res.status(400).json({ error: 'ID da loja é obrigatório' });
    }

    // Validar credenciais do Supabase
    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ error: 'Credenciais do Supabase são obrigatórias' });
    }

    console.log(`Tentando conectar ao Supabase: ${supabaseUrl}`);
    console.log(`Buscando produtos para loja: ${lojaId}`);

    // Criar cliente Supabase usando as credenciais fornecidas
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se o cliente foi criado corretamente
    if (!supabase) {
      throw new Error('Falha ao criar cliente Supabase');
    }

    // Tentar listar todas as tabelas para verificar a conexão
    const { data: tabelas, error: tabelasError } = await supabase
      .from('_tables')
      .select('*');

    if (tabelasError) {
      console.log('Erro ao listar tabelas:', tabelasError);
      // Continuar mesmo com erro
    } else {
      console.log('Tabelas disponíveis:', tabelas);
    }

    // Tentar buscar todos os produtos sem filtros
    const tabelaProdutos = `${lojaId}_produtos`;
    console.log(`Buscando na tabela: ${tabelaProdutos}`);

    const { data: produtos, error: produtosError } = await supabase
      .from(tabelaProdutos)
      .select('*')
      .limit(10);

    if (produtosError) {
      throw new Error(`Erro ao buscar produtos: ${produtosError.message}`);
    }

    console.log(`Produtos encontrados: ${produtos?.length || 0}`);
    
    if (produtos && produtos.length > 0) {
      console.log('Primeiro produto:', produtos[0]);
    }

    // Retornar os dados brutos para diagnóstico
    return res.status(200).json({
      success: true,
      tabelas: tabelas || [],
      produtos: produtos || [],
      mensagem: `Encontrados ${produtos?.length || 0} produtos`
    });

  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao processar requisição',
      details: error.message,
      stack: error.stack
    });
  }
} 