import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'react-toastify';
import LojaLayout from '@/components/LojaLayout';
import Link from 'next/link';
import { FiTag, FiPlus, FiCalendar, FiPercent, FiEdit2, FiTrash2, FiPauseCircle, FiPlayCircle, FiInfo, FiX, FiSave } from 'react-icons/fi';

export default function Promocoes() {
  const router = useRouter();
  const { lojaId } = router.query;
  const { supabase, isInitialized, loading } = useSupabase();
  
  const [loja, setLoja] = useState(null);
  const [promocoes, setPromocoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [promocaoEditarId, setPromocaoEditarId] = useState(null);
  
  // Nova promoção
  const [novaPromocaoData, setNovaPromocaoData] = useState({
    nome: '',
    descricao: '',
    desconto: '',
    tipo_desconto: 'percentual',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    categorias: [],
    produtos_ids: [],
    ativo: true
  });
  
  // Categoria temporária
  const [categoriaTemp, setCategoriaTemp] = useState('');
  
  // Dados de demonstração
  const dadosDemonstracao = [
    {
      id: '1',
      nome: 'Promoção Inverno',
      descricao: 'Descontos especiais para a coleção de inverno',
      desconto: 15.00,
      tipo_desconto: 'percentual',
      produtos_ids: [],
      categorias: ['Casacos', 'Jaquetas'],
      data_inicio: '2023-06-10T00:00:00Z',
      data_fim: '2023-07-10T23:59:59Z',
      ativo: true
    },
    {
      id: '2',
      nome: 'Liquidação Verão',
      descricao: 'Últimas peças da coleção de verão com desconto',
      desconto: 30.00,
      tipo_desconto: 'percentual',
      produtos_ids: [],
      categorias: ['Camisetas', 'Bermudas', 'Vestidos'],
      data_inicio: '2023-06-01T00:00:00Z',
      data_fim: '2023-06-30T23:59:59Z',
      ativo: true
    },
    {
      id: '3',
      nome: 'Cupom Primeira Compra',
      descricao: 'Desconto para novos clientes',
      desconto: 25.00,
      tipo_desconto: 'valor',
      produtos_ids: [],
      categorias: [],
      data_inicio: '2023-01-01T00:00:00Z',
      data_fim: '2023-12-31T23:59:59Z',
      ativo: true
    },
    {
      id: '4',
      nome: 'Black Friday Antecipada',
      descricao: 'Descontos especiais para o mês de novembro',
      desconto: 35.00,
      tipo_desconto: 'percentual',
      produtos_ids: [],
      categorias: ['Calças', 'Jaquetas', 'Vestidos'],
      data_inicio: '2023-11-01T00:00:00Z',
      data_fim: '2023-11-30T23:59:59Z',
      ativo: false
    }
  ];

  // Carregar dados da loja quando o ID estiver disponível
  useEffect(() => {
    if (supabase && lojaId) {
      carregarDados();
    }
  }, [supabase, lojaId]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      
      // Verificar se a loja existe
      const { data: lojaData, error: lojaError } = await supabase
        .from('lojas')
        .select('*')
        .eq('identificador', lojaId)
        .single();
      
      if (lojaError) throw lojaError;
      
      if (!lojaData) {
        toast.error('Loja não encontrada');
        router.push('/dashboard');
        return;
      }
      
      setLoja(lojaData);
      
      // Carregar produtos para seleção nas promoções
      try {
        const { data: produtosData, error: produtosError } = await supabase
          .from(`${lojaId}_produtos`)
          .select('id, nome, categoria')
          .order('nome', { ascending: true });
          
        if (!produtosError && produtosData) {
          setProdutos(produtosData);
          
          // Extrair categorias únicas dos produtos
          const todasCategorias = [...new Set(produtosData.map(p => p.categoria).filter(Boolean))];
          setCategorias(todasCategorias);
        }
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      }
      
      // Tentar carregar promoções do banco
      try {
        const { data: promocoesData, error: promocoesError } = await supabase
          .from(`${lojaId}_promocoes`)
          .select('*')
          .order('data_inicio', { ascending: false });
        
        if (promocoesError) {
          if (promocoesError.code === 'PGRST116') {
            // A tabela não existe, tentamos criá-la
            try {
              await supabase.rpc('executar_sql', {
                p_sql: `
                  CREATE TABLE IF NOT EXISTS ${lojaId}_promocoes (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    nome TEXT NOT NULL,
                    descricao TEXT,
                    desconto DECIMAL(10, 2) NOT NULL,
                    tipo_desconto TEXT NOT NULL,
                    produtos_ids UUID[],
                    categorias TEXT[],
                    data_inicio TIMESTAMPTZ NOT NULL,
                    data_fim TIMESTAMPTZ NOT NULL,
                    ativo BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ DEFAULT now(),
                    updated_at TIMESTAMPTZ DEFAULT now()
                  );
                `
              });
              
              toast.info('Tabela de promoções criada com sucesso!');
              setPromocoes([]);
            } catch (criarTabelaError) {
              console.error('Erro ao criar tabela de promoções:', criarTabelaError);
              toast.error('Erro ao criar tabela de promoções');
              setPromocoes([]);
            }
          } else {
            throw promocoesError;
          }
        } else {
          setPromocoes(promocoesData || []);
        }
      } catch (error) {
        console.error('Erro ao carregar promoções:', error);
        toast.error('Erro ao carregar promoções');
        setPromocoes([]);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  // Função para verificar se uma promoção está ativa atualmente
  const isPromocaoAtiva = (promocao) => {
    if (!promocao.ativo) return false;
    
    const agora = new Date();
    const dataInicio = new Date(promocao.data_inicio);
    const dataFim = new Date(promocao.data_fim);
    
    return agora >= dataInicio && agora <= dataFim;
  };
  
  // Função para formatar data no padrão brasileiro
  const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  };
  
  // Alternar status ativo/inativo da promoção
  const alternarStatusPromocao = async (id) => {
    try {
      // Encontrar a promoção no estado atual
      const promocao = promocoes.find(p => p.id === id);
      if (!promocao) return;
      
      const novoStatus = !promocao.ativo;
      
      // Atualizar no banco de dados, se possível
      try {
        await supabase
          .from(`${lojaId}_promocoes`)
          .update({ ativo: novoStatus })
          .eq('id', id);
      } catch (error) {
        console.log('Erro ao atualizar no banco, atualizando apenas na interface:', error);
      }
      
      // Atualizar no estado local independentemente do resultado do banco
      setPromocoes(promocoes.map(promo => 
        promo.id === id ? { ...promo, ativo: novoStatus } : promo
      ));
      
      toast.success(`Promoção ${novoStatus ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alternar status:', error);
      toast.error('Erro ao alternar status da promoção');
    }
  };
  
  // Excluir promoção
  const excluirPromocao = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja excluir a promoção "${nome}"?`)) {
      return;
    }
    
    try {
      // Tentar excluir do banco de dados
      try {
        await supabase
          .from(`${lojaId}_promocoes`)
          .delete()
          .eq('id', id);
      } catch (error) {
        console.log('Erro ao excluir do banco, removendo apenas da interface:', error);
      }
      
      // Atualizar o estado local independentemente do resultado do banco
      setPromocoes(promocoes.filter(promo => promo.id !== id));
      toast.success(`Promoção "${nome}" excluída com sucesso!`);
    } catch (error) {
      console.error('Erro ao excluir promoção:', error);
      toast.error('Erro ao excluir promoção');
    }
  };
  
  // Abrir modal de nova promoção
  const novaPromocao = () => {
    setShowModal(true);
  };
  
  // Fechar modal
  const fecharModal = () => {
    setShowModal(false);
    setModoEdicao(false);
    setPromocaoEditarId(null);
    // Resetar dados do formulário
    setNovaPromocaoData({
      nome: '',
      descricao: '',
      desconto: '',
      tipo_desconto: 'percentual',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      categorias: [],
      produtos_ids: [],
      ativo: true
    });
    setCategoriaTemp('');
  };
  
  // Abrir modal de edição
  const editarPromocao = (promocao) => {
    // Formatar datas para o formato aceito pelo input date
    const formatarDataInput = (dataString) => {
      const data = new Date(dataString);
      return data.toISOString().split('T')[0];
    };
    
    setNovaPromocaoData({
      nome: promocao.nome,
      descricao: promocao.descricao || '',
      desconto: promocao.desconto.toString(),
      tipo_desconto: promocao.tipo_desconto,
      data_inicio: formatarDataInput(promocao.data_inicio),
      data_fim: formatarDataInput(promocao.data_fim),
      categorias: promocao.categorias || [],
      produtos_ids: promocao.produtos_ids || [],
      ativo: promocao.ativo
    });
    
    setModoEdicao(true);
    setPromocaoEditarId(promocao.id);
    setShowModal(true);
  };
  
  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNovaPromocaoData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Adicionar categoria
  const adicionarCategoria = () => {
    if (!categoriaTemp.trim()) return;
    
    setNovaPromocaoData(prev => ({
      ...prev,
      categorias: [...prev.categorias, categoriaTemp.trim()]
    }));
    
    setCategoriaTemp('');
  };
  
  // Remover categoria
  const removerCategoria = (index) => {
    setNovaPromocaoData(prev => ({
      ...prev,
      categorias: prev.categorias.filter((_, i) => i !== index)
    }));
  };
  
  // Submeter formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validar datas
      const dataInicio = new Date(novaPromocaoData.data_inicio);
      const dataFim = new Date(novaPromocaoData.data_fim);
      
      if (dataInicio > dataFim) {
        toast.error('A data de início deve ser anterior à data de fim');
        return;
      }
      
      // Validar desconto
      if (parseFloat(novaPromocaoData.desconto) <= 0) {
        toast.error('O desconto deve ser maior que zero');
        return;
      }
      
      // Preparar dados da promoção
      const promocaoParaSalvar = {
        ...novaPromocaoData,
        desconto: parseFloat(novaPromocaoData.desconto),
        produtos_ids: novaPromocaoData.produtos_ids.length > 0 ? novaPromocaoData.produtos_ids : null,
        categorias: novaPromocaoData.categorias.length > 0 ? novaPromocaoData.categorias : null,
        ativo: true,
        updated_at: new Date().toISOString()
      };
      
      if (modoEdicao && promocaoEditarId) {
        // Atualizar promoção existente
        const { error } = await supabase
          .from(`${lojaId}_promocoes`)
          .update(promocaoParaSalvar)
          .eq('id', promocaoEditarId);
          
        if (error) throw error;
        
        toast.success('Promoção atualizada com sucesso!');
        
        // Atualizar o estado local
        setPromocoes(promocoes.map(promo => 
          promo.id === promocaoEditarId ? {...promocaoParaSalvar, id: promocaoEditarId} : promo
        ));
      } else {
        // Criar nova promoção
        const { data, error } = await supabase
          .from(`${lojaId}_promocoes`)
          .insert([{
            ...promocaoParaSalvar,
            created_at: new Date().toISOString()
          }])
          .select();
          
        if (error) throw error;
        
        toast.success('Promoção criada com sucesso!');
        
        // Adicionar a nova promoção ao estado
        if (data && data.length > 0) {
          setPromocoes([data[0], ...promocoes]);
        } else {
          // Se não recebemos o dado inserido, recarregar todos os dados
          carregarDados();
        }
      }
      
      // Fechar modal e limpar formulário
      fecharModal();
      
    } catch (error) {
      console.error('Erro ao salvar promoção:', error);
      toast.error('Erro ao salvar promoção: ' + error.message);
    }
  };

  return (
    <LojaLayout title="Promoções Personalizadas" loja={loja} lojaId={lojaId} icon={<FiTag className="mr-2 text-yellow-400" />}>
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <h2 className="text-xl font-semibold">Promoções e Descontos</h2>
            <button
              onClick={novaPromocao}
              className="btn btn-primary ml-4 flex items-center"
            >
              <FiPlus className="mr-1" />
              Nova Promoção
            </button>
          </div>
        </div>
        
        {carregando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : promocoes.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <FiTag className="mx-auto text-5xl mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma promoção cadastrada</h3>
            <p className="text-gray-400 mb-6">
              Comece criando sua primeira promoção para atrair mais clientes
            </p>
            <button
              className="btn btn-primary inline-flex items-center"
              onClick={novaPromocao}
            >
              <FiPlus className="mr-1" />
              Criar Promoção
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promocoes.map((promocao) => {
              const ativa = isPromocaoAtiva(promocao);
              
              return (
                <div key={promocao.id} className={`card hover:shadow-lg transition-shadow duration-300 
                  ${ativa ? 'border-green-700' : 'border-gray-700'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{promocao.nome}</h3>
                    
                    {ativa ? (
                      <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded">
                        Ativa
                      </span>
                    ) : promocao.ativo ? (
                      <span className="bg-yellow-900 text-yellow-300 text-xs px-2 py-1 rounded">
                        Programada
                      </span>
                    ) : (
                      <span className="bg-red-900 text-red-300 text-xs px-2 py-1 rounded">
                        Inativa
                      </span>
                    )}
                  </div>
                  
                  {promocao.descricao && (
                    <p className="text-gray-300 text-sm mb-4">{promocao.descricao}</p>
                  )}
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm">
                      <FiPercent className="text-primary-400 mr-2" />
                      <span>
                        {promocao.tipo_desconto === 'percentual'
                          ? `${promocao.desconto}% de desconto`
                          : `R$ ${promocao.desconto.toFixed(2).replace('.', ',')} de desconto`
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <FiCalendar className="text-primary-400 mr-2" />
                      <span>
                        {formatarData(promocao.data_inicio)} a {formatarData(promocao.data_fim)}
                      </span>
                    </div>
                    
                    {promocao.categorias && promocao.categorias.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {promocao.categorias.map((categoria, idx) => (
                          <span key={idx} className="bg-gray-700 text-xs rounded-full px-2 py-1">
                            {categoria}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-700">
                    <div>
                      <button
                        className="btn btn-sm btn-ghost text-blue-400"
                        onClick={() => editarPromocao(promocao)}
                      >
                        <FiEdit2 className="mr-1" />
                        Editar
                      </button>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        className={`btn btn-sm btn-ghost ${promocao.ativo ? 'text-yellow-400' : 'text-green-400'}`}
                        onClick={() => alternarStatusPromocao(promocao.id)}
                        title={promocao.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {promocao.ativo ? <FiPauseCircle /> : <FiPlayCircle />}
                      </button>
                      
                      <button
                        className="btn btn-sm btn-ghost text-red-400"
                        onClick={() => excluirPromocao(promocao.id, promocao.nome)}
                        title="Excluir"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-8 p-4 bg-gray-800 rounded-lg flex items-start gap-4">
          <FiInfo className="text-primary-400 text-2xl flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Dicas para Promoções Eficazes</h3>
            <ul className="text-gray-300 text-sm space-y-2 list-disc pl-5">
              <li>Use prazos limitados para criar senso de urgência</li>
              <li>Promova seus produtos mais populares para aumentar as vendas</li>
              <li>Envie promoções personalizadas para seus clientes regulares</li>
              <li>Considere descontos sazonais para acompanhar datas comemorativas</li>
              <li>Analise o desempenho de promoções passadas para otimizar futuras campanhas</li>
            </ul>
          </div>
        </div>
        
        {/* Modal de Nova Promoção */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg border border-gray-700">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                  <h3 className="text-xl font-semibold text-white">{modoEdicao ? 'Editar Promoção' : 'Nova Promoção'}</h3>
                  <button 
                    onClick={fecharModal}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Fechar"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Promoção</label>
                    <input
                      type="text"
                      name="nome"
                      value={novaPromocaoData.nome}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Ex: Promoção de Verão"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Descrição (opcional)</label>
                    <textarea
                      name="descricao"
                      value={novaPromocaoData.descricao}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Descreva sua promoção"
                      rows="3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Desconto</label>
                      <select
                        name="tipo_desconto"
                        value={novaPromocaoData.tipo_desconto}
                        onChange={handleChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="percentual">Percentual (%)</option>
                        <option value="valor">Valor fixo (R$)</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Valor do Desconto {novaPromocaoData.tipo_desconto === 'percentual' ? '(%)' : '(R$)'}
                      </label>
                      <input
                        type="number"
                        name="desconto"
                        value={novaPromocaoData.desconto}
                        onChange={handleChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder={novaPromocaoData.tipo_desconto === 'percentual' ? 'Ex: 10' : 'Ex: 50.00'}
                        min="0"
                        step={novaPromocaoData.tipo_desconto === 'percentual' ? '1' : '0.01'}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Data de Início</label>
                      <input
                        type="date"
                        name="data_inicio"
                        value={novaPromocaoData.data_inicio}
                        onChange={handleChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Data de Término</label>
                      <input
                        type="date"
                        name="data_fim"
                        value={novaPromocaoData.data_fim}
                        onChange={handleChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Categorias (opcional)</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={categoriaTemp}
                        onChange={(e) => setCategoriaTemp(e.target.value)}
                        className="flex-grow bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ex: Camisetas, Vestidos, etc."
                      />
                      <button
                        type="button"
                        onClick={adicionarCategoria}
                        className="flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-md transition-colors"
                        disabled={!categoriaTemp.trim()}
                      >
                        <FiPlus size={20} />
                      </button>
                    </div>
                    
                    {novaPromocaoData.categorias.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {novaPromocaoData.categorias.map((categoria, idx) => (
                          <span key={idx} className="bg-gray-700 text-sm rounded-full px-3 py-1 flex items-center">
                            {categoria}
                            <button
                              type="button"
                              onClick={() => removerCategoria(idx)}
                              className="ml-2 text-gray-400 hover:text-red-400 transition-colors"
                              aria-label="Remover categoria"
                            >
                              <FiX size={16} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group pt-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="ativo"
                        checked={novaPromocaoData.ativo}
                        onChange={handleChange}
                        className="form-checkbox h-5 w-5 text-primary-500 rounded border-gray-700 bg-gray-800 focus:ring-primary-500"
                      />
                      <span className="text-gray-300">Ativar promoção imediatamente</span>
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-800 mt-4">
                    <button
                      type="button"
                      onClick={fecharModal}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors flex items-center"
                    >
                      <FiSave className="mr-2" /> {modoEdicao ? 'Salvar Alterações' : 'Criar Promoção'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </LojaLayout>
  );
} 