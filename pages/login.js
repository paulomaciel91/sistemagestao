import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionar para a página inicial que já é a página de login
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <Head>
        <title>Redirecionando... | Sistema de Gestão para Lojas</title>
      </Head>
      
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Sistema de Gestão para Lojas</h1>
        <p className="text-xl text-gray-400 mb-8">Redirecionando para a página de login...</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    </div>
  );
} 