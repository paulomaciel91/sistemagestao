import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Verificar se é uma requisição POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  // Obter credenciais do Supabase
  const { supabaseUrl, supabaseKey } = req.body;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ 
      error: 'Parâmetros inválidos', 
      mensagem: 'É necessário fornecer supabaseUrl e supabaseKey' 
    });
  }
  
  try {
    // Inicializar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Lista de buckets a serem criados
    const buckets = [
      { name: 'produtos', isPublic: true },
      { name: 'logos', isPublic: true },
      { name: 'perfil', isPublic: true }
    ];
    
    const resultados = [];
    
    // Criar cada bucket e configurar políticas de acesso
    for (const bucket of buckets) {
      try {
        // 1. Verificar se o bucket já existe
        const { data: existingBuckets, error: listError } = await supabase
          .storage
          .listBuckets();
        
        if (listError) throw listError;
        
        const bucketExists = existingBuckets.some(b => b.name === bucket.name);
        
        if (!bucketExists) {
          // 2. Criar o bucket se não existir
          const { data, error: createError } = await supabase
            .storage
            .createBucket(bucket.name, {
              public: bucket.isPublic,
              fileSizeLimit: 5242880 // 5MB
            });
          
          if (createError) throw createError;
          
          resultados.push({
            bucket: bucket.name,
            status: 'criado',
            mensagem: 'Bucket criado com sucesso'
          });
        } else {
          // 3. Atualizar configurações se já existir
          const { error: updateError } = await supabase
            .storage
            .updateBucket(bucket.name, {
              public: bucket.isPublic,
              fileSizeLimit: 5242880 // 5MB
            });
          
          if (updateError) throw updateError;
          
          resultados.push({
            bucket: bucket.name,
            status: 'atualizado',
            mensagem: 'Bucket atualizado com sucesso'
          });
        }
        
        // 4. Configurar políticas de acesso para o bucket
        if (bucket.isPublic) {
          // Esta parte requer permissões de administrador
          // e normalmente seria implementada via SQL direto no Supabase
          // Aqui apenas registramos que a política deve ser configurada manualmente
          resultados.push({
            bucket: bucket.name,
            status: 'política',
            mensagem: 'Configure manualmente a política de acesso público no painel do Supabase'
          });
        }
      } catch (error) {
        resultados.push({
          bucket: bucket.name,
          status: 'erro',
          mensagem: error.message
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      mensagem: 'Configuração do Storage realizada',
      resultados,
      instrucoes: `
Para completar a configuração, acesse o painel do Supabase:
1. Vá para "Storage" no menu lateral
2. Para cada bucket, clique em "Policies"
3. Adicione uma política que permita acesso de leitura público:
   - Descrição: "Permitir acesso público de leitura"
   - Roles: "anon"
   - SQL: "true"
4. Adicione uma política que permita upload apenas para usuários autenticados:
   - Descrição: "Permitir upload para usuários autenticados"
   - Roles: "authenticated"
   - SQL: "true"
`
    });
    
  } catch (error) {
    console.error('Erro ao configurar Storage:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      mensagem: error.message
    });
  }
} 