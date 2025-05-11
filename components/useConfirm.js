import { useState, useCallback } from 'react';

const useConfirm = () => {
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

  const openConfirm = useCallback(({
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
    setDialogState({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
      type,
      showInput,
      inputPlaceholder,
      inputValidation
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setDialogState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  const handleConfirm = useCallback((value) => {
    dialogState.onConfirm(value);
    closeConfirm();
  }, [dialogState, closeConfirm]);

  return {
    ...dialogState,
    openConfirm,
    closeConfirm,
    handleConfirm
  };
};

export default useConfirm; 