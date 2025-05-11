import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { 
      lojaId,
      mensagem,
      telefone,
      nomeCliente,
      supabaseUrl,
      supabaseKey,
      openaiApiKey
    } = req.body;

    // Validação básica
    if (!lojaId || !mensagem || !telefone) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios não fornecidos' });
    }

    // Validar credenciais do Supabase
    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ error: 'Credenciais do Supabase são obrigatórias' });
    }

    // Validar API key da OpenAI
    if (!openaiApiKey) {
      return res.status(400).json({ error: 'API key da OpenAI é obrigatória' });
    }

    // Criar cliente Supabase usando as credenciais fornecidas
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar o prompt personalizado da loja
    let promptSistema = `Você é um assistente de atendimento para uma loja de roupas.
Sua tarefa é analisar a mensagem do cliente e extrair as seguintes informações:

1. Tipo de solicitação (busca de produtos, informação sobre pedido, dúvida geral)
2. Produtos mencionados (tipos de roupa, categorias)
3. Filtros mencionados (cor, tamanho, gênero, faixa de preço)
4. Nível de urgência (baixo, médio, alto)

Responda apenas em formato JSON com os campos: tipo_solicitacao, produtos, filtros (objeto com cor, tamanho, genero, preco_min, preco_max), urgencia.
Não inclua explicações, apenas o JSON.`;

    try {
      const { data: promptData, error: promptError } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('loja_id', lojaId)
        .eq('chave', 'prompt_agente_ia')
        .single();
      
      if (!promptError && promptData && promptData.valor) {
        promptSistema = promptData.valor;
      }
    } catch (promptError) {
      console.warn('Aviso: Erro ao buscar prompt personalizado, usando padrão:', promptError);
    }

    // Registrar a mensagem recebida no banco de dados
    const novaMensagem = {
      conteudo: mensagem,
      enviado_por: 'cliente',
      data_envio: new Date().toISOString(),
      cliente_telefone: telefone,
      cliente_nome: nomeCliente || null,
      loja_id: lojaId,
      processado: false
    };

    await supabase
      .from(`${lojaId}_mensagens`)
      .insert(novaMensagem);

    // Analisar a mensagem com a OpenAI para extrair intenções
    const intencoesExtraidas = await extrairIntencoes(mensagem, openaiApiKey, promptSistema);
    console.log('Intenções extraídas:', intencoesExtraidas);

    // Processar a resposta com base nas intenções
    const resposta = await processarIntencoes(intencoesExtraidas, lojaId, supabaseUrl, supabaseKey);

    // Enviar resposta para o cliente via WhatsApp
    const respostaEnviada = await enviarRespostaWhatsApp(
      resposta, 
      telefone, 
      lojaId, 
      supabaseUrl, 
      supabaseKey
    );

    // Registrar a resposta no banco de dados
    const respostaMensagem = {
      conteudo: resposta.mensagem || 'Resposta processada pelo assistente',
      enviado_por: 'assistente',
      data_envio: new Date().toISOString(),
      cliente_telefone: telefone,
      cliente_nome: nomeCliente || null,
      loja_id: lojaId,
      processado: true
    };

    await supabase
      .from(`${lojaId}_mensagens`)
      .insert(respostaMensagem);

    return res.status(200).json({ 
      success: true, 
      message: 'Mensagem processada com sucesso',
      resposta: resposta
    });
  } catch (error) {
    console.error('Erro ao processar mensagem com IA:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar mensagem',
      details: error.message
    });
  }
}

// Função para extrair intenções da mensagem usando OpenAI
async function extrairIntencoes(mensagem, apiKey, promptSistema) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: promptSistema
          },
          {
            role: 'user',
            content: mensagem
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('Resposta inválida da OpenAI');
    }

    // Extrair e parsear o JSON da resposta
    const conteudoResposta = data.choices[0].message.content;
    let jsonExtraido;
    
    try {
      // Tentar extrair JSON da string (caso tenha ```json ou outros delimitadores)
      const jsonMatch = conteudoResposta.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                        conteudoResposta.match(/\{[\s\S]*\}/);
      
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : conteudoResposta;
      jsonExtraido = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Erro ao parsear JSON da resposta:', parseError);
      console.log('Conteúdo da resposta:', conteudoResposta);
      
      // Fallback para um objeto padrão
      jsonExtraido = {
        tipo_solicitacao: 'dúvida geral',
        produtos: [],
        filtros: {},
        urgencia: 'média'
      };
    }

    return jsonExtraido;
  } catch (error) {
    console.error('Erro ao extrair intenções:', error);
    throw error;
  }
}

// Função para processar intenções e gerar resposta
async function processarIntencoes(intencoes, lojaId, supabaseUrl, supabaseKey) {
  try {
    // Verificar se é uma busca de produtos
    if (intencoes.tipo_solicitacao === 'busca de produtos' && 
        (intencoes.produtos.length > 0 || Object.keys(intencoes.filtros || {}).length > 0)) {
      
      // Preparar parâmetros para busca de produtos
      const filtros = intencoes.filtros || {};
      
      // Construir termo de busca com base nos produtos mencionados
      const termo = intencoes.produtos.join(' ');
      
      // Fazer requisição para o endpoint de busca de produtos
      const produtosResponse = await fetch('http://localhost:3000/api/buscar-produtos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lojaId,
          termo,
          categoria: filtros.categoria,
          cor: filtros.cor,
          tamanho: filtros.tamanho,
          precoMin: filtros.preco_min,
          precoMax: filtros.preco_max,
          genero: filtros.genero,
          limite: 5, // Limitar a 5 produtos para não sobrecarregar o WhatsApp
          supabaseUrl,
          supabaseKey
        })
      });
      
      const produtosData = await produtosResponse.json();
      
      if (produtosData.success && produtosData.produtos && produtosData.produtos.length > 0) {
        // Construir mensagem de resposta
        let mensagemResposta = `Encontrei ${produtosData.produtos.length} produtos que podem te interessar:\n\n`;
        
        // Retornar produtos encontrados e mensagem
        return {
          tipo: 'produtos',
          mensagem: mensagemResposta,
          produtos: produtosData.produtos
        };
      } else {
        // Nenhum produto encontrado
        return {
          tipo: 'texto',
          mensagem: 'Não encontrei produtos com essas características. Poderia fornecer mais detalhes ou tentar com outras especificações?'
        };
      }
    } else {
      // Para outros tipos de solicitação, retornar uma mensagem padrão
      return {
        tipo: 'texto',
        mensagem: 'Obrigado pelo seu contato! Estou processando sua solicitação e em breve um atendente entrará em contato para ajudar com mais detalhes.'
      };
    }
  } catch (error) {
    console.error('Erro ao processar intenções:', error);
    return {
      tipo: 'texto',
      mensagem: 'Desculpe, tive um problema ao processar sua solicitação. Por favor, tente novamente mais tarde.'
    };
  }
}

// Função para enviar resposta via WhatsApp
async function enviarRespostaWhatsApp(resposta, telefone, lojaId, supabaseUrl, supabaseKey) {
  try {
    // Preparar dados para o envio
    const payload = {
      lojaId,
      telefone,
      supabaseUrl,
      supabaseKey
    };
    
    // Adicionar mensagem de texto se existir
    if (resposta.mensagem) {
      payload.mensagem = resposta.mensagem;
    }
    
    // Adicionar produtos se existirem
    if (resposta.tipo === 'produtos' && resposta.produtos && resposta.produtos.length > 0) {
      payload.produtos = resposta.produtos;
    }
    
    // Enviar para o endpoint de envio de mensagens
    const response = await fetch('http://localhost:3000/api/enviar-mensagem-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar resposta via WhatsApp:', error);
    throw error;
  }
} 