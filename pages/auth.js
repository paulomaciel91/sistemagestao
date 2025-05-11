import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';

export default function Auth() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Credenciais temporárias simples
  const ADMIN_USER = 'admin';
  const ADMIN_PASSWORD = 'admin123';

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoggingIn(true);

    // Verificação simples de login
    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      // Armazenar o estado do login
      localStorage.setItem('isLoggedIn', 'true');
      alert('Login realizado com sucesso!');
      
      // Direcionar para o dashboard
      router.push('/dashboard');
    } else {
      alert('Credenciais inválidas. Tente novamente.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <Head>
        <title>Login | Sistema de Gestão para Lojas</title>
        <meta name="description" content="Sistema completo de gestão para lojas de roupas" />
      </Head>
      
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Sistema de Gestão - Página de Teste</h1>
          <p className="text-gray-400 mt-2">Faça login para acessar o painel</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="label" htmlFor="username">
              <span className="flex items-center">
                <FiUser className="mr-2" />
                Usuário
              </span>
            </label>
            <input
              id="username"
              type="text"
              className="input w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="label" htmlFor="password">
              <span className="flex items-center">
                <FiLock className="mr-2" />
                Senha
              </span>
            </label>
            <input
              id="password"
              type="password"
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </div>
          
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                Entrando...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <FiLogIn className="mr-2" />
                Entrar
              </span>
            )}
          </button>
          
          <div className="mt-4 text-center text-sm text-gray-400">
            <p>Use as credenciais temporárias:</p>
            <p>Usuário: admin | Senha: admin123</p>
          </div>
        </form>
      </div>
    </div>
  );
} 