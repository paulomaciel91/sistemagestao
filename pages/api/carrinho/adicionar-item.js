import { createClient } from '@supabase/supabase-js';

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

    // Validação básica
    if (!lojaId || !sessionId || !produtoId || !quantidade) {
      return res.status(400).json({ 
        success: false,
        error: 'Parâmetros obrigatórios não fornecidos',
        detalhes: 'lojaId, sessionId, produtoId e quantidade são obrigatórios'
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

    // 1. Buscar informações do produto
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

    // 2. Verificar disponibilidade de estoque
    let estoqueDisponivel = true;
    let mensagemEstoque = '';

    if (produto.estoque_por_variante) {
      // Verificar estoque específico para a variante
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
      } else if (estoque.quantidade < quantidade) {
        estoqueDisponivel = false;
        mensagemEstoque = `Estoque insuficiente. Disponível: ${estoque.quantidade} unidades`;
      }
    } else {
      // Verificar estoque geral do produto
      if (produto.estoque_quantidade < quantidade) {
        estoqueDisponivel = false;
        mensagemEstoque = `Estoque insuficiente. Disponível: ${produto.estoque_quantidade} unidades`;
      }

      // Verificar se a cor solicitada está disponível
      if (cor && produto.cores_disponiveis) {
        const coresDisponiveis = Array.isArray(produto.cores_disponiveis) 
          ? produto.cores_disponiveis 
          : JSON.parse(produto.cores_disponiveis || '[]');
          
        if (!coresDisponiveis.includes(cor)) {
          estoqueDisponivel = false;
          mensagemEstoque = `Cor ${cor} não disponível. Cores disponíveis: ${coresDisponiveis.join(', ')}`;
        }
      }

      // Verificar se o tamanho solicitado está disponível
      if (tamanho && produto.tamanhos_disponiveis) {
        const tamanhosDisponiveis = Array.isArray(produto.tamanhos_disponiveis) 
          ? produto.tamanhos_disponiveis 
          : JSON.parse(produto.tamanhos_disponiveis || '[]');
          
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

    // 3. Verificar se já existe um carrinho para esta sessão
    const { data: carrinhoExistente, error: carrinhoError } = await supabase
      .from(`${lojaId}_carrinho_compras`)
      .select('*')
      .eq('session_id', sessionId)
      .eq('ativo', true)
      .maybeSingle();

    // Variável para armazenar o carrinho que vamos usar
    let carrinhoParaUsar = carrinhoExistente;

    // Verificar se a tabela possui o campo 'status'
    let temCampoStatus = true; // Assumir que o campo existe por padrão
    try {
      // Tentativa simples de verificar se o campo status existe
      // sem usar information_schema
      const { data: campoTest, error: campoError } = await supabase
        .from(`${lojaId}_carrinho_compras`)
        .select('status')
        .limit(1);
        
      // Se der erro específico de coluna inexistente, marcamos como falso
      if (campoError && 
          (campoError.message.includes('column') && 
           campoError.message.includes('does not exist'))) {
        temCampoStatus = false;
      }
    } catch (schemaError) {
      console.warn('Erro ao verificar campo status:', schemaError);
      // Continuamos mesmo sem conseguir verificar
    }

    // Verificar se existe um carrinho abandonado para esta sessão
    if (!carrinhoParaUsar) {
      let query = supabase
        .from(`${lojaId}_carrinho_compras`)
        .select('*')
        .eq('session_id', sessionId)
        .eq('ativo', false);
      
      // Adicionar filtro por status apenas se o campo existir
      if (temCampoStatus) {
        query = query.eq('status', 'abandonado');
      }
      
      const { data: carrinhoAbandonado, error: abandonadoError } = await query
        .order('updated_at', { ascending: false })
        .maybeSingle();

      // Se existir um carrinho abandonado, reativá-lo antes de adicionar o item
      if (carrinhoAbandonado && !abandonadoError) {
        console.log(`Reativando carrinho abandonado ID: ${carrinhoAbandonado.id}`);
        
        // Preparar dados para reativação
        const dadosReativacao = {
          ativo: true,
          updated_at: new Date().toISOString()
        };
        
        // Adicionar campo status apenas se existir na tabela
        if (temCampoStatus) {
          dadosReativacao.status = 'ativo';
        }
        
        // Reativar o carrinho abandonado
        const { error: reativarError } = await supabase
          .from(`${lojaId}_carrinho_compras`)
          .update(dadosReativacao)
          .eq('id', carrinhoAbandonado.id);
          
        if (reativarError) {
          console.error('Erro ao reativar carrinho abandonado:', reativarError);
        } else {
          // Usar o carrinho reativado
          // Criamos um novo objeto com as propriedades atualizadas
          carrinhoParaUsar = {
            ...carrinhoAbandonado,
            ativo: true
          };
          
          // Adicionar status apenas se o campo existir
          if (temCampoStatus) {
            carrinhoParaUsar.status = 'ativo';
          }
        }
      }
    }

    // Calcular preço do item
    const precoItem = produto.preco_promocional && produto.preco_promocional > 0 
      ? produto.preco_promocional 
      : produto.preco;

    // Preparar o item para adicionar ao carrinho
    const novoItem = {
      produto_id: produtoId,
      nome: produto.nome,
      preco: precoItem,
      quantidade: quantidade,
      subtotal: precoItem * quantidade,
      cor: cor || null,
      tamanho: tamanho || null,
      imagem_url: produto.imagem_url || null,
      observacoes: observacoes || null
    };

    let resultado;

    if (!carrinhoParaUsar) {
      // 4. Criar um novo carrinho se não existir
      
      // Preparar dados para inserção no carrinho
      const dadosNovoCarrinho = {
        session_id: sessionId,
        cliente_id: clienteId || null,
        itens: [novoItem],
        valor_total: novoItem.subtotal,
        quantidade_itens: novoItem.quantidade,
        ativo: true,
        observacoes: observacoes || null
      };
      
      // Adicionar campo status apenas se existir na tabela
      if (temCampoStatus) {
        dadosNovoCarrinho.status = 'ativo';
      }

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
      // 5. Adicionar item ao carrinho existente
      const itensAtuais = carrinhoParaUsar.itens || [];
      
      // Verificar se o produto já está no carrinho com as mesmas características
      const itemExistenteIndex = itensAtuais.findIndex(item => 
        item.produto_id === produtoId && 
        item.cor === cor && 
        item.tamanho === tamanho
      );

      let novosItens;
      let novaQuantidade;

      if (itemExistenteIndex >= 0) {
        // Atualizar quantidade do item existente
        novosItens = [...itensAtuais];
        novosItens[itemExistenteIndex].quantidade += quantidade;
        novosItens[itemExistenteIndex].subtotal = novosItens[itemExistenteIndex].preco * novosItens[itemExistenteIndex].quantidade;
        // Calcular a quantidade total correta somando todas as quantidades individuais
        novaQuantidade = novosItens.reduce((total, item) => total + item.quantidade, 0);
      } else {
        // Adicionar novo item
        novosItens = [...itensAtuais, novoItem];
        // Calcular a quantidade total correta somando todas as quantidades individuais
        novaQuantidade = novosItens.reduce((total, item) => total + item.quantidade, 0);
      }

      // Calcular novo valor total
      const novoValorTotal = novosItens.reduce((total, item) => total + item.subtotal, 0);

      // Preparar dados para atualização do carrinho
      const dadosAtualizacao = {
        itens: novosItens,
        valor_total: novoValorTotal,
        quantidade_itens: novaQuantidade,
        updated_at: new Date().toISOString()
      };
      
      // Adicionar campo status apenas se existir na tabela
      if (temCampoStatus && !carrinhoParaUsar.status) {
        dadosAtualizacao.status = 'ativo';
      }

      // Atualizar carrinho
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
