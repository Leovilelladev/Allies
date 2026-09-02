import { useState } from 'react';

export default function ModalNome({ titulo, rotulo, valorInicial, onConfirmar, onCancelar }) {
  const [valor, setValor] = useState(valorInicial || '');

  return (
    <div
      className="mesa-modal-fundo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <form
        className="mesa-modal"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirmar(valor);
        }}
      >
        <h2>{titulo}</h2>
        <label>
          {rotulo}
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            autoFocus
          />
        </label>
        <div className="mesa-modal-acoes">
          <button className="mesa-btn mesa-btn--ativo" type="submit">
            Criar
          </button>
          <button className="mesa-btn" type="button" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
