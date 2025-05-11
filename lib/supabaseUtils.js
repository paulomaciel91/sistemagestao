// Função para criar as tabelas necessárias para uma nova loja
export async function criarTabelasLoja(supabase, nomeLoja) {
  try {
    // Nome da loja formatado para uso em nomes de tabela (remover espaços, caracteres especiais, etc.)
    const lojaId = nomeLoja.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Verificar se a função executar_sql existe
    try {
      // Criar tabela de configurações da loja
      await supabase.rpc('criar_tabela_loja_config', { 
        p_nome_tabela: `${lojaId}_config`
      });
      
      // Tabela de produtos
      await supabase.rpc('criar_tabela_produtos', { 
        p_nome_tabela: `${lojaId}_produtos`
      });
      
      // Tabela de estoque
      await supabase.rpc('criar_tabela_estoque', { 
        p_nome_tabela: `${lojaId}_estoque`
      });
      
      // Tabela de vendas
      await supabase.rpc('criar_tabela_vendas', { 
        p_nome_tabela: `${lojaId}_vendas`
      });
      
      // Tabela de clientes
      await supabase.rpc('criar_tabela_clientes', { 
        p_nome_tabela: `${lojaId}_clientes`
      });
      
      // Tabela de promoções
      await supabase.rpc('criar_tabela_promocoes', { 
        p_nome_tabela: `${lojaId}_promocoes`
      });
      
      // Inserir registro na tabela de lojas
      await supabase
        .from('lojas')
        .insert([{ 
          nome: nomeLoja, 
          identificador: lojaId,
          data_criacao: new Date().toISOString()
        }]);
      
      return {
        success: true,
        lojaId
      };
    } catch (rpcError) {
      console.error('Erro ao usar RPC para criar tabelas:', rpcError);
      
      // Se falhar, tentar criar as tabelas via SQL direto
      try {
        // Criar a tabela de lojas se não existir
        await criarTabelaLojas(supabase);
        
        // Inserir na tabela de lojas
        await supabase
          .from('lojas')
          .insert([{ 
            nome: nomeLoja, 
            identificador: lojaId,
            data_criacao: new Date().toISOString()
          }]);
        
        return {
          success: true,
          lojaId,
          warning: 'Algumas tabelas podem precisar ser criadas manualmente'
        };
      } catch (sqlError) {
        console.error('Erro ao criar tabelas via SQL direto:', sqlError);
        throw new Error('Não foi possível criar as tabelas necessárias. Verifique as permissões do Supabase.');
      }
    }
  } catch (error) {
    console.error('Erro ao criar tabelas para a loja:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Função específica para criar a tabela de lojas diretamente
export async function criarTabelaLojas(supabase) {
  try {
    // Verificar se a tabela já existe
    const { error: checkError } = await supabase.from('lojas').select('count').limit(1);
    if (!checkError) {
      return { success: true };
    }
    
    // Tentar criar tabela diretamente com SQL bruto
    const sql = `
      CREATE TABLE IF NOT EXISTS public.lojas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        identificador TEXT NOT NULL UNIQUE,
        data_criacao TIMESTAMPTZ DEFAULT now(),
        ativo BOOLEAN DEFAULT true
      );
    `;
    
    // Tentar executar via RPC
    try {
      await supabase.rpc('executar_sql', { p_sql: sql });
      return { success: true };
    } catch (rpcError) {
      console.warn('Erro ao tentar RPC:', rpcError);
      
      // Tentar criar usando API SQL (requer permissões de administrador)
      try {
        await fetch(`${supabase.supabaseUrl}/rest/v1/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`,
            'apikey': supabase.supabaseKey,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: sql })
        });
        
        // Verificar se a tabela foi criada
        const checkResult = await supabase.from('lojas').select('count').limit(1);
        if (!checkResult.error) {
          return { success: true };
        }
      } catch (sqlError) {
        console.warn('Erro ao tentar SQL direto:', sqlError);
      }
    }
    
    // Oferecer uma solução manual
    return { 
      success: false, 
      error: 'Não foi possível criar a tabela de lojas automaticamente',
      manual: true,
      sql: sql,
      suggestion: 'Execute este SQL no SQL Editor do Supabase'
    };
  } catch (error) {
    console.error('Erro ao criar tabela de lojas:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Função para criar todas as estruturas iniciais necessárias
export async function criarEstruturasIniciais(supabase) {
  try {
    // Criar a tabela de lojas (mais importante)
    const resultado = await criarTabelaLojas(supabase);
    return resultado;
  } catch (error) {
    console.error('Erro ao criar estruturas iniciais:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Função para criar todos os triggers automáticos para uma loja
export async function criarTodosTriggersAutomaticos(supabase, lojaId) {
  try {
    // Criar trigger básico (simplificado)
    try {
      await supabase.rpc('executar_sql', {
        p_sql: `
          CREATE OR REPLACE FUNCTION trigger_${lojaId}_atualizar_timestamp()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = now();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `
      });
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao criar triggers:', error);
      return { success: false, error: error.message };
    }
  } catch (error) {
    console.error('Erro ao criar triggers automáticos:', error);
    return { success: false, error: error.message };
  }
}

// Função para atualizar as tabelas de produtos
export async function atualizarTabelasProdutos(supabase, lojaId) {
  try {
    // Verificar se a tabela de produtos existe e atualizá-la se necessário
    const sql = `
      DO $$
      BEGIN
        -- Verificar se a tabela existe
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${lojaId}_produtos') THEN
          -- Verificar se a coluna estoque existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = '${lojaId}_produtos' AND column_name = 'estoque') THEN
            -- Adicionar coluna estoque
            ALTER TABLE ${lojaId}_produtos ADD COLUMN estoque INTEGER DEFAULT 0;
          END IF;
          
          -- Verificar se a coluna estoque_minimo existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = '${lojaId}_produtos' AND column_name = 'estoque_minimo') THEN
            -- Adicionar coluna estoque_minimo
            ALTER TABLE ${lojaId}_produtos ADD COLUMN estoque_minimo INTEGER DEFAULT 5;
          END IF;
          
          -- Verificar se a coluna cores existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = '${lojaId}_produtos' AND column_name = 'cores') THEN
            -- Adicionar coluna cores
            ALTER TABLE ${lojaId}_produtos ADD COLUMN cores TEXT[] DEFAULT '{}';
          END IF;
          
          -- Verificar se a coluna tamanhos existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = '${lojaId}_produtos' AND column_name = 'tamanhos') THEN
            -- Adicionar coluna tamanhos
            ALTER TABLE ${lojaId}_produtos ADD COLUMN tamanhos TEXT[] DEFAULT '{}';
          END IF;
          
          -- Verificar se a coluna imagens existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = '${lojaId}_produtos' AND column_name = 'imagens') THEN
            -- Adicionar coluna imagens
            ALTER TABLE ${lojaId}_produtos ADD COLUMN imagens TEXT[] DEFAULT '{}';
          END IF;
          
          -- Verificar se a coluna destaque existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = '${lojaId}_produtos' AND column_name = 'destaque') THEN
            -- Adicionar coluna destaque
            ALTER TABLE ${lojaId}_produtos ADD COLUMN destaque BOOLEAN DEFAULT false;
          END IF;
          
          -- Verificar se a coluna ativo existe
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = '${lojaId}_produtos' AND column_name = 'ativo') THEN
            -- Adicionar coluna ativo
            ALTER TABLE ${lojaId}_produtos ADD COLUMN ativo BOOLEAN DEFAULT true;
          END IF;
        ELSE
          -- Criar a tabela se não existir
          CREATE TABLE ${lojaId}_produtos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome TEXT NOT NULL,
            descricao TEXT,
            preco DECIMAL(10, 2) NOT NULL,
            categoria TEXT,
            estoque INTEGER DEFAULT 0,
            estoque_minimo INTEGER DEFAULT 5,
            cores TEXT[] DEFAULT '{}',
            tamanhos TEXT[] DEFAULT '{}',
            imagens TEXT[] DEFAULT '{}',
            destaque BOOLEAN DEFAULT false,
            ativo BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );
        END IF;
        
        -- Verificar se a tabela de estoque existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${lojaId}_estoque') THEN
          -- Criar tabela de estoque
          CREATE TABLE ${lojaId}_estoque (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            produto_id UUID NOT NULL REFERENCES ${lojaId}_produtos(id) ON DELETE CASCADE,
            tamanho TEXT,
            cor TEXT,
            quantidade INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );
        END IF;
      END
      $$;
    `;
    
    // Executar SQL
    await supabase.rpc('executar_sql', { p_sql: sql });
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar tabelas de produtos:', error);
    return { success: false, error: error.message };
  }
}

// Função para criar trigger de atualização de estoque
export async function criarTriggerAtualizacaoEstoque(supabase, lojaId) {
  try {
    const sql = `
      -- Função para atualizar estoque após venda
      CREATE OR REPLACE FUNCTION atualizar_estoque_apos_venda_${lojaId}()
      RETURNS TRIGGER AS $$
      DECLARE
        item JSONB;
        produto_id UUID;
        cor TEXT;
        tamanho TEXT;
        quantidade INTEGER;
      BEGIN
        -- Processar cada item da venda
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.itens)
        LOOP
          produto_id := (item->>'produto_id')::UUID;
          cor := item->>'cor';
          tamanho := item->>'tamanho';
          quantidade := (item->>'quantidade')::INTEGER;
          
          -- Atualizar estoque
          UPDATE ${lojaId}_estoque
          SET quantidade = quantidade - quantidade
          WHERE produto_id = produto_id
            AND (cor = cor OR (cor IS NULL AND cor IS NULL))
            AND (tamanho = tamanho OR (tamanho IS NULL AND tamanho IS NULL));
        END LOOP;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Criar ou substituir o trigger
      DROP TRIGGER IF EXISTS atualizar_estoque_apos_venda_${lojaId} ON ${lojaId}_vendas;
      CREATE TRIGGER atualizar_estoque_apos_venda_${lojaId}
      AFTER INSERT ON ${lojaId}_vendas
      FOR EACH ROW
      EXECUTE FUNCTION atualizar_estoque_apos_venda_${lojaId}();
    `;
    
    // Executar SQL
    await supabase.rpc('executar_sql', { p_sql: sql });
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar trigger de atualização de estoque:', error);
    return { success: false, error: error.message };
  }
}

// Função para criar trigger de estatísticas de produto
export async function criarTriggerEstatisticasProduto(supabase, lojaId) {
  try {
    const sql = `
      -- Função para atualizar estatísticas do produto após venda
      CREATE OR REPLACE FUNCTION atualizar_estatisticas_produto_${lojaId}()
      RETURNS TRIGGER AS $$
      DECLARE
        item JSONB;
        produto_id UUID;
        quantidade INTEGER;
      BEGIN
        -- Processar cada item da venda
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.itens)
        LOOP
          produto_id := (item->>'produto_id')::UUID;
          quantidade := (item->>'quantidade')::INTEGER;
          
          -- Atualizar estatísticas (exemplo: incrementar contador de vendas)
          -- Aqui você pode adicionar mais campos conforme necessário
          UPDATE ${lojaId}_produtos
          SET vendas_count = COALESCE(vendas_count, 0) + quantidade
          WHERE id = produto_id;
        END LOOP;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Verificar se a coluna vendas_count existe
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = '${lojaId}_produtos' AND column_name = 'vendas_count') THEN
          -- Adicionar coluna vendas_count
          ALTER TABLE ${lojaId}_produtos ADD COLUMN vendas_count INTEGER DEFAULT 0;
        END IF;
      END
      $$;
      
      -- Criar ou substituir o trigger
      DROP TRIGGER IF EXISTS atualizar_estatisticas_produto_${lojaId} ON ${lojaId}_vendas;
      CREATE TRIGGER atualizar_estatisticas_produto_${lojaId}
      AFTER INSERT ON ${lojaId}_vendas
      FOR EACH ROW
      EXECUTE FUNCTION atualizar_estatisticas_produto_${lojaId}();
    `;
    
    // Executar SQL
    await supabase.rpc('executar_sql', { p_sql: sql });
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar trigger de estatísticas de produto:', error);
    return { success: false, error: error.message };
  }
}

// Função para corrigir triggers com problemas
export async function corrigirTriggers(supabase, lojaId) {
  try {
    // Remover triggers problemáticos
    const dropTriggersQuery = `
      DROP TRIGGER IF EXISTS atualizar_estoque_apos_venda_${lojaId} ON ${lojaId}_vendas;
      DROP TRIGGER IF EXISTS atualizar_estatisticas_produto_${lojaId} ON ${lojaId}_vendas;
    `;
    
    await supabase.rpc('executar_sql', { p_sql: dropTriggersQuery });
    console.log("Triggers antigos removidos");
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao corrigir triggers:', error);
    return { success: false, error: error.message };
  }
} 