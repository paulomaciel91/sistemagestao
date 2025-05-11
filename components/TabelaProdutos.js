import React from 'react';
import Link from 'next/link';
import { FiEdit2, FiTrash2, FiEye } from 'react-icons/fi';

const TabelaProdutos = ({ produtos, lojaId, onEdit, onDelete }) => {
  if (!produtos || produtos.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-800 rounded-lg">
        <p className="text-gray-400">Nenhum produto encontrado.</p>
      </div>
    );
  }

  // Função para obter o estoque de forma segura
  const getEstoqueTotal = (produto) => {
    // Verificar se existe um valor específico de estoque_total
    if (produto.estoque_total !== undefined) {
      return produto.estoque_total;
    }
    // Fallback para o campo estoque
    if (produto.estoque !== undefined) {
      return produto.estoque;
    }
    // Valor padrão se nenhum estiver disponível
    return 0;
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-700">
            <th className="px-4 py-3 text-left">Produto</th>
            <th className="px-4 py-3 text-right">Preço</th>
            <th className="px-4 py-3 text-center">Estoque</th>
            <th className="px-4 py-3 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((produto) => {
            const estoqueTotal = getEstoqueTotal(produto);
            return (
              <tr key={produto.id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded bg-gray-700 mr-3 flex items-center justify-center overflow-hidden">
                      {produto.imagens && produto.imagens[0] ? (
                        <img 
                          src={produto.imagens[0]} 
                          alt="" 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.src = "/placeholder-image.png";
                            e.target.onerror = null;
                          }}
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">Sem imagem</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{produto.nome}</div>
                      <div className="text-sm text-gray-400">{produto.categoria || '-'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-green-400">
                  R$ {parseFloat(produto.preco).toFixed(2).replace('.', ',')}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                    estoqueTotal <= 0 ? 'bg-red-900/50 text-red-300' : 
                    estoqueTotal <= (produto.estoque_minimo || 5) ? 'bg-amber-900/50 text-amber-300' : 
                    'bg-green-900/50 text-green-300'
                  }`}>
                    {estoqueTotal} un
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center space-x-3">
                    <Link
                      href={`/lojas/${lojaId}/produtos/${produto.id}`}
                      className="text-gray-400 hover:text-primary-500"
                      title="Ver detalhes"
                    >
                      <FiEye size={18} />
                    </Link>
                    <button
                      onClick={() => onEdit(produto)}
                      className="text-blue-400 hover:text-blue-300"
                      title="Editar"
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(produto.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Excluir"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TabelaProdutos; 