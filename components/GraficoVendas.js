import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Registrar componentes Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function GraficoVendas({ 
  vendas, 
  tipo = 'line', 
  periodo = 'semana',
  titulo = 'Histórico de Vendas',
  altura = 300 
}) {
  const [dadosGrafico, setDadosGrafico] = useState({
    labels: [],
    datasets: []
  });
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!vendas || vendas.length === 0) {
      return;
    }

    try {
      processarDados();
      setErro(null);
    } catch (error) {
      console.error('Erro ao processar dados do gráfico:', error);
      setErro('Não foi possível processar os dados do gráfico.');
    }
  }, [vendas, periodo, tipo]);

  const processarDados = () => {
    // Garantir que vendas seja sempre um array
    if (!Array.isArray(vendas)) {
      console.warn('Vendas não é um array:', vendas);
      setErro('Dados de vendas inválidos.');
      return;
    }

    // Garantir que todos os itens tenham created_at e valor_total
    const vendasValidas = vendas.filter(venda => {
      if (!venda || typeof venda !== 'object') return false;
      
      // Verificar se created_at existe e é válido
      const temDataValida = venda.created_at && new Date(venda.created_at).toString() !== 'Invalid Date';
      
      // Verificar se valor_total existe e é numérico
      const temValorValido = venda.valor_total !== undefined && 
                             venda.valor_total !== null && 
                             !isNaN(parseFloat(venda.valor_total));
      
      return temDataValida && temValorValido;
    });

    if (vendasValidas.length === 0) {
      console.warn('Nenhuma venda válida para processar');
      setErro('Dados de vendas insuficientes para gerar o gráfico.');
      return;
    }

    // Ordenar vendas por data
    const vendasOrdenadas = [...vendasValidas].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );

    // Datas para agrupar as vendas
    let datas = [];
    let valores = [];
    let quantidades = [];
    
    // Determinar intervalo baseado no período
    const hoje = new Date();
    const inicioIntervalo = new Date();
    
    switch (periodo) {
      case 'semana':
        inicioIntervalo.setDate(hoje.getDate() - 7);
        break;
      case 'mes':
        inicioIntervalo.setMonth(hoje.getMonth() - 1);
        break;
      case 'ano':
        inicioIntervalo.setFullYear(hoje.getFullYear() - 1);
        break;
      default:
        inicioIntervalo.setDate(hoje.getDate() - 7);
    }

    // Filtrar vendas pelo período selecionado
    const vendasFiltradas = vendasOrdenadas.filter(venda => 
      new Date(venda.created_at) >= inicioIntervalo
    );

    // Agrupar por dia
    if (periodo === 'semana') {
      // Para semana, mostrar dias individuais
      const mapaVendas = new Map();
      
      // Inicializar mapa com todos os dias do período
      for (let i = 0; i <= 6; i++) {
        const data = new Date();
        data.setDate(data.getDate() - (6 - i));
        const dataFormatada = data.toLocaleDateString('pt-BR');
        mapaVendas.set(dataFormatada, { total: 0, quantidade: 0 });
      }
      
      // Adicionar vendas ao mapa
      vendasFiltradas.forEach(venda => {
        try {
          const dataVenda = new Date(venda.created_at).toLocaleDateString('pt-BR');
          
          if (mapaVendas.has(dataVenda)) {
            const dadosAtuais = mapaVendas.get(dataVenda);
            mapaVendas.set(dataVenda, {
              total: dadosAtuais.total + parseFloat(venda.valor_total),
              quantidade: dadosAtuais.quantidade + 1
            });
          }
        } catch (error) {
          console.warn('Erro ao processar venda:', error, venda);
        }
      });
      
      // Converter mapa para arrays
      datas = Array.from(mapaVendas.keys());
      valores = Array.from(mapaVendas.values()).map(v => v.total);
      quantidades = Array.from(mapaVendas.values()).map(v => v.quantidade);
    } 
    // Agrupar por mês
    else if (periodo === 'mes') {
      const mapaVendas = new Map();
      
      // Inicializar mapa com todos os dias do período
      for (let i = 0; i < 30; i++) {
        const data = new Date();
        data.setDate(data.getDate() - (29 - i));
        const dataFormatada = data.toLocaleDateString('pt-BR');
        mapaVendas.set(dataFormatada, { total: 0, quantidade: 0 });
      }
      
      // Adicionar vendas ao mapa
      vendasFiltradas.forEach(venda => {
        try {
          const dataVenda = new Date(venda.created_at).toLocaleDateString('pt-BR');
          
          if (mapaVendas.has(dataVenda)) {
            const dadosAtuais = mapaVendas.get(dataVenda);
            mapaVendas.set(dataVenda, {
              total: dadosAtuais.total + parseFloat(venda.valor_total),
              quantidade: dadosAtuais.quantidade + 1
            });
          }
        } catch (error) {
          console.warn('Erro ao processar venda:', error, venda);
        }
      });
      
      // Converter mapa para arrays - agrupar por semana para facilitar visualização
      const datasAgrupadas = [];
      const valoresAgrupados = [];
      const quantidadesAgrupadas = [];
      
      let somaValor = 0;
      let somaQuantidade = 0;
      let contador = 0;
      let ultimaData = '';
      
      Array.from(mapaVendas.entries()).forEach(([data, valores], index) => {
        somaValor += valores.total;
        somaQuantidade += valores.quantidade;
        contador++;
        
        // Agrupar a cada 5 dias
        if (contador === 5 || index === mapaVendas.size - 1) {
          datasAgrupadas.push(ultimaData ? `${ultimaData} a ${data}` : data);
          valoresAgrupados.push(somaValor);
          quantidadesAgrupadas.push(somaQuantidade);
          
          somaValor = 0;
          somaQuantidade = 0;
          contador = 0;
          ultimaData = '';
        } else if (contador === 1) {
          ultimaData = data;
        }
      });
      
      datas = datasAgrupadas;
      valores = valoresAgrupados;
      quantidades = quantidadesAgrupadas;
    } 
    // Agrupar por ano
    else if (periodo === 'ano') {
      const meses = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];
      
      const mapaVendas = new Map();
      
      // Inicializar mapa com todos os meses
      for (let i = 0; i < 12; i++) {
        const data = new Date();
        data.setMonth(data.getMonth() - (11 - i));
        const mesAno = `${meses[data.getMonth()]}/${data.getFullYear()}`;
        mapaVendas.set(mesAno, { total: 0, quantidade: 0 });
      }
      
      // Adicionar vendas ao mapa
      vendasFiltradas.forEach(venda => {
        try {
          const dataVenda = new Date(venda.created_at);
          const mesAno = `${meses[dataVenda.getMonth()]}/${dataVenda.getFullYear()}`;
          
          if (mapaVendas.has(mesAno)) {
            const dadosAtuais = mapaVendas.get(mesAno);
            mapaVendas.set(mesAno, {
              total: dadosAtuais.total + parseFloat(venda.valor_total),
              quantidade: dadosAtuais.quantidade + 1
            });
          }
        } catch (error) {
          console.warn('Erro ao processar venda:', error, venda);
        }
      });
      
      // Converter mapa para arrays
      datas = Array.from(mapaVendas.keys());
      valores = Array.from(mapaVendas.values()).map(v => v.total);
      quantidades = Array.from(mapaVendas.values()).map(v => v.quantidade);
    }

    // Configurar dados do gráfico
    const dados = {
      labels: datas,
      datasets: [
        {
          label: 'Valor (R$)',
          data: valores,
          borderColor: 'rgba(53, 162, 235, 1)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          tension: 0.2,
          yAxisID: 'y'
        },
        {
          label: 'Qtd. Vendas',
          data: quantidades,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          tension: 0.2,
          yAxisID: 'y1'
        }
      ]
    };

    setDadosGrafico(dados);
  };

  // Opções do gráfico
  const opcoes = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    animation: {
      duration: 0 // Desativar animações para melhorar o desempenho
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#CCC'
        }
      },
      title: {
        display: !!titulo,
        text: titulo,
        color: '#CCC'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (context.dataset.label === 'Valor (R$)') {
              return `${context.dataset.label}: R$ ${context.parsed.y.toFixed(2).replace('.', ',')}`;
            }
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(80, 80, 80, 0.2)',
        },
        ticks: {
          color: '#AAA',
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Valor (R$)',
          color: '#AAA'
        },
        grid: {
          color: 'rgba(80, 80, 80, 0.2)',
        },
        ticks: {
          color: '#AAA',
          callback: function(value) {
            return `R$ ${value}`;
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Qtd. Vendas',
          color: '#AAA'
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#AAA',
        }
      },
    },
  };

  // Renderizar mensagem de erro quando não houver dados
  if (erro) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] bg-gray-800 rounded-lg">
        <p className="text-gray-400">{erro}</p>
      </div>
    );
  }

  // Renderizar o gráfico correto baseado no tipo
  return (
    <div style={{ height: `${altura}px` }} className="relative">
      {dadosGrafico.labels.length > 0 ? (
        tipo === 'line' ? (
          <Line options={opcoes} data={dadosGrafico} />
        ) : (
          <Bar options={opcoes} data={dadosGrafico} />
        )
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-800 rounded-lg">
          <p className="text-gray-400">Nenhum dado disponível para o período.</p>
        </div>
      )}
    </div>
  );
} 