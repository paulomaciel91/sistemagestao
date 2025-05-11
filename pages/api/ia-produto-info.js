import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Obter as credenciais do Supabase do corpo da requisição
    const { 
      lojaId,
      termo,
      produtoId,
      supabaseUrl,
      supabaseKey
    } = req.body;

    // Validação básica
    if (!lojaId) {
      return res.status(400).json({ error: 'ID da loja é obrigatório' });
    }

    // Validar credenciais do Supabase
    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ error: 'Credenciais do Supabase são obrigatórias' });
    }

    // Criar cliente Supabase usando as credenciais fornecidas
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar produto específico por ID ou buscar por termo
    if (produtoId) {
      // Buscar produto específico pelo ID
      const { data: produto, error: produtoError } = await supabase
        .from(`${lojaId}_produtos`)
        .select(`
          id, 
          nome, 
          descricao, 
          preco, 
          preco_promocional, 
          categoria, 
          estoque_quantidade,
          cores_disponiveis,
          tamanhos_disponiveis,
          imagem_url
        `)
        .eq('id', produtoId)
        .single();

      if (produtoError) {
        console.error('Erro ao buscar produto específico:', produtoError);
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado',
          mensagem: 'Não foi possível encontrar o produto solicitado.'
        });
      }

      // Preparar informações essenciais para a IA
      const produtoSimplificado = {
        id: produto.id,
        nome: produto.nome,
        descricao: produto.descricao,
        preco: produto.preco_promocional > 0 ? produto.preco_promocional : produto.preco,
        preco_original: produto.preco,
        tem_promocao: produto.preco_promocional > 0,
        categoria: produto.categoria,
        disponivel: produto.estoque_quantidade > 0,
        estoque: produto.estoque_quantidade,
        cores: Array.isArray(produto.cores_disponiveis) 
          ? produto.cores_disponiveis 
          : JSON.parse(produto.cores_disponiveis || '[]'),
        tamanhos: Array.isArray(produto.tamanhos_disponiveis) 
          ? produto.tamanhos_disponiveis 
          : JSON.parse(produto.tamanhos_disponiveis || '[]'),
        imagem: produto.imagem_url
      };

      return res.status(200).json({
        success: true,
        produto: produtoSimplificado
      });
    } else if (termo) {
      // Buscar produtos pelo termo (limitado a 5 resultados para a IA)
      const { data: produtos, error: produtosError } = await supabase
        .from(`${lojaId}_produtos`)
        .select(`
          id, 
          nome, 
          descricao, 
          preco, 
          preco_promocional, 
          categoria, 
          estoque_quantidade,
          cores_disponiveis,
          tamanhos_disponiveis,
          imagem_url
        `)
        .ilike('nome', `%${termo}%`)
        .order('nome', { ascending: true })
        .limit(5);

      if (produtosError) {
        console.error('Erro ao buscar produtos por termo:', produtosError);
        return res.status(500).json({
          success: false,
          error: 'Erro ao buscar produtos',
          mensagem: 'Ocorreu um erro ao processar sua solicitação.'
        });
      }

      // Preparar lista simplificada para a IA
      const produtosSimplificados = produtos.map(produto => ({
        id: produto.id,
        nome: produto.nome,
        descricao: produto.descricao ? produto.descricao.substring(0, 100) + (produto.descricao.length > 100 ? '...' : '') : '',
        preco: produto.preco_promocional > 0 ? produto.preco_promocional : produto.preco,
        preco_original: produto.preco,
        tem_promocao: produto.preco_promocional > 0,
        categoria: produto.categoria,
        disponivel: produto.estoque_quantidade > 0,
        cores: Array.isArray(produto.cores_disponiveis) 
          ? produto.cores_disponiveis 
          : JSON.parse(produto.cores_disponiveis || '[]'),
        tamanhos: Array.isArray(produto.tamanhos_disponiveis) 
          ? produto.tamanhos_disponiveis 
          : JSON.parse(produto.tamanhos_disponiveis || '[]')
      }));

      return res.status(200).json({
        success: true,
        produtos: produtosSimplificados,
        termo_busca: termo,
        quantidade_resultados: produtosSimplificados.length
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros insuficientes',
        mensagem: 'É necessário fornecer pelo menos o ID do produto ou um termo de busca.'
      });
    }
  } catch (error) {
    console.error('Erro na API de informações de produto para IA:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar requisição',
      mensagem: 'Ocorreu um erro interno no servidor.'
    });
  }
} 