import { useCallback, useEffect, useMemo, useState } from 'react';
import { sb } from './supabaseClient';

function ordenar(lista) {
  return [...lista].sort((a, b) => b.valor - a.valor || new Date(a.criado_em) - new Date(b.criado_em));
}

export default function IniciativaPanel({ cenaId, userId, autorNome, ehMestre, deslocado }) {
  const [combatentes, setCombatentes] = useState([]);
  const [turnoAtualId, setTurnoAtualId] = useState(null);
  const [rodada, setRodada] = useState(1);
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');

  useEffect(() => {
    let ativo = true;
    if (!cenaId) return;

    async function carregar() {
      const [{ data: lista, error: erroLista }, { data: cena, error: erroCena }] = await Promise.all([
        sb.from('mesa_iniciativa').select('*').eq('cena_id', cenaId),
        sb.from('cenas').select('iniciativa_atual_id, iniciativa_rodada').eq('id', cenaId).single(),
      ]);
      if (!ativo) return;
      if (!erroLista) setCombatentes(ordenar(lista ?? []));
      if (!erroCena && cena) {
        setTurnoAtualId(cena.iniciativa_atual_id);
        setRodada(cena.iniciativa_rodada);
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
            const existe = prev.some((c) => c.id === payload.new.id);
            const proxima = existe
              ? prev.map((c) => (c.id === payload.new.id ? payload.new : c))
              : [...prev, payload.new];
            return ordenar(proxima);
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cenas', filter: `id=eq.${cenaId}` },
        (payload) => {
          setTurnoAtualId(payload.new.iniciativa_atual_id);
          setRodada(payload.new.iniciativa_rodada);
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

  const remover = useCallback((id) => {
    sb.from('mesa_iniciativa').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('Falha ao remover da iniciativa:', error.message);
    });
  }, []);

  const avancarTurno = useCallback(() => {
    if (combatentes.length === 0) return;
    const idxAtual = combatentes.findIndex((c) => c.id === turnoAtualId);
    const proximoIdx = idxAtual === -1 ? 0 : (idxAtual + 1) % combatentes.length;
    const viraRodada = idxAtual !== -1 && proximoIdx === 0;
    sb.from('cenas')
      .update({
        iniciativa_atual_id: combatentes[proximoIdx].id,
        iniciativa_rodada: viraRodada ? rodada + 1 : rodada,
      })
      .eq('id', cenaId)
      .then(({ error }) => {
        if (error) console.error('Falha ao avançar turno:', error.message);
      });
  }, [combatentes, turnoAtualId, rodada, cenaId]);

  const encerrarCombate = useCallback(async () => {
    await sb.from('mesa_iniciativa').delete().eq('cena_id', cenaId);
    await sb.from('cenas').update({ iniciativa_atual_id: null, iniciativa_rodada: 1 }).eq('id', cenaId);
  }, [cenaId]);

  const listaOrdenada = useMemo(() => combatentes, [combatentes]);

  return (
    <div className={`mesa-iniciativa ${deslocado ? 'mesa-iniciativa--deslocado' : ''}`}>
      <div className="mesa-iniciativa-cabecalho">
        <span>Rodada {rodada}</span>
        {ehMestre && (
          <div className="mesa-iniciativa-controles">
            <button className="mesa-btn" onClick={avancarTurno} disabled={listaOrdenada.length === 0}>
              Próximo turno
            </button>
            <button className="mesa-btn" onClick={encerrarCombate} disabled={listaOrdenada.length === 0}>
              Encerrar
            </button>
          </div>
        )}
      </div>

      <div className="mesa-iniciativa-lista">
        {listaOrdenada.length === 0 && <p className="mesa-chat-vazio">Ninguém na iniciativa ainda.</p>}
        {listaOrdenada.map((c) => (
          <div key={c.id} className={`mesa-iniciativa-item ${c.id === turnoAtualId ? 'mesa-iniciativa-item--ativo' : ''}`}>
            <span className="mesa-iniciativa-valor">{c.valor}</span>
            <span className="mesa-iniciativa-nome">{c.nome}</span>
            {(c.criado_por === userId || ehMestre) && (
              <button className="mesa-iniciativa-remover" onClick={() => remover(c.id)} title="Remover">
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <form className="mesa-iniciativa-form" onSubmit={adicionar}>
        <input placeholder="Nome (opcional)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input
          placeholder="Iniciativa"
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="mesa-iniciativa-input-valor"
        />
        <button className="mesa-btn" type="submit">+</button>
      </form>
    </div>
  );
}
