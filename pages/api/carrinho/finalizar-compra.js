import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { 
      lojaId,
      sessionId,
      enderecoEntrega,
      formaPagamento,
      observacoes,
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

    if (!enderecoEntrega) {
      return res.status(400).json({ 
        success: false,
        error: 'Endereço de entrega não fornecido',
        detalhes: 'O endereço de entrega é obrigatório'
      });
    }

    if (!formaPagamento) {
      return res.status(400).json({ 
        success: false,
        error: 'Forma de pagamento não especificada'
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
    
    // Verificar e atualizar o schema da tabela de vendas
    try {
      // Verificar se a tabela tem todas as colunas necessárias
      const alterTableQuery = `
        DO $$
        BEGIN
          ALTER TABLE ${lojaId}_vendas
          ADD COLUMN IF NOT EXISTS endereco_entrega JSONB,
          ADD COLUMN IF NOT EXISTS carrinho_id UUID,
          ADD COLUMN IF NOT EXISTS observacoes TEXT,
          ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
          ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT;
          
          -- Verificar se podemos converter endereco_entrega para JSONB se for TEXT
          BEGIN
            ALTER TABLE ${lojaId}_vendas 
            ALTER COLUMN endereco_entrega TYPE JSONB USING 
              CASE 
                WHEN endereco_entrega IS NULL THEN NULL
                ELSE endereco_entrega::JSONB
              END;
          EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignorar erro se a conversão falhar
          END;
        END
        $$;
      `;
      
      await supabase.rpc('executar_sql', { p_sql: alterTableQuery });
    } catch (schemaError) {
      console.warn('Aviso: Não foi possível verificar/atualizar o schema da tabela:', schemaError.message);
      // Continuar mesmo com erro, pois a tabela pode já ter as colunas necessárias
    }

    // 1. Buscar o carrinho
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
      return res.status(404).json({
        success: false,
        error: 'Carrinho não encontrado',
        mensagem: 'Não foi encontrado um carrinho ativo para esta sessão'
      });
    }

    if (!carrinho.itens || carrinho.itens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Carrinho vazio',
        mensagem: 'O carrinho não possui itens para finalizar a compra'
      });
    }

    // 2. Verificar se os produtos ainda estão disponíveis
    let todosItensDisponiveis = true;
    let mensagensErro = [];

    for (const item of carrinho.itens) {
      // Verificar se o produto existe
      const { data: produto, error: produtoError } = await supabase
        .from(`${lojaId}_produtos`)
        .select('*')
        .eq('id', item.produto_id)
        .single();

      if (produtoError || !produto) {
        todosItensDisponiveis = false;
        mensagensErro.push(`Produto ${item.nome} não está mais disponível`);
        continue;
      }

      // Verificar estoque
      if (produto.estoque_por_variante) {
        const { data: estoque, error: estoqueError } = await supabase
          .from(`${lojaId}_estoque`)
          .select('*')
          .eq('produto_id', item.produto_id)
          .eq('cor', item.cor || '')
          .eq('tamanho', item.tamanho || '')
          .single();

        if (estoqueError || !estoque) {
          todosItensDisponiveis = false;
          mensagensErro.push(`Variante do produto ${item.nome} (cor: ${item.cor}, tamanho: ${item.tamanho}) não está disponível`);
        } else if (estoque.quantidade < item.quantidade) {
          todosItensDisponiveis = false;
          mensagensErro.push(`Estoque insuficiente para ${item.nome} (cor: ${item.cor}, tamanho: ${item.tamanho}). Disponível: ${estoque.quantidade}`);
        }
      } else {
        if (produto.estoque_quantidade < item.quantidade) {
          todosItensDisponiveis = false;
          mensagensErro.push(`Estoque insuficiente para ${item.nome}. Disponível: ${produto.estoque_quantidade}`);
        }
      }
    }

    if (!todosItensDisponiveis) {
      return res.status(400).json({
        success: false,
        error: 'Problemas com itens do carrinho',
        mensagens: mensagensErro
      });
    }

    // 3. Buscar cliente pelo sessionId
    const { data: clienteExistente, error: clienteError } = await supabase
      .from(`${lojaId}_clientes`)
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    let clienteId = null;

    if (clienteExistente) {
      clienteId = clienteExistente.id;
      
      // Atualizar endereço do cliente
      await supabase
        .from(`${lojaId}_clientes`)
        .update({
          endereco: typeof enderecoEntrega === 'string' ? JSON.parse(enderecoEntrega) : enderecoEntrega,
          updated_at: new Date().toISOString()
        })
        .eq('id', clienteId);
    } else {
      // Se não encontrou cliente pelo session_id, buscar pelo cliente_id do carrinho
      if (carrinho.cliente_id) {
        const { data: clientePorId, error: clientePorIdError } = await supabase
          .from(`${lojaId}_clientes`)
          .select('*')
          .eq('id', carrinho.cliente_id)
          .single();

        if (!clientePorIdError && clientePorId) {
          clienteId = clientePorId.id;
          
          // Atualizar session_id e endereço do cliente
          await supabase
            .from(`${lojaId}_clientes`)
            .update({
              session_id: sessionId,
              endereco: typeof enderecoEntrega === 'string' ? JSON.parse(enderecoEntrega) : enderecoEntrega,
              updated_at: new Date().toISOString()
            })
            .eq('id', clienteId);
        }
      }
    }

    // Se não encontrou cliente, retornar erro
    if (!clienteId) {
      return res.status(400).json({
        success: false,
        error: 'Cliente não encontrado',
        mensagem: 'Não foi possível identificar o cliente para esta sessão'
      });
    }

    // 4. Calcular valores
    const subtotal = carrinho.valor_total;
    const valorTotal = subtotal;

    // 5. Criar a venda
    const vendaData = {
      cliente_id: clienteId,
      itens: carrinho.itens,
      valor_total: valorTotal,
      status: 'aguardando_pagamento',
      metodo_pagamento: formaPagamento,
      forma_pagamento: formaPagamento,
      endereco_entrega: typeof enderecoEntrega === 'string' ? JSON.parse(enderecoEntrega) : enderecoEntrega,
      carrinho_id: carrinho.id,
      observacoes: observacoes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: venda, error: vendaError } = await supabase
      .from(`${lojaId}_vendas`)
      .insert(vendaData)
      .select()
      .single();

    if (vendaError) {
      console.error('Erro detalhado ao criar venda:', vendaError);
      throw new Error(`Erro ao criar venda: ${vendaError.message}`);
    }

    // 6. Marcar carrinho como finalizado (não apagar ainda)
    await supabase
      .from(`${lojaId}_carrinho_compras`)
      .update({
        ativo: false,
        status: 'finalizado',
        updated_at: new Date().toISOString()
      })
      .eq('id', carrinho.id);

    // 7. Retornar sucesso com os dados da venda
    return res.status(200).json({
      success: true,
      venda: venda,
      mensagem: 'Compra finalizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao finalizar compra:', error);
    
    // Tentar obter mais detalhes do erro
    let detalhesErro = error.message;
    if (error.details || error.hint || error.code) {
      detalhesErro = {
        mensagem: error.message,
        detalhes: error.details,
        dica: error.hint,
        codigo: error.code
      };
    }
    
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar requisição',
      detalhes: detalhesErro
    });
  }
} 