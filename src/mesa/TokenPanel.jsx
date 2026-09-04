import { useState } from 'react';
import { CONDICOES } from './condicoes';
import { OPCOES_LUZ } from './constantes';

export default function TokenPanel({
  token,
  ehMestre,
  podeEditar,
  fichas,
  fogAtivo,
  visaoDinamica,
  onAtualizar,
  onAlterarDados,
  onDano,
  onRemover,
  onRolarAtaque,
  onEnviarImagem,
  onCamada,
  enviandoImagem,
}) {
  const [ajuste, setAjuste] = useState('');
  const [secao, setSecao] = useState('combate'); // combate | ajustes
  const [novoAtaque, setNovoAtaque] = useState(null);

  if (!token) {
    return (
      <p className="dock-vazio">
        Nenhum token selecionado. Clique num token do mapa para ver e editar os detalhes dele aqui.
      </p>
    );
  }

  const dados = token.dadosRaw || {};
  const condicoes = Array.isArray(dados.condicoes) ? dados.condicoes : [];
  const ataques = Array.isArray(dados.ataques) ? dados.ataques : [];
  const temFicha = !!token.fichaId;
  const pvMax = token.pvTotal || 0;
  const pvAtual = token.pvAtual || 0;
  const pct = pvMax ? Math.max(0, Math.min(100, (pvAtual / pvMax) * 100)) : 0;
  const estado = pct <= 25 ? 'critico' : pct <= 50 ? 'ferido' : 'ok';

  const aplicar = (sinal) => {
    const valor = Math.abs(parseInt(ajuste, 10) || 0);
    if (!valor) return;
    onDano(token.id, sinal * valor);
    setAjuste('');
  };

  const alternarCondicao = (id) => {
    const proximas = condicoes.includes(id) ? condicoes.filter((c) => c !== id) : [...condicoes, id];
    onAlterarDados(token.id, { condicoes: proximas });
  };

  const definirVida = (campo, valor) => {
    const n = Math.max(0, Number(valor) || 0);
    const pv = { atual: pvAtual, max: pvMax, ...(dados.pv || {}) };
    onAlterarDados(token.id, { pv: { ...pv, [campo]: n } });
  };

  const salvarAtaque = () => {
    const nome = (novoAtaque?.nome || '').trim();
    if (!nome) return;
    const item = {
      id: novoAtaque.id || `at-${Date.now()}`,
      nome,
      bonus: Number(novoAtaque.bonus) || 0,
      dano: (novoAtaque.dano || '').trim(),
      tipo: (novoAtaque.tipo || '').trim(),
    };
    const lista = novoAtaque.id ? ataques.map((a) => (a.id === item.id ? item : a)) : [...ataques, item];
    onAlterarDados(token.id, { ataques: lista });
    setNovoAtaque(null);
  };

  return (
    <div className="token-painel">
      <div className="token-painel-topo">
        <div
          className="token-painel-avatar"
          style={
            token.imagemUrl ? { backgroundImage: `url(${token.imagemUrl})` } : { background: token.color }
          }
        />
        <div className="token-painel-identidade">
          <input
            className="token-painel-nome"
            value={token.label}
            onChange={(e) => onAtualizar(token.id, { label: e.target.value }, { nome: e.target.value })}
            placeholder="Nome do token"
            readOnly={!podeEditar}
          />
          <span className="token-painel-tipo">
            {temFicha ? 'ficha vinculada' : pvMax ? 'criatura da mesa' : 'token simples'}
          </span>
        </div>
      </div>

      <div className="token-painel-abas">
        {[
          { id: 'combate', rotulo: 'Combate' },
          { id: 'ajustes', rotulo: 'Ajustes' },
        ].map((a) => (
          <button
            key={a.id}
            className={`ficha-aba ${secao === a.id ? 'is-ativa' : ''}`}
            onClick={() => setSecao(a.id)}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {secao === 'combate' && (
        <div className="token-painel-corpo">
          {/* Vida */}
          <div className="ficha-pv">
            <div className="ficha-pv-cabecalho">
              <span className="vital-rotulo">Pontos de vida</span>
              {pvMax > 0 ? (
                <span className={`ficha-pv-numeros is-${estado}`}>
                  {pvAtual}
                  <small> / {pvMax}</small>
                </span>
              ) : (
                <span className="vital-rotulo">sem vida definida</span>
              )}
            </div>

            {podeEditar && pvMax > 0 && (
              <div className="ficha-pv-barra">
                <div className={`ficha-pv-preenchimento is-${estado}`} style={{ width: `${pct}%` }} />
              </div>
            )}

            {pvMax > 0 && (
              <div className="ficha-pv-controles">
                <button className="mesa-btn mesa-btn--dano" onClick={() => aplicar(1)}>
                  Dano
                </button>
                <input
                  value={ajuste}
                  onChange={(e) => setAjuste(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') aplicar(e.shiftKey ? -1 : 1);
                  }}
                  placeholder="0"
                  inputMode="numeric"
                />
                <button className="mesa-btn mesa-btn--cura" onClick={() => aplicar(-1)}>
                  Cura
                </button>
              </div>
            )}

            {!temFicha && ehMestre && (
              <div className="token-vida-definir">
                <label>
                  <span>PV atual</span>
                  <input type="number" min="0" value={pvAtual} onChange={(e) => definirVida('atual', e.target.value)} />
                </label>
                <label>
                  <span>PV máximo</span>
                  <input type="number" min="0" value={pvMax} onChange={(e) => definirVida('max', e.target.value)} />
                </label>
                <label>
                  <span>CA</span>
                  <input
                    type="number"
                    min="0"
                    value={dados.ca ?? ''}
                    onChange={(e) => onAlterarDados(token.id, { ca: Number(e.target.value) || 0 })}
                  />
                </label>
              </div>
            )}
            {temFicha && (
              <p className="token-nota">A vida vem da ficha vinculada — dano e cura aqui alteram a ficha.</p>
            )}
          </div>

          {/* Condições */}
          <div className="token-secao">
            <span className="ficha-secao-rotulo">Condições</span>
            <div className="condicoes-grade">
              {CONDICOES.map((c) => (
                <button
                  key={c.id}
                  className={`condicao ${condicoes.includes(c.id) ? 'is-ativa' : ''}`}
                  style={condicoes.includes(c.id) ? { borderColor: `#${c.cor.toString(16).padStart(6, '0')}` } : undefined}
                  onClick={() => alternarCondicao(c.id)}
                  disabled={!podeEditar}
                  title={c.nome}
                >
                  <span
                    className="condicao-ponto"
                    style={{ background: `#${c.cor.toString(16).padStart(6, '0')}` }}
                  />
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Ataques do monstro */}
          {ehMestre && !temFicha && (
            <div className="token-secao">
              <span className="ficha-secao-rotulo">Ataques</span>
              {ataques.length === 0 && !novoAtaque && (
                <p className="dock-vazio">Sem ataques. Adicione para rolar direto pelo token.</p>
              )}
              <div className="ficha-acoes">
                {ataques.map((a) => (
                  <div key={a.id} className="token-ataque">
                    <button className="acao" onClick={() => onRolarAtaque(token, a)}>
                      <span className="acao-nome">{a.nome}</span>
                      <span className="acao-detalhes">
                        <em>{a.bonus >= 0 ? `+${a.bonus}` : a.bonus} acerto</em>
                        {a.dano && <em>{a.dano} dano</em>}
                        {a.tipo && <em>{a.tipo}</em>}
                      </span>
                    </button>
                    <div className="token-ataque-controles">
                      <button className="mesa-icone-btn" onClick={() => setNovoAtaque({ ...a })} title="Editar">
                        ✎
                      </button>
                      <button
                        className="mesa-icone-btn"
                        onClick={() => onAlterarDados(token.id, { ataques: ataques.filter((x) => x.id !== a.id) })}
                        title="Remover"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {novoAtaque ? (
                <div className="item-novo">
                  <input
                    autoFocus
                    placeholder="Nome do ataque"
                    value={novoAtaque.nome || ''}
                    onChange={(e) => setNovoAtaque((n) => ({ ...n, nome: e.target.value }))}
                  />
                  <div className="item-novo-linha">
                    <input
                      type="number"
                      placeholder="Bônus"
                      value={novoAtaque.bonus ?? ''}
                      onChange={(e) => setNovoAtaque((n) => ({ ...n, bonus: e.target.value }))}
                    />
                    <input
                      placeholder="Dano (1d8+2)"
                      value={novoAtaque.dano || ''}
                      onChange={(e) => setNovoAtaque((n) => ({ ...n, dano: e.target.value }))}
                    />
                    <input
                      placeholder="Tipo"
                      value={novoAtaque.tipo || ''}
                      onChange={(e) => setNovoAtaque((n) => ({ ...n, tipo: e.target.value }))}
                    />
                  </div>
                  <div className="ficha-nova-acoes">
                    <button className="mesa-btn mesa-btn--primario" onClick={salvarAtaque}>
                      Salvar
                    </button>
                    <button className="mesa-btn" onClick={() => setNovoAtaque(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button className="mesa-btn mesa-btn--largo" onClick={() => setNovoAtaque({ bonus: 0 })}>
                  + Ataque
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {secao === 'ajustes' && !podeEditar && (
        <p className="dock-vazio">
          Você pode consultar este token, mas somente o dono ou o mestre pode alterá-lo.
        </p>
      )}

      {secao === 'ajustes' && podeEditar && (
        <div className="token-painel-corpo">
          <label className="modal-campo">
            <span>Ficha vinculada</span>
            <select
              className="mesa-select"
              value={token.fichaId || ''}
              onChange={(e) =>
                onAtualizar(
                  token.id,
                  { fichaId: e.target.value ? Number(e.target.value) : null },
                  { personagem_id: e.target.value ? Number(e.target.value) : null }
                )
              }
            >
              <option value="">Sem ficha (criatura da mesa)</option>
              {fichas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="token-secao">
            <span className="ficha-secao-rotulo">Imagem</span>
            <div className="token-imagem-acoes">
              <button className="mesa-btn" onClick={onEnviarImagem} disabled={enviandoImagem}>
                {enviandoImagem ? 'Enviando…' : 'Enviar imagem'}
              </button>
              {token.imagemUrl && (
                <button
                  className="mesa-btn"
                  onClick={() => onAtualizar(token.id, { imagemUrl: null }, { imagem_url: null })}
                >
                  Tirar imagem
                </button>
              )}
            </div>
          </div>

          {fogAtivo && visaoDinamica && (
            <label className="modal-campo">
              <span>Luz que carrega</span>
              <select
                className="mesa-select"
                value={token.luz || 0}
                onChange={(e) => onAlterarDados(token.id, { luz: Number(e.target.value) || 0 })}
              >
                {OPCOES_LUZ.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="token-secao">
            <span className="ficha-secao-rotulo">Camada</span>
            <div className="token-imagem-acoes">
              <button className="mesa-btn" onClick={() => onCamada('frente')}>
                ↑ Trazer pra frente
              </button>
              <button className="mesa-btn" onClick={() => onCamada('atras')}>
                ↓ Mandar pra trás
              </button>
            </div>
          </div>

          <button className="mesa-btn mesa-btn--largo mesa-btn--perigo" onClick={onRemover}>
            Remover token
          </button>
        </div>
      )}
    </div>
  );
}
