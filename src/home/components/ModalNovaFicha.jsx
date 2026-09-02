import { useState, useRef, useEffect } from 'react';
import { RETRATOS_CLASSES, obterRetratoPorClasse, redimensionarImagem } from '../../shared';

const CLASSES_DD = [
  'Guerreiro',
  'Mago',
  'Ladino',
  'Clérigo',
  'Bárbaro',
  'Bardo',
  'Paladino',
  'Bruxo',
  'Monge',
  'Patrulheiro',
  'Druida',
  'Feiticeiro',
  'Artífice',
  'Outra / Personalizada',
];

const RACAS_DD = [
  'Humano',
  'Alto Elfo',
  'Elfo da Floresta',
  'Elfo Negro (Drow)',
  'Anão da Colina',
  'Anão da Montanha',
  'Halfling Pés-Leves',
  'Draconato',
  'Gnomo da Floresta',
  'Gnomo das Rochas',
  'Meio-Elfo',
  'Meio-Orc',
  'Tiefling',
  'Aasimar',
  'Goliath',
  'Outra / Personalizada',
];

const ANTECEDENTES_DD = [
  'Acólito',
  'Artesão de Guilda',
  'Charlatão',
  'Criminoso / Bandido',
  'Eremita',
  'Forasteiro / Nômade',
  'Herói do Povo',
  'Marinheiro',
  'Nobre',
  'Órfão',
  'Sábio / Erudito',
  'Soldado / Veterano',
  'Outro',
];

const ALINHAMENTOS_DD = [
  'Leal e Bom',
  'Neutro e Bom',
  'Caótico e Bom',
  'Leal e Neutro',
  'Neutro Puro',
  'Caótico e Neutro',
  'Leal e Mau',
  'Neutro e Mau',
  'Caótico e Mau',
];

export default function ModalNovaFicha({ campanhas = [], campanhaPadraoId, onCriar, onCancelar }) {
  const [nome, setNome] = useState('');
  const [campanhaId, setCampanhaId] = useState(campanhaPadraoId || (campanhas[0]?.id || ''));
  const [classe, setClasse] = useState('Guerreiro');
  const [subclasse, setSubclasse] = useState('');
  const [raca, setRaca] = useState('Humano');
  const [nivel, setNivel] = useState(1);
  const [antecedente, setAntecedente] = useState('Herói do Povo');
  const [alinhamento, setAlinhamento] = useState('Neutro e Bom');
  
  // Imagem do Personagem (Avatar / Token)
  const [avatarUrl, setAvatarUrl] = useState(() => obterRetratoPorClasse('Guerreiro'));
  const [customUpload, setCustomUpload] = useState(false);
  const fileInputRef = useRef(null);

  // Atualiza o avatar padrão quando a classe muda, a menos que o usuário tenha enviado uma foto personalizada
  const handleClasseChange = (novaClasse) => {
    setClasse(novaClasse);
    if (!customUpload) {
      setAvatarUrl(obterRetratoPorClasse(novaClasse));
    }
  };

  const handleUploadFoto = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await redimensionarImagem(file, 500, 500, 0.88);
        setAvatarUrl(dataUrl);
        setCustomUpload(true);
      } catch (err) {
        console.error('Erro ao redimensionar avatar:', err);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const n = Number(nivel) || 1;
    const conMod = 2; // mod padrão con 14
    const pvInicial = 10 + (n - 1) * 6 + conMod * n;

    onCriar({
      nome: nome.trim(),
      raca,
      classe,
      subclasse: subclasse.trim() || null,
      nivel: n,
      antecedente,
      alinhamento,
      campanhaId: campanhaId || null,
      avatar_url: avatarUrl,
      token_url: avatarUrl,
      background_url: avatarUrl,
      dadosIniciais: {
        avatar_url: avatarUrl,
        token_url: avatarUrl,
        pv_total: pvInicial,
        pv_atual: pvInicial,
        pvTemp: 0,
        ca: 14,
        deslocamento: '30ft',
        iniciativa: 2,
        profBonus: Math.floor((n - 1) / 4) + 2,
        for: 15,
        des: 14,
        con: 14,
        int: 10,
        sab: 12,
        car: 8,
        pericias: {
          atletismo: true,
          percepcao: true,
        },
        ataques: [
          {
            id: 1,
            nome: 'Espada Longa',
            tipo: 'Ataque',
            acerto: '+4',
            dano: '1d8+2',
            tipoDano: 'Cortante',
            desc: 'Ataque corpo a corpo marcial. Versátil (1d10).',
          },
        ],
        moedas: { pc: 0, pp: 5, pe: 0, po: 25, pl: 0 },
        equipamento: 'Armadura de Cota de Malha, Escudo, Pacote de Explorador.',
        tracos: 'Determinado e corajoso.',
        historia: '',
      },
    });
  };

  return (
    <div
      className="wizard-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div className="wizard-modal-container" style={{ maxWidth: '680px' }}>
        {/* Input oculto para upload de imagem */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleUploadFoto}
        />

        {/* Cabeçalho do Modal */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div className="wizard-sparkle-circle">
            <span className="material-symbols-outlined text-2xl">swords</span>
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '28px',
              color: 'var(--color-primary)',
              margin: '0 0 6px',
            }}
          >
            Novo Personagem
          </h3>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', margin: 0 }}>
            Invoque um herói com retrato personalizado e atributos completos.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="wizard-form-body">
          {/* Seção de Retrato / Imagem do Personagem */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 16px',
              background: 'rgba(4, 14, 34, 0.6)',
              borderRadius: '10px',
              border: '1px solid rgba(226, 195, 132, 0.25)',
              marginBottom: '16px',
            }}
          >
            {/* Preview do Avatar com Borda Dourada */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                border: '2px solid var(--color-surface-tint)',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(229, 197, 135, 0.35)',
                background: '#081327',
              }}
            >
              <img
                src={avatarUrl}
                alt="Retrato do Herói"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                Retrato do Personagem
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>
                {customUpload ? 'Imagem personalizada carregada.' : `Retrato temático da classe ${classe}.`}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="nexus-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-symbols-outlined text-[14px]">add_a_photo</span>
                  <span>Carregar Foto</span>
                </button>

                {customUpload && (
                  <button
                    type="button"
                    className="nexus-icon-btn"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                    onClick={() => {
                      setCustomUpload(false);
                      setAvatarUrl(obterRetratoPorClasse(classe));
                    }}
                    title="Restaurar Retrato da Classe"
                  >
                    <span className="material-symbols-outlined text-sm">restart_alt</span>
                    <span style={{ fontSize: '11px', marginLeft: '4px' }}>Padrão</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="wizard-field">
            <label htmlFor="char-nome">Nome do Personagem</label>
            <input
              type="text"
              id="char-nome"
              className="wizard-input-highlight"
              placeholder="Ex: Valerius Starfall, Thorgar Barbaférrea..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoFocus
            />
          </div>

          {campanhas.length > 0 && (
            <div className="wizard-field">
              <label htmlFor="char-campanha">Campanha Vinculada</label>
              <select
                id="char-campanha"
                className="wizard-select"
                value={campanhaId}
                onChange={(e) => setCampanhaId(e.target.value)}
              >
                {campanhas.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏰 {c.titulo || c.nome} ({c.sistema || 'D&D 5E'})
                  </option>
                ))}
                <option value="">⚔️ Herói Avulso (Sem campanha)</option>
              </select>
            </div>
          )}

          <div className="wizard-row-split">
            <div className="wizard-field" style={{ flex: 1.2 }}>
              <label htmlFor="char-classe">Classe</label>
              <select
                id="char-classe"
                className="wizard-select"
                value={classe}
                onChange={(e) => handleClasseChange(e.target.value)}
              >
                {CLASSES_DD.map((cl) => (
                  <option key={cl} value={cl}>
                    {cl}
                  </option>
                ))}
              </select>
            </div>

            <div className="wizard-field" style={{ flex: 1 }}>
              <label htmlFor="char-subclasse">Subclasse (Opcional)</label>
              <input
                type="text"
                id="char-subclasse"
                className="wizard-input"
                placeholder="Ex: Campeão, Evocação..."
                value={subclasse}
                onChange={(e) => setSubclasse(e.target.value)}
              />
            </div>

            <div className="wizard-field" style={{ width: '85px', flex: 'none' }}>
              <label htmlFor="char-nivel">Nível</label>
              <input
                type="number"
                id="char-nivel"
                className="wizard-input"
                style={{ padding: '12px 8px', textAlign: 'center' }}
                min="1"
                max="20"
                value={nivel}
                onChange={(e) => setNivel(e.target.value)}
              />
            </div>
          </div>

          <div className="wizard-row-split">
            <div className="wizard-field" style={{ flex: 1 }}>
              <label htmlFor="char-raca">Raça</label>
              <select
                id="char-raca"
                className="wizard-select"
                value={raca}
                onChange={(e) => setRaca(e.target.value)}
              >
                {RACAS_DD.map((rc) => (
                  <option key={rc} value={rc}>
                    {rc}
                  </option>
                ))}
              </select>
            </div>

            <div className="wizard-field" style={{ flex: 1 }}>
              <label htmlFor="char-antecedente">Antecedente</label>
              <select
                id="char-antecedente"
                className="wizard-select"
                value={antecedente}
                onChange={(e) => setAntecedente(e.target.value)}
              >
                {ANTECEDENTES_DD.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="wizard-field">
            <label htmlFor="char-alinhamento">Alinhamento Moral</label>
            <select
              id="char-alinhamento"
              className="wizard-select"
              value={alinhamento}
              onChange={(e) => setAlinhamento(e.target.value)}
            >
              {ALINHAMENTOS_DD.map((al) => (
                <option key={al} value={al}>
                  {al}
                </option>
              ))}
            </select>
          </div>

          {/* Rodapé de Ações */}
          <div className="wizard-modal-footer">
            <button type="button" className="wizard-btn-cancel" onClick={onCancelar}>
              CANCELAR
            </button>

            <button type="submit" className="gold-gradient-btn wizard-btn-next">
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              <span>CRIAR PERSONAGEM</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


