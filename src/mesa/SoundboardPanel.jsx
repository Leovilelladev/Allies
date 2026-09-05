import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from '../shared/supabaseClient';

export default function SoundboardPanel({ campanhaId, ehMestre, audio }) {
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
    <div className="soundboard">
      <label>Volume local <input aria-label="Volume local" type="range" min="0" max="1" step="0.05"
        value={audio.volume} onChange={e => audio.ajustarVolume(e.target.value)} /></label>
      <button className="mesa-btn" onClick={audio.parar}>Parar sons neste dispositivo</button>
      {audio.erro && <p role="alert">{audio.erro}</p>}
      <div className="soundboard-lista">
        {sons.length === 0 && (
          <span className="dock-vazio">Nenhum som cadastrado nesta campanha.</span>
        )}
        {sons.map((som) => (
          <div key={som.id} className="soundboard-item">
            <button className="soundboard-play" onClick={() => audio.tocar(som)}>
              ▶ {som.nome}
            </button>
            {ehMestre && (
              <button
                type="button"
                className="mesa-icone-btn"
                onClick={() => remover(som)}
                title="Excluir som"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {ehMestre && (
        <div className="soundboard-upload">
          {erro && <span className="chat-erro">{erro}</span>}
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            onChange={enviarArquivo}
            style={{ display: 'none' }}
          />
          <button
            className="mesa-btn mesa-btn--largo"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
          >
            {enviando ? 'Enviando…' : '+ Áudio'}
          </button>
        </div>
      )}
    </div>
  );
}
