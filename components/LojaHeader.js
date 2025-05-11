import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiSettings, FiArrowLeft, FiGrid } from 'react-icons/fi';

export default function LojaHeader({ title, loja, lojaId, icon }) {
  const router = useRouter();
  
  const isDemoLoja = lojaId === 'loja_demo';
  
  return (
    <header className="bg-gray-800 shadow-md py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          {router.pathname.includes('/lojas/[lojaId]') && !router.pathname.endsWith('/[lojaId]') ? (
            <Link href={`/lojas/${lojaId}`} className="mr-3 text-gray-300 hover:text-white">
              <FiArrowLeft size={20} />
            </Link>
          ) : (
            <Link href="/dashboard" className="mr-4 text-lg font-medium text-gray-300 hover:text-white">
              Dashboard
            </Link>
          )}
          <h1 className="text-2xl font-bold flex items-center">
            {icon}
            {title || (loja ? loja.nome : 'Loja')}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {isDemoLoja && (
            <Link 
              href="/configuracao/demo"
              className="text-emerald-400 hover:text-emerald-300 flex items-center"
            >
              <FiGrid className="mr-1" />
              <span>Dados Demo</span>
            </Link>
          )}
          <Link 
            href={`/lojas/${lojaId}/configuracoes`}
            className="text-gray-300 hover:text-white flex items-center"
          >
            <FiSettings className="mr-1" />
            <span>Configurações</span>
          </Link>
        </div>
      </div>
    </header>
  );
} 