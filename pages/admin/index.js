import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      <p className="ml-3 text-gray-400">Redirecionando para o Dashboard...</p>
    </div>
  );
} 