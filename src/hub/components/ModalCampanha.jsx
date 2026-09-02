import { useState, useEffect, useRef } from 'react';

const SISTEMAS_DISPONIVEIS = [
  'D&D 5E',
  'Pathfinder 2e',
  'Tormenta20',
  'Ordem Paranormal',
  'Call of Cthulhu',
  'Vampiro: A Máscara',
  'Sistema Próprio / Outro',
];

export default function ModalCampanha({ campanha, onSalvar, onCancelar }) {
  const [passo, setPasso] = useState(1); // 1: Básicos, 2: Convite

  // Dados da Campanha
  const [nome, setNome] = useState('');
  const [sistema, setSistema] = useState('D&D 5E');
  const [visibilidade, setVisibilidade] = useState('publica'); // 'publica' | 'privada'
  const [desc, setDesc] = useState('');
  const [capaPreview, setCapaPreview] = useState(null);

  // Convidados no Passo 2
  const [convidadoInput, setConvidadoInput] = useState('');
  const [jogadoresConvidados, setJogadoresConvidados] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (campanha) {
      setNome(campanha.titulo || campanha.nome || '');
      setSistema(campanha.sistema || 'D&D 5E');
      setDesc(campanha.descricao || '');
      setVisibilidade(campanha.visibilidade || 'publica');
      setCapaPreview(campanha.imagem_capa_url || null);
    } else {
      setNome('');
      setSistema('D&D 5E');
      setVisibilidade('publica');
      setDesc('');
      setCapaPreview(null);
      setJogadoresConvidados([]);
    }
  }, [campanha]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapaPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdicionarConvidado = (e) => {
    e.preventDefault();
    const user = convidadoInput.trim().replace(/^@/, '');
    if (user && !jogadoresConvidados.includes(user)) {
      setJogadoresConvidados([...jogadoresConvidados, user]);
      setConvidadoInput('');
    }
  };

  const handleRemoverConvidado = (user) => {
    setJogadoresConvidados(jogadoresConvidados.filter((u) => u !== user));
  };

  const handleAvancarOuSalvar = (e) => {
    e.preventDefault();
    if (passo === 1) {
      if (!nome.trim()) return;
      setPasso(2);
    } else {
      // Salvar campanha
      onSalvar({
        id: campanha?.id,
        titulo: nome.trim(),
        nome: nome.trim(),
        sistema: sistema.trim(),
        descricao: desc.trim(),
        visibilidade,
        imagem_capa_url: capaPreview,
        jogadores: jogadoresConvidados,
      });
    }
  };

  return (
    <div
      className="wizard-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div className="wizard-modal-container">
        <div className="hextech-corner-accent top-left" />
        <div className="hextech-corner-accent top-right" />
        <div className="hextech-corner-accent bottom-left" />
        <div className="hextech-corner-accent bottom-right" />

        {/* Indicador Superior de Passos (1 Básicos -> 2 Convite) */}
        <div className="wizard-steps-header">
          <div
            className={`wizard-step-item ${passo >= 1 ? 'active' : ''}`}
            onClick={() => setPasso(1)}
          >
            <div className="wizard-step-circle">1</div>
            <span className="wizard-step-label">BÁSICOS</span>
          </div>

          <div className={`wizard-step-line ${passo === 2 ? 'active' : ''}`} />

          <div
            className={`wizard-step-item ${passo === 2 ? 'active' : ''}`}
            onClick={() => {
              if (nome.trim()) setPasso(2);
            }}
          >
            <div className="wizard-step-circle">2</div>
            <span className="wizard-step-label">CONVITE</span>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleAvancarOuSalvar} className="wizard-form-body">
          {/* PASSO 1: BÁSICOS */}
          {passo === 1 && (
            <div className="wizard-step-grid">
              {/* Coluna da Esquerda */}
              <div className="wizard-left-col">
                {/* Nome da Campanha */}
                <div className="wizard-field">
                  <label htmlFor="camp-nome">Nome da Campanha</label>
                  <input
                    type="text"
                    id="camp-nome"
                    className="wizard-input-highlight"
                    placeholder="Insira o nome da sua epopeia..."
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* Sistema e Visibilidade lado a lado */}
                <div className="wizard-row-split">
                  {/* Sistema de Jogo */}
                  <div className="wizard-field" style={{ flex: 1 }}>
                    <label htmlFor="camp-sistema">Sistema de Jogo</label>
                    <select
                      id="camp-sistema"
                      className="wizard-select"
                      value={sistema}
                      onChange={(e) => setSistema(e.target.value)}
                    >
                      {SISTEMAS_DISPONIVEIS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Visibilidade do Reino */}
                  <div className="wizard-field" style={{ flex: 1.1 }}>
                    <label>Visibilidade do Reino</label>
                    <div className="wizard-visibilidade-toggle">
                      <button
                        type="button"
                        className={`wizard-vis-btn ${visibilidade === 'publica' ? 'active' : ''}`}
                        onClick={() => setVisibilidade('publica')}
                      >
                        <span className="material-symbols-outlined text-[18px]">public</span>
                        <span>Pública</span>
                      </button>

                      <button
                        type="button"
                        className={`wizard-vis-btn ${visibilidade === 'privada' ? 'active' : ''}`}
                        onClick={() => setVisibilidade('privada')}
                      >
                        <span className="material-symbols-outlined text-[18px]">lock</span>
                        <span>Privada</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lore & Descrição */}
                <div className="wizard-field">
                  <label htmlFor="camp-desc">Lore & Descrição</label>
                  <textarea
                    id="camp-desc"
                    className="wizard-textarea"
                    rows={4}
                    placeholder="Descreva os mistérios e perigos que aguardam os aventureiros..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                </div>
              </div>

              {/* Coluna da Direita: Capa da Campanha */}
              <div className="wizard-right-col">
                <div className="wizard-field" style={{ height: '100%' }}>
                  <label>Capa da Campanha</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/png, image/jpeg, image/webp"
                    style={{ display: 'none' }}
                  />

                  <div
                    className={`wizard-upload-dropzone ${capaPreview ? 'has-image' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {capaPreview ? (
                      <div className="wizard-upload-preview">
                        <img src={capaPreview} alt="Prévia da Capa" />
                        <div className="wizard-preview-overlay">
                          <span className="material-symbols-outlined text-2xl">photo_camera</span>
                          <span>Trocar imagem</span>
                        </div>
                      </div>
                    ) : (
                      <div className="wizard-upload-empty">
                        <div className="wizard-sparkle-circle">
                          <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                        </div>
                        <p className="wizard-upload-title">
                          Arraste uma imagem ou clique para invocar
                        </p>
                        <p className="wizard-upload-sub">JPEG, PNG ou WEBP (Max 5MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2: CONVITE */}
          {passo === 2 && (
            <div className="wizard-step-invite">
              <div className="wizard-invite-header">
                <h4 className="wizard-invite-title">Convocar Aventureiros</h4>
                <p className="wizard-invite-sub">
                  Adicione amigos para participar da campanha ou compartilhe o reino.
                </p>
              </div>

              <div className="wizard-invite-search-box">
                <div className="wizard-input-wrap">
                  <span className="material-symbols-outlined">person_add</span>
                  <input
                    type="text"
                    className="wizard-input"
                    placeholder="Nome de usuário do jogador..."
                    value={convidadoInput}
                    onChange={(e) => setConvidadoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdicionarConvidado(e);
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="gold-gradient-btn wizard-btn-add"
                  onClick={handleAdicionarConvidado}
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Convidar</span>
                </button>
              </div>

              {/* Lista de Jogadores Convidados */}
              <div className="wizard-invited-list">
                {jogadoresConvidados.length === 0 ? (
                  <div className="wizard-empty-invited">
                    <span className="material-symbols-outlined text-3xl text-secondary/60">group</span>
                    <p>Nenhum jogador adicionado ainda. Você também pode convidar mais tarde.</p>
                  </div>
                ) : (
                  jogadoresConvidados.map((user) => (
                    <div key={user} className="wizard-invited-chip">
                      <div className="wizard-chip-avatar">
                        {user.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="wizard-chip-name">@{user}</span>
                      <button
                        type="button"
                        className="wizard-chip-remove"
                        onClick={() => handleRemoverConvidado(user)}
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="wizard-modal-footer">
            {passo === 1 ? (
              <button type="button" className="wizard-btn-cancel" onClick={onCancelar}>
                CANCELAR
              </button>
            ) : (
              <button
                type="button"
                className="wizard-btn-cancel"
                onClick={() => setPasso(1)}
              >
                ← VOLTAR
              </button>
            )}

            <button type="submit" className="gold-gradient-btn wizard-btn-next">
              <span>{passo === 1 ? 'PRÓXIMO PASSO' : (campanha ? 'SALVAR ALTERAÇÕES' : 'CRIAR CAMPANHA')}</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
