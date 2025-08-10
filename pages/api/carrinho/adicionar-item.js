import { createClient } from '@supabase/supabase-js';

// Utilitários para lidar com a coluna "itens" como jsonb (array) ou text (JSON string)
function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeItensArray(arr) {
  // Garante números para quantidade/preço/subtotal
  return (Array.isArray(arr) ? arr : []).map((i) => {
    const preco = Number(i?.preco) || 0;
    const qtd = Number(i?.quantidade) || 0;
    const subtotal = Number(i?.subtotal);
    return {
      ...i,
      preco,
      quantidade: qtd,
      subtotal: Number.isFinite(subtotal) ? subtotal : (preco * qtd),
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { 
      lojaId,
      sessionId,
      produtoId,
      quantidade,
      cor,
      tamanho,
      observacoes,
      clienteId,
      supabaseUrl,
      supabaseKey
    } = req.body;

    // --- Quantidade como número (EVITA "011") ---
    const qty = Number(quantidade);
    if (!lojaId || !sessionId || !produtoId || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Parâmetros obrigatórios não fornecidos/invalidos',
        detalhes: 'lojaId, sessionId, produtoId e quantidade numérica > 0 são obrigatórios'
      });
    }

    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ 
        success: false,
        error: 'Credenciais do Supabase são obrigatórias' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1) Produto
    const { data: produto, error: produtoError } = await supabase
      .from(`${lojaId}_produtos`)
      .select('*')
      .eq('id', produtoId)
      .single();

    if (produtoError || !produto) {
      return res.status(404).json({ 
        success: false, 
        error: 'Produto não encontrado',
        detalhes: produtoError?.message || 'Produto não existe na base de dados'
      });
    }

    // 2) Estoque (usa qty)
    let estoqueDisponivel = true;
    let mensagemEstoque = '';

    if (produto.estoque_por_variante) {
      const { data: estoque, error: estoqueError } = await supabase
        .from(`${lojaId}_estoque`)
        .select('*')
        .eq('produto_id', produtoId)
        .eq('cor', cor || '')
        .eq('tamanho', tamanho || '')
        .single();

      if (estoqueError || !estoque) {
        estoqueDisponivel = false;
        mensagemEstoque = `Variante não disponível (cor: ${cor || 'N/A'}, tamanho: ${tamanho || 'N/A'})`;
      } else if (Number(estoque.quantidade) < qty) {
        estoqueDisponivel = false;
        mensagemEstoque = `Estoque insuficiente. Disponível: ${Number(estoque.quantidade)} unidades`;
      }
    } else {
      if (Number(produto.estoque_quantidade) < qty) {
        estoqueDisponivel = false;
        mensagemEstoque = `Estoque insuficiente. Disponível: ${Number(produto.estoque_quantidade)} unidades`;
      }

      if (cor && produto.cores_disponiveis) {
        const coresDisponiveis = Array.isArray(produto.cores_disponiveis) 
          ? produto.cores_disponiveis 
          : toArray(produto.cores_disponiveis);
        if (!coresDisponiveis.includes(cor)) {
          estoqueDisponivel = false;
          mensagemEstoque = `Cor ${cor} não disponível. Cores disponíveis: ${coresDisponiveis.join(', ')}`;
        }
      }

      if (tamanho && produto.tamanhos_disponiveis) {
        const tamanhosDisponiveis = Array.isArray(produto.tamanhos_disponiveis) 
          ? produto.tamanhos_disponiveis 
          : toArray(produto.tamanhos_disponiveis);
        if (!tamanhosDisponiveis.includes(tamanho)) {
          estoqueDisponivel = false;
          mensagemEstoque = `Tamanho ${tamanho} não disponível. Tamanhos disponíveis: ${tamanhosDisponiveis.join(', ')}`;
        }
      }
    }

    if (!estoqueDisponivel) {
      return res.status(400).json({
        success: false,
        error: 'Estoque insuficiente',
        mensagem: mensagemEstoque
      });
    }

    // 3) Carrinho existente ativo por sessão
    const { data: carrinhoExistente, error: carrinhoError } = await supabase
      .from(`${lojaId}_carrinho_compras`)
      .select('*')
      .eq('session_id', sessionId)
      .eq('ativo', true)
      .maybeSingle();

    let carrinhoParaUsar = carrinhoExistente;

    // Verifica se há campo 'status' (tabela pode variar)
    let temCampoStatus = true;
    try {
      const { error: campoError } = await supabase
        .from(`${lojaId}_carrinho_compras`)
        .select('status')
        .limit(1);
      if (campoError && (campoError.message?.includes('column') && campoError.message?.includes('does not exist'))) {
        temCampoStatus = false;
      }
    } catch (_) {
      // segue o jogo
    }

    // Se não existir carrinho ativo, tenta reativar abandonado da mesma sessão
    if (!carrinhoParaUsar) {
      let query = supabase
        .from(`${lojaId}_carrinho_compras`)
        .select('*')
        .eq('session_id', sessionId)
        .eq('ativo', false);

      if (temCampoStatus) query = query.eq('status', 'abandonado');

      const { data: carrinhoAbandonado } = await query
        .order('updated_at', { ascending: false })
        .maybeSingle();

      if (carrinhoAbandonado) {
        const dadosReativacao = {
          ativo: true,
          updated_at: new Date().toISOString(),
          ...(temCampoStatus ? { status: 'ativo' } : {})
        };

        const { error: reativarError } = await supabase
          .from(`${lojaId}_carrinho_compras`)
          .update(dadosReativacao)
          .eq('id', carrinhoAbandonado.id);

        if (!reativarError) {
          carrinhoParaUsar = { ...carrinhoAbandonado, ...dadosReativacao };
        }
      }
    }

    // 4) Preço do item (número)
    const precoItem = Number(
      (produto.preco_promocional && produto.preco_promocional > 0) 
        ? produto.preco_promocional 
        : produto.preco
    ) || 0;

    // 5) Monta item novo com números
    const novoItem = {
      produto_id: produtoId,
      nome: produto.nome,
      preco: precoItem,
      quantidade: qty,
      subtotal: precoItem * qty,
      cor: cor || null,
      tamanho: tamanho || null,
      imagem_url: produto.imagem_url || null,
      observacoes: observacoes || null
    };

    let resultado;

    // 6) Criar carrinho se não existir
    if (!carrinhoParaUsar) {
      const dadosNovoCarrinho = {
        session_id: sessionId,
        cliente_id: clienteId || null,
        itens: [novoItem],                 // se jsonb, vai como array; se text, a regra/trigger converte
        valor_total: Number(novoItem.subtotal),
        quantidade_itens: Number(novoItem.quantidade),
        ativo: true,
        observacoes: observacoes || null,
        ...(temCampoStatus ? { status: 'ativo' } : {})
      };

      const { data: novoCarrinho, error: novoCarrinhoError } = await supabase
        .from(`${lojaId}_carrinho_compras`)
        .insert(dadosNovoCarrinho)
        .select()
        .single();

      if (novoCarrinhoError) {
        throw new Error(`Erro ao criar carrinho: ${novoCarrinhoError.message}`);
      }

      resultado = novoCarrinho;
    } else {
      // 7) Atualizar carrinho existente (normaliza itens)
      const itensAtuaisRaw = carrinhoParaUsar.itens ?? [];
      const itensAtuais = normalizeItensArray(toArray(itensAtuaisRaw));

      // procura item igual (produto + cor + tamanho)
      const idx = itensAtuais.findIndex((item) =>
        item?.produto_id === produtoId &&
        (item?.cor ?? null) === (cor ?? null) &&
        (item?.tamanho ?? null) === (tamanho ?? null)
      );

      let novosItens;
      if (idx >= 0) {
        novosItens = [...itensAtuais];
        const qAnterior = Number(novosItens[idx].quantidade) || 0;
        novosItens[idx].quantidade = qAnterior + qty;
        const pUnit = Number(novosItens[idx].preco) || 0;
        novosItens[idx].subtotal = pUnit * Number(novosItens[idx].quantidade);
      } else {
        novosItens = [...itensAtuais, novoItem];
      }

      const novaQuantidade = novosItens.reduce((s, it) => s + (Number(it.quantidade) || 0), 0);
      const novoValorTotal = novosItens.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);

      const dadosAtualizacao = {
        itens: novosItens,                   // se coluna for jsonb, ok; se text e tiver trigger/converter, ok
        valor_total: Number(novoValorTotal),
        quantidade_itens: Number(novaQuantidade),
        updated_at: new Date().toISOString(),
        ...(temCampoStatus && !carrinhoParaUsar.status ? { status: 'ativo' } : {})
      };

      const { data: carrinhoAtualizado, error: atualizacaoError } = await supabase
        .from(`${lojaId}_carrinho_compras`)
        .update(dadosAtualizacao)
        .eq('id', carrinhoParaUsar.id)
        .select()
        .single();

      if (atualizacaoError) {
        throw new Error(`Erro ao atualizar carrinho: ${atualizacaoError.message}`);
      }

      resultado = carrinhoAtualizado;
    }

    return res.status(200).json({
      success: true,
      mensagem: 'Item adicionado ao carrinho com sucesso',
      carrinho: resultado
    });

  } catch (error) {
    console.error('Erro ao adicionar item ao carrinho:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar requisição',
      detalhes: error.message
    });
  }
}
