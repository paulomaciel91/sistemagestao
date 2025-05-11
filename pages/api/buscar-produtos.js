import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Obter as credenciais do Supabase do corpo da requisição
    const { 
      lojaId,
      categoria,
      cor,
      tamanho,
      precoMin,
      precoMax,
      genero,
      termo,
      promocao,
      limite = 10,
      supabaseUrl,
      supabaseKey
    } = req.body;

    console.log('Parâmetros recebidos:', { 
      lojaId, 
      categoria, 
      cor, 
      tamanho, 
      precoMin, 
      precoMax, 
      genero, 
      termo, 
      promocao, 
      limite 
    });

    // Validação básica
    if (!lojaId) {
      return res.status(400).json({ error: 'ID da loja é obrigatório' });
    }

    // Validar credenciais do Supabase
    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ error: 'Credenciais do Supabase são obrigatórias' });
    }

    // Criar cliente Supabase usando as credenciais fornecidas
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar todos os produtos primeiro para verificar o que temos
    const { data: todosProdutos, error: todosProdutosError } = await supabase
      .from(`${lojaId}_produtos`)
      .select('*')
      .limit(100); // Aumentado para buscar mais produtos

    if (todosProdutosError) {
      throw new Error(`Erro ao verificar produtos: ${todosProdutosError.message}`);
    }

    console.log(`Total de produtos na tabela: ${todosProdutos?.length || 0}`);
    
    if (todosProdutos && todosProdutos.length > 0) {
      console.log('Colunas disponíveis:', Object.keys(todosProdutos[0]));
      console.log('Exemplo de produto:', todosProdutos[0]);
    }

    // Se não houver produtos, retornar lista vazia
    if (!todosProdutos || todosProdutos.length === 0) {
      return res.status(200).json({ 
        success: true, 
        produtos: [],
        mensagem: 'Nenhum produto encontrado na tabela'
      });
    }

    // Separar termos de busca e filtros de cor/tamanho
    let termoBusca = termo;
    let corBusca = cor;
    let tamanhoBusca = tamanho;
    let categoriaBusca = categoria;

    // Identificar categorias de produtos a partir do termo de busca
    const mapaCategorias = {
      'camiseta': 'Camisetas',
      'camisa': 'Camisas',
      'blusa': 'Blusas',
      'calça': 'Calças',
      'vestido': 'Vestidos',
      'saia': 'Saias',
      'shorts': 'Shorts',
      'bermuda': 'Bermudas',
      'casaco': 'Casacos',
      'jaqueta': 'Jaquetas',
      'moletom': 'Moletons',
      'sapato': 'Calçados',
      'tênis': 'Calçados',
      'sandália': 'Calçados',
      'bota': 'Calçados'
    };

    // Verificar se o termo contém alguma categoria de produto
    if (!categoriaBusca && termoBusca) {
      const termoLower = termoBusca.toLowerCase();
      for (const [palavraChave, categoria] of Object.entries(mapaCategorias)) {
        if (termoLower.includes(palavraChave)) {
          categoriaBusca = categoria;
          console.log(`Categoria "${categoria}" identificada a partir do termo de busca`);
          break;
        }
      }
    }

    // Identificar tipos específicos de produtos (mantém no termo para busca)
    const tiposProdutos = [
      'gola v', 'gola redonda', 'polo', 'regata', 'cropped', 'jeans', 'social',
      'esportivo', 'casual', 'formal', 'infantil', 'masculino', 'feminino'
    ];
    
    let tiposProdutoIdentificados = [];
    if (termoBusca) {
      const termoLower = termoBusca.toLowerCase();
      for (const tipo of tiposProdutos) {
        if (termoLower.includes(tipo)) {
          tiposProdutoIdentificados.push(tipo);
          console.log(`Tipo de produto "${tipo}" identificado no termo de busca`);
        }
      }
    }

    // Se não há filtro de cor explícito mas há termo de busca, verificar se o termo contém cores
    if (!corBusca && termoBusca) {
      // Lista de cores comuns
      const coresComuns = ['preto', 'branco', 'azul', 'vermelho', 'verde', 'amarelo', 
                          'rosa', 'roxo', 'laranja', 'marrom', 'cinza', 'bege', 'dourado', 
                          'prateado', 'violeta', 'turquesa', 'salmão', 'bordô', 'vinho'];
      
      // Verificar se alguma cor está no termo
      const termoLower = termoBusca.toLowerCase();
      for (const cor of coresComuns) {
        if (termoLower.includes(cor)) {
          corBusca = cor;
          // Remover a cor do termo de busca para evitar duplicação
          termoBusca = termoBusca.replace(new RegExp(cor, 'i'), '').trim();
          console.log(`Cor "${cor}" extraída do termo de busca`);
          break;
        }
      }
    }

    // Se não há filtro de tamanho explícito mas há termo de busca, verificar se o termo contém tamanhos
    if (!tamanhoBusca && termoBusca) {
      // Lista de tamanhos comuns
      const tamanhosComuns = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'XGG', 'EG', 'EGG'];
      
      // Verificar se algum tamanho está no termo
      const termoLower = termoBusca.toLowerCase();
      for (const tamanho of tamanhosComuns) {
        // Verificar tamanho exato (com espaço antes/depois ou no início/fim)
        const regexTamanho = new RegExp(`(^|\\s)${tamanho}(\\s|$)`, 'i');
        if (regexTamanho.test(termoLower)) {
          tamanhoBusca = tamanho;
          // Remover o tamanho do termo de busca para evitar duplicação
          termoBusca = termoBusca.replace(regexTamanho, ' ').trim();
          console.log(`Tamanho "${tamanho}" extraído do termo de busca`);
          break;
        }
      }
    }

    console.log(`Termo processado: "${termoBusca}", Categoria: "${categoriaBusca}", Tipos: [${tiposProdutoIdentificados.join(', ')}], Cor: "${corBusca}", Tamanho: "${tamanhoBusca}"`);

    // Filtrar produtos com base nos parâmetros
    let produtosFiltrados = todosProdutos;
    console.log(`Total de produtos antes da filtragem: ${produtosFiltrados.length}`);

    // Filtrar por categoria identificada no termo
    if (categoriaBusca) {
      const categoriaLower = categoriaBusca.toLowerCase();
      const produtosAntes = produtosFiltrados.length;
      
      produtosFiltrados = produtosFiltrados.filter(produto => {
        const categoriaProduto = (produto.categoria || '').toLowerCase();
        return categoriaProduto.includes(categoriaLower) || categoriaLower.includes(categoriaProduto);
      });
      
      console.log(`Filtro por categoria "${categoriaBusca}": ${produtosAntes} -> ${produtosFiltrados.length}`);
      
      // Se não encontrou produtos na categoria, voltar aos produtos originais
      if (produtosFiltrados.length === 0) {
        console.log(`Nenhum produto encontrado na categoria "${categoriaBusca}". Ignorando filtro de categoria.`);
        produtosFiltrados = todosProdutos;
      }
    }

    // Filtrar por termo (nome, descrição ou categoria)
    if (termoBusca) {
      // Dividir o termo em palavras para busca mais eficiente
      const termos = termoBusca.toLowerCase().split(/\s+/).filter(t => t.length > 0);
      console.log(`Termos de busca: ${JSON.stringify(termos)}`);
      
      // Abordagem mais flexível: um produto é relevante se contiver pelo menos uma das palavras
      // Usaremos pontuação para ordenar por relevância
      const produtosComPontuacao = produtosFiltrados.map(produto => {
        const nome = (produto.nome || '').toLowerCase();
        const descricao = (produto.descricao || '').toLowerCase();
        const categoriaProduto = (produto.categoria || '').toLowerCase();
        
        // Combinar todos os campos em um único texto para busca
        const textoCompleto = `${nome} ${descricao} ${categoriaProduto}`;
        
        // Pontuação inicial
        let pontuacao = 0;
        let termosEncontrados = 0;
        
        // Verificar cada termo
        for (const t of termos) {
          if (textoCompleto.includes(t)) {
            termosEncontrados++;
            
            // Pontuação adicional se o termo estiver no nome do produto
            if (nome.includes(t)) {
              pontuacao += 10;
            }
            
            // Pontuação adicional se o termo estiver na categoria
            if (categoriaProduto.includes(t)) {
              pontuacao += 5;
            }
            
            // Pontuação adicional se o termo estiver na descrição
            if (descricao.includes(t)) {
              pontuacao += 3;
            }
          }
        }
        
        // Pontuação adicional baseada na proporção de termos encontrados
        pontuacao += (termosEncontrados / termos.length) * 20;
        
        // Pontuação adicional se todos os termos estiverem juntos na mesma ordem
        if (textoCompleto.includes(termos.join(' '))) {
          pontuacao += 30;
        }
        
        // Pontuação adicional para tipos específicos de produtos
        for (const tipo of tiposProdutoIdentificados) {
          if (textoCompleto.includes(tipo)) {
            pontuacao += 50; // Alta prioridade para tipos específicos
            console.log(`Produto "${produto.nome}" corresponde ao tipo "${tipo}"`);
          }
        }
        
        return {
          produto,
          pontuacao,
          termosEncontrados
        };
      });
      
      // Filtrar produtos que têm pelo menos um termo encontrado
      produtosFiltrados = produtosComPontuacao
        .filter(item => item.termosEncontrados > 0)
        .sort((a, b) => b.pontuacao - a.pontuacao) // Ordenar por relevância
        .map(item => item.produto);
      
      console.log(`Produtos após filtro por termo: ${produtosFiltrados.length}`);
      
      // Mostrar os primeiros 3 produtos encontrados para depuração
      if (produtosFiltrados.length > 0) {
        console.log('Primeiros produtos encontrados:');
        produtosFiltrados.slice(0, 3).forEach((p, i) => {
          console.log(`${i+1}. ${p.nome} (${p.categoria})`);
        });
      }
    }

    // Filtrar por categoria explícita (se não foi usada anteriormente)
    if (categoria && (!categoriaBusca || categoria !== categoriaBusca)) {
      const categoriaLower = categoria.toLowerCase();
      const produtosAntes = produtosFiltrados.length;
      
      produtosFiltrados = produtosFiltrados.filter(produto => {
        const categoriaProduto = (produto.categoria || '').toLowerCase();
        return categoriaProduto.includes(categoriaLower);
      });
      
      console.log(`Filtro por categoria explícita "${categoria}": ${produtosAntes} -> ${produtosFiltrados.length}`);
    }

    // Filtrar por gênero
    if (genero) {
      const generoLower = genero.toLowerCase();
      const produtosAntes = produtosFiltrados.length;
      
      produtosFiltrados = produtosFiltrados.filter(produto => {
        const generoProduto = (produto.genero || '').toLowerCase();
        return generoProduto.includes(generoLower);
      });
      
      console.log(`Filtro por gênero "${genero}": ${produtosAntes} -> ${produtosFiltrados.length}`);
    }

    // Filtrar por preço mínimo
    if (precoMin !== undefined) {
      const produtosAntes = produtosFiltrados.length;
      
      produtosFiltrados = produtosFiltrados.filter(produto => 
        produto.preco >= precoMin
      );
      
      console.log(`Filtro por preço mínimo ${precoMin}: ${produtosAntes} -> ${produtosFiltrados.length}`);
    }

    // Filtrar por preço máximo
    if (precoMax !== undefined) {
      const produtosAntes = produtosFiltrados.length;
      
      produtosFiltrados = produtosFiltrados.filter(produto => 
        produto.preco <= precoMax
      );
      
      console.log(`Filtro por preço máximo ${precoMax}: ${produtosAntes} -> ${produtosFiltrados.length}`);
    }

    // Filtrar por promoção
    if (promocao === true) {
      const produtosAntes = produtosFiltrados.length;
      
      produtosFiltrados = produtosFiltrados.filter(produto => 
        produto.preco_promocional != null
      );
      
      console.log(`Filtro por promoção: ${produtosAntes} -> ${produtosFiltrados.length}`);
    }

    // Buscar dados de estoque
    let estoque = [];
    try {
      const { data: estoqueData, error: estoqueError } = await supabase
        .from(`${lojaId}_estoque`)
        .select('*');
      
      if (!estoqueError && estoqueData) {
        estoque = estoqueData;
        console.log(`Itens de estoque encontrados: ${estoque.length}`);
      } else {
        console.warn(`Aviso: Erro ao buscar estoque: ${estoqueError?.message || 'Desconhecido'}`);
      }
    } catch (estoqueError) {
      console.warn(`Aviso: Falha ao buscar estoque: ${estoqueError.message}`);
    }

    // Formatar produtos com estoque
    const produtosFormatados = produtosFiltrados.map(produto => {
      // Encontrar itens de estoque para este produto
      const estoqueItens = estoque.filter(item => item.produto_id === produto.id);
      
      // Pegar apenas a primeira imagem se existir
      let imagemPrincipal = null;
      if (produto.imagens && Array.isArray(produto.imagens) && produto.imagens.length > 0) {
        imagemPrincipal = produto.imagens[0];
      }
      
      // Calcular cores e tamanhos disponíveis
      const coresDisponiveis = [...new Set(
        estoqueItens
          .filter(item => item.quantidade > 0)
          .map(item => item.cor)
      )].filter(Boolean); // Remover valores nulos ou undefined
      
      const tamanhosDisponiveis = [...new Set(
        estoqueItens
          .filter(item => item.quantidade > 0)
          .map(item => item.tamanho)
      )].filter(Boolean); // Remover valores nulos ou undefined
      
      // Construir objeto formatado
      return {
        id: produto.id,
        nome: produto.nome || '',
        descricao: produto.descricao || '',
        preco: produto.preco || 0,
        preco_promocional: produto.preco_promocional,
        categoria: produto.categoria || '',
        genero: produto.genero || '',
        imagem_url: imagemPrincipal,
        cores_disponiveis: coresDisponiveis,
        tamanhos_disponiveis: tamanhosDisponiveis
      };
    });

    console.log(`Produtos formatados com estoque: ${produtosFormatados.length}`);

    // Filtrar por cor e tamanho
    let resultadoFinal = produtosFormatados;
    
    if (corBusca || tamanhoBusca) {
      console.log(`Aplicando filtros: cor=${corBusca}, tamanho=${tamanhoBusca}`);
      console.log(`Produtos antes do filtro: ${produtosFormatados.length}`);
      
      // Verificar se há cores e tamanhos disponíveis nos produtos
      if (produtosFormatados.length > 0) {
        const coresDisponiveis = [...new Set(produtosFormatados.flatMap(p => p.cores_disponiveis || []))].filter(Boolean);
        const tamanhosDisponiveis = [...new Set(produtosFormatados.flatMap(p => p.tamanhos_disponiveis || []))].filter(Boolean);
        
        console.log('Cores disponíveis nos produtos:', coresDisponiveis);
        console.log('Tamanhos disponíveis nos produtos:', tamanhosDisponiveis);
      }
      
      // Verificar se a cor buscada está próxima de alguma cor disponível
      if (corBusca) {
        const coresDisponiveis = [...new Set(produtosFormatados.flatMap(p => p.cores_disponiveis || []))].filter(Boolean);
        let corMaisProxima = null;
        let maiorSimilaridade = 0;
        
        for (const corDisponivel of coresDisponiveis) {
          const corDispLower = corDisponivel.toLowerCase();
          const corBuscaLower = corBusca.toLowerCase();
          
          // Verificar similaridade
          if (corDispLower.includes(corBuscaLower) || corBuscaLower.includes(corDispLower)) {
            const similaridade = Math.min(corDispLower.length, corBuscaLower.length) / 
                               Math.max(corDispLower.length, corBuscaLower.length);
            if (similaridade > maiorSimilaridade) {
              maiorSimilaridade = similaridade;
              corMaisProxima = corDisponivel;
            }
          }
        }
        
        if (corMaisProxima && corMaisProxima !== corBusca) {
          console.log(`Cor mais próxima de "${corBusca}" é "${corMaisProxima}" (similaridade: ${maiorSimilaridade.toFixed(2)})`);
          corBusca = corMaisProxima;
        }
      }
      
      // Filtrar produtos que correspondem à cor E/OU tamanho (não necessariamente ambos)
      resultadoFinal = produtosFormatados.filter(produto => {
        let correspondeAoFiltro = true;
        
        // Filtrar por cor se especificada
        if (corBusca) {
          const corMatch = produto.cores_disponiveis && produto.cores_disponiveis.some(c => {
            if (!c) return false;
            const cLower = c.toLowerCase();
            const corBuscaLower = corBusca.toLowerCase();
            return cLower.includes(corBuscaLower) || corBuscaLower.includes(cLower);
          });
          
          if (!corMatch) correspondeAoFiltro = false;
        }
        
        // Filtrar por tamanho se especificado
        if (tamanhoBusca && correspondeAoFiltro) {
          const tamanhoMatch = produto.tamanhos_disponiveis && produto.tamanhos_disponiveis.some(t => {
            if (!t) return false;
            const tLower = t.toLowerCase();
            const tamanhoBuscaLower = tamanhoBusca.toLowerCase();
            return tLower.includes(tamanhoBuscaLower) || tamanhoBuscaLower.includes(tLower);
          });
          
          if (!tamanhoMatch) correspondeAoFiltro = false;
        }
        
        return correspondeAoFiltro;
      });
      
      console.log(`Produtos após filtro de cor/tamanho: ${resultadoFinal.length}`);
      
      // Se não encontrou nenhum produto com os filtros exatos, tentar uma correspondência mais flexível
      if (resultadoFinal.length === 0) {
        console.log("Tentando correspondência mais flexível para cor/tamanho...");
        
        // Tentar filtrar apenas por um dos critérios (cor OU tamanho)
        if (corBusca && tamanhoBusca) {
          // Tentar só com cor
          const resultadosPorCor = produtosFormatados.filter(produto => {
            return produto.cores_disponiveis && produto.cores_disponiveis.some(c => {
              if (!c) return false;
              const cLower = c.toLowerCase();
              const corBuscaLower = corBusca.toLowerCase();
              return cLower.includes(corBuscaLower) || corBuscaLower.includes(cLower);
            });
          });
          
          // Tentar só com tamanho
          const resultadosPorTamanho = produtosFormatados.filter(produto => {
            return produto.tamanhos_disponiveis && produto.tamanhos_disponiveis.some(t => {
              if (!t) return false;
              const tLower = t.toLowerCase();
              const tamanhoBuscaLower = tamanhoBusca.toLowerCase();
              return tLower.includes(tamanhoBuscaLower) || tamanhoBuscaLower.includes(tLower);
            });
          });
          
          console.log(`Resultados só por cor: ${resultadosPorCor.length}, só por tamanho: ${resultadosPorTamanho.length}`);
          
          // Usar o filtro que retorna mais resultados
          if (resultadosPorCor.length > 0 || resultadosPorTamanho.length > 0) {
            if (resultadosPorCor.length >= resultadosPorTamanho.length) {
              resultadoFinal = resultadosPorCor;
              console.log(`Usando apenas filtro de cor: ${resultadoFinal.length} produtos`);
            } else {
              resultadoFinal = resultadosPorTamanho;
              console.log(`Usando apenas filtro de tamanho: ${resultadoFinal.length} produtos`);
            }
          } else {
            // Se ainda não temos resultados, voltar aos produtos originais
            resultadoFinal = produtosFormatados;
            console.log(`Ignorando filtros de cor e tamanho: ${resultadoFinal.length} produtos`);
          }
        }
      }
    }

    // Verificar se temos resultados
    if (resultadoFinal.length === 0 && termoBusca) {
      // Se não encontrou resultados, tentar uma busca mais flexível
      console.log("Tentando busca flexível por termo...");
      
      // Dividir o termo em palavras
      const termos = termoBusca.toLowerCase().split(/\s+/).filter(t => t.length > 0);
      
      if (termos.length > 1) {
        // Tentar encontrar produtos que contenham pelo menos uma das palavras
        const produtosFlexiveis = todosProdutos.filter(produto => {
          const nome = (produto.nome || '').toLowerCase();
          const descricao = (produto.descricao || '').toLowerCase();
          const categoriaProduto = (produto.categoria || '').toLowerCase();
          
          // Combinar todos os campos em um único texto para busca
          const textoCompleto = `${nome} ${descricao} ${categoriaProduto}`;
          
          // Verificar se pelo menos uma das palavras está presente
          return termos.some(t => textoCompleto.includes(t));
        });
        
        if (produtosFlexiveis.length > 0) {
          console.log(`Busca flexível encontrou ${produtosFlexiveis.length} produtos`);
          
          // Formatar esses produtos
          const produtosFlexiveisFormatados = produtosFlexiveis.map(produto => {
            // Encontrar itens de estoque para este produto
            const estoqueItens = estoque.filter(item => item.produto_id === produto.id);
            
            // Pegar apenas a primeira imagem se existir
            let imagemPrincipal = null;
            if (produto.imagens && Array.isArray(produto.imagens) && produto.imagens.length > 0) {
              imagemPrincipal = produto.imagens[0];
            }
            
            // Calcular cores e tamanhos disponíveis
            const coresDisponiveis = [...new Set(
              estoqueItens
                .filter(item => item.quantidade > 0)
                .map(item => item.cor)
            )].filter(Boolean);
            
            const tamanhosDisponiveis = [...new Set(
              estoqueItens
                .filter(item => item.quantidade > 0)
                .map(item => item.tamanho)
            )].filter(Boolean);
            
            return {
              id: produto.id,
              nome: produto.nome || '',
              descricao: produto.descricao || '',
              preco: produto.preco || 0,
              preco_promocional: produto.preco_promocional,
              categoria: produto.categoria || '',
              genero: produto.genero || '',
              imagem_url: imagemPrincipal,
              cores_disponiveis: coresDisponiveis,
              tamanhos_disponiveis: tamanhosDisponiveis
            };
          });
          
          // Aplicar filtros de cor e tamanho de forma flexível
          if (corBusca || tamanhoBusca) {
            const antesDoFiltro = produtosFlexiveisFormatados.length;
            let resultadoComFiltro = produtosFlexiveisFormatados;
            
            // Aplicar filtros de forma independente e flexível
            if (corBusca) {
              resultadoComFiltro = resultadoComFiltro.filter(produto => {
                return !produto.cores_disponiveis || produto.cores_disponiveis.length === 0 || 
                       produto.cores_disponiveis.some(c => {
                         if (!c) return false;
                         const cLower = c.toLowerCase();
                         const corBuscaLower = corBusca.toLowerCase();
                         return cLower.includes(corBuscaLower) || corBuscaLower.includes(cLower);
                       });
              });
            }
            
            if (tamanhoBusca) {
              resultadoComFiltro = resultadoComFiltro.filter(produto => {
                return !produto.tamanhos_disponiveis || produto.tamanhos_disponiveis.length === 0 || 
                       produto.tamanhos_disponiveis.some(t => {
                         if (!t) return false;
                         const tLower = t.toLowerCase();
                         const tamanhoBuscaLower = tamanhoBusca.toLowerCase();
                         return tLower.includes(tamanhoBuscaLower) || tamanhoBuscaLower.includes(tLower);
                       });
              });
            }
            
            console.log(`Filtro flexível de cor/tamanho: ${antesDoFiltro} -> ${resultadoComFiltro.length}`);
            
            // Se o filtro flexível retornou resultados, usá-lo
            if (resultadoComFiltro.length > 0) {
              resultadoFinal = resultadoComFiltro;
            } else {
              // Caso contrário, ignorar filtros de cor/tamanho
              resultadoFinal = produtosFlexiveisFormatados;
              console.log(`Ignorando filtros de cor/tamanho na busca flexível`);
            }
          } else {
            resultadoFinal = produtosFlexiveisFormatados;
          }
        }
      }
    }

    // Se ainda não temos resultados, tentar criar produtos fictícios baseados na busca
    if (resultadoFinal.length === 0) {
      console.log("Sem resultados. Criando produtos sugeridos baseados na busca.");
      
      // Verificar se temos informações suficientes para sugerir produtos
      if (categoriaBusca || tiposProdutoIdentificados.length > 0) {
        // Criar um produto sugerido
        const nomeProduto = [
          categoriaBusca || (tiposProdutoIdentificados.length > 0 ? 'Produto' : 'Item'),
          ...tiposProdutoIdentificados
        ].join(' ');
        
        const produtoSugerido = {
          id: 'sugestao-1',
          nome: nomeProduto,
          descricao: `Não encontramos exatamente o que você procura, mas temos produtos similares. Tente refinar sua busca.`,
          preco: 0,
          categoria: categoriaBusca || 'Diversos',
          genero: '',
          imagem_url: null,
          cores_disponiveis: corBusca ? [corBusca] : [],
          tamanhos_disponiveis: tamanhoBusca ? [tamanhoBusca] : [],
          produto_sugerido: true
        };
        
        resultadoFinal = [produtoSugerido];
        console.log(`Criado produto sugerido: ${produtoSugerido.nome}`);
      } else if (produtosFormatados.length > 0) {
        // Se não temos informações para sugestões, retornar produtos aleatórios
        resultadoFinal = produtosFormatados.slice(0, Math.min(5, produtosFormatados.length));
        console.log(`Retornando ${resultadoFinal.length} produtos aleatórios`);
      }
    }

    // Limitar a quantidade de resultados
    resultadoFinal = resultadoFinal.slice(0, limite);

    console.log(`Produtos filtrados finais: ${resultadoFinal.length}`);
    
    // Mostrar os produtos que serão retornados
    if (resultadoFinal.length > 0) {
      console.log('Produtos retornados:');
      resultadoFinal.forEach((p, i) => {
        console.log(`${i+1}. ${p.nome} (${p.categoria}) - Cores: ${p.cores_disponiveis?.join(', ')} - Tamanhos: ${p.tamanhos_disponiveis?.join(', ')}`);
      });
    }

    return res.status(200).json({ 
      success: true, 
      produtos: resultadoFinal
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar produtos',
      details: error.message
    });
  }
} 