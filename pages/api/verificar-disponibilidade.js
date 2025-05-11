import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { 
      lojaId,
      produtoId,
      cor,
      tamanho,
      supabaseUrl,
      supabaseKey
    } = req.body;

    // Validação básica
    if (!lojaId || !produtoId) {
      return res.status(400).json({ error: 'ID da loja e ID do produto são obrigatórios' });
    }

    // Validar credenciais do Supabase
    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ error: 'Credenciais do Supabase são obrigatórias' });
    }

    // Criar cliente Supabase usando as credenciais fornecidas
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar o produto pelo ID
    const { data: produto, error: produtoError } = await supabase
      .from(`${lojaId}_produtos`)
      .select('*')
      .eq('id', produtoId)
      .single();

    if (produtoError) {
      return res.status(404).json({ 
        success: false, 
        error: 'Produto não encontrado',
        details: produtoError.message
      });
    }

    // Verificar se o produto existe
    if (!produto) {
      return res.status(404).json({ 
        success: false, 
        error: 'Produto não encontrado'
      });
    }

    // Verificar disponibilidade de estoque
    let disponivel = true;
    let mensagem = 'Produto disponível';
    
    // Verificar se o produto tem controle de estoque por cor e tamanho
    if (produto.estoque_por_variante) {
      // Buscar estoque específico para a variante
      const { data: estoque, error: estoqueError } = await supabase
        .from(`${lojaId}_estoque`)
        .select('*')
        .eq('produto_id', produtoId)
        .eq('cor', cor || '')
        .eq('tamanho', tamanho || '')
        .single();

      if (estoqueError || !estoque) {
        disponivel = false;
        mensagem = `Variante não disponível (cor: ${cor || 'N/A'}, tamanho: ${tamanho || 'N/A'})`;
      } else if (estoque.quantidade <= 0) {
        disponivel = false;
        mensagem = `Sem estoque para esta variante (cor: ${cor || 'N/A'}, tamanho: ${tamanho || 'N/A'})`;
      } else {
        mensagem = `Disponível: ${estoque.quantidade} unidades`;
      }
    } else {
      // Verificar estoque geral do produto
      if (produto.estoque_quantidade <= 0) {
        disponivel = false;
        mensagem = 'Produto sem estoque';
      } else {
        mensagem = `Disponível: ${produto.estoque_quantidade} unidades`;
      }

      // Verificar se a cor solicitada está disponível
      if (cor && produto.cores_disponiveis) {
        const coresDisponiveis = Array.isArray(produto.cores_disponiveis) 
          ? produto.cores_disponiveis 
          : JSON.parse(produto.cores_disponiveis || '[]');
          
        if (!coresDisponiveis.includes(cor)) {
          disponivel = false;
          mensagem = `Cor ${cor} não disponível. Cores disponíveis: ${coresDisponiveis.join(', ')}`;
        }
      }

      // Verificar se o tamanho solicitado está disponível
      if (tamanho && produto.tamanhos_disponiveis) {
        const tamanhosDisponiveis = Array.isArray(produto.tamanhos_disponiveis) 
          ? produto.tamanhos_disponiveis 
          : JSON.parse(produto.tamanhos_disponiveis || '[]');
          
        if (!tamanhosDisponiveis.includes(tamanho)) {
          disponivel = false;
          mensagem = `Tamanho ${tamanho} não disponível. Tamanhos disponíveis: ${tamanhosDisponiveis.join(', ')}`;
        }
      }
    }

    // Retornar resultado
    return res.status(200).json({
      success: true,
      disponivel,
      mensagem,
      produto: {
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        preco_promocional: produto.preco_promocional,
        cores_disponiveis: Array.isArray(produto.cores_disponiveis) 
          ? produto.cores_disponiveis 
          : JSON.parse(produto.cores_disponiveis || '[]'),
        tamanhos_disponiveis: Array.isArray(produto.tamanhos_disponiveis) 
          ? produto.tamanhos_disponiveis 
          : JSON.parse(produto.tamanhos_disponiveis || '[]')
      }
    });
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar requisição',
      details: error.message
    });
  }
} 