import { useState, useEffect, Fragment } from 'react';
import { FiAlertTriangle, FiInfo, FiX, FiCheck } from 'react-icons/fi';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "warning", // warning, danger, info, success
  showInput = false,
  inputPlaceholder = "",
  inputValidation = null
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setInputValue("");
      setInputError("");
      // Bloquear o scroll da página quando o modal está aberto
      document.body.style.overflow = 'hidden';
    } else {
      // Definir um pequeno atraso para a animação de saída
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Restaurar o scroll da página quando o modal é fechado
        document.body.style.overflow = 'auto';
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  const handleConfirm = () => {
    if (showInput && inputValidation) {
      const validationResult = inputValidation(inputValue);
      if (validationResult !== true) {
        setInputError(validationResult || "Valor inválido");
        return;
      }
    }
    
    onConfirm(showInput ? inputValue : true);
  };

  const typeClasses = {
    warning: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      border: "border-amber-300 dark:border-amber-700",
      icon: <FiAlertTriangle className="h-6 w-6 text-amber-500" />,
      button: "bg-amber-500 hover:bg-amber-600 text-white",
    },
    danger: {
      bg: "bg-red-100 dark:bg-red-900/30",
      border: "border-red-300 dark:border-red-700",
      icon: <FiAlertTriangle className="h-6 w-6 text-red-500" />,
      button: "bg-red-600 hover:bg-red-700 text-white",
    },
    info: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      border: "border-blue-300 dark:border-blue-700",
      icon: <FiInfo className="h-6 w-6 text-blue-500" />,
      button: "bg-blue-500 hover:bg-blue-600 text-white",
    },
    success: {
      bg: "bg-green-100 dark:bg-green-900/30",
      border: "border-green-300 dark:border-green-700",
      icon: <FiCheck className="h-6 w-6 text-green-500" />,
      button: "bg-green-500 hover:bg-green-600 text-white",
    },
  };

  const classes = typeClasses[type] || typeClasses.warning;

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all ${classes.bg} border ${classes.border}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {classes.icon}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                {title}
              </h3>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {message}
            </p>

            {showInput && (
              <div className="mt-4">
                <input
                  type="text"
                  className={`w-full px-3 py-2 text-gray-700 dark:text-gray-300 border rounded-md focus:outline-none focus:ring-2 ${
                    inputError
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                  } bg-white dark:bg-gray-700`}
                  placeholder={inputPlaceholder}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setInputError("");
                  }}
                />
                {inputError && (
                  <p className="mt-1 text-sm text-red-500">{inputError}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              onClick={onClose}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`inline-flex justify-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${classes.button}`}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default ConfirmDialog; 