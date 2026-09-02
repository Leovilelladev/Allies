import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext({
  toast: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((mensagem, tipo = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => {
          const icone = t.tipo === 'erro' ? '✕' : t.tipo === 'sucesso' ? '✓' : '→';
          return (
            <div
              key={t.id}
              className={`toast ${t.tipo === 'erro' ? 'toast-erro' : t.tipo === 'sucesso' ? 'toast-sucesso' : ''}`}
            >
              <span className="toast-icon">{icone}</span>
              <span>{t.mensagem}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
