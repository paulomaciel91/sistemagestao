import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { 
      lojaId,
      telefone,
      mensagem,
      imagens,
      produtos,
      supabaseUrl,
      supabaseKey
    } = req.body;

    // Validação básica
    if (!lojaId || !telefone) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios não fornecidos' });
    }

    if (!mensagem && !imagens && !produtos) {
      return res.status(400).json({ error: 'É necessário fornecer uma mensagem, imagens ou produtos' });
    }

    // Validar credenciais do Supabase
    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ error: 'Credenciais do Supabase são obrigatórias' });
    }

    // Criar cliente Supabase usando as credenciais fornecidas
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar credenciais da Evolution API para a loja
    const { data: credenciais, error: credenciaisError } = await supabase
      .from('credenciais_externas')
      .select('chave, valor')
      .eq('loja_id', lojaId)
      .eq('servico', 'evolution_api');

    if (credenciaisError) {
      throw new Error(`Erro ao buscar credenciais: ${credenciaisError.message}`);
    }

    if (!credenciais || credenciais.length === 0) {
      return res.status(400).json({ error: 'Credenciais da Evolution API não configuradas para esta loja' });
    }

    // Organizar credenciais em um objeto para fácil acesso
    const configEvolutionApi = {};
    credenciais.forEach(cred => {
      configEvolutionApi[cred.chave] = cred.valor;
    });

    // Verificar se temos a URL base e a instância configuradas
    if (!configEvolutionApi.BASE_URL || !configEvolutionApi.INSTANCE_NAME) {
      return res.status(400).json({ error: 'Configuração incompleta da Evolution API' });
    }

    const baseUrl = configEvolutionApi.BASE_URL;
    const instanceName = configEvolutionApi.INSTANCE_NAME;
    const apiKey = configEvolutionApi.API_KEY || '';

    // Formatar o número de telefone (remover caracteres não numéricos)
    const numeroFormatado = telefone.replace(/\D/g, '');
    
    // Verificar se o número tem o formato correto
    if (numeroFormatado.length < 10) {
      return res.status(400).json({ error: 'Número de telefone inválido' });
    }

    // Preparar o cabeçalho para requisições à Evolution API
    const headers = {
      'Content-Type': 'application/json',
      'apikey': apiKey
    };

    // Array para armazenar todas as promessas de envio
    const envios = [];

    // 1. Enviar mensagem de texto se fornecida
    if (mensagem) {
      const mensagemPayload = {
        number: numeroFormatado,
        options: {
          delay: 1200
        },
        textMessage: {
          text: mensagem
        }
      };

      const envioMensagem = fetch(`${baseUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(mensagemPayload)
      });

      envios.push(envioMensagem);
    }

    // 2. Enviar imagens se fornecidas
    if (imagens && imagens.length > 0) {
      for (const imagem of imagens) {
        const imagemPayload = {
          number: numeroFormatado,
          options: {
            delay: 1200
          },
          mediaMessage: {
            mediatype: "image",
            media: imagem.url,
            caption: imagem.legenda || ""
          }
        };

        const envioImagem = fetch(`${baseUrl}/message/sendMedia/${instanceName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(imagemPayload)
        });

        envios.push(envioImagem);
      }
    }

    // 3. Enviar produtos se fornecidos
    if (produtos && produtos.length > 0) {
      for (const produto of produtos) {
        // Verificar se o produto tem imagem
        if (!produto.imagem_url) continue;

        const produtoPayload = {
          number: numeroFormatado,
          options: {
            delay: 1200
          },
          mediaMessage: {
            mediatype: "image",
            media: produto.imagem_url,
            caption: `*${produto.nome}*\n${produto.descricao || ''}\n\nPreço: R$ ${produto.preco.toFixed(2)}${produto.preco_promocional ? ` | Promoção: R$ ${produto.preco_promocional.toFixed(2)}` : ''}\n\nCores disponíveis: ${produto.cores_disponiveis?.join(', ') || 'N/A'}\nTamanhos disponíveis: ${produto.tamanhos_disponiveis?.join(', ') || 'N/A'}`
          }
        };

        const envioProduto = fetch(`${baseUrl}/message/sendMedia/${instanceName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(produtoPayload)
        });

        envios.push(envioProduto);
      }
    }

    // Executar todos os envios
    const resultados = await Promise.allSettled(envios);
    
    // Verificar se todos os envios foram bem-sucedidos
    const falhas = resultados.filter(resultado => resultado.status === 'rejected');
    
    if (falhas.length > 0) {
      console.error('Alguns envios falharam:', falhas);
      return res.status(207).json({ 
        success: true, 
        message: 'Alguns envios falharam',
        detalhes: {
          total: resultados.length,
          sucesso: resultados.length - falhas.length,
          falhas: falhas.length
        }
      });
    }

    // Registrar a mensagem no banco de dados
    const novaMensagem = {
      conteudo: mensagem || 'Envio de imagens/produtos',
      enviado_por: 'sistema',
      data_envio: new Date().toISOString(),
      cliente_telefone: telefone,
      loja_id: lojaId,
      processado: true
    };

    await supabase
      .from(`${lojaId}_mensagens`)
      .insert(novaMensagem);

    return res.status(200).json({ 
      success: true, 
      message: 'Mensagem enviada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem via WhatsApp:', error);
    return res.status(500).json({ 
      error: 'Erro ao enviar mensagem',
      details: error.message
    });
  }
} 