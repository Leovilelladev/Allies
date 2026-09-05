import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from '../shared/supabaseClient';

// Permanece montado com a mesa, independentemente da aba do dock.
export default function useAudioMesa(cenaId) {
  const tocando = useRef(new Set());
  const canalRef = useRef(null);
  const volumeRef = useRef(0.7);
  const [volume, setVolume] = useState(0.7);
  const [erro, setErro] = useState('');
  const parar = useCallback(() => {
    for (const audio of tocando.current) { audio.pause(); audio.src = ''; }
    tocando.current.clear();
  }, []);
  const reproduzir = useCallback(async url => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
    const audio = new Audio(url);
    audio.volume = volumeRef.current;
    tocando.current.add(audio);
    audio.onended = () => tocando.current.delete(audio);
    try { await audio.play(); setErro(''); }
    catch { tocando.current.delete(audio); setErro('Áudio bloqueado ou indisponível. Abra Sons e tente reproduzir novamente.'); }
  }, []);
  useEffect(() => {
    const canal = sb.channel(`mesa-sons-tocar-${cenaId}`)
      .on('broadcast', { event: 'tocar' }, ({ payload }) => reproduzir(payload?.url))
      .subscribe();
    canalRef.current = canal;
    return () => { canalRef.current = null; sb.removeChannel(canal); parar(); };
  }, [cenaId, reproduzir, parar]);
  const tocar = useCallback(async som => {
    const { data } = sb.storage.from('mesa-sons').getPublicUrl(som.caminho_arquivo);
    if (!data?.publicUrl) return;
    await reproduzir(data.publicUrl);
    try {
      const status = await canalRef.current?.send({ type: 'broadcast', event: 'tocar', payload: { url: data.publicUrl } });
      if (status !== 'ok') setErro('Não foi possível confirmar o envio do som à mesa.');
    } catch { setErro('Falha de conexão ao enviar o som à mesa.'); }
  }, [reproduzir]);
  const ajustarVolume = useCallback(valor => {
    const novo = Math.max(0, Math.min(1, Number(valor) || 0));
    volumeRef.current = novo; setVolume(novo);
    for (const audio of tocando.current) audio.volume = novo;
  }, []);
  return { tocar, parar, volume, ajustarVolume, erro };
}
