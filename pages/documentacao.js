import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { FiChevronDown, FiChevronUp, FiDatabase, FiServer, FiLayers, FiCode, FiShoppingBag, FiUser } from 'react-icons/fi';

// Componente de seção dobrável para organizar o conteúdo
function Section({ title, icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = icon;

  return (
    <div className="mb-6 border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-800 text-white hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center">
          <Icon className="mr-2 text-purple-400" />
          <h2 className="text-lg font-medium">{title}</h2>
        </div>
        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
      </button>
      
      {isOpen && (
        <div className="p-4 bg-gray-900">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Documentacao() {
  return (
    <AdminLayout title="Documentação">
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6 border-b border-gray-700 pb-3">
            Documentação da Dashboard Administrativa
          </h1>
          
          <div className="text-gray-300 mb-8">
            <p className="mb-4">
              Esta documentação fornece uma visão geral do funcionamento do painel administrativo, 
              explicando sua arquitetura, recursos e como utilizá-lo corretamente.
            </p>
          </div>

          <Section title="Arquitetura do Sistema" icon={FiLayers} defaultOpen={true}>
            <p className="mb-4">
              O dashboard administrativo é construído usando Next.js, uma framework React, e utiliza o Supabase como banco de dados e backend.
              A arquitetura segue o modelo de Single Page Application (SPA) com renderização do lado do servidor (SSR) para melhor performance e SEO.
            </p>
            
            <h3 className="text-xl font-medium text-purple-400 mb-2">Tecnologias Principais</h3>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Next.js - Framework React para renderização do lado do servidor</li>
              <li>Supabase - Plataforma de banco de dados PostgreSQL com APIs e autenticação</li>
              <li>Tailwind CSS - Framework CSS para estilização</li>
              <li>React Icons - Biblioteca de ícones</li>
              <li>React Toastify - Notificações de sistema</li>
            </ul>
          </Section>

          <Section title="Configuração do Supabase" icon={FiDatabase} defaultOpen={true}>
            <p className="mb-4">
              O sistema utiliza o Supabase como banco de dados e serviço de backend. A integração é gerenciada através do contexto SupabaseContext que fornece acesso ao cliente Supabase em toda a aplicação.
            </p>
            
            <h3 className="text-xl font-medium text-purple-400 mb-2">Como Funciona a Conexão</h3>
            <p className="mb-4">
              1. O sistema armazena as credenciais do Supabase (URL e chave de API) no localStorage do navegador.
              2. O SupabaseContext inicializa automaticamente a conexão quando a aplicação é carregada, usando essas credenciais salvas.
              3. Se as credenciais não existirem ou forem inválidas, o sistema redireciona para a página de configuração do Supabase.
            </p>
            
            <h3 className="text-xl font-medium text-purple-400 mb-2">Configuração Inicial</h3>
            <p className="mb-4">
              Para configurar o Supabase:
            </p>
            <ol className="list-decimal pl-6 mb-4 space-y-1">
              <li>Acesse <a href="/configuracao/supabase" className="text-purple-400 hover:underline">Configuração do Supabase</a></li>
              <li>Insira a URL do seu projeto Supabase (ex: https://xyzabcde.supabase.co)</li>
              <li>Insira a chave de API (anon key) do seu projeto Supabase</li>
              <li>Clique em "Salvar e Testar Conexão"</li>
            </ol>
            
            <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded p-4 mb-4">
              <h4 className="font-medium text-yellow-400 mb-1">Importante</h4>
              <p>
                Ao iniciar o sistema pela primeira vez, o dashboard irá tentar criar as tabelas necessárias no Supabase.
                Caso as tabelas não existam, será exibido um script SQL que poderá ser copiado e executado diretamente
                no SQL Editor do Supabase para criar todas as estruturas necessárias.
              </p>
            </div>
          </Section>

          <Section title="Estrutura do Banco de Dados" icon={FiServer} defaultOpen={false}>
            <p className="mb-4">
              O sistema utiliza um modelo de banco de dados que consiste em tabelas globais e tabelas específicas para cada loja.
            </p>
            
            <h3 className="text-xl font-medium text-purple-400 mb-2">Tabelas Principais</h3>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full bg-gray-800 rounded-lg">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-300 font-medium border-b border-gray-700">Tabela</th>
                    <th className="px-4 py-2 text-left text-gray-300 font-medium border-b border-gray-700">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">lojas</td>
                    <td className="px-4 py-2 border-b border-gray-700">Tabela global que armazena todas as lojas cadastradas no sistema</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">webhooks_n8n</td>
                    <td className="px-4 py-2 border-b border-gray-700">Armazena webhooks para integração com serviços externos</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">credenciais_externas</td>
                    <td className="px-4 py-2 border-b border-gray-700">Armazena credenciais para serviços externos</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h3 className="text-xl font-medium text-purple-400 mb-2">Tabelas Específicas por Loja</h3>
            <p className="mb-4">
              Para cada loja cadastrada, são criadas tabelas específicas com o prefixo do identificador da loja:
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full bg-gray-800 rounded-lg">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-300 font-medium border-b border-gray-700">Tabela</th>
                    <th className="px-4 py-2 text-left text-gray-300 font-medium border-b border-gray-700">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">[loja]_config</td>
                    <td className="px-4 py-2 border-b border-gray-700">Configurações da loja (cores, logo, dados de contato)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">[loja]_produtos</td>
                    <td className="px-4 py-2 border-b border-gray-700">Produtos da loja</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">[loja]_estoque</td>
                    <td className="px-4 py-2 border-b border-gray-700">Controle de estoque dos produtos</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">[loja]_vendas</td>
                    <td className="px-4 py-2 border-b border-gray-700">Registro de vendas da loja</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">[loja]_clientes</td>
                    <td className="px-4 py-2 border-b border-gray-700">Clientes da loja</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">[loja]_promocoes</td>
                    <td className="px-4 py-2 border-b border-gray-700">Promoções da loja</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="API e Integrações" icon={FiCode} defaultOpen={false}>
            <p className="mb-4">
              O sistema oferece uma API REST para interação com serviços externos e integrações, especialmente com o n8n para automações.
            </p>
            
            <h3 className="text-xl font-medium text-purple-400 mb-2">Endpoints Principais</h3>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full bg-gray-800 rounded-lg">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-300 font-medium border-b border-gray-700">Endpoint</th>
                    <th className="px-4 py-2 text-left text-gray-300 font-medium border-b border-gray-700">Método</th>
                    <th className="px-4 py-2 text-left text-gray-300 font-medium border-b border-gray-700">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">/api/buscar-produtos</td>
                    <td className="px-4 py-2 border-b border-gray-700">POST</td>
                    <td className="px-4 py-2 border-b border-gray-700">Lista produtos de uma loja (usado pelo n8n)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">/api/lojas/[lojaId]/produtos/criar</td>
                    <td className="px-4 py-2 border-b border-gray-700">POST</td>
                    <td className="px-4 py-2 border-b border-gray-700">Cria um novo produto</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">/api/lojas/[lojaId]/vendas/listar</td>
                    <td className="px-4 py-2 border-b border-gray-700">POST</td>
                    <td className="px-4 py-2 border-b border-gray-700">Lista vendas de uma loja</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">/api/lojas/[lojaId]/vendas/registrar</td>
                    <td className="px-4 py-2 border-b border-gray-700">POST</td>
                    <td className="px-4 py-2 border-b border-gray-700">Registra uma nova venda</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">/api/carrinho/adicionar</td>
                    <td className="px-4 py-2 border-b border-gray-700">POST</td>
                    <td className="px-4 py-2 border-b border-gray-700">Adiciona produto ao carrinho</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">/api/admin/lojas/listar</td>
                    <td className="px-4 py-2 border-b border-gray-700">POST</td>
                    <td className="px-4 py-2 border-b border-gray-700">Lista todas as lojas (somente admin)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">/api/admin/lojas/criar</td>
                    <td className="px-4 py-2 border-b border-gray-700">POST</td>
                    <td className="px-4 py-2 border-b border-gray-700">Cria uma nova loja (somente admin)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">/api/supabase/webhook</td>
                    <td className="px-4 py-2 border-b border-gray-700">POST</td>
                    <td className="px-4 py-2 border-b border-gray-700">Recebe webhooks do Supabase</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h3 className="text-xl font-medium text-purple-400 mb-2">Integração com n8n</h3>
            <p className="mb-4">
              O sistema é integrado com o n8n para automações e workflows. A comunicação ocorre principalmente 
              através de endpoints POST, que são mais seguros para transmitir dados estruturados.
            </p>
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-purple-400 mb-2">Exemplo de requisição para buscar produtos:</h4>
              <pre className="bg-gray-900 p-3 rounded text-gray-300 text-sm overflow-x-auto">
{`// Endpoint: /api/buscar-produtos
// Método: POST
// Body:
{
  "lojaId": "nome-da-loja",
  "filtros": {
    "categoria": "camisetas",
    "ativo": true
  }
}`}
              </pre>
            </div>
            
            <h3 className="text-xl font-medium text-purple-400 mb-2">Supabase e API</h3>
            <p className="mb-4">
              O sistema utiliza as capacidades do Supabase para acesso ao banco de dados e autenticação. 
              A comunicação ocorre através:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Cliente Supabase no frontend para operações diretas</li>
              <li>API Routes do Next.js para operações que exigem lógica adicional ou validação</li>
              <li>Webhooks para comunicação assíncrona entre sistemas</li>
            </ul>
            <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded p-4">
              <h4 className="font-medium text-blue-400 mb-1">Observação Importante</h4>
              <p>
                Todos os endpoints de API utilizam principalmente o método POST para permitir o envio de 
                dados estruturados no corpo da requisição, incluindo filtros complexos e parâmetros de segurança.
              </p>
            </div>
          </Section>

          <Section title="Gerenciamento de Lojas" icon={FiShoppingBag} defaultOpen={false}>
            <h3 className="text-xl font-medium text-purple-400 mb-2">Criar uma Nova Loja</h3>
            <p className="mb-4">
              Para criar uma nova loja no sistema:
            </p>
            <ol className="list-decimal pl-6 mb-4 space-y-1">
              <li>Acesse o <a href="/dashboard" className="text-purple-400 hover:underline">Painel Principal</a></li>
              <li>Clique no botão "Nova Loja"</li>
              <li>Digite um nome para a loja (o identificador será gerado automaticamente)</li>
              <li>Aguarde a criação das tabelas e estruturas necessárias</li>
            </ol>
            
            <h3 className="text-xl font-medium text-purple-400 mb-2">Excluir ou Desativar uma Loja</h3>
            <p className="mb-4">
              Você pode desativar uma loja temporariamente (recomendado) ou excluí-la permanentemente:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Para <strong>desativar</strong>: clique no ícone de desativação (olho) na lista de lojas</li>
              <li>Para <strong>excluir</strong>: clique no ícone de lixeira na lista de lojas (ação irreversível)</li>
            </ul>
            
            <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded p-4 mb-4">
              <h4 className="font-medium text-red-400 mb-1">Atenção</h4>
              <p>
                A exclusão de uma loja é <strong>permanente</strong> e remove todos os dados relacionados, 
                incluindo produtos, vendas e clientes. Considere desativar a loja em vez de excluí-la.
              </p>
            </div>
          </Section>

          <Section title="Perfis de Usuário" icon={FiUser} defaultOpen={false}>
            <p className="mb-4">
              O sistema possui diferentes níveis de acesso:
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full bg-gray-800 rounded-lg">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-300 font-medium border-b border-gray-700">Perfil</th>
                    <th className="px-4 py-2 text-left text-gray-300 font-medium border-b border-gray-700">Permissões</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">Administrador</td>
                    <td className="px-4 py-2 border-b border-gray-700">Acesso total ao sistema, gerenciamento de lojas, configurações de sistema</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">Gerente de Loja</td>
                    <td className="px-4 py-2 border-b border-gray-700">Acesso total a uma loja específica, sem acesso ao painel administrativo</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-gray-700">Vendedor</td>
                    <td className="px-4 py-2 border-b border-gray-700">Acesso limitado à loja, pode registrar vendas e ver produtos</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <p className="mb-4">
              Atualmente, o sistema está configurado para uso administrativo. Perfis de usuário adicionais 
              podem ser implementados nas próximas versões.
            </p>
          </Section>
          
          <div className="mt-10 border-t border-gray-700 pt-6">
            <h3 className="text-xl font-medium text-white mb-4">Suporte e Ajuda Adicional</h3>
            <p className="mb-4">
              Para informações adicionais ou solicitações de suporte, entre em contato com a equipe de desenvolvimento.
            </p>
            <p className="text-sm text-gray-400">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
} 