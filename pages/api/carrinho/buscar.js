import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { 
      lojaId,
      sessionId,
      supabaseUrl,
      supabaseKey
    } = req.body;

    // Validação básica
    if (!lojaId || !sessionId) {
      return res.status(400).json({ 
        success: false,
        error: 'Parâmetros obrigatórios não fornecidos',
        detalhes: 'lojaId e sessionId são obrigatórios'
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

    // Buscar o carrinho ativo para a sessão
    const { data: carrinho, error: carrinhoError } = await supabase
      .from(`${lojaId}_carrinho_compras`)
      .select('*')
      .eq('session_id', sessionId)
      .eq('ativo', true)
      .maybeSingle();

    if (carrinhoError) {
      throw new Error(`Erro ao buscar carrinho: ${carrinhoError.message}`);
    }

    if (!carrinho) {
      return res.status(200).json({
        success: true,
        carrinho: null,
        mensagem: 'Nenhum carrinho encontrado para esta sessão'
      });
    }

    // Verificar se os produtos no carrinho ainda estão disponíveis e atualizar preços
    if (carrinho.itens && carrinho.itens.length > 0) {
      let itensAtualizados = [...carrinho.itens];
      let carrinhoAtualizado = false;
      let valorTotalAtualizado = 0;

      for (let i = 0; i < itensAtualizados.length; i++) {
        const item = itensAtualizados[i];
        
        // Buscar informações atualizadas do produto
        const { data: produto, error: produtoError } = await supabase
          .from(`${lojaId}_produtos`)
          .select('*')
          .eq('id', item.produto_id)
          .single();

        if (produtoError || !produto) {
          // Produto não existe mais, marcar para remoção
          itensAtualizados[i].indisponivel = true;
          itensAtualizados[i].mensagem_erro = 'Produto não disponível';
          carrinhoAtualizado = true;
          continue;
        }

        // Verificar preço atual
        const precoAtual = produto.preco_promocional && produto.preco_promocional > 0 
          ? produto.preco_promocional 
          : produto.preco;

        if (precoAtual !== item.preco) {
          itensAtualizados[i].preco = precoAtual;
          itensAtualizados[i].preco_alterado = true;
          itensAtualizados[i].preco_anterior = item.preco;
          itensAtualizados[i].subtotal = precoAtual * item.quantidade;
          carrinhoAtualizado = true;
        }

        // Verificar disponibilidade de estoque
        let estoqueDisponivel = true;
        let mensagemEstoque = '';

        if (produto.estoque_por_variante) {
          // Verificar estoque específico para a variante
          const { data: estoque, error: estoqueError } = await supabase
            .from(`${lojaId}_estoque`)
            .select('*')
            .eq('produto_id', item.produto_id)
            .eq('cor', item.cor || '')
            .eq('tamanho', item.tamanho || '')
            .single();

          if (estoqueError || !estoque) {
            estoqueDisponivel = false;
            mensagemEstoque = `Variante não disponível`;
          } else if (estoque.quantidade < item.quantidade) {
            estoqueDisponivel = false;
            mensagemEstoque = `Estoque insuficiente. Disponível: ${estoque.quantidade} unidades`;
            // Ajustar quantidade para o máximo disponível
            if (estoque.quantidade > 0) {
              itensAtualizados[i].quantidade_anterior = item.quantidade;
              itensAtualizados[i].quantidade = estoque.quantidade;
              itensAtualizados[i].subtotal = precoAtual * estoque.quantidade;
              itensAtualizados[i].quantidade_ajustada = true;
              carrinhoAtualizado = true;
            }
          }
        } else {
          // Verificar estoque geral do produto
          if (produto.estoque_quantidade < item.quantidade) {
            estoqueDisponivel = false;
            mensagemEstoque = `Estoque insuficiente. Disponível: ${produto.estoque_quantidade} unidades`;
            // Ajustar quantidade para o máximo disponível
            if (produto.estoque_quantidade > 0) {
              itensAtualizados[i].quantidade_anterior = item.quantidade;
              itensAtualizados[i].quantidade = produto.estoque_quantidade;
              itensAtualizados[i].subtotal = precoAtual * produto.estoque_quantidade;
              itensAtualizados[i].quantidade_ajustada = true;
              carrinhoAtualizado = true;
            }
          }
        }

        if (!estoqueDisponivel) {
          itensAtualizados[i].estoque_insuficiente = true;
          itensAtualizados[i].mensagem_estoque = mensagemEstoque;
          carrinhoAtualizado = true;
        }

        valorTotalAtualizado += itensAtualizados[i].subtotal;
      }

      // Remover itens indisponíveis
      const itensDisponiveis = itensAtualizados.filter(item => !item.indisponivel);
      
      // Se houve alterações, atualizar o carrinho no banco
      if (carrinhoAtualizado) {
        const novaQuantidadeTotal = itensDisponiveis.reduce((total, item) => total + item.quantidade, 0);
        
        const { data: carrinhoAtt, error: attError } = await supabase
          .from(`${lojaId}_carrinho_compras`)
          .update({
            itens: itensDisponiveis,
            valor_total: valorTotalAtualizado,
            quantidade_itens: novaQuantidadeTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', carrinho.id)
          .select()
          .single();

        if (attError) {
          console.error('Erro ao atualizar carrinho:', attError);
        } else {
          // Retornar o carrinho atualizado
          return res.status(200).json({
            success: true,
            carrinho: carrinhoAtt,
            atualizado: true,
            mensagem: 'Carrinho atualizado com informações recentes dos produtos'
          });
        }
      }
    }

    // Retornar o carrinho sem alterações
    return res.status(200).json({
      success: true,
      carrinho: carrinho,
      atualizado: false
    });

  } catch (error) {
    console.error('Erro ao buscar carrinho:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar requisição',
      detalhes: error.message
    });
  }
} 