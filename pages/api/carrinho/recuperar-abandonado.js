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

    // Buscar o carrinho abandonado
    let query = supabase
      .from(`${lojaId}_carrinho_compras`)
      .select('*')
      .eq('ativo', false)
      .eq('status', 'abandonado');
    
    if (carrinhoId) {
      query = query.eq('id', carrinhoId);
    } else {
      query = query.eq('session_id', sessionId);
    }

    const { data: carrinho, error: carrinhoError } = await query
      .order('updated_at', { ascending: false })
      .maybeSingle();

    if (carrinhoError) {
      throw new Error(`Erro ao buscar carrinho abandonado: ${carrinhoError.message}`);
    }

    if (!carrinho) {
      return res.status(404).json({
        success: false,
        error: 'Carrinho abandonado não encontrado',
        mensagem: 'Não foi encontrado um carrinho abandonado para esta sessão/ID'
      });
    }

    // Verificar se os produtos ainda estão disponíveis
    let itensDisponiveis = [];
    let itensIndisponiveis = [];
    let valorTotal = 0;
    let quantidadeTotal = 0;

    for (const item of carrinho.itens) {
      // Verificar se o produto existe
      const { data: produto, error: produtoError } = await supabase
        .from(`${lojaId}_produtos`)
        .select('*')
        .eq('id', item.produto_id)
        .single();

      if (produtoError || !produto) {
        itensIndisponiveis.push({
          ...item,
          motivo: 'Produto não está mais disponível'
        });
        continue;
      }

      // Verificar estoque
      let estoqueDisponivel = true;
      let mensagemEstoque = '';

      if (produto.estoque_por_variante) {
        const { data: estoque, error: estoqueError } = await supabase
          .from(`${lojaId}_estoque`)
          .select('*')
          .eq('produto_id', item.produto_id)
          .eq('cor', item.cor || '')
          .eq('tamanho', item.tamanho || '')
          .single();

        if (estoqueError || !estoque) {
          estoqueDisponivel = false;
          mensagemEstoque = `Variante não está mais disponível`;
        } else if (estoque.quantidade < item.quantidade) {
          estoqueDisponivel = false;
          mensagemEstoque = `Estoque insuficiente. Disponível: ${estoque.quantidade}`;
          
          // Se tem algum estoque, adicionar com quantidade ajustada
          if (estoque.quantidade > 0) {
            const itemAjustado = {
              ...item,
              quantidade: estoque.quantidade,
              quantidade_original: item.quantidade,
              subtotal: estoque.quantidade * item.preco,
              quantidade_ajustada: true
            };
            
            itensDisponiveis.push(itemAjustado);
            valorTotal += itemAjustado.subtotal;
            quantidadeTotal += itemAjustado.quantidade;
            continue;
          }
        }
      } else {
        if (produto.estoque_quantidade < item.quantidade) {
          estoqueDisponivel = false;
          mensagemEstoque = `Estoque insuficiente. Disponível: ${produto.estoque_quantidade}`;
          
          // Se tem algum estoque, adicionar com quantidade ajustada
          if (produto.estoque_quantidade > 0) {
            const itemAjustado = {
              ...item,
              quantidade: produto.estoque_quantidade,
              quantidade_original: item.quantidade,
              subtotal: produto.estoque_quantidade * item.preco,
              quantidade_ajustada: true
            };
            
            itensDisponiveis.push(itemAjustado);
            valorTotal += itemAjustado.subtotal;
            quantidadeTotal += itemAjustado.quantidade;
            continue;
          }
        }
      }

      if (!estoqueDisponivel) {
        itensIndisponiveis.push({
          ...item,
          motivo: mensagemEstoque
        });
      } else {
        itensDisponiveis.push(item);
        valorTotal += item.subtotal;
        quantidadeTotal += item.quantidade;
      }
    }

    // Se não há itens disponíveis, retornar erro
    if (itensDisponiveis.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Carrinho não pode ser recuperado',
        mensagem: 'Nenhum dos itens do carrinho está disponível',
        itensIndisponiveis: itensIndisponiveis
      });
    }

    // Criar um novo carrinho ativo com os itens disponíveis
    const { data: novoCarrinho, error: novoCarrinhoError } = await supabase
      .from(`${lojaId}_carrinho_compras`)
      .insert({
        session_id: sessionId || carrinho.session_id,
        cliente_id: carrinho.cliente_id,
        itens: itensDisponiveis,
        valor_total: valorTotal,
        quantidade_itens: quantidadeTotal,
        ativo: true,
        status: 'ativo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (novoCarrinhoError) {
      throw new Error(`Erro ao criar novo carrinho: ${novoCarrinhoError.message}`);
    }

    // Retornar sucesso
    return res.status(200).json({
      success: true,
      carrinho: novoCarrinho,
      itensIndisponiveis: itensIndisponiveis.length > 0 ? itensIndisponiveis : null,
      mensagem: itensIndisponiveis.length > 0 
        ? 'Carrinho recuperado parcialmente. Alguns itens não estão mais disponíveis.' 
        : 'Carrinho recuperado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao recuperar carrinho abandonado:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar requisição',
      detalhes: error.message
    });
  }
} 