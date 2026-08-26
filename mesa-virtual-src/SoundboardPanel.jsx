import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from './supabaseClient';

export default function SoundboardPanel({ cenaId, campanhaId, ehMestre }) {
  const [sons, setSons] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    if (!campanhaId) return;

    async function carregar() {
      const { data, error } = await sb
        .from('mesa_sons')
        .select('*')
        .eq('campanha_id', campanhaId)
        .order('criado_em', { ascending: true });
      if (!ativo) return;
      if (!error) setSons(data ?? []);
    }
    carregar();

    const canalDados = sb
      .channel(`mesa-sons-lista-${campanhaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mesa_sons', filter: `campanha_id=eq.${campanhaId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setSons((prev) => prev.filter((s) => s.id !== payload.old.id));
            return;
          }
          setSons((prev) => (prev.some((s) => s.id === payload.new.id) ? prev : [...prev, payload.new]));
        }
      )
      .subscribe();

    return () => {
      ativo = false;
      sb.removeChannel(canalDados);
    };
  }, [campanhaId]);

  // Canal de transmissão: toca o som pra todo mundo que estiver na mesma cena agora
  const canalSomRef = useRef(null);
  useEffect(() => {
    if (!cenaId) return;
    const canal = sb
      .channel(`mesa-sons-tocar-${cenaId}`)
      .on('broadcast', { event: 'tocar' }, ({ payload }) => {
        new Audio(payload.url).play().catch(() => {});
      })
      .subscribe();
    canalSomRef.current = canal;
    return () => {
      sb.removeChannel(canal);
      canalSomRef.current = null;
    };
  }, [cenaId]);

  const tocar = useCallback((som) => {
    const { data } = sb.storage.from('mesa-sons').getPublicUrl(som.caminho_arquivo);
    const url = data?.publicUrl;
    if (!url) return;
    new Audio(url).play().catch(() => {});
    canalSomRef.current?.send({ type: 'broadcast', event: 'tocar', payload: { url } });
  }, []);

  const enviarArquivo = useCallback(
    async (e) => {
      const arquivo = e.target.files?.[0];
      e.target.value = '';
      if (!arquivo) return;
      setErro('');
      setEnviando(true);
      const caminho = `${campanhaId}/${crypto.randomUUID()}-${arquivo.name}`;
      const { error: erroUpload } = await sb.storage.from('mesa-sons').upload(caminho, arquivo);
      if (erroUpload) {
        setErro('Falha ao enviar o áudio.');
        setEnviando(false);
        return;
      }
      const { error: erroInsert } = await sb.from('mesa_sons').insert({
        campanha_id: campanhaId,
        nome: arquivo.name.replace(/\.[^/.]+$/, ''),
        caminho_arquivo: caminho,
      });
      if (erroInsert) setErro('Áudio enviado, mas falhou ao salvar na lista.');
      setEnviando(false);
    },
    [campanhaId]
  );

  const remover = useCallback((som) => {
    sb.storage.from('mesa-sons').remove([som.caminho_arquivo]);
    sb.from('mesa_sons').delete().eq('id', som.id);
  }, []);

  return (
    <div className="mesa-soundboard">
      <div className="mesa-soundboard-lista">
        {sons.length === 0 && <p className="mesa-chat-vazio">Nenhum som ainda.</p>}
        {sons.map((som) => (
          <div key={som.id} className="mesa-soundboard-item">
            <button className="mesa-btn mesa-soundboard-play" onClick={() => tocar(som)}>
              ▶ {som.nome}
            </button>
            {ehMestre && (
              <button className="mesa-iniciativa-remover" onClick={() => remover(som)} title="Remover">
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {ehMestre && (
        <div className="mesa-soundboard-upload">
          <input ref={inputRef} type="file" accept="audio/*" onChange={enviarArquivo} disabled={enviando} />
          {enviando && <span className="mesa-sync">Enviando…</span>}
        </div>
      )}
      {erro && <p className="mesa-chat-erro">{erro}</p>}
    </div>
  );
}
