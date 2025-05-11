import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { 
      lojaId,
      horasAbandonado = 24,
      supabaseUrl,
      supabaseKey 
    } = req.body;

    // Validação básica
    if (!lojaId) {
      return res.status(400).json({ 
        success: false,
        error: 'ID da loja é obrigatório' 
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

    // Verificar permissões para criar funções
    const { data: permissoes, error: permissoesError } = await supabase.rpc('get_my_claims');
    
    if (permissoesError) {
      return res.status(403).json({ 
        success: false,
        error: 'Erro ao verificar permissões',
        detalhes: permissoesError.message
      });
    }

    // Nome da função e trigger
    const nomeFuncao = `${lojaId}_detectar_carrinhos_abandonados`;
    const nomeTrigger = `${lojaId}_trigger_carrinhos_abandonados`;

    // 1. Criar a função SQL que detecta carrinhos abandonados
    const sqlFuncao = `
      CREATE OR REPLACE FUNCTION ${nomeFuncao}()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Atualizar carrinhos ativos não atualizados no período definido
        UPDATE ${lojaId}_carrinho_compras
        SET status = 'abandonado',
            ativo = false,
            updated_at = NOW()
        WHERE ativo = true 
          AND updated_at < NOW() - INTERVAL '${horasAbandonado} hours';
          
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // 2. Criar o trigger de execução regular
    const sqlTrigger = `
      SELECT cron.schedule(
        '${nomeTrigger}',        -- nome único para o job
        '0 */6 * * *',           -- executa a cada 6 horas (sintaxe cron)
        'SELECT ${nomeFuncao}()' -- chama a função
      );
    `;

    // 3. Verificar se o trigger já existe e removê-lo se necessário
    const sqlRemoverTriggerExistente = `
      SELECT cron.unschedule('${nomeTrigger}');
    `;

    // Executar as operações SQL
    try {
      // Remover trigger existente se houver
      await supabase.rpc('executar_sql', { p_sql: sqlRemoverTriggerExistente });
      
      // Criar a função
      await supabase.rpc('executar_sql', { p_sql: sqlFuncao });
      
      // Criar o trigger
      await supabase.rpc('executar_sql', { p_sql: sqlTrigger });

      // Executar a função imediatamente para processar carrinhos já abandonados
      await supabase.rpc('executar_sql', { p_sql: `SELECT ${nomeFuncao}()` });
      
      return res.status(200).json({
        success: true,
        mensagem: 'Trigger de carrinhos abandonados configurado com sucesso',
        detalhes: {
          funcao: nomeFuncao,
          trigger: nomeTrigger,
          intervaloHoras: horasAbandonado
        }
      });
    } catch (sqlError) {
      console.error('Erro ao executar SQL:', sqlError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao configurar trigger de carrinhos abandonados',
        detalhes: sqlError.message
      });
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar requisição',
      detalhes: error.message
    });
  }
} 