-- Template de tabelas para uma nova loja
-- {loja_id} será substituído pelo ID da loja

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS "{loja_id}_produtos" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco DECIMAL(10, 2) NOT NULL,
    estoque INTEGER DEFAULT 0,
    imagem_url TEXT,
    categoria TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS "{loja_id}_clientes" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    tipo TEXT DEFAULT 'lead',
    ultima_compra TIMESTAMP WITH TIME ZONE,
    total_compras DECIMAL(10, 2) DEFAULT 0,
    endereco JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Vendas
CREATE TABLE IF NOT EXISTS "{loja_id}_vendas" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES "{loja_id}_clientes" (id),
    valor_total DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pendente',
    data_venda TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    forma_pagamento TEXT,
    carrinho_id UUID,
    endereco_entrega JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observacoes TEXT
);

-- Tabela de Itens de Venda
CREATE TABLE IF NOT EXISTS "{loja_id}_itens_venda" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID REFERENCES "{loja_id}_vendas" (id),
    produto_id UUID REFERENCES "{loja_id}_produtos" (id),
    quantidade INTEGER NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Promoções
CREATE TABLE IF NOT EXISTS "{loja_id}_promocoes" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_fim TIMESTAMP WITH TIME ZONE,
    tipo TEXT DEFAULT 'desconto',
    valor DECIMAL(10, 2),
    ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pagamentos
CREATE TABLE IF NOT EXISTS "{loja_id}_pagamentos" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID REFERENCES "{loja_id}_vendas" (id),
    valor DECIMAL(10, 2) NOT NULL,
    forma_pagamento TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    data_pagamento TIMESTAMP WITH TIME ZONE,
    referencia_externa TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS "{loja_id}_mensagens" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES "{loja_id}_clientes" (id),
    cliente_nome TEXT,
    cliente_telefone TEXT,
    conteudo TEXT NOT NULL,
    enviado_por TEXT NOT NULL, -- 'lojista', 'cliente', 'assistente'
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    loja_id TEXT,
    processado BOOLEAN DEFAULT TRUE,
    criado_por TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar índices
CREATE INDEX IF NOT EXISTS idx_{loja_id}_clientes_telefone ON "{loja_id}_clientes" (telefone);
CREATE INDEX IF NOT EXISTS idx_{loja_id}_mensagens_cliente_id ON "{loja_id}_mensagens" (cliente_id);
CREATE INDEX IF NOT EXISTS idx_{loja_id}_mensagens_telefone ON "{loja_id}_mensagens" (cliente_telefone);
CREATE INDEX IF NOT EXISTS idx_{loja_id}_mensagens_data ON "{loja_id}_mensagens" (data_envio);

-- Criar RLS (Row Level Security)
-- Políticas seriam adicionadas aqui com base nas necessidades de segurança 