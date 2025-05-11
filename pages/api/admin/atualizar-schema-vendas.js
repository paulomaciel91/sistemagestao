import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log('[API] Endpoint atualizar-schema-vendas iniciado', { method: req.method });
  
  if (req.method !== 'POST') {
    console.log('[API] Método inválido:', req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('[API] Processando requisição POST');
    const { 
      lojaId,
      supabaseUrl,
      supabaseKey
    } = req.body;

    console.log('[API] Parâmetros recebidos:', { 
      lojaId, 
      credenciaisPresentes: supabaseUrl && supabaseKey ? 'sim' : 'não' 
    });

    // Validação básica
    if (!lojaId) {
      console.log('[API] Erro: lojaId não fornecido');
      return res.status(400).json({ 
        success: false,
        error: 'Parâmetros obrigatórios não fornecidos',
        detalhes: 'lojaId é obrigatório'
      });
    }

    // Validar credenciais do Supabase
    if (!supabaseUrl || !supabaseKey) {
      console.log('[API] Erro: credenciais do Supabase não fornecidas');
      return res.status(400).json({ 
        success: false,
        error: 'Credenciais do Supabase são obrigatórias' 
      });
    }

    console.log('[API] Criando cliente Supabase');
    // Criar cliente Supabase usando as credenciais fornecidas
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se a tabela de vendas existe
    console.log('[API] Verificando se a tabela existe:', `${lojaId}_vendas`);
    const { data: tabelaExiste, error: tabelaError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', `${lojaId}_vendas`)
      .maybeSingle();

    if (tabelaError) {
      console.error('[API] Erro ao verificar tabela:', tabelaError);
      throw new Error(`Erro ao verificar tabela: ${tabelaError.message}`);
    }

    if (!tabelaExiste) {
      console.log('[API] Tabela não encontrada:', `${lojaId}_vendas`);
      return res.status(404).json({
        success: false,
        error: 'Tabela não encontrada',
        mensagem: `A tabela ${lojaId}_vendas não existe`
      });
    }

    console.log('[API] Tabela encontrada, verificando colunas existentes');
    // Verificar quais colunas existem antes da alteração
    const { data: colunasAntes, error: colunasAntesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', `${lojaId}_vendas`);

    if (colunasAntesError) {
      console.warn('[API] Erro ao verificar colunas antes da alteração:', colunasAntesError);
    } else {
      console.log(`[API] Colunas existentes: ${colunasAntes.map(c => c.column_name).join(', ')}`);
    }

    // Adicionar todas as colunas necessárias, incluindo 'observacoes'
    console.log('[API] Adicionando colunas necessárias');
    const alterTableQuery = `
      ALTER TABLE ${lojaId}_vendas
      ADD COLUMN IF NOT EXISTS observacoes TEXT,
      ADD COLUMN IF NOT EXISTS valor_subtotal DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS valor_frete DECIMAL(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS valor_desconto DECIMAL(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
      ADD COLUMN IF NOT EXISTS cupom_aplicado TEXT,
      ADD COLUMN IF NOT EXISTS endereco_entrega JSONB,
      ADD COLUMN IF NOT EXISTS carrinho_id UUID;
    `;

    try {
      console.log('[API] Executando SQL para adicionar colunas');
      const { error: alterError } = await supabase.rpc('executar_sql', {
        p_sql: alterTableQuery
      });

      if (alterError) {
        console.error('[API] Erro ao alterar tabela via RPC:', alterError);
        throw alterError;
      }
      console.log('[API] SQL executado com sucesso');
    } catch (alterError) {
      console.error('[API] Erro ao alterar tabela:', alterError);
      throw new Error(`Erro ao alterar tabela: ${alterError.message}`);
    }

    // Verificar explicitamente a coluna 'observacoes'
    console.log('[API] Verificando explicitamente a coluna observacoes');
    let observacoesStatus = 'desconhecido';
    try {
      const { data: observacoesCheck, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', `${lojaId}_vendas`)
        .eq('column_name', 'observacoes')
        .maybeSingle();
      
      if (error) {
        console.error('[API] Erro ao verificar coluna observacoes:', error);
        observacoesStatus = `erro: ${error.message}`;
      } else {
        observacoesStatus = observacoesCheck ? 'coluna existe' : 'coluna não existe';
        console.log(`[API] Status da coluna observacoes: ${observacoesStatus}`);
        
        // Se a coluna não existir, tentar criá-la especificamente
        if (!observacoesCheck) {
          console.log('[API] Tentando criar a coluna observacoes explicitamente');
          try {
            await supabase.rpc('executar_sql', {
              p_sql: `ALTER TABLE ${lojaId}_vendas ADD COLUMN observacoes TEXT;`
            });
            observacoesStatus = 'coluna criada explicitamente';
            console.log('[API] Coluna observacoes criada com sucesso');
          } catch (addError) {
            console.error('[API] Erro ao adicionar coluna explicitamente:', addError);
            observacoesStatus = `erro na adição: ${addError.message}`;
          }
        }
      }
    } catch (specificError) {
      console.error('[API] Erro na verificação de coluna:', specificError);
      observacoesStatus = `erro na verificação: ${specificError.message}`;
    }

    // Verificar compatibilidade entre metodo_pagamento e forma_pagamento
    console.log('[API] Verificando compatibilidade entre metodo_pagamento e forma_pagamento');
    const compatibilidadeQuery = `
      DO $$
      BEGIN
        -- Atualizar forma_pagamento com base em metodo_pagamento para registros antigos
        UPDATE ${lojaId}_vendas
        SET forma_pagamento = metodo_pagamento
        WHERE forma_pagamento IS NULL AND metodo_pagamento IS NOT NULL;
      END$$;
    `;

    try {
      await supabase.rpc('executar_sql', {
        p_sql: compatibilidadeQuery
      });
      console.log('[API] Compatibilidade entre colunas verificada');
    } catch (compatError) {
      console.warn('[API] Erro ao verificar compatibilidade:', compatError);
    }

    // Listar as colunas atuais da tabela para confirmar que foram adicionadas
    console.log('[API] Verificando colunas após alterações');
    const { data: colunas, error: colunasError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', `${lojaId}_vendas`);

    if (colunasError) {
      console.error('[API] Erro ao verificar colunas finais:', colunasError);
      throw new Error(`Erro ao verificar colunas: ${colunasError.message}`);
    }

    console.log(`[API] Colunas após alterações: ${colunas.map(c => c.column_name).join(', ')}`);
    
    // Calcular quais colunas foram adicionadas
    const colunasAdicionadas = colunas 
      ? colunas.filter(col => !colunasAntes || !colunasAntes.some(antes => antes.column_name === col.column_name))
          .map(col => col.column_name)
      : [];
    
    console.log(`[API] Colunas adicionadas: ${colunasAdicionadas.join(', ') || 'nenhuma'}`);

    console.log('[API] Retornando resposta de sucesso');
    return res.status(200).json({
      success: true,
      mensagem: 'Schema da tabela de vendas atualizado com sucesso',
      observacoes_status: observacoesStatus,
      colunas_antes: colunasAntes || [],
      colunas_depois: colunas || [],
      colunas_adicionadas: colunasAdicionadas
    });

  } catch (error) {
    console.error('[API] Erro ao atualizar schema:', error);
    
    try {
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar requisição',
        detalhes: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } catch (responseError) {
      console.error('[API] Erro ao enviar resposta de erro:', responseError);
      res.status(500).end('Erro interno no servidor');
    }
  }
} 