import { useCallback, useEffect, useState } from 'react';
import { sb } from '../shared/supabaseClient';
import { rolarD20, enviarRolagem } from './rolagem';

function ordenar(lista) {
  return [...lista].sort((a, b) => b.valor - a.valor || new Date(a.criado_em) - new Date(b.criado_em));
}

export default function IniciativaPanel({ cenaId, userId, autorNome, ehMestre }) {
  const [combatentes, setCombatentes] = useState([]);
  const [turnoAtualId, setTurnoAtualId] = useState(null);
  const [rodada, setRodada] = useState(1);
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');

  useEffect(() => {
    let ativo = true;
    if (!cenaId) return;

    async function carregar() {
      const [{ data: lista, error: erroLista }, { data: cena }] = await Promise.all([
        sb.from('mesa_iniciativa').select('*').eq('cena_id', cenaId),
        sb.from('mesa_cenas').select('iniciativa_atual_id, iniciativa_rodada').eq('id', cenaId).maybeSingle(),
      ]);
      if (!ativo) return;
      if (!erroLista) setCombatentes(ordenar(lista ?? []));
      if (cena) {
        setTurnoAtualId(cena.iniciativa_atual_id);
        setRodada(cena.iniciativa_rodada || 1);
      }
    }
    carregar();

    const canal = sb
      .channel(`mesa-iniciativa-${cenaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mesa_iniciativa', filter: `cena_id=eq.${cenaId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setCombatentes((prev) => prev.filter((c) => c.id !== payload.old.id));
            return;
          }
          setCombatentes((prev) => {
            const sem = prev.filter((c) => c.id !== payload.new.id);
            return ordenar([...sem, payload.new]);
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mesa_cenas', filter: `id=eq.${cenaId}` },
        (payload) => {
          setTurnoAtualId(payload.new.iniciativa_atual_id);
          setRodada(payload.new.iniciativa_rodada || 1);
        }
      )
      .subscribe();

    return () => {
      ativo = false;
      sb.removeChannel(canal);
    };
  }, [cenaId]);

  const adicionar = useCallback(
    async (e) => {
      e.preventDefault();
      const nomeLimpo = nome.trim() || autorNome;
      const valorNumero = parseInt(valor, 10);
      if (Number.isNaN(valorNumero)) return;
      const { error } = await sb
        .from('mesa_iniciativa')
        .insert({ cena_id: cenaId, nome: nomeLimpo, valor: valorNumero, criado_por: userId });
      if (error) console.error('Falha ao adicionar na iniciativa:', error.message);
      setNome('');
      setValor('');
    },
    [cenaId, userId, autorNome, nome, valor]
  );

  const rolarEntrar = useCallback(async () => {
    const nomeLimpo = nome.trim() || autorNome;
    const r = rolarD20({ bonus: 0 });
    await enviarRolagem({
      cenaId,
      userId,
      autorNome: nomeLimpo,
      payload: { categoria: 'iniciativa', titulo: 'Iniciativa', d20: r },
    });
    const { error } = await sb
      .from('mesa_iniciativa')
      .insert({ cena_id: cenaId, nome: nomeLimpo, valor: r.total, criado_por: userId });
    if (error) console.error('Falha ao entrar na iniciativa:', error.message);
    setNome('');
  }, [cenaId, userId, autorNome, nome]);

  const remover = useCallback((id) => {
    sb.from('mesa_iniciativa')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('Falha ao remover da iniciativa:', error.message);
      });
  }, []);

  const avancarTurno = useCallback(() => {
    if (!combatentes.length) return;
    const idx = combatentes.findIndex((c) => c.id === turnoAtualId);
    const proximo = idx === -1 ? 0 : (idx + 1) % combatentes.length;
    const viraRodada = idx !== -1 && proximo === 0;
    sb.from('mesa_cenas')
      .update({
        iniciativa_atual_id: combatentes[proximo].id,
        iniciativa_rodada: viraRodada ? rodada + 1 : rodada,
      })
      .eq('id', cenaId)
      .then(({ error }) => {
        if (error) console.error('Falha ao avançar turno:', error.message);
      });
  }, [combatentes, turnoAtualId, rodada, cenaId]);

  const encerrar = useCallback(() => {
    sb.from('mesa_iniciativa').delete().eq('cena_id', cenaId).then(({ error }) => {
      if (error) console.error('Falha ao limpar iniciativa:', error.message);
    });
    sb.from('mesa_cenas')
      .update({ iniciativa_atual_id: null, iniciativa_rodada: 1 })
      .eq('id', cenaId)
      .then(({ error }) => {
        if (error) console.error('Falha ao resetar turno:', error.message);
      });
  }, [cenaId]);

  const atual = combatentes.find((c) => c.id === turnoAtualId);

  return (
    <div className="iniciativa">
      <div className="iniciativa-topo">
        <div>
          <span className="dock-rotulo">Rodada</span>
          <span className="iniciativa-rodada">{rodada}</span>
        </div>
        {atual && (
          <div className="iniciativa-vez">
            <span className="dock-rotulo">Vez de</span>
            <span className="iniciativa-vez-nome">{atual.nome}</span>
          </div>
        )}
      </div>

      {ehMestre && (
        <div className="iniciativa-controles">
          <button className="mesa-btn mesa-btn--primario" onClick={avancarTurno} disabled={!combatentes.length}>
            Próximo turno
          </button>
          <button className="mesa-btn" onClick={encerrar} disabled={!combatentes.length}>
            Encerrar
          </button>
        </div>
      )}

      <div className="iniciativa-lista">
        {combatentes.length === 0 && <div className="dock-vazio">Ninguém na ordem de combate ainda.</div>}
        {combatentes.map((c, i) => {
          const meu = c.criado_por === userId;
          const ativo = c.id === turnoAtualId;
          return (
            <div key={c.id} className={`combatente ${ativo ? 'is-ativo' : ''}`}>
              <span className="combatente-ordem">{i + 1}</span>
              <span className="combatente-valor">{c.valor}</span>
              <span className="combatente-nome">{c.nome}</span>
              {(ehMestre || meu) && (
                <button className="mesa-icone-btn" onClick={() => remover(c.id)} title="Remover">
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      <form className="iniciativa-form" onSubmit={adicionar}>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={autorNome || 'Nome'} />
        <input
          className="iniciativa-input-valor"
          type="number"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="—"
        />
        <button className="mesa-btn" type="submit" title="Adicionar com valor manual">
          +
        </button>
      </form>
      <button className="mesa-btn mesa-btn--largo" onClick={rolarEntrar}>
        Rolar d20 e entrar
      </button>
    </div>
  );
}
