import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Verificar se é uma requisição POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  // Obter credenciais e ID da loja da requisição
  const { supabaseUrl, supabaseKey, lojaId, tabelas: tabelasCliente } = req.body;
  
  // Validar parâmetros
  if (!supabaseUrl || !supabaseKey || !lojaId) {
    return res.status(400).json({ 
      error: 'Parâmetros inválidos', 
      mensagem: 'É necessário fornecer supabaseUrl, supabaseKey e lojaId' 
    });
  }
  
  try {
    // Inicializar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar se a loja existe
    const { data: loja, error: lojaError } = await supabase
      .from('lojas')
      .select('*')
      .eq('identificador', lojaId)
      .single();
    
    if (lojaError) {
      return res.status(404).json({ 
        error: 'Loja não encontrada', 
        mensagem: `Não foi possível encontrar a loja com ID ${lojaId}. Erro: ${lojaError.message}` 
      });
    }
    
    // Lista de tabelas para excluir
    const tabelas = tabelasCliente || [
      `${lojaId}_config`,
      `${lojaId}_produtos`,
      `${lojaId}_estoque`,
      `${lojaId}_vendas`,
      `${lojaId}_clientes`,
      `${lojaId}_promocoes`,
      `${lojaId}_carrinhos`,
      `${lojaId}_carrinho_compras`
    ];
    
    const resultados = [];
    
    // 1. Excluir tabelas específicas da loja
    for (const tabela of tabelas) {
      try {
        // Verificar se a tabela existe antes de tentar excluir
        const { error: checkError } = await supabase.from(tabela).select('count').limit(1);
        const tabelaExiste = !checkError || checkError.code === '42P01'; // Código para "relation does not exist"
        
        if (tabelaExiste) {
          // Abordagem 1: Usando RPC
          try {
            const { error } = await supabase.rpc('executar_sql', {
              p_sql: `DROP TABLE IF EXISTS "${tabela}"`
            });
            
            if (error && error.code !== 'PGRST116') {
              console.error(`Erro ao excluir tabela ${tabela} via RPC:`, error);
              
              // Abordagem 2: Tentar SQL direto
              try {
                await supabase.rpc('executar_sql', {
                  p_sql: `DROP TABLE IF EXISTS public."${tabela}"`
                });
                
                resultados.push({
                  tabela,
                  status: 'sucesso',
                  mensagem: 'Tabela removida (segundo método)'
                });
              } catch (directError) {
                resultados.push({
                  tabela,
                  status: 'erro',
                  mensagem: `Falha em ambos os métodos: ${error.message} e ${directError.message}`
                });
              }
            } else {
              resultados.push({
                tabela,
                status: 'sucesso',
                mensagem: 'Tabela removida'
              });
            }
          } catch (rpcError) {
            console.error(`Erro na chamada RPC para tabela ${tabela}:`, rpcError);
            resultados.push({
              tabela,
              status: 'erro',
              mensagem: rpcError.message
            });
          }
        } else {
          resultados.push({
            tabela,
            status: 'info',
            mensagem: 'Tabela não existe'
          });
        }
      } catch (error) {
        console.error(`Erro geral ao processar tabela ${tabela}:`, error);
        resultados.push({
          tabela,
          status: 'erro',
          mensagem: error.message
        });
      }
    }
    
    // 2. Excluir registros de credenciais externas
    try {
      const { error: errorCredenciais } = await supabase
        .from('credenciais_externas')
        .delete()
        .eq('loja_id', lojaId);
      
      resultados.push({
        tabela: 'credenciais_externas',
        status: errorCredenciais ? 'erro' : 'sucesso',
        mensagem: errorCredenciais ? errorCredenciais.message : 'Registros removidos'
      });
    } catch (error) {
      resultados.push({
        tabela: 'credenciais_externas',
        status: 'erro',
        mensagem: error.message
      });
    }
    
    // 3. Excluir webhooks
    try {
      const { error: errorWebhooks } = await supabase
        .from('webhooks_n8n')
        .delete()
        .eq('loja_id', lojaId);
      
      resultados.push({
        tabela: 'webhooks_n8n',
        status: errorWebhooks ? 'erro' : 'sucesso',
        mensagem: errorWebhooks ? errorWebhooks.message : 'Registros removidos'
      });
    } catch (error) {
      resultados.push({
        tabela: 'webhooks_n8n',
        status: 'erro',
        mensagem: error.message
      });
    }
    
    // 4. Finalmente, excluir o registro da loja
    try {
      const { error: errorLoja } = await supabase
        .from('lojas')
        .delete()
        .eq('identificador', lojaId);
      
      resultados.push({
        tabela: 'lojas',
        status: errorLoja ? 'erro' : 'sucesso',
        mensagem: errorLoja ? errorLoja.message : 'Registro removido'
      });
      
      if (errorLoja) {
        return res.status(500).json({
          error: 'Erro ao excluir registro da loja',
          mensagem: errorLoja.message,
          resultados
        });
      }
    } catch (error) {
      return res.status(500).json({
        error: 'Erro ao excluir registro da loja',
        mensagem: error.message,
        resultados
      });
    }
    
    // Verificar se houve erros graves
    const errosGraves = resultados.filter(r => 
      r.status === 'erro' && (r.tabela === 'lojas' || r.tabela === 'credenciais_externas' || r.tabela === 'webhooks_n8n')
    );
    
    if (errosGraves.length > 0) {
      return res.status(500).json({
        error: 'Erro ao excluir dados relacionados à loja',
        resultados,
        detalhes: errosGraves
      });
    }
    
    return res.status(200).json({
      success: true,
      mensagem: `Loja ${loja.nome} excluída com sucesso`,
      resultados
    });
    
  } catch (error) {
    console.error('Erro ao excluir loja:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      mensagem: error.message
    });
  }
} 