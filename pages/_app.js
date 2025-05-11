import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@/styles/globals.css';
import { SupabaseProvider } from '@/context/SupabaseContext';
import { useState, createContext, useContext, useEffect } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useRouter } from 'next/router';

// Contexto global para o diálogo de confirmação
export const ConfirmContext = createContext(null);

// Hook para usar o contexto de confirmação
export const useConfirmDialog = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmDialog deve ser usado dentro de um ConfirmProvider');
  }
  return context;
};

function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'warning',
    showInput: false,
    inputPlaceholder: '',
    inputValidation: null
  });

  const confirm = ({
    title,
    message,
    onConfirm,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning',
    showInput = false,
    inputPlaceholder = '',
    inputValidation = null
  }) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        onConfirm: (value) => {
          setDialogState(prev => ({
            ...prev,
            isOpen: false
          }));
          setTimeout(() => {
            resolve(value);
            onConfirm?.(value);
          }, 100);
        },
        confirmText,
        cancelText,
        type,
        showInput,
        inputPlaceholder,
        inputValidation
      });
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        onConfirm={dialogState.onConfirm}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        type={dialogState.type}
        showInput={dialogState.showInput}
        inputPlaceholder={dialogState.inputPlaceholder}
        inputValidation={dialogState.inputValidation}
      />
    </ConfirmContext.Provider>
  );
}

function PageTransition({ children }) {
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setPageLoading(true);
    const handleComplete = () => {
      setTimeout(() => {
        setPageLoading(false);
      }, 100);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  // Aplicamos o efeito de transição apenas ao conteúdo, modificando o DOM após renderização
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const applyTransitionEffects = () => {
        // Selecionamos apenas o conteúdo principal para aplicar a transição
        const mainContent = document.querySelector('main');
        const sidebar = document.querySelector('.sidebar-fixed');
        const header = document.querySelector('.header-fixed');
        
        if (mainContent) {
          mainContent.style.opacity = pageLoading ? '0' : '1';
          mainContent.style.transition = 'opacity 300ms ease-in-out';
        }
        
        // Garantimos que a barra lateral e o header permaneçam visíveis durante a transição
        if (sidebar) {
          sidebar.style.opacity = '1';
        }
        
        if (header) {
          header.style.opacity = '1';
        }
      };
      
      applyTransitionEffects();
    }
  }, [pageLoading]);

  // Retornamos o children normalmente, sem o wrapper de estilo
  return children;
}

function MyApp({ Component, pageProps }) {
  return (
    <SupabaseProvider>
      <ConfirmProvider>
        <PageTransition>
          <Component {...pageProps} />
          <ToastContainer position="top-right" autoClose={3000} />
        </PageTransition>
      </ConfirmProvider>
    </SupabaseProvider>
  );
}

export default MyApp; 