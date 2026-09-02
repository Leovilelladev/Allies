import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ConfirmContext = createContext({
  confirmar: () => Promise.resolve(false),
});

export function ConfirmProvider({ children }) {
  const [modalState, setModalState] = useState(null);
  const resolverRef = useRef(null);

  const confirmar = useCallback((titulo, texto, rotuloOk = 'Confirmar') => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setModalState({ titulo, texto, rotuloOk });
    });
  }, []);

  const handleClose = (resposta) => {
    setModalState(null);
    if (resolverRef.current) {
      resolverRef.current(resposta);
      resolverRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirmar }}>
      {children}
      {modalState && (
        <div
          className="modal-backdrop visible"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose(false);
          }}
        >
          <div className="modal">
            <h3>{modalState.titulo}</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '15px', lineHeight: 1.55, margin: 0 }}>
              {modalState.texto}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-seal"
                style={{ flex: 1 }}
                onClick={() => handleClose(true)}
              >
                {modalState.rotuloOk}
              </button>
              <button
                type="button"
                className="btn-text"
                onClick={() => handleClose(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
