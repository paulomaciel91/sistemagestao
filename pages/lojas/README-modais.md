# Padrão de Modais para o Dashboard

Este documento descreve o padrão visual e de comportamento para modais de adição e edição em todo o Dashboard.

## Estrutura do Modal

Todos os modais de adição ou edição devem seguir esta estrutura básica:

```jsx
{/* Modal */}
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg border border-gray-700">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <h3 className="text-xl font-semibold text-white">{modoEdicao ? 'Editar Item' : 'Novo Item'}</h3>
          <button 
            onClick={fecharModal}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <FiX size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campos do formulário */}
          
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
              <FiSave className="mr-2" /> {modoEdicao ? 'Salvar Alterações' : 'Criar Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
)}
```

## Estados necessários

Cada página que utiliza modais deve definir estes estados:

```jsx
// Estados para controlar o modal
const [showModal, setShowModal] = useState(false);
const [modoEdicao, setModoEdicao] = useState(false);
const [itemEditarId, setItemEditarId] = useState(null);
const [formData, setFormData] = useState({
  // Campos específicos do formulário
  campo1: '',
  campo2: '',
  // ...
});
```

## Funções básicas para gerenciar o modal

Cada página deve implementar estas funções principais:

```jsx
// Abrir modal para criar
const abrirNovoItem = () => {
  setModoEdicao(false);
  setItemEditarId(null);
  setFormData({
    campo1: '',
    campo2: '',
    // ...valores iniciais
  });
  setShowModal(true);
};

// Abrir modal para editar
const editarItem = (item) => {
  setFormData({
    campo1: item.campo1,
    campo2: item.campo2,
    // ...preencher com dados do item
  });
  
  setModoEdicao(true);
  setItemEditarId(item.id);
  setShowModal(true);
};

// Fechar modal
const fecharModal = () => {
  setShowModal(false);
  setModoEdicao(false);
  setItemEditarId(null);
  setFormData({
    campo1: '',
    campo2: '',
    // ...resetar valores
  });
};

// Manipular mudanças no formulário
const handleChange = (e) => {
  const { name, value, type, checked } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: type === 'checkbox' ? checked : value
  }));
};

// Submeter formulário
const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    // Validar dados
    // ...
    
    // Preparar dados
    const data = {
      ...formData,
      updated_at: new Date().toISOString()
    };
    
    if (modoEdicao) {
      // Lógica para atualizar item existente
      // ...
      
      toast.success('Item atualizado com sucesso!');
    } else {
      // Lógica para criar novo item
      // ...
      
      toast.success('Item criado com sucesso!');
    }
    
    fecharModal();
    
  } catch (error) {
    console.error(`Erro ao ${modoEdicao ? 'atualizar' : 'criar'} item:`, error);
    toast.error(`Erro ao ${modoEdicao ? 'atualizar' : 'criar'} item`);
  }
};
```

## Estilo dos elementos de formulário

Use estas classes para estilizar os elementos de formulário no modal:

### Contêiner de grupo de campos
```jsx
<div className="form-group">
  {/* Conteúdo */}
</div>
```

### Label
```jsx
<label className="block text-sm font-medium text-gray-300 mb-2">Label</label>
```

### Input de texto, número, e-mail, etc.
```jsx
<input
  type="text"
  name="campo"
  value={formData.campo}
  onChange={handleChange}
  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  placeholder="Ex: texto de exemplo"
/>
```

### Textarea
```jsx
<textarea
  name="campo"
  value={formData.campo}
  onChange={handleChange}
  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  placeholder="Descrição..."
  rows="3"
/>
```

### Select
```jsx
<select
  name="campo"
  value={formData.campo}
  onChange={handleChange}
  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
>
  <option value="opcao1">Opção 1</option>
  <option value="opcao2">Opção 2</option>
</select>
```

### Checkbox
```jsx
<label className="flex items-center space-x-3 cursor-pointer">
  <input
    type="checkbox"
    name="campo"
    checked={formData.campo}
    onChange={handleChange}
    className="h-5 w-5 text-primary-500 rounded border-gray-700 bg-gray-800 focus:ring-primary-500"
  />
  <span className="text-gray-300">Texto do Checkbox</span>
</label>
```

### Layout em grid
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div className="form-group">
    {/* Campo 1 */}
  </div>
  <div className="form-group">
    {/* Campo 2 */}
  </div>
</div>
```

## Importações necessárias

Certifique-se de importar os ícones necessários:

```jsx
import { FiX, FiSave } from 'react-icons/fi';
```

## Exemplo de Implementação

Veja os arquivos:
- `pages/lojas/[lojaId]/promocoes.js` - Modal de adição/edição de promoções
- `pages/lojas/[lojaId]/clientes.js` - Modal de adição/edição de clientes

## Observações

1. Mantenha a consistência visual em todos os modais
2. Implemente validação adequada para os dados do formulário
3. Use mensagens toast para feedback de sucesso e erro
4. Certifique-se de atualizar tanto o banco de dados quanto o estado local da aplicação 