import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { 
      lojaId,
      vendaId,
      supabaseUrl,
      supabaseKey
    } = req.body;

    // Validação básica
    if (!lojaId || !vendaId) {
      return res.status(400).json({ 
        success: false,
        error: 'Parâmetros obrigatórios não fornecidos',
        detalhes: 'lojaId e vendaId são obrigatórios'
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

    // 1. Buscar a venda
    const { data: venda, error: vendaError } = await supabase
      .from(`${lojaId}_vendas`)
      .select('*')
      .eq('id', vendaId)
      .single();

    if (vendaError) {
      throw new Error(`Erro ao buscar venda: ${vendaError.message}`);
    }

    if (!venda) {
      return res.status(404).json({
        success: false,
        error: 'Venda não encontrada',
        mensagem: 'Não foi encontrada uma venda com o ID fornecido'
      });
    }

    // 2. Atualizar status da venda para pago
    const { error: updateError } = await supabase
      .from(`${lojaId}_vendas`)
      .update({
        status: 'pago',
        pagamento_status: 'confirmado',
        updated_at: new Date().toISOString()
      })
      .eq('id', vendaId);

    if (updateError) {
      throw new Error(`Erro ao atualizar status da venda: ${updateError.message}`);
    }

    // 3. Atualizar estoque dos produtos
    for (const item of venda.itens) {
      const { data: produto, error: produtoError } = await supabase
        .from(`${lojaId}_produtos`)
        .select('*')
        .eq('id', item.produto_id)
        .single();

      if (produtoError || !produto) {
        console.error(`Produto ${item.produto_id} não encontrado`);
        continue;
      }

      if (produto.estoque_por_variante) {
        // Atualizar estoque da variante
        const { error: estoqueError } = await supabase
          .from(`${lojaId}_estoque`)
          .update({
            quantidade: supabase.rpc('decrement', { x: item.quantidade }),
            updated_at: new Date().toISOString()
          })
          .eq('produto_id', item.produto_id)
          .eq('cor', item.cor || '')
          .eq('tamanho', item.tamanho || '');

        if (estoqueError) {
          console.error(`Erro ao atualizar estoque da variante: ${estoqueError.message}`);
        }
      } else {
        // Atualizar estoque geral do produto
        const { error: produtoUpdateError } = await supabase
          .from(`${lojaId}_produtos`)
          .update({
            estoque_quantidade: supabase.rpc('decrement', { x: item.quantidade }),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.produto_id);

        if (produtoUpdateError) {
          console.error(`Erro ao atualizar estoque do produto: ${produtoUpdateError.message}`);
        }
      }
    }

    // 4. Limpar carrinho se existir
    if (venda.carrinho_id) {
      // Verificar se o carrinho existe
      const { data: carrinho, error: carrinhoError } = await supabase
        .from(`${lojaId}_carrinho_compras`)
        .select('id')
        .eq('id', venda.carrinho_id)
        .single();

      if (!carrinhoError && carrinho) {
        // Excluir o carrinho
        await supabase
          .from(`${lojaId}_carrinho_compras`)
          .delete()
          .eq('id', venda.carrinho_id);
      }
    }

    // 5. Retornar sucesso
    return res.status(200).json({
      success: true,
      mensagem: 'Pagamento confirmado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar requisição',
      detalhes: error.message
    });
  }
} 