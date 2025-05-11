# Sistema de Gestão para Lojas de Roupas

Sistema completo para gestão de lojas de roupas com integração ao Supabase e n8n para automações.

## Funcionalidades Principais

- **Gerenciamento Multi-Lojas**: Crie e administre múltiplas lojas através de um único painel administrativo.
- **Geração Automática de Tabelas**: Ao criar uma nova loja, todas as tabelas necessárias são geradas automaticamente no Supabase.
- **Gestão de Produtos e Estoque**: Upload de imagens, cadastro de produtos, controle de estoque.
- **Relatórios Financeiros**: Acompanhe vendas, pagamentos e produtos mais vendidos.
- **Gestão de Clientes**: Cadastro e histórico de clientes e leads, com envio de promoções.
- **Chat Integrado**: Interface de chat simplificada para comunicação com clientes via WhatsApp.
- **Automações com n8n**: Configuração de webhooks para automação de processos.
- **Integrações com Formas de Pagamento**: Suporte a Mercado Pago, Asaas e registros manuais.

## Tecnologias

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Supabase (Banco de dados PostgreSQL + API)
- **Automações**: n8n
- **Comunicação**: Chatwoot + Evolution API (WhatsApp)

## Requisitos

- Node.js 14.x ou superior
- Conta no Supabase (gratuita ou paga)
- (Opcional) Instância n8n para automações
- (Opcional) Chatwoot para gerenciamento de conversas

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/sistema-gestao-lojas.git
cd sistema-gestao-lojas
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o projeto em modo de desenvolvimento:
```bash
npm run dev
```

4. Acesse o sistema em `http://localhost:3000`

## Configuração Inicial

1. Crie um projeto no [Supabase](https://supabase.io)
2. Na primeira execução, o sistema pedirá a URL e a chave de API do seu projeto Supabase
3. Use a chave `service_role` para permitir a criação de tabelas e funções

## Arquitetura do Sistema

### Separação de Configurações

O sistema possui dois níveis de configurações:

1. **Configurações do Lojista**: 
   - Informações básicas da loja (nome, logo, endereço)
   - Contato e horários de funcionamento
   - Formas de pagamento aceitas
   - Personalização visual (cores, banner)
   - Informações fiscais
   - Redes sociais

2. **Configurações de Backend** (apenas para administradores):
   - Integrações com n8n
   - Configuração de Chatwoot e WhatsApp
   - Webhooks para automações
   - Configurações avançadas de banco de dados

Esta separação permite que os lojistas se concentrem apenas nas informações relevantes para o negócio, enquanto os administradores do sistema têm acesso às configurações técnicas.

### Integração com Serviços Externos

- **n8n**: Utilizado para automações e fluxos de trabalho
- **Chatwoot**: Gerenciamento de conversas com clientes
- **Evolution API**: Interface para comunicação com WhatsApp
- **Webhooks**: Permitindo integração com serviços externos

## Configurações Avançadas

### Webhooks do n8n

Para configurar automações com n8n:

1. Configure sua instância do n8n
2. Acesse as configurações de backend de uma loja
3. Configure os URLs dos webhooks para diferentes eventos (novo cliente, nova venda, etc.)
4. Configure a URL da API do n8n e a chave de API

## Sobre a Arquitetura

O sistema utiliza uma arquitetura onde:

1. Cada loja possui seu conjunto de tabelas no Supabase (produtos, estoque, vendas, mensagens, etc.)
2. As tabelas são criadas dinamicamente ao cadastrar uma nova loja
3. O frontend é uma aplicação Next.js que se comunica diretamente com o Supabase
4. Automações são gerenciadas através do n8n com webhooks

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

# Dashboard para Lojas

Dashboard completo para gerenciamento de lojas, produtos, clientes e vendas.

## Funcionalidades

- Dashboard de métricas e indicadores
- Gestão de produtos com variações (cores/tamanhos)
- Controle de estoque
- Gestão de clientes e leads
- Registro de vendas
- Promoções e descontos
- Integração com N8N para automações

## Triggers Automáticos no Banco de Dados

O sistema utiliza triggers PostgreSQL diretamente no banco de dados Supabase para automatizar várias operações, eliminando a necessidade de implementar essa lógica no frontend ou no n8n.

### Triggers Disponíveis

1. **Atualização de Leads para Clientes**
   - Quando um lead realiza uma compra, é automaticamente promovido para cliente
   - Atualiza última compra e total de compras do cliente
   - Mantém consistência dos dados independente da origem da venda (frontend, n8n, etc.)

2. **Atualização de Estoque**
   - Após uma venda, o estoque é automaticamente atualizado para cada item vendido
   - Considera variações de cor e tamanho
   - Evita estoques negativos

3. **Conversão de Carrinhos Abandonados**
   - Quando um carrinho abandonado é marcado como recuperado, cria automaticamente uma venda
   - Registra a data de recuperação do carrinho
   - Mantém a consistência entre carrinhos recuperados e vendas

4. **Estatísticas de Produtos**
   - Atualiza automaticamente estatísticas de vendas para cada produto
   - Rastreia total de vendas, última venda e valor total vendido
   - Facilita a geração de relatórios e análises

5. **Aplicação Automática de Promoções**
   - Aplica promoções automaticamente aos produtos elegíveis
   - Quando uma promoção é criada/atualizada, atualiza os preços promocionais dos produtos
   - Gerencia datas de início e fim das promoções sem intervenção manual

### Benefícios

- **Redução da Complexidade**: Menos código no frontend e no n8n
- **Consistência de Dados**: Regras de negócio aplicadas diretamente no banco de dados
- **Performance**: Operações executadas diretamente no banco, sem chamadas de API adicionais
- **Segurança**: Lógica crítica protegida no nível do banco de dados
- **Integração Simplificada**: Sistemas externos como n8n podem focar apenas em criar registros básicos

### Como Funciona

- Para lojas novas: todos os triggers são criados automaticamente durante a configuração da loja
- Para lojas existentes: um administrador pode criar os triggers através do botão "Criar Triggers Automáticos" no painel administrativo

### Para Desenvolvedores N8N

Ao implementar fluxos no n8n, você só precisa se preocupar em:

1. Inserir os dados básicos (vendas, produtos, clientes, etc.)
2. Os triggers cuidarão automaticamente de:
   - Atualizar estoque
   - Converter leads em clientes
   - Aplicar promoções
   - Atualizar estatísticas

Isso simplifica significativamente o desenvolvimento de automações no n8n.

## Instalação e Configuração

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente (ver `.env.example`)
4. Execute o projeto: `npm run dev`

## Integração com N8N

Para integrar com o N8N, configure os webhooks na seção de configurações da loja.

## Estrutura do Projeto

- `/pages` - Páginas da aplicação
- `/components` - Componentes reutilizáveis
- `/context` - Contextos React
- `/lib` - Funções e utilitários
- `/styles` - Estilos globais 