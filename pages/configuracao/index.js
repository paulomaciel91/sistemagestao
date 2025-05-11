import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/context/SupabaseContext';
import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft, FiDatabase, FiServer, FiSettings, FiCloud, FiMessageSquare, FiHardDrive, FiKey, FiShoppingCart } from 'react-icons/fi';
import { FiBriefcase, FiActivity } from 'react-icons/fi';

export default function ConfiguracaoIndex() {
  const router = useRouter();
  const { isInitialized, loading } = useSupabase();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Configurações do Sistema | Sistema de Gestão</title>
      </Head>
      
      <header className="bg-gray-800 shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/dashboard" className="mr-3 text-gray-300 hover:text-white">
              <FiArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Configuração do Supabase */}
          <Link href="/configuracao/supabase" className="bg-gray-800 rounded-lg p-6 shadow-lg hover:bg-gray-750 transition-colors">
            <div className="flex items-center mb-4">
              <div className="bg-primary-500 bg-opacity-20 p-3 rounded-lg mr-4">
                <FiDatabase className="text-primary-400 text-2xl" />
              </div>
              <h2 className="text-xl font-semibold">Supabase</h2>
            </div>
            <p className="text-gray-400">
              Configure as credenciais de acesso ao banco de dados Supabase.
            </p>
          </Link>
          
          {/* Configuração de Webhooks */}
          <Link href="/configuracao/webhooks" className="bg-gray-800 rounded-lg p-6 shadow-lg hover:bg-gray-750 transition-colors">
            <div className="flex items-center mb-4">
              <div className="bg-blue-500 bg-opacity-20 p-3 rounded-lg mr-4">
                <FiBriefcase className="text-blue-400 text-2xl" />
              </div>
              <h2 className="text-xl font-semibold">Webhooks</h2>
            </div>
            <p className="text-gray-400">
              Configure webhooks para integração com o n8n e outros serviços.
            </p>
          </Link>
          
          {/* Configuração de Storage */}
          <Link href="/configuracao/storage" className="bg-gray-800 rounded-lg p-6 shadow-lg hover:bg-gray-750 transition-colors">
            <div className="flex items-center mb-4">
              <div className="bg-green-500 bg-opacity-20 p-3 rounded-lg mr-4">
                <FiHardDrive className="text-green-400 text-2xl" />
              </div>
              <h2 className="text-xl font-semibold">Storage</h2>
            </div>
            <p className="text-gray-400">
              Configure o armazenamento de arquivos e imagens no Supabase Storage.
            </p>
          </Link>
          
          {/* Configuração de Credenciais */}
          <Link href="/configuracao/credenciais" className="bg-gray-800 rounded-lg p-6 shadow-lg hover:bg-gray-750 transition-colors">
            <div className="flex items-center mb-4">
              <div className="bg-yellow-500 bg-opacity-20 p-3 rounded-lg mr-4">
                <FiSettings className="text-yellow-400 text-2xl" />
              </div>
              <h2 className="text-xl font-semibold">Credenciais</h2>
            </div>
            <p className="text-gray-400">
              Gerencie credenciais para serviços externos como gateways de pagamento.
            </p>
          </Link>
          
          {/* Configuração do Agente IA */}
          <Link href="/configuracao/agente-ia" className="bg-gray-800 rounded-lg p-6 shadow-lg hover:bg-gray-750 transition-colors">
            <div className="flex items-center mb-4">
              <div className="bg-purple-500 bg-opacity-20 p-3 rounded-lg mr-4">
                <FiActivity className="text-purple-400 text-2xl" />
              </div>
              <h2 className="text-xl font-semibold">Agente IA</h2>
            </div>
            <p className="text-gray-400">
              Configure o assistente de IA para atendimento via WhatsApp e processamento de mensagens.
            </p>
          </Link>
          
          {/* Resetar Sistema */}
          <Link href="/configuracao/resetar" className="bg-gray-800 rounded-lg p-6 shadow-lg hover:bg-gray-750 transition-colors">
            <div className="flex items-center mb-4">
              <div className="bg-red-500 bg-opacity-20 p-3 rounded-lg mr-4">
                <FiServer className="text-red-400 text-2xl" />
              </div>
              <h2 className="text-xl font-semibold">Resetar Sistema</h2>
            </div>
            <p className="text-gray-400">
              Limpe todos os dados e reconfigure o sistema do zero (use com cuidado).
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
} 