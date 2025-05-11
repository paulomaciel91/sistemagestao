import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Logging inicial para depuração
  console.log('API gerar-link-pagamento-auto iniciada', { method: req.method });
  
  // Apenas método POST é permitido
  if (req.method !== 'POST') {
    console.log('Método inválido:', req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('Processando requisição para gerar link de pagamento (com credenciais armazenadas)');
    const { 
      lojaId,
      vendaId,
      clienteId,
      valorTotal,
      parcelamento,
      vencimento,
      descricao,
      notificacaoCliente = true,
      supabaseUrl,
      supabaseKey
    } = req.body;

    // Validação básica
    if (!lojaId || !vendaId) {
      console.log('Erro de validação: lojaId ou vendaId ausentes');
      return res.status(400).json({ 
        success: false,
        error: 'Parâmetros obrigatórios não fornecidos',
        detalhes: 'lojaId e vendaId são obrigatórios'
      });
    }

    if (!valorTotal || valorTotal <= 0) {
      console.log('Erro de validação: valor total inválido', valorTotal);
      return res.status(400).json({ 
        success: false,
        error: 'Valor total inválido',
        detalhes: 'O valor total deve ser maior que zero'
      });
    }

    // Validar credenciais do Supabase
    if (!supabaseUrl || !supabaseKey) {
      console.log('Erro de validação: credenciais do Supabase ausentes');
      return res.status(400).json({ 
        success: false,
        error: 'Credenciais do Supabase são obrigatórias' 
      });
    }

    console.log('Criando cliente Supabase');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar as credenciais do Asaas
    console.log('Buscando credenciais do Asaas no banco de dados');
    const { data: credenciais, error: credenciaisError } = await supabase
      .from('credenciais_externas')
      .select('*')
      .eq('loja_id', lojaId)
      .eq('servico', 'asaas');

    if (credenciaisError) {
      console.error('Erro ao buscar credenciais do Asaas:', credenciaisError);
      throw new Error(`Erro ao buscar credenciais do Asaas: ${credenciaisError.message}`);
    }

    if (!credenciais || credenciais.length === 0) {
      console.error('Credenciais do Asaas não encontradas');
      return res.status(404).json({
        success: false,
        error: 'Credenciais do Asaas não encontradas',
        mensagem: 'Você precisa configurar as credenciais do Asaas em Configurações > Credenciais Externas'
      });
    }

    // Extrair a chave API do Asaas
    let asaasApiKey = null;
    for (const cred of credenciais) {
      if (cred.chave === 'api_key' || cred.chave === 'token' || cred.chave === 'access_token') {
        asaasApiKey = cred.valor;
        break;
      }
    }

    if (!asaasApiKey) {
      console.error('Chave API do Asaas não encontrada');
      return res.status(404).json({
        success: false,
        error: 'Chave API do Asaas não encontrada',
        mensagem: 'A chave da API do Asaas não está configurada corretamente'
      });
    }

    console.log('Credenciais do Asaas encontradas');

    // Buscar detalhes da venda
    console.log('Buscando detalhes da venda:', vendaId);
    const { data: venda, error: vendaError } = await supabase
      .from(`${lojaId}_vendas`)
      .select('*')
      .eq('id', vendaId)
      .single();

    if (vendaError || !venda) {
      console.error('Erro ao buscar venda:', vendaError);
      return res.status(404).json({ 
        success: false,
        error: 'Venda não encontrada',
        detalhes: vendaError?.message || 'Não foi possível encontrar a venda especificada'
      });
    }
    console.log('Venda encontrada:', { id: venda.id, status: venda.status });

    // Buscar cliente
    const buscarClienteId = clienteId || venda.cliente_id;
    if (!buscarClienteId) {
      console.log('Erro: Nenhum ID de cliente fornecido');
      return res.status(400).json({ 
        success: false,
        error: 'ID do cliente não fornecido',
        detalhes: 'É necessário fornecer o ID do cliente para gerar o link de pagamento'
      });
    }

    console.log('Buscando dados do cliente:', buscarClienteId);
    const { data: cliente, error: clienteError } = await supabase
      .from(`${lojaId}_clientes`)
      .select('*')
      .eq('id', buscarClienteId)
      .single();

    if (clienteError || !cliente) {
      console.error('Erro ao buscar cliente:', clienteError);
      return res.status(404).json({ 
        success: false,
        error: 'Cliente não encontrado',
        detalhes: clienteError?.message || 'Não foi possível encontrar o cliente associado à venda'
      });
    }
    console.log('Cliente encontrado:', { id: cliente.id, nome: cliente.nome });

    // Preparar os dados para a API do Asaas
    const valorUsar = valorTotal || venda.valor_total;
    const descricaoUsar = descricao || `Pedido ref. venda ${vendaId} - ${lojaId}`;
    
    // Determinar data de vencimento
    const dataVencimento = vencimento || new Date();
    if (!vencimento) {
      // Se não fornecido, adiciona 3 dias à data atual
      dataVencimento.setDate(dataVencimento.getDate() + 3);
    }
    
    // Formatar data para o formato YYYY-MM-DD esperado pelo Asaas
    const dataFormatada = dataVencimento.toISOString().split('T')[0];

    console.log('Preparando dados para API Asaas:', { 
      valor: valorUsar, 
      vencimento: dataFormatada,
      temParcelamento: Boolean(parcelamento)
    });

    const asaasPaymentData = {
      customer: cliente.asaas_id || cliente.id, // Usar o ID Asaas se disponível, ou o ID único
      billingType: 'UNDEFINED', // Permite que o cliente escolha a forma de pagamento
      value: valorUsar,
      dueDate: dataFormatada,
      description: descricaoUsar,
      externalReference: vendaId,
      postalService: false
    };

    // Adicionar parcelamento se solicitado
    if (parcelamento && parcelamento > 1) {
      asaasPaymentData.installmentCount = Math.min(parcelamento, 12); // Máximo 12 parcelas
      asaasPaymentData.installmentValue = (valorUsar / parcelamento).toFixed(2);
    }

    // Adicionar notificação se solicitada e houver email
    if (notificacaoCliente && cliente.email) {
      asaasPaymentData.sendEmailNotification = true;
    }

    // Chamar a API do Asaas
    console.log('Enviando solicitação para API Asaas');
    try {
      // URL da API (sandbox ou produção)
      const asaasApiUrl = process.env.ASAAS_PRODUCTION === 'true' 
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/api/v3';
      
      const apiResponse = await fetch(`${asaasApiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasApiKey
        },
        body: JSON.stringify(asaasPaymentData)
      });

      const asaasResult = await apiResponse.json();
      
      if (!apiResponse.ok) {
        console.error('Erro na resposta Asaas:', asaasResult);
        throw new Error(`Erro na API Asaas: ${asaasResult.message || 'Erro desconhecido'}`);
      }

      console.log('Link de pagamento gerado com sucesso:', { 
        id: asaasResult.id, 
        status: asaasResult.status 
      });

      // Atualizar a venda com os dados do link de pagamento
      await supabase
        .from(`${lojaId}_vendas`)
        .update({
          link_pagamento: asaasResult.invoiceUrl || null,
          pagamento_id: asaasResult.id || null,
          pagamento_status: asaasResult.status || 'PENDING',
          updated_at: new Date().toISOString()
        })
        .eq('id', vendaId);

      // Retornar os dados do link de pagamento
      return res.status(200).json({
        success: true,
        mensagem: 'Link de pagamento gerado com sucesso',
        pagamento: {
          id: asaasResult.id,
          status: asaasResult.status,
          valor: asaasResult.value,
          vencimento: asaasResult.dueDate,
          url: asaasResult.invoiceUrl,
          codigoBarras: asaasResult.bankSlipBarCode || null,
          pixQrCode: asaasResult.pixQrCode || null,
          pixCopiaECola: asaasResult.pixCopiaECola || null
        },
        venda: {
          id: venda.id,
          valor_total: venda.valor_total
        }
      });
    } catch (asaasError) {
      console.error('Erro ao gerar link de pagamento no Asaas:', asaasError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao gerar link de pagamento',
        detalhes: asaasError.message
      });
    }
  } catch (error) {
    console.error('Erro ao processar solicitação de link de pagamento:', error);
    
    // Tentar enviar uma resposta mesmo em caso de erro crítico
    try {
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar requisição',
        detalhes: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } catch (responseError) {
      console.error('Erro ao enviar resposta de erro:', responseError);
      // Se não conseguir enviar a resposta formatada, tentar uma resposta simples
      res.status(500).end('Erro interno no servidor');
    }
  }
} 