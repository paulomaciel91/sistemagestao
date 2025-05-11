import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { 
  FiDatabase, FiGrid, FiLoader, FiShoppingBag, 
  FiUsers, FiTag, FiBarChart2, FiChevronRight, FiShoppingCart 
} from 'react-icons/fi';
import { useConfirmDialog } from '../_app';

// Cores pré-definidas para produtos
const CORES_DISPONIVEIS = [
  'Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 
  'Amarelo', 'Cinza', 'Rosa', 'Roxo', 'Marrom', 
  'Laranja', 'Bege', 'Azul Marinho', 'Vinho'
];

// Tamanhos pré-definidos
const TAMANHOS_DISPONIVEIS = {
  camisetas: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'],
  calcas: ['34', '36', '38', '40', '42', '44', '46', '48', '50', '52'],
  vestidos: ['PP', 'P', 'M', 'G', 'GG'],
  acessorios: ['Único']
};

// Categorias de produtos
const CATEGORIAS = [
  'Camisetas', 'Calças', 'Vestidos', 'Blusas', 
  'Casacos', 'Moletons', 'Saias', 'Shorts', 'Jaquetas',
  'Acessórios', 'Bolsas', 'Calçados'
];

export default function LojaDemoPage() {
  const router = useRouter();
  const { supabase, isInitialized } = useSupabase();
  const { confirm } = useConfirmDialog();
  
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const [mensagem, setMensagem] = useState('');
  const [lojaId, setLojaId] = useState('loja_demo');
  const [nomeLoja, setNomeLoja] = useState('Loja Fashion Demo');
  const [quantidadeProdutos, setQuantidadeProdutos] = useState(50);
  const [quantidadeClientes, setQuantidadeClientes] = useState(30);
  const [quantidadeVendas, setQuantidadeVendas] = useState(100);
  const [quantidadePromocoes, setQuantidadePromocoes] = useState(10);
  const [resumo, setResumo] = useState({
    produtos: 0,
    clientes: 0,
    vendas: 0,
    promocoes: 0,
    carrinhos: 0
  });
  const [statusDemo, setStatusDemo] = useState('');
  const [carregando, setCarregando] = useState(false);
  
  // Função para criar loja de demonstração
  const criarLojaDemo = async () => {
    const confirmarCriacao = await confirm({
      title: 'Criar loja de demonstração',
      message: "Deseja criar uma loja de demonstração com dados fictícios?\nIsso irá gerar produtos, clientes, vendas e promoções para testes.",
      confirmText: 'Sim, criar demo',
      cancelText: 'Cancelar',
      type: 'info'
    });
    
    if (!confirmarCriacao) return;
    
    setCriandoDemo(true);
    
    try {
      // Verificar se a tabela lojas existe
      const { error: checkError } = await supabase.from('lojas').select('count');
      
      // Se houver erro específico de "relation does not exist"
      if (checkError && checkError.message && checkError.message.includes('relation "public.lojas" does not exist')) {
        mostrarInstrucoesSQL();
        throw new Error('É necessário criar as tabelas no Supabase primeiro');
      }
      
      // Verificar se já existe uma loja com ID "loja_demo"
      const { data, error } = await supabase
        .from('lojas')
        .select('id')
        .eq('identificador', 'loja_demo')
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        const confirmarSubstituicao = await confirm({
          title: 'Loja demo já existe',
          message: 'Já existe uma loja demo. Deseja sobrescrevê-la?',
          confirmText: 'Sim, substituir',
          cancelText: 'Cancelar',
          type: 'warning'
        });
        
        if (!confirmarSubstituicao) {
          return;
        }
        
        // Excluir tabelas existentes
        const tabelas = [
          'loja_demo_config',
          'loja_demo_produtos',
          'loja_demo_estoque',
          'loja_demo_vendas',
          'loja_demo_clientes',
          'loja_demo_promocoes',
          'loja_demo_carrinhos',
          'loja_demo_carrinho_compras'
        ];
        
        for (const tabela of tabelas) {
          await supabase.rpc('executar_sql', {
            p_sql: `DROP TABLE IF EXISTS ${tabela}`
          });
        }
        
        // Excluir registro da loja
        await supabase
          .from('lojas')
          .delete()
          .eq('identificador', 'loja_demo');
      }
      
      // ... resto do código existente ...
    } catch (error) {
      console.error('Erro ao criar loja de demonstração:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Gerar loja de demonstração
  const gerarLojaDemonstracao = async () => {
    if (!supabase) {
      toast.error('Supabase não inicializado');
      return;
    }
    
    try {
      setLoading(true);
      setEtapa(0);
      setProgresso(0);
      
      // 1. Criar tabelas básicas
      setMensagem('Criando estrutura da loja...');
      await criarEstruturaDaLoja();
      setEtapa(1);
      setProgresso(10);
      
      // 2. Gerar produtos
      setMensagem('Gerando produtos...');
      await gerarProdutos();
      setEtapa(2);
      setProgresso(30);
      
      // 3. Gerar clientes
      setMensagem('Gerando clientes...');
      await gerarClientes();
      setEtapa(3);
      setProgresso(50);
      
      // 4. Gerar vendas
      setMensagem('Gerando histórico de vendas...');
      await gerarVendas();
      setEtapa(4);
      setProgresso(70);
      
      // 5. Gerar promoções
      setMensagem('Gerando promoções...');
      await gerarPromocoes();
      setEtapa(5);
      setProgresso(90);
      
      // 6. Criar carrinhos abandonados de demonstração
      setStatusDemo('Criando carrinhos abandonados de demonstração...');
      
      // Obter dados de clientes para associar aos carrinhos
      const { data: clientes } = await supabase
        .from(`${lojaId}_clientes`)
        .select('id, nome, email')
        .limit(20);
      
      // Obter produtos para incluir nos carrinhos
      const { data: produtos } = await supabase
        .from(`${lojaId}_produtos`)
        .select('id, nome, preco, categoria')
        .order('created_at', { ascending: false })
        .limit(30);
        
      if (clientes?.length && produtos?.length) {
        // Gerar entre 5 e 15 carrinhos abandonados
        const numCarrinhos = Math.floor(Math.random() * 10) + 5;
        
        for (let i = 0; i < numCarrinhos; i++) {
          // Selecionar cliente aleatório
          const cliente = clientes[Math.floor(Math.random() * clientes.length)];
          
          // Data aleatória nos últimos 30 dias
          const dataAbandonado = new Date();
          dataAbandonado.setDate(dataAbandonado.getDate() - Math.floor(Math.random() * 30));
          
          // Itens aleatórios (1 a 4 itens)
          const numItens = Math.floor(Math.random() * 3) + 1;
          const itens = [];
          let valorTotal = 0;
          
          for (let j = 0; j < numItens; j++) {
            const produto = produtos[Math.floor(Math.random() * produtos.length)];
            const quantidade = Math.floor(Math.random() * 2) + 1;
            const valorItem = produto.preco * quantidade;
            
            itens.push({
              produto_id: produto.id,
              nome_produto: produto.nome,
              categoria: produto.categoria,
              preco: produto.preco,
              quantidade: quantidade,
              valor_total: valorItem
            });
            
            valorTotal += valorItem;
          }
          
          // Status (maioria abandonado, alguns recuperados)
          const recuperado = Math.random() > 0.7;
          const status = recuperado ? 'recuperado' : 'abandonado';
          
          // Criar o carrinho
          await supabase
            .from(`${lojaId}_carrinhos`)
            .insert({
              cliente_id: cliente.id,
              cliente_email: cliente.email,
              cliente_nome: cliente.nome,
              valor_total: valorTotal,
              itens: itens,
              status: status,
              recuperado: recuperado,
              data_abandono: dataAbandonado.toISOString(),
              data_recuperacao: recuperado ? new Date().toISOString() : null
            });
        }
      }
      
      // 6. Finalizar
      setMensagem('Finalizando configuração...');
      setProgresso(100);
      setEtapa(6);
      
      toast.success('Loja de demonstração criada com sucesso!');
      
      // Resumo do que foi criado
      setResumo({
        produtos: quantidadeProdutos,
        clientes: quantidadeClientes,
        vendas: quantidadeVendas,
        promocoes: quantidadePromocoes,
        carrinhos: numCarrinhos
      });
      
    } catch (error) {
      console.error('Erro ao criar loja de demonstração:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 1. Criar estrutura básica da loja
  const criarEstruturaDaLoja = async () => {
    // Verificar se a loja já existe
    const { data, error } = await supabase
      .from('lojas')
      .select('*')
      .eq('identificador', lojaId);
    
    if (error) throw error;
    
    // Se a loja já existir, perguntar se quer remover
    if (data && data.length > 0) {
      const confirmar = await confirm({
        title: 'Loja já existe',
        message: `Uma loja com o ID '${lojaId}' já existe. Deseja removê-la e criar uma nova?`,
        confirmText: 'Sim, substituir',
        cancelText: 'Cancelar',
        type: 'warning'
      });
      
      if (!confirmar) {
        throw new Error('Operação cancelada pelo usuário');
      }
      
      // Excluir tabelas existentes
      const tabelas = [
        `${lojaId}_config`,
        `${lojaId}_produtos`,
        `${lojaId}_estoque`,
        `${lojaId}_vendas`,
        `${lojaId}_clientes`,
        `${lojaId}_promocoes`,
        `${lojaId}_carrinhos`,
        `${lojaId}_carrinho_compras`
      ];
      
      for (const tabela of tabelas) {
        await supabase.rpc('executar_sql', {
          p_sql: `DROP TABLE IF EXISTS ${tabela}`
        });
      }
      
      // Excluir registro da loja
      await supabase
        .from('lojas')
        .delete()
        .eq('identificador', lojaId);
    }
    
    // Criar registro da loja
    const { error: errorInsert } = await supabase
      .from('lojas')
      .insert([{
        nome: nomeLoja,
        identificador: lojaId,
        data_criacao: new Date().toISOString(),
        ativo: true
      }]);
    
    if (errorInsert) throw errorInsert;
    
    // Criar tabelas específicas da loja
    const tabelas = [
      { funcao: 'criar_tabela_loja_config', tabela: `${lojaId}_config` },
      { funcao: 'criar_tabela_produtos', tabela: `${lojaId}_produtos` },
      { funcao: 'criar_tabela_estoque', tabela: `${lojaId}_estoque` },
      { funcao: 'criar_tabela_vendas', tabela: `${lojaId}_vendas` },
      { funcao: 'criar_tabela_clientes', tabela: `${lojaId}_clientes` },
      { funcao: 'criar_tabela_promocoes', tabela: `${lojaId}_promocoes` },
      { funcao: 'criar_tabela_carrinhos', tabela: `${lojaId}_carrinhos` },
      { funcao: 'criar_tabela_carrinho_compras', tabela: `${lojaId}_carrinho_compras` }
    ];
    
    for (const t of tabelas) {
      const { error } = await supabase.rpc(t.funcao, { p_nome_tabela: t.tabela });
      if (error) throw error;
    }
    
    // Verificar explicitamente que as colunas session_id e customer_id existem na tabela de clientes
    // e adicioná-las se estiverem faltando
    try {
      console.log(`Verificando e garantindo colunas na tabela ${lojaId}_clientes...`);
      
      await supabase.rpc('executar_sql', {
        p_sql: `
          ALTER TABLE ${lojaId}_clientes
          ADD COLUMN IF NOT EXISTS session_id TEXT,
          ADD COLUMN IF NOT EXISTS customer_id TEXT,
          ADD COLUMN IF NOT EXISTS endereco JSONB;
        `
      });
      
      console.log('Colunas verificadas e atualizadas com sucesso.');
    } catch (e) {
      console.error('Erro ao verificar ou adicionar colunas:', e);
      // Não vamos interromper o processo por causa desse erro
    }
    
    // Adicionar configurações básicas
    const { error: errorConfig } = await supabase
      .from(`${lojaId}_config`)
      .insert([{
        nome_loja: nomeLoja,
        endereco: 'Av. Brasil, 1500 - Centro',
        telefone: '(11) 98765-4321',
        horario_funcionamento: 'Segunda a Sexta: 9h às 18h\nSábado: 9h às 13h',
        politica_troca: 'Troca em até 30 dias com nota fiscal.',
        cor_primaria: '#3B82F6',
        cor_secundaria: '#1E3A8A',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
    
    if (errorConfig) throw errorConfig;
  };
  
  // Geração de produtos - substitua a função "vazia" pelo código abaixo
  const gerarProdutos = async () => {
    // Nomes de produtos
    const nomesProdutos = {
      Camisetas: [
        'Camiseta Básica', 'Camiseta Estampada', 'Camiseta Gola V', 
        'Camiseta Manga Longa', 'Camiseta Oversized', 'Camiseta Cropped',
        'Camiseta Tie Dye', 'Camiseta Polo', 'Camiseta Listrada'
      ],
      Calças: [
        'Calça Jeans Skinny', 'Calça Jeans Reta', 'Calça Cargo', 
        'Calça Social', 'Calça Legging', 'Calça Jogger',
        'Calça Flare', 'Calça Pantacourt', 'Calça Jeans Mom'
      ],
      Vestidos: [
        'Vestido Longo', 'Vestido Curto', 'Vestido Estampado', 
        'Vestido Tubinho', 'Vestido Midi', 'Vestido Festa',
        'Vestido Casual', 'Vestido Florido', 'Vestido Social'
      ],
      Blusas: [
        'Blusa Manga Bufante', 'Blusa Cropped', 'Blusa Ombro a Ombro', 
        'Blusa Decote V', 'Blusa de Alcinha', 'Blusa Transpassada',
        'Blusa em Renda', 'Blusa Ciganinha', 'Blusa Bordada'
      ],
      Casacos: [
        'Casaco de Lã', 'Casaco Trench Coat', 'Casaco Sobretudo', 
        'Casaco Parka', 'Casaco Acolchoado', 'Casaco Tweed',
        'Casaco de Pelo Sintético', 'Casaco Corta-Vento'
      ],
      Moletons: [
        'Moletom Canguru', 'Moletom Oversized', 'Moletom Cropped', 
        'Moletom com Capuz', 'Moletom Estampado', 'Moletom Básico',
        'Moletom com Zíper', 'Moletom College'
      ],
      Saias: [
        'Saia Midi', 'Saia Longa', 'Saia Plissada', 
        'Saia Jeans', 'Saia Lápis', 'Saia Godê',
        'Saia Envelope', 'Saia Couro', 'Saia Tennis'
      ],
      Shorts: [
        'Short Jeans', 'Short Alfaiataria', 'Short Moletom', 
        'Short Cintura Alta', 'Short Saia', 'Short Social',
        'Short Praia', 'Short Couro', 'Short Tecido'
      ],
      Jaquetas: [
        'Jaqueta Jeans', 'Jaqueta de Couro', 'Jaqueta Bomber', 
        'Jaqueta Corta-Vento', 'Jaqueta Puffer', 'Jaqueta Varsity',
        'Jaqueta Militar', 'Jaqueta Biker'
      ],
      Acessórios: [
        'Cinto Couro', 'Boné Aba Reta', 'Bolsa Transversal', 
        'Cachecol Lã', 'Óculos de Sol', 'Carteira Couro',
        'Chapéu Bucket', 'Boina Francesa', 'Luvas de Inverno'
      ],
      Bolsas: [
        'Bolsa Tote', 'Bolsa Transversal', 'Bolsa Clutch', 
        'Bolsa Bucket', 'Mochila Fashion', 'Bolsa de Mão',
        'Bolsa Shopper', 'Bolsa Estruturada', 'Bolsa Hobo'
      ],
      Calçados: [
        'Tênis Casual', 'Sandália Rasteira', 'Bota Cano Curto', 
        'Sapatilha Básica', 'Scarpin Salto Alto', 'Mocassim Couro',
        'Chinelo Slide', 'Oxford Feminino', 'Mule Flat'
      ]
    };
    
    // Descrições genéricas que serão combinadas
    const descricoesBase = [
      'Confeccionado em', 'Produzido com', 'Feito com', 'Fabricado em'
    ];
    
    const tecidos = [
      'algodão', 'viscose', 'poliéster', 'linho', 'jeans', 'seda', 
      'couro sintético', 'tecido tecnológico', 'malha', 'moletom',
      'tricot', 'lã', 'cetim', 'renda'
    ];
    
    const caracteristicas = [
      'de alta qualidade', 'premium', 'durável', 'macio', 'confortável',
      'respirável', 'versátil', 'moderno', 'estiloso', 'elegante',
      'casual', 'com acabamento refinado', 'com design exclusivo'
    ];
    
    const finalidade = [
      'ideal para o dia a dia', 'perfeito para ocasiões especiais',
      'ótima opção para o trabalho', 'essencial para o guarda-roupa',
      'indispensável na estação', 'tendência da temporada',
      'combinando estilo e conforto', 'para um look despojado',
      'para um visual sofisticado', 'para composições versáteis'
    ];
    
    // Produtos a serem criados
    const produtosParaInserir = [];
    const estoqueParaInserir = [];
    
    // Gerar produtos
    const produtosGerados = 0;
    
    // Distribuir produtos entre categorias
    const categorias = Object.keys(nomesProdutos);
    
    while (produtosParaInserir.length < quantidadeProdutos) {
      // Escolher categoria aleatória
      const categoria = categorias[Math.floor(Math.random() * categorias.length)];
      
      // Escolher produto aleatório da categoria
      const opcoesProdutos = nomesProdutos[categoria];
      const base = opcoesProdutos[Math.floor(Math.random() * opcoesProdutos.length)];
      
      // Adicionar variação ao nome para não ter produtos duplicados
      const variantes = ['', ' Premium', ' Plus', ' Comfort', ' Essential', ' Fashion', ' Eco', ' Limited'];
      const nomeProduto = base + variantes[Math.floor(Math.random() * variantes.length)];
      
      // Cores para este produto (2 a 5 cores)
      const numCores = Math.floor(Math.random() * 4) + 2;
      const cores = [];
      for (let i = 0; i < numCores; i++) {
        const corAleatoria = CORES_DISPONIVEIS[Math.floor(Math.random() * CORES_DISPONIVEIS.length)];
        if (!cores.includes(corAleatoria)) {
          cores.push(corAleatoria);
        }
      }
      
      // Tamanhos para este produto
      let tamanhos = [];
      if (categoria === 'Calças') {
        tamanhos = TAMANHOS_DISPONIVEIS.calcas.slice(0, Math.floor(Math.random() * 5) + 4);
      } else if (categoria === 'Vestidos') {
        tamanhos = TAMANHOS_DISPONIVEIS.vestidos.slice(0, Math.floor(Math.random() * 3) + 3);
      } else if (categoria === 'Acessórios' || categoria === 'Bolsas') {
        tamanhos = TAMANHOS_DISPONIVEIS.acessorios;
      } else {
        tamanhos = TAMANHOS_DISPONIVEIS.camisetas.slice(0, Math.floor(Math.random() * 4) + 3);
      }
      
      // Gerar descrição
      const descricaoBase = descricoesBase[Math.floor(Math.random() * descricoesBase.length)];
      const tecido = tecidos[Math.floor(Math.random() * tecidos.length)];
      const caracteristica = caracteristicas[Math.floor(Math.random() * caracteristicas.length)];
      const uso = finalidade[Math.floor(Math.random() * finalidade.length)];
      
      const descricao = `${descricaoBase} ${tecido} ${caracteristica}, ${uso}. Disponível em diferentes cores e tamanhos.`;
      
      // Determinar preço baseado na categoria
      let precoBase;
      if (['Acessórios'].includes(categoria)) {
        precoBase = Math.floor(Math.random() * 50) + 30; // 30-80
      } else if (['Camisetas', 'Shorts', 'Blusas', 'Saias'].includes(categoria)) {
        precoBase = Math.floor(Math.random() * 70) + 60; // 60-130
      } else if (['Calças', 'Vestidos', 'Moletons', 'Calçados'].includes(categoria)) {
        precoBase = Math.floor(Math.random() * 100) + 100; // 100-200
      } else if (['Casacos', 'Jaquetas', 'Bolsas'].includes(categoria)) {
        precoBase = Math.floor(Math.random() * 150) + 150; // 150-300
      } else {
        precoBase = Math.floor(Math.random() * 80) + 80; // 80-160
      }
      
      // Adicionar centavos
      const preco = precoBase + Math.floor(Math.random() * 100) / 100;
      
      // Determinar se é destaque
      const destaque = Math.random() < 0.2; // 20% de chance de ser destaque
      
      // Gerar data de criação (últimos 30 dias)
      const hoje = new Date();
      const dataInicio = new Date(hoje);
      dataInicio.setDate(hoje.getDate() - 30);
      const dataCriacao = new Date(
        dataInicio.getTime() + Math.random() * (hoje.getTime() - dataInicio.getTime())
      ).toISOString();
      
      // Criar produto
      const produto = {
        nome: nomeProduto,
        descricao: descricao,
        preco: preco,
        categoria: categoria,
        cores: cores,
        tamanhos: tamanhos,
        imagens: [],
        estoque_minimo: Math.floor(Math.random() * 5) + 3,
        ativo: true,
        destaque: destaque,
        created_at: dataCriacao,
        updated_at: dataCriacao
      };
      
      // Adicionar à lista de produtos
      produtosParaInserir.push(produto);
    }
    
    // Inserir produtos no banco
    for (let i = 0; i < produtosParaInserir.length; i++) {
      try {
        // Atualizar progresso
        setProgresso(10 + Math.floor((i / produtosParaInserir.length) * 20));
        
        // Inserir produto
        const { data, error } = await supabase
          .from(`${lojaId}_produtos`)
          .insert([produtosParaInserir[i]])
          .select();
        
        if (error) throw error;
        
        // Gerar estoque para cada combinação de cor e tamanho
        if (data && data.length > 0) {
          const produtoId = data[0].id;
          
          for (const cor of produtosParaInserir[i].cores) {
            for (const tamanho of produtosParaInserir[i].tamanhos) {
              // Estoque aleatório entre 0 e 20
              const quantidade = Math.floor(Math.random() * 21);
              
              estoqueParaInserir.push({
                produto_id: produtoId,
                cor: cor,
                tamanho: tamanho,
                quantidade: quantidade,
                created_at: produtosParaInserir[i].created_at,
                updated_at: produtosParaInserir[i].created_at
              });
            }
          }
        }
      } catch (error) {
        console.error('Erro ao inserir produto:', error);
      }
    }
    
    // Inserir registros de estoque em lotes de 50 para não sobrecarregar
    const tamanhoBatch = 50;
    for (let i = 0; i < estoqueParaInserir.length; i += tamanhoBatch) {
      const batch = estoqueParaInserir.slice(i, i + tamanhoBatch);
      try {
        const { error } = await supabase
          .from(`${lojaId}_estoque`)
          .insert(batch);
        
        if (error) throw error;
      } catch (error) {
        console.error('Erro ao inserir estoque:', error);
      }
    }
  };
  
  // Geração de clientes - substitua a função "vazia" pelo código abaixo
  const gerarClientes = async () => {
    try {
      // Nomes e sobrenomes para gerar clientes aleatórios
      const nomes = [
        'Ana', 'Maria', 'João', 'Pedro', 'Carlos', 'Lucas', 'Mariana', 
        'Juliana', 'Fernanda', 'Paulo', 'Rafael', 'Luiza', 'Beatriz', 
        'Renata', 'Gustavo', 'Diego', 'Camila', 'Isabela', 'Leonardo',
        'Amanda', 'Bruno', 'Vanessa', 'Patrícia', 'Ricardo', 'Sandra',
        'Thiago', 'Natália', 'Gabriel', 'Larissa', 'Daniel'
      ];
      
      const sobrenomes = [
        'Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 
        'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Fernandes', 
        'Carvalho', 'Gomes', 'Martins', 'Vieira', 'Barbosa', 'Rocha',
        'Dias', 'Mendes', 'Castro', 'Campos', 'Cardoso', 'Correia', 
        'Ferreira', 'Ribeiro', 'Nunes', 'Pinto', 'Moreira', 'Marques'
      ];
      
      // Verificar primeiro se a tabela de clientes tem as colunas necessárias
      console.log(`Verificando estrutura da tabela ${lojaId}_clientes...`);
      
      // Tentar obter a estrutura da tabela via RPC
      try {
        const { data: colunas, error: colunaError } = await supabase.rpc('obter_colunas_tabela', { 
          p_nome_tabela: `${lojaId}_clientes` 
        });
        
        if (colunaError) {
          console.error('Erro ao verificar colunas:', colunaError);
          
          // Criar função temporária para verificar colunas
          await supabase.rpc('executar_sql', {
            p_sql: `
              CREATE OR REPLACE FUNCTION obter_colunas_tabela(p_nome_tabela TEXT)
              RETURNS TABLE(coluna_nome TEXT) AS $$
              BEGIN
                RETURN QUERY EXECUTE format('
                  SELECT column_name::TEXT
                  FROM information_schema.columns
                  WHERE table_schema = ''public''
                  AND table_name = ''%I''
                  ORDER BY ordinal_position
                ', p_nome_tabela);
              END;
              $$ LANGUAGE plpgsql SECURITY DEFINER;
            `
          });
          
          // Tentar novamente
          const { data: colunasRetry, error: colunaRetryError } = await supabase.rpc('obter_colunas_tabela', { 
            p_nome_tabela: `${lojaId}_clientes` 
          });
          
          if (colunaRetryError) {
            console.error('Falha na segunda tentativa de verificar colunas:', colunaRetryError);
          } else {
            console.log('Colunas encontradas:', colunasRetry);
          }
        } else {
          console.log('Colunas encontradas:', colunas);
        }
      } catch (e) {
        console.error('Exceção ao verificar colunas:', e);
      }
      
      // Clientes a serem inseridos
      const clientesParaInserir = [];
      
      // Gerar clientes
      for (let i = 0; i < quantidadeClientes; i++) {
        // Atualizar progresso
        setProgresso(30 + Math.floor((i / quantidadeClientes) * 20));
        
        // Gerar nome
        const nome = nomes[Math.floor(Math.random() * nomes.length)];
        const sobrenome1 = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
        const sobrenome2 = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
        const nomeCompleto = `${nome} ${sobrenome1} ${sobrenome2}`;
        
        // Gerar email
        const email = `${nome.toLowerCase()}.${sobrenome1.toLowerCase()}${Math.floor(Math.random() * 100)}@email.com`;
        
        // Gerar telefone
        const ddd = Math.floor(Math.random() * 89) + 11; // DDDs entre 11 e 99
        const parteUm = Math.floor(Math.random() * 9000) + 1000;
        const parteDois = Math.floor(Math.random() * 9000) + 1000;
        const telefone = `(${ddd}) 9${parteUm}-${parteDois}`;
        
        // Determinar tipo (lead ou cliente)
        const tipo = Math.random() < 0.35 ? 'lead' : 'cliente';
        
        // Dados específicos baseado no tipo
        let ultimaCompra = null;
        let totalCompras = 0;
        
        if (tipo === 'cliente') {
          // Gerar data da última compra (últimos 90 dias)
          const hoje = new Date();
          const dataInicio = new Date(hoje);
          dataInicio.setDate(hoje.getDate() - 90);
          ultimaCompra = new Date(
            dataInicio.getTime() + Math.random() * (hoje.getTime() - dataInicio.getTime())
          ).toISOString();
          
          // Gerar valor total de compras
          totalCompras = parseFloat((Math.random() * 1000 + 100).toFixed(2));
        }
        
        // Data de criação (últimos 120 dias)
        const hoje = new Date();
        const dataInicio = new Date(hoje);
        dataInicio.setDate(hoje.getDate() - 120);
        const dataCriacao = new Date(
          dataInicio.getTime() + Math.random() * (hoje.getTime() - dataInicio.getTime())
        ).toISOString();
        
        // Criar cliente
        const cliente = {
          nome: nomeCompleto,
          email: email,
          telefone: telefone,
          tipo: tipo,
          ultima_compra: ultimaCompra,
          total_compras: totalCompras,
          created_at: dataCriacao,
          updated_at: dataCriacao
        };
        
        // Adicionar session_id e customer_id com verificação
        cliente.session_id = `session_${Math.random().toString(36).substring(2, 15)}`;
        cliente.customer_id = `cus_${Math.random().toString(36).substring(2, 15)}`;
        
        clientesParaInserir.push(cliente);
      }
      
      // Inserir clientes no banco
      try {
        console.log(`Inserindo ${clientesParaInserir.length} clientes...`);
        console.log('Exemplo de cliente para inserir:', clientesParaInserir[0]);
        
        const { error } = await supabase
          .from(`${lojaId}_clientes`)
          .insert(clientesParaInserir);
        
        if (error) {
          console.error('Erro ao inserir clientes:', error);
          
          // Se o erro for sobre a coluna customer_id não encontrada
          if (error.message && error.message.includes('customer_id') && error.message.includes('column')) {
            console.log('Tentando corrigir o problema da coluna...');
            
            // Tentar adicionar as colunas que estão faltando
            await supabase.rpc('executar_sql', {
              p_sql: `
                ALTER TABLE ${lojaId}_clientes
                ADD COLUMN IF NOT EXISTS session_id TEXT,
                ADD COLUMN IF NOT EXISTS customer_id TEXT;
              `
            });
            
            // Tentar inserir novamente
            const { error: retryError } = await supabase
              .from(`${lojaId}_clientes`)
              .insert(clientesParaInserir);
            
            if (retryError) {
              console.error('Erro após tentativa de correção:', retryError);
              throw retryError;
            } else {
              console.log('Clientes inseridos após correção!');
            }
          } else {
            throw error;
          }
        } else {
          console.log('Clientes inseridos com sucesso!');
        }
      } catch (error) {
        console.error('Exceção ao inserir clientes:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro geral na função gerarClientes:', error);
      throw error;
    }
  };
  
  // Geração de vendas - substitua a função "vazia" pelo código abaixo
  const gerarVendas = async () => {
    // Buscar produtos
    const { data: produtos, error: errorProdutos } = await supabase
      .from(`${lojaId}_produtos`)
      .select('id, nome, preco, categoria, cores, tamanhos');
    
    if (errorProdutos) throw errorProdutos;
    
    // Buscar clientes
    const { data: clientes, error: errorClientes } = await supabase
      .from(`${lojaId}_clientes`)
      .select('id, nome, tipo')
      .eq('tipo', 'cliente'); // Apenas clientes (não leads)
    
    if (errorClientes) throw errorClientes;
    
    if (!produtos || produtos.length === 0) {
      throw new Error('Produtos não encontrados');
    }
    
    if (!clientes || clientes.length === 0) {
      throw new Error('Clientes não encontrados');
    }
    
    // Métodos de pagamento
    const metodosPagamento = [
      'Cartão de Crédito', 'Pix', 'Dinheiro', 'Transferência', 'Boleto'
    ];
    
    // Status de venda
    const statusVenda = [
      'concluída', 'em processamento', 'enviada', 'cancelada'
    ];
    
    // Distribuição de probabilidade para status
    const probabilidadeStatus = [0.7, 0.1, 0.15, 0.05]; // 70% concluída, 10% processamento, etc.
    
    // Vendas a serem inseridas
    const vendasParaInserir = [];
    
    // Gerar vendas nos últimos 90 dias
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(hoje.getDate() - 90);
    
    for (let i = 0; i < quantidadeVendas; i++) {
      // Atualizar progresso
      setProgresso(50 + Math.floor((i / quantidadeVendas) * 20));
      
      // Cliente aleatório
      const cliente = clientes[Math.floor(Math.random() * clientes.length)];
      
      // Data da venda (últimos 90 dias)
      const dataVenda = new Date(
        dataInicio.getTime() + Math.random() * (hoje.getTime() - dataInicio.getTime())
      ).toISOString();
      
      // Método de pagamento aleatório
      const metodoPagamento = metodosPagamento[Math.floor(Math.random() * metodosPagamento.length)];
      
      // Status aleatório com base na distribuição de probabilidade
      let status;
      const rand = Math.random();
      let acumulado = 0;
      
      for (let j = 0; j < probabilidadeStatus.length; j++) {
        acumulado += probabilidadeStatus[j];
        if (rand <= acumulado) {
          status = statusVenda[j];
          break;
        }
      }
      
      // Quantidade de itens na venda (1 a 5)
      const quantidadeItens = Math.floor(Math.random() * 5) + 1;
      
      // Itens da venda
      const itens = [];
      let valorTotal = 0;
      
      // Produtos já adicionados para evitar duplicatas
      const produtosAdicionados = new Set();
      
      for (let j = 0; j < quantidadeItens; j++) {
        let produto;
        
        // Evitar produtos duplicados na mesma venda
        do {
          produto = produtos[Math.floor(Math.random() * produtos.length)];
        } while (produtosAdicionados.has(produto.id));
        
        produtosAdicionados.add(produto.id);
        
        // Quantidade do item (1 a 3)
        const quantidade = Math.floor(Math.random() * 3) + 1;
        
        // Cor aleatória deste produto
        const cor = produto.cores[Math.floor(Math.random() * produto.cores.length)];
        
        // Tamanho aleatório deste produto
        const tamanho = produto.tamanhos[Math.floor(Math.random() * produto.tamanhos.length)];
        
        // Preço do item (possivelmente com desconto)
        const precoUnitario = produto.preco * (Math.random() < 0.3 ? 0.9 : 1); // 30% de chance de ter 10% de desconto
        
        // Valor total do item
        const valorItem = precoUnitario * quantidade;
        
        // Adicionar ao valor total da venda
        valorTotal += valorItem;
        
        // Adicionar item
        itens.push({
          produto_id: produto.id,
          nome_produto: produto.nome,
          categoria: produto.categoria,
          quantidade: quantidade,
          cor: cor,
          tamanho: tamanho,
          preco_unitario: precoUnitario,
          valor_total: valorItem
        });
      }
      
      // Arredondar valor total para 2 casas decimais
      valorTotal = parseFloat(valorTotal.toFixed(2));
      
      // Criar venda
      const venda = {
        cliente_id: cliente.id,
        valor_total: valorTotal,
        metodo_pagamento: metodoPagamento,
        status: status,
        itens: itens,
        created_at: dataVenda,
        updated_at: dataVenda
      };
      
      vendasParaInserir.push(venda);
    }
    
    // Inserir vendas no banco
    try {
      // Inserir em lotes para não sobrecarregar
      const tamanhoBatch = 20;
      for (let i = 0; i < vendasParaInserir.length; i += tamanhoBatch) {
        const batch = vendasParaInserir.slice(i, i + tamanhoBatch);
        
        const { error } = await supabase
          .from(`${lojaId}_vendas`)
          .insert(batch);
        
        if (error) throw error;
      }
      
      // Atualizar clientes com última compra e total de compras
      await atualizarDadosClientes();
      
    } catch (error) {
      console.error('Erro ao inserir vendas:', error);
      throw error;
    }
  };
  
  // Função auxiliar para atualizar dados de clientes com base nas vendas
  const atualizarDadosClientes = async () => {
    try {
      // Buscar todas as vendas agrupadas por cliente
      const { data: vendasAgregadas, error: errorVendas } = await supabase
        .from(`${lojaId}_vendas`)
        .select('cliente_id, valor_total, created_at')
        .eq('status', 'concluída');
      
      if (errorVendas) throw errorVendas;
      
      // Agrupar vendas por cliente
      const vendaPorCliente = {};
      
      for (const venda of vendasAgregadas) {
        if (!vendaPorCliente[venda.cliente_id]) {
          vendaPorCliente[venda.cliente_id] = {
            ultima_compra: venda.created_at,
            total_compras: venda.valor_total
          };
        } else {
          vendaPorCliente[venda.cliente_id].total_compras += venda.valor_total;
          
          // Verificar se esta venda é mais recente
          if (new Date(venda.created_at) > new Date(vendaPorCliente[venda.cliente_id].ultima_compra)) {
            vendaPorCliente[venda.cliente_id].ultima_compra = venda.created_at;
          }
        }
      }
      
      // Atualizar cada cliente
      for (const clienteId in vendaPorCliente) {
        const { error } = await supabase
          .from(`${lojaId}_clientes`)
          .update({
            ultima_compra: vendaPorCliente[clienteId].ultima_compra,
            total_compras: parseFloat(vendaPorCliente[clienteId].total_compras.toFixed(2)),
            updated_at: new Date().toISOString()
          })
          .eq('id', clienteId);
        
        if (error) console.error(`Erro ao atualizar cliente ${clienteId}:`, error);
      }
      
    } catch (error) {
      console.error('Erro ao atualizar dados dos clientes:', error);
    }
  };
  
  // Geração de promoções - substitua a função "vazia" pelo código abaixo
  const gerarPromocoes = async () => {
    // Buscar produtos
    const { data: produtos, error: errorProdutos } = await supabase
      .from(`${lojaId}_produtos`)
      .select('id, categoria');
    
    if (errorProdutos) throw errorProdutos;
    
    if (!produtos || produtos.length === 0) {
      throw new Error('Produtos não encontrados');
    }
    
    // Nomes de promoções
    const nomesPromocoes = [
      'Oferta Imperdível', 'Liquidação Relâmpago', 'Promoção Especial',
      'Desconto Exclusivo', 'Super Oferta', 'Queima de Estoque',
      'Black Friday', 'Semana de Descontos', 'Outlet', 'Oferta Limitada',
      'Bota Fora', 'Loucura de Verão', 'Especial de Inverno'
    ];
    
    // Descrições de promoções
    const descricoesPromocoes = [
      'Aproveite descontos incríveis em produtos selecionados!',
      'Só por tempo limitado! Não perca essa oportunidade.',
      'Produtos com preços reduzidos para você economizar.',
      'Descontos especiais para nossos clientes.',
      'Último lote com preços reduzidos!',
      'Economize com esta promoção exclusiva.',
      'Os melhores preços do ano!',
      'Peças selecionadas com preços imperdíveis.',
      'Promoção relâmpago! Corra e aproveite.'
    ];
    
    // Tipos de desconto
    const tiposDesconto = ['porcentagem', 'valor_fixo'];
    
    // Agrupar produtos por categoria
    const produtosPorCategoria = {};
    for (const produto of produtos) {
      if (!produtosPorCategoria[produto.categoria]) {
        produtosPorCategoria[produto.categoria] = [];
      }
      produtosPorCategoria[produto.categoria].push(produto.id);
    }
    
    const categorias = Object.keys(produtosPorCategoria);
    
    // Promoções a serem inseridas
    const promocoesParaInserir = [];
    
    // Data atual como referência
    const hoje = new Date();
    
    for (let i = 0; i < quantidadePromocoes; i++) {
      // Atualizar progresso
      setProgresso(70 + Math.floor((i / quantidadePromocoes) * 20));
      
      // Nome aleatório
      const nome = nomesPromocoes[Math.floor(Math.random() * nomesPromocoes.length)];
      
      // Descrição aleatória
      const descricao = descricoesPromocoes[Math.floor(Math.random() * descricoesPromocoes.length)];
      
      // Tipo de desconto aleatório
      const tipoDesconto = tiposDesconto[Math.floor(Math.random() * tiposDesconto.length)];
      
      // Valor do desconto
      let desconto;
      if (tipoDesconto === 'porcentagem') {
        // Entre 10% e 50%
        desconto = Math.floor(Math.random() * 41) + 10;
      } else {
        // Entre R$ 10 e R$ 50
        desconto = Math.floor(Math.random() * 41) + 10;
      }
      
      // Duração da promoção (entre 7 e 30 dias)
      const duracaoDias = Math.floor(Math.random() * 24) + 7;
      
      // Determinar se a promoção é atual, futura ou passada
      const tipoTempo = Math.random();
      let dataInicio, dataFim;
      
      if (tipoTempo < 0.5) {
        // Promoção atual (50% de chance)
        dataInicio = new Date(hoje);
        dataInicio.setDate(hoje.getDate() - Math.floor(Math.random() * 5)); // Começou até 5 dias atrás
        
        dataFim = new Date(dataInicio);
        dataFim.setDate(dataInicio.getDate() + duracaoDias);
      } else if (tipoTempo < 0.8) {
        // Promoção futura (30% de chance)
        dataInicio = new Date(hoje);
        dataInicio.setDate(hoje.getDate() + Math.floor(Math.random() * 10) + 1); // Começa nos próximos 10 dias
        
        dataFim = new Date(dataInicio);
        dataFim.setDate(dataInicio.getDate() + duracaoDias);
      } else {
        // Promoção passada (20% de chance)
        dataFim = new Date(hoje);
        dataFim.setDate(hoje.getDate() - Math.floor(Math.random() * 10) - 1); // Terminou nos últimos 10 dias
        
        dataInicio = new Date(dataFim);
        dataInicio.setDate(dataFim.getDate() - duracaoDias);
      }
      
      // Escolher se a promoção é por categoria ou produtos específicos
      const porCategoria = Math.random() < 0.7; // 70% de chance de ser por categoria
      
      let produtosIds = [];
      let categoriasPromocao = [];
      
      if (porCategoria) {
        // Escolher categorias aleatórias (1 ou 2)
        const numCategorias = Math.random() < 0.3 ? 2 : 1;
        
        for (let j = 0; j < numCategorias; j++) {
          if (categorias.length > 0) {
            const categoriaAleatoria = categorias[Math.floor(Math.random() * categorias.length)];
            categoriasPromocao.push(categoriaAleatoria);
            
            // Remover para evitar duplicatas
            categorias.splice(categorias.indexOf(categoriaAleatoria), 1);
          }
        }
      } else {
        // Escolher produtos aleatórios (3 a 8)
        const numProdutos = Math.floor(Math.random() * 6) + 3;
        
        // Escolher categoria aleatória
        const categoriaAleatoria = categorias[Math.floor(Math.random() * categorias.length)];
        
        // Pegar produtos dessa categoria
        const produtosCategoria = [...produtosPorCategoria[categoriaAleatoria]];
        
        // Selecionar produtos aleatórios da categoria
        for (let j = 0; j < Math.min(numProdutos, produtosCategoria.length); j++) {
          const index = Math.floor(Math.random() * produtosCategoria.length);
          produtosIds.push(produtosCategoria[index]);
          produtosCategoria.splice(index, 1);
        }
      }
      
      // Criar promoção
      const promocao = {
        nome: nome,
        descricao: descricao,
        desconto: desconto,
        tipo_desconto: tipoDesconto,
        produtos_ids: produtosIds.length > 0 ? produtosIds : null,
        categorias: categoriasPromocao.length > 0 ? categoriasPromocao : null,
        data_inicio: dataInicio.toISOString(),
        data_fim: dataFim.toISOString(),
        ativo: hoje >= dataInicio && hoje <= dataFim,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      promocoesParaInserir.push(promocao);
    }
    
    // Inserir promoções no banco
    try {
      const { error } = await supabase
        .from(`${lojaId}_promocoes`)
        .insert(promocoesParaInserir);
      
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao inserir promoções:', error);
      throw error;
    }
  };
  
  return (
    <Layout title="Criar Loja de Demonstração">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Link href="/dashboard" className="btn btn-ghost mr-4">
            &larr; Voltar
          </Link>
          <h1 className="text-xl font-semibold">Criar Loja de Demonstração com Dados Fictícios</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-lg font-semibold mb-6 flex items-center">
                <FiDatabase className="text-primary-500 mr-2" />
                Configurações
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="lojaId">
                    ID da Loja
                  </label>
                  <input
                    id="lojaId"
                    type="text"
                    className="input w-full"
                    value={lojaId}
                    onChange={(e) => setLojaId(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Identificador único usado nas tabelas do banco
                  </p>
                </div>
                
                <div>
                  <label className="label" htmlFor="nomeLoja">
                    Nome da Loja
                  </label>
                  <input
                    id="nomeLoja"
                    type="text"
                    className="input w-full"
                    value={nomeLoja}
                    onChange={(e) => setNomeLoja(e.target.value)}
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label className="label" htmlFor="quantidadeProdutos">
                    Quantidade de Produtos
                  </label>
                  <input
                    id="quantidadeProdutos"
                    type="number"
                    min="5"
                    max="100"
                    className="input w-full"
                    value={quantidadeProdutos}
                    onChange={(e) => setQuantidadeProdutos(parseInt(e.target.value))}
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label className="label" htmlFor="quantidadeClientes">
                    Quantidade de Clientes
                  </label>
                  <input
                    id="quantidadeClientes"
                    type="number"
                    min="5"
                    max="50"
                    className="input w-full"
                    value={quantidadeClientes}
                    onChange={(e) => setQuantidadeClientes(parseInt(e.target.value))}
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label className="label" htmlFor="quantidadeVendas">
                    Quantidade de Vendas
                  </label>
                  <input
                    id="quantidadeVendas"
                    type="number"
                    min="5"
                    max="100"
                    className="input w-full"
                    value={quantidadeVendas}
                    onChange={(e) => setQuantidadeVendas(parseInt(e.target.value))}
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label className="label" htmlFor="quantidadePromocoes">
                    Quantidade de Promoções
                  </label>
                  <input
                    id="quantidadePromocoes"
                    type="number"
                    min="1"
                    max="10"
                    className="input w-full"
                    value={quantidadePromocoes}
                    onChange={(e) => setQuantidadePromocoes(parseInt(e.target.value))}
                    disabled={loading}
                  />
                </div>
                
                <div className="pt-4">
                  <button
                    className="btn btn-primary w-full"
                    onClick={gerarLojaDemonstracao}
                    disabled={loading || !supabase}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <FiLoader className="animate-spin mr-2" />
                        Gerando Loja...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <FiGrid className="mr-2" />
                        Gerar Loja de Demonstração
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-lg font-semibold mb-6">
                Status da Criação
              </h2>
              
              {loading ? (
                <div className="space-y-6">
                  <div className="w-full bg-gray-700 rounded-full h-4">
                    <div
                      className="bg-primary-600 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${progresso}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-lg font-medium">{mensagem}</p>
                    <p className="text-gray-400 mt-1">{progresso}% concluído</p>
                  </div>
                  
                  <div className="space-y-3 mt-6">
                    <div className={`flex items-center ${etapa >= 1 ? 'text-green-400' : 'text-gray-500'}`}>
                      {etapa >= 1 ? '✓' : '○'} 
                      <span className="ml-2">Estrutura da loja criada</span>
                    </div>
                    <div className={`flex items-center ${etapa >= 2 ? 'text-green-400' : 'text-gray-500'}`}>
                      {etapa >= 2 ? '✓' : '○'} 
                      <span className="ml-2">Produtos gerados</span>
                    </div>
                    <div className={`flex items-center ${etapa >= 3 ? 'text-green-400' : 'text-gray-500'}`}>
                      {etapa >= 3 ? '✓' : '○'} 
                      <span className="ml-2">Clientes gerados</span>
                    </div>
                    <div className={`flex items-center ${etapa >= 4 ? 'text-green-400' : 'text-gray-500'}`}>
                      {etapa >= 4 ? '✓' : '○'} 
                      <span className="ml-2">Vendas geradas</span>
                    </div>
                    <div className={`flex items-center ${etapa >= 5 ? 'text-green-400' : 'text-gray-500'}`}>
                      {etapa >= 5 ? '✓' : '○'} 
                      <span className="ml-2">Promoções geradas</span>
                    </div>
                    <div className={`flex items-center ${etapa >= 6 ? 'text-green-400' : 'text-gray-500'}`}>
                      {etapa >= 6 ? '✓' : '○'} 
                      <span className="ml-2">Carrinhos abandonados gerados</span>
                    </div>
                  </div>
                </div>
              ) : etapa === 6 ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                    <FiCheck className="text-3xl text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-green-400 mb-2">
                    Loja de Demonstração Criada com Sucesso!
                  </h3>
                  <p className="text-gray-300 mb-6">
                    A loja de demonstração foi criada com todos os dados fictícios.
                    Você já pode começar a usar o sistema com os dados de exemplo.
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-4">
                    <Link href={`/lojas/${lojaId}`} className="btn btn-primary">
                      <span className="flex items-center">
                        <FiGrid className="mr-2" />
                        Acessar Loja Demo
                      </span>
                    </Link>
                    
                    <Link href="/dashboard" className="btn btn-outline">
                      Voltar para Dashboard
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 rounded-lg p-4 flex items-start border border-gray-700">
                      <FiShoppingBag className="text-2xl text-blue-400 mr-3 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Produtos</h3>
                        <p className="text-gray-300 text-sm mb-2">
                          Serão gerados {quantidadeProdutos} produtos fictícios com descrições, 
                          preços, cores, tamanhos e estoque.
                        </p>
                        <span className="text-xs text-gray-400">
                          Categorias incluídas: camisetas, calças, vestidos, etc.
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-4 flex items-start border border-gray-700">
                      <FiUsers className="text-2xl text-purple-400 mr-3 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Clientes</h3>
                        <p className="text-gray-300 text-sm mb-2">
                          Serão gerados {quantidadeClientes} clientes e leads fictícios
                          com dados de contato.
                        </p>
                        <span className="text-xs text-gray-400">
                          Inclui histórico de compras e tipos de cliente
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-4 flex items-start border border-gray-700">
                      <FiBarChart2 className="text-2xl text-green-400 mr-3 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Vendas</h3>
                        <p className="text-gray-300 text-sm mb-2">
                          Serão geradas {quantidadeVendas} vendas fictícias com
                          produtos, valores e datas variadas.
                        </p>
                        <span className="text-xs text-gray-400">
                          Histórico de vendas dos últimos 3 meses
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-4 flex items-start border border-gray-700">
                      <FiTag className="text-2xl text-yellow-400 mr-3 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Promoções</h3>
                        <p className="text-gray-300 text-sm mb-2">
                          Serão geradas {quantidadePromocoes} promoções fictícias
                          para categorias e produtos.
                        </p>
                        <span className="text-xs text-gray-400">
                          Inclui promoções ativas e programadas
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {resumo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <FiShoppingBag className="text-primary-500 mr-2" />
                <h4 className="font-medium">Produtos</h4>
              </div>
              <p className="text-2xl font-bold">{resumo.produtos}</p>
              <p className="text-gray-400 text-sm mt-auto">Incluindo variações de estoque</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <FiUsers className="text-primary-500 mr-2" />
                <h4 className="font-medium">Clientes e Leads</h4>
              </div>
              <p className="text-2xl font-bold">{resumo.clientes}</p>
              <p className="text-gray-400 text-sm mt-auto">Com histórico de compras</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <FiBarChart2 className="text-primary-500 mr-2" />
                <h4 className="font-medium">Vendas</h4>
              </div>
              <p className="text-2xl font-bold">{resumo.vendas}</p>
              <p className="text-gray-400 text-sm mt-auto">Distribuídas nos últimos 30 dias</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <FiTag className="text-primary-500 mr-2" />
                <h4 className="font-medium">Promoções</h4>
              </div>
              <p className="text-2xl font-bold">{resumo.promocoes}</p>
              <p className="text-gray-400 text-sm mt-auto">Ativas e programadas</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <FiShoppingCart className="text-primary-500 mr-2" />
                <h4 className="font-medium">Carrinhos Abandonados</h4>
              </div>
              <p className="text-2xl font-bold">{resumo.carrinhos}</p>
              <p className="text-gray-400 text-sm mt-auto">Para testes de recuperação</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// Componente de marcação de concluído
const FiCheck = ({ className }) => {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth="2" 
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}; 