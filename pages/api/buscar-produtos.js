import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
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
      lojaId, categoria, cor, tamanho, precoMin, precoMax, genero, termo, promocao, limite 
    });

    if (!lojaId) {
      return res.status(400).json({ error: 'ID da loja é obrigatório' });
    }
    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ error: 'Credenciais do Supabase são obrigatórias' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar produtos (simples; se quiser, depois empurramos filtros para a query)
    const { data: todosProdutos, error: todosProdutosError } = await supabase
      .from(`${lojaId}_produtos`)
      .select('*')
      .limit(100);

    if (todosProdutosError) {
      throw new Error(`Erro ao verificar produtos: ${todosProdutosError.message}`);
    }

    console.log(`Total de produtos na tabela: ${todosProdutos?.length || 0}`);
    if (!todosProdutos || todosProdutos.length === 0) {
      return res.status(200).json({ success: true, produtos: [], mensagem: 'Nenhum produto encontrado na tabela' });
    }

    // Pré-processamento leve
    let termoBusca = termo;
    let corBusca = cor;
    let tamanhoBusca = tamanho;
    let categoriaBusca = categoria;

    const mapaCategorias = {
      'camiseta': 'Camisetas','camisa': 'Camisas','blusa': 'Blusas','calça': 'Calças','vestido': 'Vestidos',
      'saia': 'Saias','shorts': 'Shorts','bermuda': 'Bermudas','casaco': 'Casacos','jaqueta': 'Jaquetas',
      'moletom': 'Moletons','sapato': 'Calçados','tênis': 'Calçados','sandália': 'Calçados','bota': 'Calçados'
    };

    if (!categoriaBusca && termoBusca) {
      const termoLower = termoBusca.toLowerCase();
      for (const [palavraChave, cat] of Object.entries(mapaCategorias)) {
        if (termoLower.includes(palavraChave)) {
          categoriaBusca = cat;
          break;
        }
      }
    }

    const tiposProdutos = [
      'gola v','gola redonda','polo','regata','cropped','jeans','social',
      'esportivo','casual','formal','infantil','masculino','feminino'
    ];
    let tiposProdutoIdentificados = [];
    if (termoBusca) {
      const termoLower = termoBusca.toLowerCase();
      for (const tipo of tiposProdutos) {
        if (termoLower.includes(tipo)) tiposProdutoIdentificados.push(tipo);
      }
    }

    if (!corBusca && termoBusca) {
      const coresComuns = ['preto','branco','azul','vermelho','verde','amarelo','rosa','roxo','laranja','marrom','cinza','bege','dourado','prateado','violeta','turquesa','salmão','bordô','vinho'];
      const termoLower = termoBusca.toLowerCase();
      for (const cor of coresComuns) {
        if (termoLower.includes(cor)) {
          corBusca = cor;
          termoBusca = termoBusca.replace(new RegExp(cor, 'i'), '').trim();
          break;
        }
      }
    }

    if (!tamanhoBusca && termoBusca) {
      const tamanhosComuns = ['PP','P','M','G','GG','XG','XXG','XGG','EG','EGG'];
      const termoLower = termoBusca.toLowerCase();
      for (const tamanho of tamanhosComuns) {
        const regexTamanho = new RegExp(`(^|\\s)${tamanho}(\\s|$)`, 'i');
        if (regexTamanho.test(termoLower)) {
          tamanhoBusca = tamanho;
          termoBusca = termoBusca.replace(regexTamanho, ' ').trim();
          break;
        }
      }
    }

    console.log(`Termo processado: "${termoBusca}", Categoria: "${categoriaBusca}", Tipos: [${tiposProdutoIdentificados.join(', ')}], Cor: "${corBusca}", Tamanho: "${tamanhoBusca}"`);

    // Filtros em memória (mantendo tua lógica)
    let produtosFiltrados = todosProdutos;

    if (categoriaBusca) {
      const categoriaLower = categoriaBusca.toLowerCase();
      const antes = produtosFiltrados.length;
      produtosFiltrados = produtosFiltrados.filter(produto => {
        const cat = (produto.categoria || '').toLowerCase();
        return cat.includes(categoriaLower) || categoriaLower.includes(cat);
      });
      if (produtosFiltrados.length === 0) produtosFiltrados = todosProdutos;
      console.log(`Filtro categoria "${categoriaBusca}": ${antes} -> ${produtosFiltrados.length}`);
    }

    if (termoBusca) {
      const termos = termoBusca.toLowerCase().split(/\s+/).filter(t => t.length > 0);
      const produtosComPontuacao = produtosFiltrados.map(produto => {
        const nome = (produto.nome || '').toLowerCase();
        const descricao = (produto.descricao || '').toLowerCase();
        const categoriaProduto = (produto.categoria || '').toLowerCase();
        const textoCompleto = `${nome} ${descricao} ${categoriaProduto}`;
        let pontuacao = 0, termosEncontrados = 0;
        for (const t of termos) {
          if (textoCompleto.includes(t)) {
            termosEncontrados++;
            if (nome.includes(t)) pontuacao += 10;
            if (categoriaProduto.includes(t)) pontuacao += 5;
            if (descricao.includes(t)) pontuacao += 3;
          }
        }
        pontuacao += (termosEncontrados / termos.length) * 20;
        if (textoCompleto.includes(termos.join(' '))) pontuacao += 30;
        for (const tipo of tiposProdutoIdentificados) {
          if (textoCompleto.includes(tipo)) pontuacao += 50;
        }
        return { produto, pontuacao, termosEncontrados };
      });
      produtosFiltrados = produtosComPontuacao
        .filter(item => item.termosEncontrados > 0)
        .sort((a, b) => b.pontuacao - a.pontuacao)
        .map(item => item.produto);
      console.log(`Após termo: ${produtosFiltrados.length}`);
    }

    if (categoria && (!categoriaBusca || categoria !== categoriaBusca)) {
      const categoriaLower = categoria.toLowerCase();
      produtosFiltrados = produtosFiltrados.filter(p => (p.categoria || '').toLowerCase().includes(categoriaLower));
    }

    if (genero) {
      const generoLower = genero.toLowerCase();
      produtosFiltrados = produtosFiltrados.filter(p => (p.genero || '').toLowerCase().includes(generoLower));
    }

    if (precoMin !== undefined) {
      produtosFiltrados = produtosFiltrados.filter(p => p.preco >= precoMin);
    }
    if (precoMax !== undefined) {
      produtosFiltrados = produtosFiltrados.filter(p => p.preco <= precoMax);
    }

    if (promocao === true) {
      produtosFiltrados = produtosFiltrados.filter(p => p.preco_promocional != null);
    }

    // Estoque
    let estoque = [];
    try {
      const { data: estoqueData, error: estoqueError } = await supabase
        .from(`${lojaId}_estoque`)
        .select('*');
      if (!estoqueError && estoqueData) {
        estoque = estoqueData;
      } else {
        console.warn(`Aviso: Erro ao buscar estoque: ${estoqueError?.message || 'Desconhecido'}`);
      }
    } catch (estoqueError) {
      console.warn(`Aviso: Falha ao buscar estoque: ${estoqueError.message}`);
    }

    // 🔎 Filtro FORTE por variação (usa estoque com quantidade > 0)
    if (corBusca || tamanhoBusca) {
      const disponiveis = new Set(
        estoque
          .filter(e =>
            e.quantidade > 0 &&
            (!corBusca || String(e.cor).toLowerCase() === String(corBusca).toLowerCase()) &&
            (!tamanhoBusca || String(e.tamanho).toLowerCase() === String(tamanhoBusca).toLowerCase())
          )
          .map(e => e.produto_id)
      );
      produtosFiltrados = produtosFiltrados.filter(p => disponiveis.has(p.id));
    }

    // Formatar com variações disponíveis
    const produtosFormatados = produtosFiltrados.map(produto => {
      const estoqueItens = estoque.filter(item => item.produto_id === produto.id);
      let imagemPrincipal = null;
      if (produto.imagens && Array.isArray(produto.imagens) && produto.imagens.length > 0) {
        imagemPrincipal = produto.imagens[0];
      }
      const coresDisponiveis = [...new Set(estoqueItens.filter(i => i.quantidade > 0).map(i => i.cor))].filter(Boolean);
      const tamanhosDisponiveis = [...new Set(estoqueItens.filter(i => i.quantidade > 0).map(i => i.tamanho))].filter(Boolean);

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

    // Resultado final (após alguma lógica tua de flexibilidade, se quiser manter)
    let resultadoFinal = produtosFormatados;

    // (mantive seus filtros flexíveis por cor/tamanho aqui — opcionais)
    if (corBusca || tamanhoBusca) {
      resultadoFinal = resultadoFinal.filter(produto => {
        let ok = true;
        if (corBusca) {
          const corMatch = produto.cores_disponiveis?.some(c => c && (c.toLowerCase() === corBusca.toLowerCase()));
          if (!corMatch) ok = false;
        }
        if (tamanhoBusca && ok) {
          const tamMatch = produto.tamanhos_disponiveis?.some(t => t && (t.toLowerCase() === tamanhoBusca.toLowerCase()));
          if (!tamMatch) ok = false;
        }
        return ok;
      });
    }

    // Sem resultados? retorna vazio (sem "produto sugerido")
    if (resultadoFinal.length === 0) {
      return res.status(200).json({ success: true, produtos: [] });
    }

    // Limite
    resultadoFinal = resultadoFinal.slice(0, Number(limite) || 10);

    return res.status(200).json({ success: true, produtos: resultadoFinal });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return res.status(500).json({ error: 'Erro ao buscar produtos', details: error.message });
  }
}
