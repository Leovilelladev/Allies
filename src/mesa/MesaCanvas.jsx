import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Text } from 'pixi.js';
import {
  createTokenView,
  redrawTokenView,
  tokenColor,
  createSelectionHandles,
  positionSelectionHandles,
} from './pixiToken';
import ChatPanel from './ChatPanel';
import IniciativaPanel from './IniciativaPanel';
import SoundboardPanel from './SoundboardPanel';
import useAudioMesa from './useAudioMesa';
import FichaPanel from './FichaPanel';
import { lerFicha, montarAtualizacao } from './fichaLegado';
import { lerUsuarioLocal } from './Mesa';
import TokenPanel from './TokenPanel';
import { METROS_POR_QUADRADO as METROS } from './constantes';
import { COR, CSS, FONTE_SANS } from './paleta';
import { podeControlarToken, podeCriarTokenDeFicha } from './permissoes';
import Dado3DHost from './Dado3DHost';
import { tokenVisivelNaNevoa, tokensDoObservador } from './nevoa';

const COR_TOKEN_PADRAO = '#785a28';
import { CONDICAO_POR_ID } from './condicoes';
import { FORMAS, TAMANHOS_SUGERIDOS, desenharArea, tokenNaArea, metrosParaPx } from './areas';
import {
  TIPOS_PAREDE,
  bloqueiaVisao,
  celulasVisiveisDoPonto,
  distanciaAoSegmento,
} from './paredes';
import { MODOS, rolarD20, rolarFormula, enviarRolagem } from './rolagem';
import { enviarImagem, enviarMapa, importarDeUrl } from './imagens';
import { sb } from '../shared/supabaseClient';
import { useToast } from '../shared/Toast';

const ESCALA_MIN = 0.2;
const ESCALA_MAX = 4;
const GRID_PADRAO = 70;
const RAIO_TOKEN = 28;
const METROS_POR_QUADRADO = METROS;
// Faixa vazia ao redor da mesa delimitada: dá espaço pra arrastar a tela sem
// se perder no vazio infinito.
const MARGEM_MESA = 400;
// De dia a visão é "ilimitada", mas precisa de um número para o cálculo parar
const RAIO_DIA_M = 60;

const FERRAMENTAS = [
  { id: 'selecionar', rotulo: 'Selecionar', atalho: 'V', icone: '⌖', mestreApenas: false },
  { id: 'token', rotulo: 'Novo token', atalho: 'T', icone: '＋', mestreApenas: true },
  { id: 'medir', rotulo: 'Medir', atalho: 'M', icone: '↔', mestreApenas: false },
  { id: 'area', rotulo: 'Área', atalho: 'Q', icone: '◎', mestreApenas: false },
  { id: 'parede', rotulo: 'Paredes', atalho: 'P', icone: '▤', mestreApenas: true },
  { id: 'revelar', rotulo: 'Revelar névoa', atalho: 'R', icone: '◐', mestreApenas: true },
  { id: 'esconder', rotulo: 'Cobrir névoa', atalho: 'C', icone: '◑', mestreApenas: true },
];

const ABAS_DOCK = [
  { id: 'ficha', rotulo: 'Ficha' },
  { id: 'token', rotulo: 'Token' },
  { id: 'chat', rotulo: 'Chat' },
  { id: 'iniciativa', rotulo: 'Turnos' },
  { id: 'sons', rotulo: 'Sons' },
];

/** Interseção de dois retângulos {x0,y0,x1,y1}; null se não se cruzam. */
function intersecao(a, b) {
  const x0 = Math.max(a.x0, b.x0);
  const y0 = Math.max(a.y0, b.y0);
  const x1 = Math.min(a.x1, b.x1);
  const y1 = Math.min(a.y1, b.y1);
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null;
}

/** Retângulos que cobrem "externo" menos "interno" (o anel entre eles). */
function anelDeRetangulos(externo, interno) {
  if (!interno) return [[externo.x0, externo.y0, externo.x1 - externo.x0, externo.y1 - externo.y0]];
  const rects = [];
  if (interno.y0 > externo.y0) rects.push([externo.x0, externo.y0, externo.x1 - externo.x0, interno.y0 - externo.y0]);
  if (interno.y1 < externo.y1) rects.push([externo.x0, interno.y1, externo.x1 - externo.x0, externo.y1 - interno.y1]);
  const topo = Math.max(externo.y0, interno.y0);
  const base = Math.min(externo.y1, interno.y1);
  if (base > topo) {
    if (interno.x0 > externo.x0) rects.push([externo.x0, topo, interno.x0 - externo.x0, base - topo]);
    if (interno.x1 < externo.x1) rects.push([interno.x1, topo, externo.x1 - interno.x1, base - topo]);
  }
  return rects.filter(([, , w, h]) => w > 0 && h > 0);
}

/** Raio de visão do token em metros, considerando a iluminação da cena. */
function raioVisaoMetros(token, iluminacao) {
  if (iluminacao === 'dia') return Infinity;
  const escuro = Number(token.visaoEscuro) || 0;
  const luz = Number(token.luz) || 0;
  return Math.max(escuro, luz);
}

let contadorTokens = 0;

function linhaParaToken(row) {
  return {
    id: row.id,
    x: row.x,
    y: row.y,
    rotation: row.rotacao,
    scaleX: row.escala,
    scaleY: row.escala,
    radius: row.raio,
    color: row.cor || COR_TOKEN_PADRAO,
    label: row.nome || '',
    camada: row.camada ?? 0,
    fichaId: row.personagem_id ?? null,
    imagemUrl: row.imagem_url ?? null,
    luz: Number(row.dados?.luz) || 0,
    dadosRaw: row.dados && typeof row.dados === 'object' ? row.dados : {},
    pvAtual: 0,
    pvTotal: 0,
    visaoClara: 0,
    visaoEscuro: 0,
    donoId: null,
  };
}

export default function MesaCanvas({ cenaId, campanhaId, seletor, onVoltarCampanha }) {
  const audioMesa = useAudioMesa(cenaId);
  const { toast } = useToast();
  const portasPendentesRef = useRef(new Set());
  useEffect(() => { if (audioMesa.erro) toast(audioMesa.erro, 'erro'); }, [audioMesa.erro, toast]);
  const containerRef = useRef(null);
  const pixiRef = useRef(null);
  const liveRef = useRef({});
  const fogRevelaSetRef = useRef(new Set());
  const transformPendenteRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [tokens, setTokens] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sincronizando, setSincronizando] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [ehMestre, setEhMestre] = useState(false);
  const [fichas, setFichas] = useState([]);
  const [cena, setCena] = useState(null);
  const [fogAtivo, setFogAtivo] = useState(false);
  const [fogRevelado, setFogRevelado] = useState([]);
  const [verComoJogador, setVerComoJogador] = useState(false);
  const [observadorId, setObservadorId] = useState('');
  const [ferramenta, setFerramenta] = useState('selecionar');
  const [abaDock, setAbaDock] = useState('ficha');
  const [dockAberto, setDockAberto] = useState(true);
  const [modoRolagem, setModoRolagem] = useState(MODOS.NORMAL);
  const [medida, setMedida] = useState(null);
  const [configMapa, setConfigMapa] = useState(null);
  const [mostrarAjuda, setMostrarAjuda] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [erroMapa, setErroMapa] = useState('');
  const [danoRapido, setDanoRapido] = useState('');
  const historicoRef = useRef([]);
  const [areas, setAreas] = useState([]);
  const [configArea, setConfigArea] = useState({ forma: 'circulo', tamanho: 3 });
  const [previaArea, setPreviaArea] = useState(null);
  const [paredes, setParedes] = useState([]);
  const [modoParede, setModoParede] = useState('parede'); // parede | porta | janela | apagar
  const [tracado, setTracado] = useState(null); // polilinha em desenho
  const [mostrarParedes, setMostrarParedes] = useState(true);
  const [cursorParede, setCursorParede] = useState(null);
  const inputImagemRef = useRef(null);
  const inputMapaRef = useRef(null);

  const gridSize = cena?.grid_tamanho || GRID_PADRAO;

  // Área jogável: quando o mestre define largura/altura em quadrados, a mesa
  // passa a existir só dentro desse retângulo (grade, mapa, névoa e tokens).
  const limites = useMemo(() => {
    // A área é guardada em pixels. Cenas antigas guardavam em quadrados.
    let largura = Number(cena?.largura_px) || 0;
    let altura = Number(cena?.altura_px) || 0;
    if (largura <= 0 || altura <= 0) {
      const lc = Number(cena?.largura_quadrados) || 0;
      const ac = Number(cena?.altura_quadrados) || 0;
      if (lc <= 0 || ac <= 0) return null;
      largura = lc * gridSize;
      altura = ac * gridSize;
    }
    return {
      x0: 0,
      y0: 0,
      x1: largura,
      y1: altura,
      largura,
      altura,
      colunas: largura / gridSize,
      linhas: altura / gridSize,
    };
  }, [cena?.largura_px, cena?.altura_px, cena?.largura_quadrados, cena?.altura_quadrados, gridSize]);

  // Pilha local de desfazer: guarda o inverso de cada ação feita por mim
  const registrar = useCallback((entrada) => {
    historicoRef.current.push(entrada);
    if (historicoRef.current.length > 40) historicoRef.current.shift();
  }, []);

  const snap = useCallback(
    (v, eixo = 'x') => {
      let alvo = Math.floor(v / gridSize) * gridSize + gridSize / 2;
      if (limites) {
        // O centro do token não sai da área da mesa
        const tamanho = eixo === 'x' ? limites.largura : limites.altura;
        const minimo = Math.min(gridSize / 2, tamanho / 2);
        const maximo = Math.max(minimo, tamanho - gridSize / 2);
        alvo = Math.max(minimo, Math.min(maximo, alvo));
      }
      return alvo;
    },
    [gridSize, limites]
  );

  // Fichas indexadas para exibir PV e visão nos tokens
  const fichasPorId = useMemo(() => {
    const mapa = new Map();
    for (const f of fichas) mapa.set(f.id, lerFicha(f));
    return mapa;
  }, [fichas]);

  const tokensComVida = useMemo(
    () =>
      tokens.map((t) => {
        const condicoes = Array.isArray(t.dadosRaw?.condicoes) ? t.dadosRaw.condicoes : [];
        const f = t.fichaId ? fichasPorId.get(t.fichaId) : null;

        if (f) {
          return {
            ...t,
            condicoes,
            pvAtual: f.pvAtual,
            pvTotal: f.pvTotal,
            imagemUrl: t.imagemUrl || f.retratoUrl || null,
            visaoClara: f.visaoClara,
            visaoEscuro: f.visaoEscuro,
            deslocamento: parseFloat(String(f.deslocamento).replace(',', '.')) || 0,
            donoId: f.usuarioId,
          };
        }

        // Criatura da mesa: vida e CA moram no próprio token
        const pv = t.dadosRaw?.pv;
        return {
          ...t,
          condicoes,
          pvAtual: pv?.max ? (pv.atual ?? pv.max) : 0,
          pvTotal: pv?.max || 0,
        };
      }),
    [tokens, fichasPorId]
  );

  const iluminacao = cena?.iluminacao || 'dia';
  const visaoDinamica = !!cena?.visao_dinamica;
  const autoExplorar = cena?.auto_explorar !== false;
  const comoJogador = !ehMestre || verComoJogador;

  const observadores = useMemo(() => {
    const donos = new Map();
    for (const t of tokensComVida) {
      if (t.fichaId && t.donoId != null && String(t.donoId) !== String(perfil?.id)) {
        const id = String(t.donoId);
        donos.set(id, [...(donos.get(id) || []), t.label || 'Personagem']);
      }
    }
    return [...donos].map(([id, nomes]) => ({ id, nome: nomes.join(' / ') }));
  }, [tokensComVida, perfil?.id]);
  const donoDaVisao = ehMestre
    ? (observadores.some(o => o.id === observadorId) ? observadorId : observadores[0]?.id)
    : perfil?.id;

  const meusTokensDeVisao = useMemo(() => {
    return tokensDoObservador(tokensComVida, donoDaVisao);
  }, [tokensComVida, donoDaVisao]);

  const paredesQueBloqueiam = useMemo(() => paredes.filter(bloqueiaVisao), [paredes]);

  // null = névoa manual/desligada. A visão dinâmica sempre usa os tokens do
  // observador, inclusive quando a última porta bloqueadora é aberta.
  const celulasVisiveis = useMemo(() => {
    if (!fogAtivo || !visaoDinamica) return null;

    const set = new Set();
    for (const t of meusTokensDeVisao) {
      const raioM = raioVisaoMetros(t, iluminacao);
      const alcance = raioM === Infinity ? RAIO_DIA_M : raioM;
      if (!alcance) {
        set.add(`${Math.floor(t.x / gridSize)},${Math.floor(t.y / gridSize)}`);
        continue;
      }
      const raioPx = (alcance / METROS_POR_QUADRADO) * gridSize;
      for (const chave of celulasVisiveisDoPonto(t.x, t.y, raioPx, gridSize, paredesQueBloqueiam)) {
        set.add(chave);
      }
    }
    return set;
  }, [fogAtivo, visaoDinamica, iluminacao, meusTokensDeVisao, gridSize, paredesQueBloqueiam]);
  const contextoNevoa = useMemo(() => ({
    comoJogador, fogAtivo, celulasVisiveis, fogRevelado: new Set(fogRevelado), gridSize,
  }), [comoJogador, fogAtivo, celulasVisiveis, fogRevelado, gridSize]);

  liveRef.current.ferramenta = ferramenta;
  liveRef.current.ehMestre = ehMestre;
  liveRef.current.tokens = tokensComVida;
  liveRef.current.selectedId = selectedId;
  liveRef.current.gridSize = gridSize;
  liveRef.current.configArea = configArea;
  liveRef.current.modoParede = modoParede;
  liveRef.current.paredes = paredes;
  liveRef.current.tracado = tracado;
  liveRef.current.perfil = perfil;
  liveRef.current.userId = perfil?.id ?? null;

  // ------------------------------------------------------------------
  // Carga inicial + Realtime
  // ------------------------------------------------------------------
  useEffect(() => {
    let ativo = true;
    if (!cenaId) return;

    async function carregar() {
      // Mesma identidade do site: o usuário guardado pelo login
      const local = lerUsuarioLocal();
      const uid = local?.id ?? null;
      if (!ativo) return;
      if (uid) {
        setPerfil({ id: uid, nome: local.nome_exibicao || local.nome_usuario || 'Anônimo' });
      }

      if (uid && campanhaId) {
        const { data: campanhaData } = await sb
          .from('campanhas')
          .select('mestre_id')
          .eq('id', campanhaId)
          .maybeSingle();
        if (ativo) setEhMestre(Number(campanhaData?.mestre_id) === Number(uid));

        // O elenco da campanha vem por campanha_personagens
        const { data: elenco } = await sb
          .from('campanha_personagens')
          .select('personagem_id, personagens(*)')
          .eq('campanha_id', campanhaId);
        if (ativo) {
          setFichas((elenco ?? []).map((e) => e.personagens).filter(Boolean));
        }
      }

      const { data: cenaData, error: cenaError } = await sb
        .from('mesa_cenas')
        .select('*')
        .eq('id', cenaId)
        .maybeSingle();
      if (!ativo) return;
      if (cenaError) {
        console.error('Falha ao carregar a cena:', cenaError.message);
      } else if (cenaData) {
        setCena(cenaData);
        setFogAtivo(!!cenaData.fog_ativo);
        const lista = Array.isArray(cenaData.fog_revelado) ? cenaData.fog_revelado : [];
        setFogRevelado(lista);
        fogRevelaSetRef.current = new Set(lista);
      }

      const { data, error } = await sb
        .from('mesa_tokens')
        .select('*')
        .eq('cena_id', cenaId)
        .order('camada', { ascending: true });

      if (!ativo) return;
      if (error) console.error('Falha ao carregar tokens:', error.message);
      else if (data) setTokens(data.map(linhaParaToken));
      setSincronizando(false);
    }
    carregar();

    const canalTokens = sb
      .channel(`mesa-tokens-${cenaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mesa_tokens', filter: `cena_id=eq.${cenaId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const novo = linhaParaToken(payload.new);
            setTokens((prev) => {
              const semTemp = prev.filter((t) => !(String(t.id).startsWith('temp-') && t.label === novo.label));
              return semTemp.some((t) => t.id === novo.id) ? semTemp : [...semTemp, novo];
            });
          } else if (payload.eventType === 'UPDATE') {
            const atualizado = linhaParaToken(payload.new);
            setTokens((prev) => prev.map((t) => (t.id === atualizado.id ? atualizado : t)));
          } else if (payload.eventType === 'DELETE') {
            setTokens((prev) => prev.filter((t) => t.id !== payload.old.id));
            setSelectedId((atual) => (atual === payload.old.id ? null : atual));
          }
        }
      )
      .subscribe();

    const canalCena = sb
      .channel(`mesa-cena-${cenaId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mesa_cenas', filter: `id=eq.${cenaId}` },
        (payload) => {
          setCena((c) => (c ? { ...c, ...payload.new } : payload.new));
          setFogAtivo(!!payload.new.fog_ativo);
          const lista = Array.isArray(payload.new.fog_revelado) ? payload.new.fog_revelado : [];
          setFogRevelado(lista);
          fogRevelaSetRef.current = new Set(lista);
        }
      )
      .subscribe();

    return () => {
      ativo = false;
      sb.removeChannel(canalTokens);
      sb.removeChannel(canalCena);
    };
  }, [cenaId, campanhaId]);

  // Paredes da cena
  useEffect(() => {
    if (!cenaId) return;
    let ativo = true;

    sb.from('mesa_paredes')
      .select('*')
      .eq('cena_id', cenaId)
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) console.error('Falha ao carregar paredes:', error.message);
        else setParedes(data ?? []);
      });

    const canal = sb
      .channel(`mesa-paredes-${cenaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mesa_paredes', filter: `cena_id=eq.${cenaId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setParedes((prev) => prev.filter((p) => p.id !== payload.old.id));
            return;
          }
          setParedes((prev) => {
            const sem = prev.filter((p) => p.id !== payload.new.id);
            return [...sem, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      ativo = false;
      sb.removeChannel(canal);
    };
  }, [cenaId]);

  // Áreas de efeito da cena
  useEffect(() => {
    if (!cenaId) return;
    let ativo = true;

    sb.from('mesa_areas')
      .select('*')
      .eq('cena_id', cenaId)
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) console.error('Falha ao carregar áreas:', error.message);
        else setAreas(data ?? []);
      });

    const canal = sb
      .channel(`mesa-areas-${cenaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mesa_areas', filter: `cena_id=eq.${cenaId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setAreas((prev) => prev.filter((a) => a.id !== payload.old.id));
            return;
          }
          setAreas((prev) => {
            const sem = prev.filter((a) => a.id !== payload.new.id);
            return [...sem, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      ativo = false;
      sb.removeChannel(canal);
    };
  }, [cenaId]);

  // Fichas em tempo real (PV dos tokens)
  useEffect(() => {
    if (!campanhaId) return;
    const canal = sb
      .channel(`mesa-fichas-${campanhaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'personagens' },
        (payload) => {
          // `personagens` não tem campanha_id: só reagimos a quem já está no elenco
          setFichas((prev) => {
            if (payload.eventType === 'DELETE') return prev.filter((f) => f.id !== payload.old.id);
            if (!prev.some((f) => f.id === payload.new.id)) return prev;
            return prev.map((f) => (f.id === payload.new.id ? payload.new : f));
          });
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(canal);
    };
  }, [campanhaId]);

  // ------------------------------------------------------------------
  // Ações
  // ------------------------------------------------------------------
  const salvarNevoa = useCallback(() => {
    const lista = Array.from(fogRevelaSetRef.current);
    sb.from('mesa_cenas')
      .update({ fog_revelado: lista })
      .eq('id', cenaId)
      .then(({ error }) => {
        if (error) console.error('Falha ao salvar névoa:', error.message);
      });
  }, [cenaId]);

  const alternarFog = useCallback(() => {
    setFogAtivo((atual) => {
      const proximo = !atual;
      if (!proximo) setFerramenta('selecionar');
      sb.from('mesa_cenas')
        .update({ fog_ativo: proximo })
        .eq('id', cenaId)
        .then(({ error }) => {
          if (error) console.error('Falha ao alternar névoa:', error.message);
        });
      return proximo;
    });
  }, [cenaId]);

  const limparNevoa = useCallback(() => {
    fogRevelaSetRef.current = new Set();
    setFogRevelado([]);
    sb.from('mesa_cenas').update({ fog_revelado: [] }).eq('id', cenaId).then(({ error }) => {
      if (error) console.error('Falha ao limpar névoa:', error.message);
    });
  }, [cenaId]);

  // Mantém a área da mesa (mais a faixa fantasma) sempre dentro da tela.
  const limitarPos = useCallback(
    (pos, escala) => {
      const p = pixiRef.current;
      if (!limites || !p?.app) return pos;
      const { width, height } = p.app.screen;

      const eixo = (valor, min, max, tela) => {
        const menor = tela - max * escala;
        const maior = -min * escala;
        // Área menor que a tela: centraliza em vez de travar numa borda
        if (menor > maior) return (tela - (max - min) * escala) / 2 - min * escala;
        return Math.max(menor, Math.min(maior, valor));
      };

      return {
        x: eixo(pos.x, limites.x0 - MARGEM_MESA, limites.x1 + MARGEM_MESA, width),
        y: eixo(pos.y, limites.y0 - MARGEM_MESA, limites.y1 + MARGEM_MESA, height),
      };
    },
    [limites]
  );

  const centralizar = useCallback(() => {
    const p = pixiRef.current;
    if (!p?.app) {
      setScale(1);
      setStagePos({ x: 0, y: 0 });
      return;
    }
    const { width, height } = p.app.screen;

    // Com área definida, "centralizar" vira "enquadrar a mesa inteira"
    if (limites) {
      const margem = 40;
      const escala = Math.min(
        (width - margem * 2) / limites.largura,
        (height - margem * 2) / limites.altura
      );
      const nova = Math.max(ESCALA_MIN, Math.min(ESCALA_MAX, escala));
      setScale(nova);
      setStagePos({
        x: (width - limites.largura * nova) / 2,
        y: (height - limites.altura * nova) / 2,
      });
      return;
    }
    setScale(1);
    setStagePos({ x: width / 2, y: height / 2 });
  }, [limites]);

  const criarToken = useCallback(
    (opcoes = {}) => {
      const p = pixiRef.current;
      if (!p) return;
      const ficha = opcoes.fichaId ? fichasPorId.get(opcoes.fichaId) : null;
      if (!podeCriarTokenDeFicha({ ehMestre, userId: perfil?.id, ficha })) return;
      contadorTokens += 1;

      const centro = opcoes.mundo || p.world.toLocal({ x: p.app.screen.width / 2, y: p.app.screen.height / 2 });
      const x = snap(centro.x, 'x');
      const y = snap(centro.y, 'y');

      const atuais = liveRef.current.tokens || [];
      const proximaCamada = atuais.length ? Math.max(...atuais.map((t) => t.camada ?? 0)) + 1 : 0;
      const tempId = `temp-${Date.now()}`;
      const cor = opcoes.cor || tokenColor(atuais.length);
      const nome = opcoes.nome || `Token ${contadorTokens}`;

      setTokens((prev) => [
        ...prev,
        {
          id: tempId,
          x,
          y,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          radius: RAIO_TOKEN,
          color: cor,
          label: nome,
          camada: proximaCamada,
          fichaId: opcoes.fichaId || null,
          imagemUrl: opcoes.imagemUrl || null,
          pvAtual: 0,
          pvTotal: 0,
        },
      ]);
      setSelectedId(tempId);

      sb.from('mesa_tokens')
        .insert({
          cena_id: cenaId,
          nome,
          cor,
          x,
          y,
          raio: RAIO_TOKEN,
          rotacao: 0,
          escala: 1,
          camada: proximaCamada,
          personagem_id: opcoes.fichaId || null,
          imagem_url: opcoes.imagemUrl || null,
        })
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Falha ao criar token:', error.message);
            setTokens((prev) => prev.filter((t) => t.id !== tempId));
            return;
          }
          const definitivo = linhaParaToken(data);
          setTokens((prev) => prev.map((t) => (t.id === tempId ? definitivo : t)));
          setSelectedId((atual) => (atual === tempId ? definitivo.id : atual));
          registrarRef.current({ tipo: 'criar', id: definitivo.id });
        });
    },
    [cenaId, snap, ehMestre, perfil?.id, fichasPorId]
  );

  const criarTokenDaFicha = useCallback(
    (ficha) => {
      criarToken({ nome: ficha.nome, cor: ficha.cor, fichaId: ficha.id, imagemUrl: ficha.retratoUrl || null });
      setFerramenta('selecionar');
    },
    [criarToken]
  );

  // Revela permanentemente o que o token passou a enxergar (memória do mapa)
  const explorarComToken = useCallback(
    (token, x, y) => {
      if (!fogAtivo || !visaoDinamica || !autoExplorar || !token.fichaId || token.donoId == null) return;
      if (ehMestre && String(token.donoId) === String(perfil?.id)) return;
      const raioM = raioVisaoMetros(token, iluminacao);
      if (!raioM) return;
      const raioPx =
        raioM === Infinity
          ? (RAIO_DIA_M / METROS_POR_QUADRADO) * gridSize
          : (raioM / METROS_POR_QUADRADO) * gridSize;

      const set = fogRevelaSetRef.current;
      let novas = 0;
      const vistas = celulasVisiveisDoPonto(x, y, raioPx, gridSize, paredesQueBloqueiam);
      for (const chave of vistas) {
        if (!set.has(chave)) {
          set.add(chave);
          novas += 1;
        }
      }
      if (!novas) return;
      const lista = Array.from(set);
      setFogRevelado(lista);
      sb.from('mesa_cenas')
        .update({ fog_revelado: lista })
        .eq('id', cenaId)
        .then(({ error }) => {
          if (error) console.error('Falha ao gravar a exploração:', error.message);
        });
    },
    [fogAtivo, visaoDinamica, autoExplorar, iluminacao, gridSize, cenaId, paredesQueBloqueiam, ehMestre, perfil?.id]
  );

  // Mudanças de porta/luz também exploram, mesmo sem arrastar o personagem.
  // O mestre registra o grupo real, nunca NPCs nem apenas a prévia escolhida.
  useEffect(() => {
    if (sincronizando || !fogAtivo || !visaoDinamica || !autoExplorar || !celulasVisiveis) return;
    const vistas = new Set(ehMestre ? [] : celulasVisiveis);
    if (ehMestre) {
      for (const token of tokensComVida) {
        if (!token.fichaId || token.donoId == null || String(token.donoId) === String(perfil?.id)) continue;
        const raio = raioVisaoMetros(token, iluminacao);
        if (!raio) continue;
        for (const chave of celulasVisiveisDoPonto(token.x, token.y,
          ((raio === Infinity ? RAIO_DIA_M : raio) / METROS_POR_QUADRADO) * gridSize,
          gridSize, paredesQueBloqueiam)) vistas.add(chave);
      }
    }
    const set = fogRevelaSetRef.current;
    const antes = set.size;
    for (const chave of vistas) set.add(chave);
    if (set.size === antes) return;
    setFogRevelado([...set]);
    salvarNevoa();
  }, [sincronizando, fogAtivo, visaoDinamica, autoExplorar, celulasVisiveis, ehMestre, salvarNevoa,
    tokensComVida, perfil?.id, iluminacao, gridSize, paredesQueBloqueiam]);

  const moverTokenFim = useCallback(
    (id, rawX, rawY) => {
      const atual = (liveRef.current.tokens || []).find((t) => t.id === id);
      if (!podeControlarToken({ ehMestre, userId: perfil?.id, token: atual })) return;
      const x = snap(rawX, 'x');
      const y = snap(rawY, 'y');
      setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
      const view = pixiRef.current?.tokenViews.get(id);
      if (view) view.position.set(x, y);

      const token = (liveRef.current.tokens || []).find((t) => t.id === id);
      if (token) {
        if (token.x !== x || token.y !== y) {
          registrarRef.current({ tipo: 'mover', id, x: token.x, y: token.y });
        }
        explorarComToken(token, x, y);
      }

      if (!String(id).startsWith('temp-')) {
        sb.from('mesa_tokens').update({ x, y }).eq('id', id).then(({ error }) => {
          if (error) console.error('Falha ao mover token:', error.message);
        });
      }
    },
    [snap, explorarComToken, ehMestre, perfil?.id]
  );

  const aplicarTransform = useCallback((id, pendente) => {
    const anterior = (liveRef.current.tokens || []).find((t) => t.id === id);
    if (!podeControlarToken({
      ehMestre: liveRef.current.ehMestre,
      userId: liveRef.current.userId,
      token: anterior,
    })) return;
    if (anterior) {
      registrarRef.current({
        tipo: 'transformar',
        id,
        rotation: anterior.rotation,
        scaleX: anterior.scaleX,
      });
    }
    setTokens((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              rotation: pendente.rotation ?? t.rotation,
              scaleX: pendente.scaleX ?? t.scaleX,
              scaleY: pendente.scaleX ?? t.scaleY,
            }
          : t
      )
    );
    if (!String(id).startsWith('temp-')) {
      const patch = {};
      if (pendente.rotation != null) patch.rotacao = pendente.rotation;
      if (pendente.scaleX != null) patch.escala = pendente.scaleX;
      sb.from('mesa_tokens').update(patch).eq('id', id).then(({ error }) => {
        if (error) console.error('Falha ao transformar token:', error.message);
      });
    }
  }, []);

  const atualizarToken = useCallback((id, patchLocal, patchBanco) => {
    const token = (liveRef.current.tokens || []).find((t) => t.id === id);
    if (!podeControlarToken({
      ehMestre: liveRef.current.ehMestre,
      userId: liveRef.current.userId,
      token,
    })) return;
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, ...patchLocal } : t)));
    if (!String(id).startsWith('temp-')) {
      sb.from('mesa_tokens').update(patchBanco).eq('id', id).then(({ error }) => {
        if (error) console.error('Falha ao atualizar token:', error.message);
      });
    }
  }, []);

  // Mescla dentro do JSONB do token (condições, vida, CA, ataques, luz)
  const alterarDadosToken = useCallback(
    (id, patch) => {
      const token = (liveRef.current.tokens || []).find((t) => t.id === id);
      const dados = { ...(token?.dadosRaw || {}), ...patch };
      atualizarToken(id, { dadosRaw: dados, luz: Number(dados.luz) || 0 }, { dados });
    },
    [atualizarToken]
  );

  // Dano positivo tira vida, negativo cura. Funciona tanto para token com
  // ficha (grava na ficha) quanto para criatura da mesa (grava no token).
  const aplicarDanoNoToken = useCallback(
    async (id, valor) => {
      const token = (liveRef.current.tokens || []).find((t) => t.id === id);
      if (!token || !valor) return;
      if (!podeControlarToken({ ehMestre, userId: perfil?.id, token })) return;

      if (token.fichaId) {
        const linha = fichas.find((f) => f.id === token.fichaId);
        if (!linha) return;
        const f = lerFicha(linha);
        const novo = Math.max(0, Math.min(f.pvTotal, f.pvAtual - valor));
        const update = montarAtualizacao(linha, { pv_atual: novo });
        setFichas((prev) => prev.map((x) => (x.id === linha.id ? { ...x, ...update } : x)));
        const { error } = await sb.from('personagens').update(update).eq('id', linha.id);
        if (error) console.error('Falha ao aplicar dano na ficha:', error.message);
        return;
      }

      const pv = token.dadosRaw?.pv;
      if (!pv?.max) return;
      const novo = Math.max(0, Math.min(pv.max, (pv.atual ?? pv.max) - valor));
      alterarDadosToken(id, { pv: { ...pv, atual: novo } });
    },
    [fichas, alterarDadosToken, ehMestre, perfil?.id]
  );

  const rolarAtaqueDoToken = useCallback(
    (token, ataque) => {
      const d20 = rolarD20({ bonus: Number(ataque.bonus) || 0, modo: modoRolagem });
      const dano = ataque.dano ? rolarFormula(ataque.dano) : null;
      enviarRolagem({
        cenaId,
        userId: perfil?.id,
        autorNome: token.label || 'Criatura',
        payload: {
          categoria: 'ataque',
          titulo: ataque.nome,
          subtitulo: token.label,
          d20,
          dano: dano
            ? {
                formula: dano.formula,
                detalhe: dano.detalhe,
                total: d20.critico ? dano.total * 2 : dano.total,
                tipo: ataque.tipo || '',
                critico: d20.critico,
              }
            : null,
        },
      });
    },
    [cenaId, perfil, modoRolagem]
  );

  const removerToken = useCallback(() => {
    if (!selectedId) return;
    const id = selectedId;
    const token = (liveRef.current.tokens || []).find((t) => t.id === id);
    if (!podeControlarToken({ ehMestre, userId: perfil?.id, token })) return;
    setTokens((prev) => prev.filter((t) => t.id !== id));
    setSelectedId(null);
    if (!String(id).startsWith('temp-')) {
      if (token) registrarRef.current({ tipo: 'remover', token });
      sb.from('mesa_tokens').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Falha ao remover token:', error.message);
      });
    }
  }, [selectedId, ehMestre, perfil?.id]);

  const criarParede = useCallback(
    async (segmento) => {
      const { data, error } = await sb
        .from('mesa_paredes')
        .insert({
          cena_id: cenaId,
          tipo: segmento.tipo,
          x1: segmento.x1,
          y1: segmento.y1,
          x2: segmento.x2,
          y2: segmento.y2,
        })
        .select()
        .single();
      if (error) {
        console.error('Falha ao criar parede:', error.message);
        return;
      }
      setParedes((prev) => [...prev.filter((p) => p.id !== data.id), data]);
      registrarRef.current({ tipo: 'parede', id: data.id });
    },
    [cenaId]
  );

  const removerParede = useCallback((id) => {
    setParedes((prev) => prev.filter((p) => p.id !== id));
    sb.from('mesa_paredes').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('Falha ao remover parede:', error.message);
    });
  }, []);

  const alternarPorta = useCallback(async (parede) => {
    if (!ehMestre || portasPendentesRef.current.has(parede.id)) return;
    portasPendentesRef.current.add(parede.id);
    const aberta = !parede.aberta;
    try {
      const { data, error } = await sb.from('mesa_paredes').update({ aberta })
        .eq('id', parede.id).eq('aberta', !!parede.aberta).select('id, aberta').maybeSingle();
      if (error || !data) {
        toast('Porta não confirmada: pode ter sido alterada por outra pessoa. Confira a conexão e o estado da mesa.', 'erro');
        return;
      }
      setParedes(prev => prev.map(p => p.id === data.id ? { ...p, aberta: data.aberta } : p));
    } catch { toast('Falha de conexão ao alterar a porta.', 'erro'); }
    finally { portasPendentesRef.current.delete(parede.id); }
  }, [ehMestre, toast]);

  const limparParedes = useCallback(() => {
    setParedes([]);
    sb.from('mesa_paredes').delete().eq('cena_id', cenaId).then(({ error }) => {
      if (error) console.error('Falha ao limpar paredes:', error.message);
    });
  }, [cenaId]);

  const criarArea = useCallback(
    async (area) => {
      const { data, error } = await sb
        .from('mesa_areas')
        .insert({
          cena_id: cenaId,
          criado_por: perfil?.id || null,
          forma: area.forma,
          x: area.x,
          y: area.y,
          tamanho: area.tamanho,
          largura: area.largura || 1.5,
          angulo: area.angulo || 0,
        })
        .select()
        .single();
      if (error) {
        console.error('Falha ao criar área:', error.message);
        return;
      }
      setAreas((prev) => [...prev.filter((a) => a.id !== data.id), data]);
      registrarRef.current({ tipo: 'area', id: data.id });
    },
    [cenaId, perfil]
  );

  const removerArea = useCallback((id) => {
    setAreas((prev) => prev.filter((a) => a.id !== id));
    sb.from('mesa_areas').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('Falha ao remover área:', error.message);
    });
  }, []);

  const limparAreas = useCallback(() => {
    setAreas([]);
    sb.from('mesa_areas').delete().eq('cena_id', cenaId).then(({ error }) => {
      if (error) console.error('Falha ao limpar áreas:', error.message);
    });
  }, [cenaId]);

  // ---- Desfazer -------------------------------------------------------
  const desfazer = useCallback(async () => {
    const entrada = historicoRef.current.pop();
    if (!entrada) return;

    if (entrada.tipo === 'mover') {
      setTokens((prev) => prev.map((t) => (t.id === entrada.id ? { ...t, x: entrada.x, y: entrada.y } : t)));
      const view = pixiRef.current?.tokenViews.get(entrada.id);
      if (view) view.position.set(entrada.x, entrada.y);
      await sb.from('mesa_tokens').update({ x: entrada.x, y: entrada.y }).eq('id', entrada.id);
      return;
    }

    if (entrada.tipo === 'transformar') {
      setTokens((prev) =>
        prev.map((t) =>
          t.id === entrada.id
            ? { ...t, rotation: entrada.rotation, scaleX: entrada.scaleX, scaleY: entrada.scaleX }
            : t
        )
      );
      await sb
        .from('mesa_tokens')
        .update({ rotacao: entrada.rotation, escala: entrada.scaleX })
        .eq('id', entrada.id);
      return;
    }

    if (entrada.tipo === 'criar') {
      setTokens((prev) => prev.filter((t) => t.id !== entrada.id));
      setSelectedId((atual) => (atual === entrada.id ? null : atual));
      await sb.from('mesa_tokens').delete().eq('id', entrada.id);
      return;
    }

    if (entrada.tipo === 'remover') {
      const t = entrada.token;
      // Recria com o mesmo id: iniciativa e vínculos continuam valendo
      const { data, error } = await sb
        .from('mesa_tokens')
        .insert({
          id: t.id,
          cena_id: cenaId,
          nome: t.label,
          cor: t.color,
          x: t.x,
          y: t.y,
          raio: t.radius,
          rotacao: t.rotation,
          escala: t.scaleX,
          camada: t.camada,
          personagem_id: t.fichaId,
          imagem_url: t.imagemUrl,
          dados: t.dadosRaw || {},
        })
        .select()
        .single();
      if (error) {
        console.error('Falha ao restaurar token:', error.message);
        return;
      }
      const restaurado = linhaParaToken(data);
      setTokens((prev) => (prev.some((x) => x.id === restaurado.id) ? prev : [...prev, restaurado]));
      setSelectedId(restaurado.id);
      return;
    }

    if (entrada.tipo === 'area') {
      await sb.from('mesa_areas').delete().eq('id', entrada.id);
      return;
    }

    if (entrada.tipo === 'parede') {
      setParedes((prev) => prev.filter((p) => p.id !== entrada.id));
      await sb.from('mesa_paredes').delete().eq('id', entrada.id);
    }
  }, [cenaId]);

  const mudarCamada = useCallback(
    (direcao) => {
      if (!selectedId) return;
      const camadas = tokens.map((t) => t.camada ?? 0);
      const nova = direcao === 'frente' ? Math.max(...camadas, 0) + 1 : Math.min(...camadas, 0) - 1;
      atualizarToken(selectedId, { camada: nova }, { camada: nova });
    },
    [selectedId, tokens, atualizarToken]
  );

  const trocarImagemToken = useCallback(
    async (e) => {
      const arquivo = e.target.files?.[0];
      e.target.value = '';
      if (!arquivo || !selectedId) return;
      setEnviandoImagem(true);
      try {
        const url = await enviarImagem(arquivo, `tokens/${campanhaId}`);
        atualizarToken(selectedId, { imagemUrl: url }, { imagem_url: url });
      } catch (erro) {
        console.error('Falha ao enviar imagem do token:', erro.message || erro);
      } finally {
        setEnviandoImagem(false);
      }
    },
    [selectedId, campanhaId, atualizarToken]
  );

  const enviarMapaArquivo = useCallback(async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setConfigMapa((c) => ({ ...c, enviando: true, erro: '' }));
    try {
      const { url, largura, altura } = await enviarMapa(arquivo, `mapas/${campanhaId}`);
      setConfigMapa((c) => {
        if (!c) return c;
        const proporcao = largura && altura ? largura / altura : null;
        // O upload já é redimensionado para no máximo 2560px, então o tamanho
        // que vale é o da imagem final. Medimos de novo ao carregar no canvas.
        return {
          ...c,
          url,
          enviando: false,
          proporcao,
          limitar: true,
          larguraPx: largura ? Math.min(2560, largura) : c.larguraPx,
          alturaPx:
            altura && largura
              ? Math.round(Math.min(2560, largura) / (largura / altura))
              : c.alturaPx,
        };
      });
    } catch (erro) {
      console.error('Falha ao enviar o mapa:', erro.message || erro);
      setConfigMapa((c) => (c ? { ...c, enviando: false, erro: 'Não consegui enviar essa imagem.' } : c));
    }
  }, [campanhaId]);

  const importarMapaDaUrl = useCallback(async () => {
    const url = (configMapa?.url || '').trim();
    if (!url) return;
    setConfigMapa((c) => ({ ...c, enviando: true, erro: '' }));
    try {
      const nova = await importarDeUrl(url, `mapas/${campanhaId}`, { mapa: true });
      setConfigMapa((c) => (c ? { ...c, url: nova, enviando: false, erro: '' } : c));
    } catch (erro) {
      setConfigMapa((c) => (c ? { ...c, enviando: false, erro: erro.message || 'Falha ao importar a URL.' } : c));
    }
  }, [configMapa?.url, campanhaId]);

  const salvarCena = useCallback(
    (patch) => {
      let anterior = null;
      setCena((c) => {
        if (!c) return c;
        anterior = {};
        for (const chave of Object.keys(patch)) anterior[chave] = c[chave];
        return { ...c, ...patch };
      });
      sb.from('mesa_cenas')
        .update(patch)
        .eq('id', cenaId)
        .select()
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error('Falha ao salvar a cena:', error.message);
            // Volta pro que o banco realmente tem, senão o mapa "some" depois,
            // quando qualquer outra escrita trouxer a linha de verdade.
            if (anterior) setCena((c) => (c ? { ...c, ...anterior } : c));
            setErroMapa(`Não consegui salvar a cena: ${error.message}`);
            return;
          }
          if (!data) {
            console.warn('A cena não existe mais no banco (id %s).', cenaId);
            return;
          }
          setCena((c) => (c ? { ...c, ...data } : data));
        });
    },
    [cenaId]
  );

  // Move o token selecionado uma casa por vez. A gravação é adiada para não
  // mandar uma escrita por tecla apertada.
  const commitMovimentoRef = useRef(null);

  const moverPorTeclado = useCallback(
    (dx, dy) => {
      const id = liveRef.current.selectedId;
      if (!id) return;
      const token = (liveRef.current.tokens || []).find((t) => t.id === id);
      if (!token) return;
      if (!podeControlarToken({ ehMestre, userId: perfil?.id, token })) return;

      const destinoX = snap(token.x + dx * gridSize, 'x');
      const destinoY = snap(token.y + dy * gridSize, 'y');
      if (destinoX === token.x && destinoY === token.y) return;

      // A primeira tecla da sequência é o que o Ctrl+Z desfaz
      if (!commitMovimentoRef.current) {
        registrarRef.current({ tipo: 'mover', id, x: token.x, y: token.y });
      }

      setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, x: destinoX, y: destinoY } : t)));
      const view = pixiRef.current?.tokenViews.get(id);
      if (view) view.position.set(destinoX, destinoY);

      if (commitMovimentoRef.current) clearTimeout(commitMovimentoRef.current.timer);
      const timer = setTimeout(() => {
        commitMovimentoRef.current = null;
        const atual = (liveRef.current.tokens || []).find((t) => t.id === id);
        if (atual) explorarComToken(atual, atual.x, atual.y);
        if (!String(id).startsWith('temp-')) {
          sb.from('mesa_tokens')
            .update({ x: destinoX, y: destinoY })
            .eq('id', id)
            .then(({ error }) => {
              if (error) console.error('Falha ao mover token:', error.message);
            });
        }
      }, 260);
      commitMovimentoRef.current = { timer };
    },
    [snap, gridSize, explorarComToken, ehMestre, perfil?.id]
  );

  useEffect(() => () => {
    if (commitMovimentoRef.current) clearTimeout(commitMovimentoRef.current.timer);
  }, []);

  // Atalhos de teclado
  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        removerToken();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        desfazer();
        return;
      }
      if (e.key === 'Escape') {
        if (tracado) {
          setTracado(null);
          setCursorParede(null);
          return;
        }
        setSelectedId(null);
        setFerramenta('selecionar');
        setConfigMapa(null);
        setMostrarAjuda(false);
        return;
      }
      // W A S D ficam reservados para mover o token, então as ferramentas
      // usam teclas que não colidem.
      const passos = {
        w: [0, -1],
        a: [-1, 0],
        s: [0, 1],
        d: [1, 0],
        arrowup: [0, -1],
        arrowleft: [-1, 0],
        arrowdown: [0, 1],
        arrowright: [1, 0],
      };
      const passo = passos[e.key.toLowerCase()];
      if (passo && selectedId) {
        e.preventDefault();
        moverPorTeclado(passo[0], passo[1]);
        return;
      }

      const atalhos = {
        v: 'selecionar',
        t: 'token',
        m: 'medir',
        q: 'area',
        p: 'parede',
        r: 'revelar',
        c: 'esconder',
      };
      const alvo = atalhos[e.key.toLowerCase()];
      if (alvo) {
        const f = FERRAMENTAS.find((x) => x.id === alvo);
        if (f && (!f.mestreApenas || ehMestre)) {
          if ((alvo === 'revelar' || alvo === 'esconder') && !fogAtivo) return;
          setFerramenta(alvo);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, removerToken, ehMestre, fogAtivo, desfazer, tracado, moverPorTeclado]);

  // ------------------------------------------------------------------
  // PixiJS — montagem
  // ------------------------------------------------------------------
  useEffect(() => {
    let destruido = false;
    const app = new Application();
    pixiRef.current = { app, tokenViews: new Map(), pings: [] };

    (async () => {
      await app.init({
        resizeTo: containerRef.current,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (destruido) {
        app.destroy(true, { children: true });
        return;
      }
      containerRef.current.appendChild(app.canvas);

      const world = new Container();
      const mapaLayer = new Container();
      mapaLayer.eventMode = 'none';
      const gridLayer = new Graphics();
      gridLayer.eventMode = 'none';
      const tokensLayer = new Container();
      tokensLayer.sortableChildren = true;
      const areasLayer = new Graphics();
      areasLayer.eventMode = 'none';
      const paredesLayer = new Graphics();
      paredesLayer.eventMode = 'none';
      const foraLayer = new Graphics();
      foraLayer.eventMode = 'none';
      const medidaLayer = new Container();
      medidaLayer.eventMode = 'none';
      const fogLayer = new Container();
      fogLayer.eventMode = 'none';
      fogLayer.isRenderGroup = true;
      const selectionHandles = createSelectionHandles();

      const fundo = new Graphics();
      fundo.rect(-40000, -40000, 80000, 80000).fill({ color: 0x000000, alpha: 0 });
      fundo.eventMode = 'static';

      app.stage.eventMode = 'static';
      app.stage.addChild(fundo);
      world.addChild(
        mapaLayer,
        gridLayer,
        areasLayer,
        tokensLayer,
        foraLayer,
        fogLayer,
        paredesLayer,
        medidaLayer,
        selectionHandles
      );
      app.stage.addChild(world);

      pixiRef.current.initDone = true;
      Object.assign(pixiRef.current, {
        world,
        mapaLayer,
        gridLayer,
        areasLayer,
        paredesLayer,
        tokensLayer,
        foraLayer,
        medidaLayer,
        fogLayer,
        selectionHandles,
        fundo,
      });

      // ---- Pan, névoa, régua e ping --------------------------------
      let panejando = false;
      let pintando = false;
      let medindo = null;
      let desenhandoArea = null;
      let ultimo = { x: 0, y: 0 };

      function pintarNevoa(global) {
        const modo = liveRef.current.ferramenta;
        if (modo !== 'revelar' && modo !== 'esconder') return;
        const g = liveRef.current.gridSize;
        const p = world.toLocal(global);
        const chave = `${Math.floor(p.x / g)},${Math.floor(p.y / g)}`;
        const set = fogRevelaSetRef.current;
        const mudou = modo === 'revelar' ? !set.has(chave) : set.has(chave);
        if (!mudou) return;
        if (modo === 'revelar') set.add(chave);
        else set.delete(chave);
        setFogRevelado(Array.from(set));
      }

      app.stage.on('pointerdown', (e) => {
        const f = liveRef.current.ferramenta;

        if (e.altKey) {
          const p = world.toLocal(e.global);
          dispararPing(p.x, p.y);
          return;
        }
        if ((f === 'revelar' || f === 'esconder') && liveRef.current.ehMestre) {
          pintando = true;
          pintarNevoa(e.global);
          return;
        }
        if (f === 'token') {
          const p = world.toLocal(e.global);
          criarTokenRef.current({ mundo: p });
          setFerramenta('selecionar');
          return;
        }
        if (f === 'medir') {
          const p = world.toLocal(e.global);
          medindo = { de: p, para: p };
          setMedida({ ...medindo });
          return;
        }
        if (f === 'parede' && liveRef.current.ehMestre) {
          const p = world.toLocal(e.global);
          const g = liveRef.current.gridSize;
          const modo = liveRef.current.modoParede;
          const lista = liveRef.current.paredes || [];
          const alcance = Math.max(10, g * 0.25);

          // Mais perto de uma parede existente? Apaga ou abre/fecha a porta
          let maisPerto = null;
          let menor = Infinity;
          for (const w of lista) {
            const d = distanciaAoSegmento(p.x, p.y, w.x1, w.y1, w.x2, w.y2);
            if (d < menor) {
              menor = d;
              maisPerto = w;
            }
          }

          if (modo === 'apagar') {
            if (maisPerto && menor <= alcance) removerParedeRef.current(maisPerto.id);
            return;
          }
          if (maisPerto && menor <= alcance && maisPerto.tipo === 'porta') {
            alternarPortaRef.current(maisPerto);
            return;
          }

          // Encaixa nos cantos da grade, a menos que Alt esteja pressionado
          const ponto = e.altKey
            ? { x: p.x, y: p.y }
            : { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g };

          const anterior = liveRef.current.tracado;
          if (anterior) {
            criarParedeRef.current({
              tipo: modo,
              x1: anterior.x,
              y1: anterior.y,
              x2: ponto.x,
              y2: ponto.y,
            });
          }
          setTracado(ponto);
          return;
        }
        if (f === 'area') {
          const p = world.toLocal(e.global);
          const cfg = liveRef.current.configArea;
          desenhandoArea = {
            forma: cfg.forma,
            tamanho: cfg.tamanho,
            largura: 1.5,
            x: p.x,
            y: p.y,
            angulo: 0,
          };
          setPreviaArea({ ...desenhandoArea });
          return;
        }
        setSelectedId(null);
        panejando = true;
        ultimo = { x: e.global.x, y: e.global.y };
      });

      app.stage.on('globalpointermove', (e) => {
        if (pintando) {
          pintarNevoa(e.global);
          return;
        }
        if (liveRef.current.ferramenta === 'parede' && liveRef.current.tracado) {
          const p = world.toLocal(e.global);
          const g = liveRef.current.gridSize;
          const ponto = e.altKey
            ? { x: p.x, y: p.y }
            : { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g };
          setCursorParede(ponto);
          return;
        }
        if (desenhandoArea) {
          // Cone e linha apontam pra onde o cursor foi
          const p = world.toLocal(e.global);
          const angulo = Math.atan2(p.y - desenhandoArea.y, p.x - desenhandoArea.x);
          desenhandoArea = { ...desenhandoArea, angulo };
          setPreviaArea({ ...desenhandoArea });
          return;
        }
        if (medindo) {
          const p = world.toLocal(e.global);
          medindo = { ...medindo, para: p };
          setMedida({ ...medindo });
          return;
        }
        if (!panejando) return;
        const dx = e.global.x - ultimo.x;
        const dy = e.global.y - ultimo.y;
        ultimo = { x: e.global.x, y: e.global.y };
        setStagePos((prev) =>
          limitarPosRef.current({ x: prev.x + dx, y: prev.y + dy }, world.scale.x)
        );
      });

      function encerrar() {
        if (desenhandoArea) {
          criarAreaRef.current(desenhandoArea);
          desenhandoArea = null;
          setPreviaArea(null);
        }
        if (pintando) {
          pintando = false;
          salvarNevoaRef.current();
        }
        if (medindo) {
          medindo = null;
          setTimeout(() => setMedida(null), 1200);
        }
        panejando = false;
      }
      app.stage.on('pointerup', encerrar);
      app.stage.on('pointerupoutside', encerrar);
      window.addEventListener('pointerup', encerrar);

      // ---- Ping (alt + clique) --------------------------------------
      function dispararPing(x, y, remoto = false) {
        pixiRef.current?.pings.push({ x, y, t: 0 });
        if (!remoto) canalPing?.send({ type: 'broadcast', event: 'ping', payload: { x, y } });
      }
      pixiRef.current.dispararPing = dispararPing;

      const canalPing = sb
        .channel(`mesa-ping-${cenaId}`)
        .on('broadcast', { event: 'ping' }, ({ payload }) => {
          if (payload && typeof payload.x === 'number') dispararPing(payload.x, payload.y, true);
        })
        .subscribe();
      pixiRef.current.canalPing = canalPing;

      // Animação dos pings
      app.ticker.add((tick) => {
        const p = pixiRef.current;
        if (!p) return;
        const dt = tick.deltaMS / 1000;
        let mudou = false;
        for (const ping of p.pings) {
          ping.t += dt;
          mudou = true;
        }
        p.pings = p.pings.filter((x) => x.t < 1.6);
        if (mudou) desenharSobreposicoes();
      });

      // ---- Zoom ------------------------------------------------------
      function onWheel(e) {
        e.preventDefault();
        const rect = app.canvas.getBoundingClientRect();
        const ponteiro = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const antiga = world.scale.x;
        const alvo = {
          x: (ponteiro.x - world.position.x) / antiga,
          y: (ponteiro.y - world.position.y) / antiga,
        };
        const bruta = e.deltaY < 0 ? antiga * 1.1 : antiga / 1.1;
        const nova = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, bruta));
        setScale(nova);
        setStagePos(
          limitarPosRef.current({ x: ponteiro.x - alvo.x * nova, y: ponteiro.y - alvo.y * nova }, nova)
        );
      }
      app.canvas.addEventListener('wheel', onWheel, { passive: false });

      // ---- Régua e pings (camada de sobreposição) --------------------
      const linhaMedida = new Graphics();
      const textoMedida = new Text({
        text: '',
        style: { fontFamily: FONTE_SANS, fontSize: 13, fontWeight: '700', fill: CSS.texto },
      });
      const fundoTexto = new Graphics();
      const pingsG = new Graphics();
      medidaLayer.addChild(pingsG, linhaMedida, fundoTexto, textoMedida);
      Object.assign(pixiRef.current, { linhaMedida, textoMedida, fundoTexto, pingsG });

      function desenharSobreposicoes() {
        const p = pixiRef.current;
        if (!p) return;
        const inv = 1 / p.world.scale.x;
        p.pingsG.clear();
        for (const ping of p.pings) {
          const prog = ping.t / 1.6;
          const raio = (14 + prog * 46) * inv;
          p.pingsG
            .circle(ping.x, ping.y, raio)
            .stroke({ width: 3 * inv, color: COR.turquesa2, alpha: Math.max(0, 1 - prog) });
        }
      }
      pixiRef.current.desenharSobreposicoes = desenharSobreposicoes;

      // ---- Tokens ----------------------------------------------------
      function ligarToken(view, tokenId) {
        let arrastando = false;
        let inicioMundo = null;
        let inicioPos = null;
        let moveu = false;

        view.on('pointerdown', (e) => {
          // Com régua, névoa, novo token ou ping ativos, o clique passa direto
          // para a mesa em vez de selecionar/arrastar o token.
          const f = liveRef.current.ferramenta;
          if (f !== 'selecionar' || e.altKey) return;
          e.stopPropagation();
          setSelectedId(tokenId);
          const token = (liveRef.current.tokens || []).find((t) => t.id === tokenId);
          if (!podeControlarToken({
            ehMestre: liveRef.current.ehMestre,
            userId: liveRef.current.userId,
            token,
          })) return;
          arrastando = true;
          moveu = false;
          inicioMundo = world.toLocal(e.global);
          inicioPos = { x: view.position.x, y: view.position.y };
        });

        view.on('globalpointermove', (e) => {
          if (!arrastando) return;
          const p = world.toLocal(e.global);
          const dx = p.x - inicioMundo.x;
          const dy = p.y - inicioMundo.y;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moveu = true;
          view.position.set(inicioPos.x + dx, inicioPos.y + dy);

          const token = (liveRef.current.tokens || []).find((t) => t.id === tokenId);
          if (token && tokenId === liveRef.current.selectedId) {
            positionSelectionHandles(
              selectionHandles,
              { ...token, x: view.position.x, y: view.position.y },
              1 / world.scale.x
            );
          }
          // Mostra quanto o token já andou, e o limite de deslocamento dele
          if (moveu) {
            setMedida({
              de: { x: inicioPos.x, y: inicioPos.y },
              para: { x: view.position.x, y: view.position.y },
              limite: token?.deslocamento || 0,
              arrasto: true,
            });
          }
        });

        function fim() {
          if (!arrastando) return;
          arrastando = false;
          if (moveu) {
            moverTokenRef.current(tokenId, view.position.x, view.position.y);
            setTimeout(() => setMedida(null), 900);
          }
        }
        view.on('pointerup', fim);
        view.on('pointerupoutside', fim);
      }
      pixiRef.current.ligarToken = ligarToken;

      // ---- Handles de seleção ---------------------------------------
      let modoHandle = null;

      const iniciar = (tipo) => (e) => {
        e.stopPropagation();
        const id = liveRef.current.selectedId;
        const token = (liveRef.current.tokens || []).find((t) => t.id === id);
        if (!token) return;
        modoHandle = tipo;
        transformPendenteRef.current = { rotation: token.rotation, scaleX: token.scaleX };
      };

      const mover = (tipo) => (e) => {
        if (modoHandle !== tipo) return;
        const id = liveRef.current.selectedId;
        const token = (liveRef.current.tokens || []).find((t) => t.id === id);
        const view = pixiRef.current.tokenViews.get(id);
        if (!token || !view) return;
        const p = world.toLocal(e.global);

        if (tipo === 'rotate') {
          let deg = (Math.atan2(p.x - token.x, -(p.y - token.y)) * 180) / Math.PI;
          deg = Math.round((((deg % 360) + 360) % 360) / 15) * 15;
          view.giro.rotation = (deg * Math.PI) / 180;
          transformPendenteRef.current = { ...transformPendenteRef.current, rotation: deg };
          positionSelectionHandles(selectionHandles, { ...token, rotation: deg }, 1 / world.scale.x);
        } else {
          const dist = Math.hypot(p.x - token.x, p.y - token.y);
          const nova = Math.min(4, Math.max(0.4, dist / token.radius));
          view.giro.scale.set(nova, nova);
          view.sigla.scale.set(nova, nova);
          transformPendenteRef.current = { ...transformPendenteRef.current, scaleX: nova };
          positionSelectionHandles(selectionHandles, { ...token, scaleX: nova }, 1 / world.scale.x);
        }
      };

      function fimHandle() {
        if (!modoHandle) return;
        const id = liveRef.current.selectedId;
        const pendente = transformPendenteRef.current;
        modoHandle = null;
        transformPendenteRef.current = null;
        if (id && pendente) aplicarTransformRef.current(id, pendente);
      }

      selectionHandles.rotateHandle.on('pointerdown', iniciar('rotate'));
      selectionHandles.resizeHandle.on('pointerdown', iniciar('resize'));
      selectionHandles.rotateHandle.on('globalpointermove', mover('rotate'));
      selectionHandles.resizeHandle.on('globalpointermove', mover('resize'));
      selectionHandles.rotateHandle.on('pointerup', fimHandle);
      selectionHandles.rotateHandle.on('pointerupoutside', fimHandle);
      selectionHandles.resizeHandle.on('pointerup', fimHandle);
      selectionHandles.resizeHandle.on('pointerupoutside', fimHandle);

      pixiRef.current.limparWheel = () => app.canvas.removeEventListener('wheel', onWheel);
      pixiRef.current.limparJanela = () => window.removeEventListener('pointerup', encerrar);

      setReady(true);
    })();

    return () => {
      destruido = true;
      const p = pixiRef.current;
      pixiRef.current = null;
      if (p) {
        p.limparWheel?.();
        p.limparJanela?.();
        if (p.canalPing) sb.removeChannel(p.canalPing);
        if (p.initDone) p.app?.destroy(true, { children: true });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cenaId]);

  // Refs estáveis usadas dentro dos handlers do Pixi
  const autoTamanhoRef = useRef(false);
  const ehMestreRef = useRef(false);
  const cenaRef = useRef(null);
  const salvarCenaRef = useRef(() => {});
  const limitarPosRef = useRef((p) => p);
  const registrarRef = useRef(() => {});
  const criarAreaRef = useRef(() => {});
  const criarParedeRef = useRef(() => {});
  const removerParedeRef = useRef(() => {});
  const alternarPortaRef = useRef(() => {});
  autoTamanhoRef.current = cena?.mapa_auto_tamanho !== false;
  ehMestreRef.current = ehMestre;
  cenaRef.current = cena;
  salvarCenaRef.current = salvarCena;
  limitarPosRef.current = limitarPos;
  registrarRef.current = registrar;
  criarAreaRef.current = criarArea;
  criarParedeRef.current = criarParede;
  removerParedeRef.current = removerParede;
  alternarPortaRef.current = alternarPorta;

  const criarTokenRef = useRef(criarToken);
  const moverTokenRef = useRef(moverTokenFim);
  const aplicarTransformRef = useRef(aplicarTransform);
  const salvarNevoaRef = useRef(salvarNevoa);
  criarTokenRef.current = criarToken;
  moverTokenRef.current = moverTokenFim;
  aplicarTransformRef.current = aplicarTransform;
  salvarNevoaRef.current = salvarNevoa;

  // ------------------------------------------------------------------
  // Mapa de fundo
  // ------------------------------------------------------------------
  useEffect(() => {
    const p = pixiRef.current;
    if (!p?.mapaLayer || !ready) return;
    let cancelado = false;
    const url = cena?.mapa_url;

    p.mapaLayer.removeChildren();
    p.mapaSprite = null;
    setErroMapa('');
    if (!url) return;

    (async () => {
      try {
        // loadParser explícito: URLs sem extensão (ou com query string) não são
        // reconhecidas sozinhas pelo resolver do Pixi.
        const textura = await Assets.load({ src: url, loadParser: 'loadTextures' });
        if (cancelado || !pixiRef.current?.mapaLayer) return;
        const sprite = new Sprite(textura);
        sprite.anchor.set(0);
        sprite.position.set(0, 0);
        pixiRef.current.mapaLayer.addChild(sprite);
        pixiRef.current.mapaSprite = sprite;
        pixiRef.current.ajustarMapa?.();

        // Com "acompanhar a imagem" ligado, a área da mesa passa a ser
        // exatamente o tamanho da imagem. Só o mestre grava, pra não ter
        // vários clientes escrevendo a mesma coisa.
        if (autoTamanhoRef.current && ehMestreRef.current) {
          const w = Math.round(textura.width);
          const h = Math.round(textura.height);
          if (w > 0 && h > 0 && (cenaRef.current?.largura_px !== w || cenaRef.current?.altura_px !== h)) {
            salvarCenaRef.current({ largura_px: w, altura_px: h });
          }
        }
        setErroMapa('');
      } catch (e) {
        console.error('Falha ao carregar o mapa:', e);
        if (!cancelado) {
          setErroMapa(
            'Não consegui carregar a imagem do mapa. Se ela veio de outro site, salve o arquivo e use "Enviar imagem".'
          );
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [cena?.mapa_url, ready]);

  // O mapa preenche exatamente a área da mesa; sem área definida, fica no
  // tamanho original da imagem.
  useEffect(() => {
    const p = pixiRef.current;
    if (!p || !ready) return;
    const ajustar = () => {
      const sprite = pixiRef.current?.mapaSprite;
      if (!sprite || sprite.destroyed) return;
      if (limites) {
        sprite.width = limites.largura;
        sprite.height = limites.altura;
      } else {
        sprite.scale.set(1);
      }
      sprite.position.set(0, 0);
    };
    p.ajustarMapa = ajustar;
    ajustar();
  }, [limites, ready, cena?.mapa_url]);

  // ------------------------------------------------------------------
  // Redesenho: grid, névoa, régua
  // ------------------------------------------------------------------
  const redraw = useCallback(() => {
    const p = pixiRef.current;
    if (!p?.world || !ready) return;
    // Se alguma camada faltar, sai quieto em vez de derrubar a mesa inteira
    if (!p.gridLayer || !p.areasLayer || !p.paredesLayer || !p.foraLayer || !p.fogLayer) return;

    p.world.position.set(stagePos.x, stagePos.y);
    p.world.scale.set(scale, scale);

    const { width, height } = p.app.screen;
    const esq = -stagePos.x / scale;
    const topo = -stagePos.y / scale;
    const dir = esq + width / scale;
    const baixo = topo + height / scale;

    // Grade — desenhada só dentro da área da mesa, quando ela existe
    const cel = gridSize;
    const areaEsq = limites ? Math.max(esq, limites.x0) : esq;
    const areaDir = limites ? Math.min(dir, limites.x1) : dir;
    const areaTopo = limites ? Math.max(topo, limites.y0) : topo;
    const areaBaixo = limites ? Math.min(baixo, limites.y1) : baixo;

    const g = p.gridLayer;
    g.clear();

    if (areaDir > areaEsq && areaBaixo > areaTopo) {
      const x0 = Math.floor(areaEsq / cel) * cel;
      const x1 = Math.ceil(areaDir / cel) * cel;
      const y0 = Math.floor(areaTopo / cel) * cel;
      const y1 = Math.ceil(areaBaixo / cel) * cel;
      const cortaX = (v) => (limites ? Math.max(limites.x0, Math.min(limites.x1, v)) : v);
      const cortaY = (v) => (limites ? Math.max(limites.y0, Math.min(limites.y1, v)) : v);

      for (let x = x0; x <= x1; x += cel) {
        if (Math.round(x / cel) % 5 === 0) continue;
        if (limites && (x < limites.x0 || x > limites.x1)) continue;
        g.moveTo(x, cortaY(y0)).lineTo(x, cortaY(y1));
      }
      for (let y = y0; y <= y1; y += cel) {
        if (Math.round(y / cel) % 5 === 0) continue;
        if (limites && (y < limites.y0 || y > limites.y1)) continue;
        g.moveTo(cortaX(x0), y).lineTo(cortaX(x1), y);
      }
      g.stroke({ width: 1 / scale, color: COR.ouro, alpha: 0.14 });

      for (let x = x0; x <= x1; x += cel) {
        if (Math.round(x / cel) % 5 !== 0) continue;
        if (limites && (x < limites.x0 || x > limites.x1)) continue;
        g.moveTo(x, cortaY(y0)).lineTo(x, cortaY(y1));
      }
      for (let y = y0; y <= y1; y += cel) {
        if (Math.round(y / cel) % 5 !== 0) continue;
        if (limites && (y < limites.y0 || y > limites.y1)) continue;
        g.moveTo(cortaX(x0), y).lineTo(cortaX(x1), y);
      }
      g.stroke({ width: 1.4 / scale, color: COR.ouro, alpha: 0.3 });
    }

    // Fora da mesa: faixa "fantasma" ao redor (onde ainda dá pra arrastar a
    // tela) e, além dela, o vazio.
    p.foraLayer.clear();
    if (limites) {
      const vista = { x0: esq, y0: topo, x1: dir, y1: baixo };
      const area = { x0: limites.x0, y0: limites.y0, x1: limites.x1, y1: limites.y1 };
      const faixa = {
        x0: area.x0 - MARGEM_MESA,
        y0: area.y0 - MARGEM_MESA,
        x1: area.x1 + MARGEM_MESA,
        y1: area.y1 + MARGEM_MESA,
      };
      const faixaVisivel = intersecao(vista, faixa);
      const areaVisivel = intersecao(vista, area);

      // Vazio (fora até da faixa)
      for (const [x, y, w, h] of anelDeRetangulos(vista, faixaVisivel)) {
        p.foraLayer.rect(x, y, w, h).fill({ color: COR.vazio, alpha: 1 });
      }
      // Faixa fantasma
      if (faixaVisivel) {
        for (const [x, y, w, h] of anelDeRetangulos(faixaVisivel, areaVisivel)) {
          p.foraLayer.rect(x, y, w, h).fill({ color: COR.fundo, alpha: 1 });
        }
      }
      // Borda da área jogável
      p.foraLayer
        .rect(limites.x0, limites.y0, limites.largura, limites.altura)
        .stroke({ width: 2 / scale, color: COR.ouro, alpha: 0.55 });
    }

    // Névoa em três estados:
    //   nunca visto        → preto sólido
    //   explorado, sem ver → penumbra (memória do mapa)
    //   visível agora      → limpo
    p.fogLayer.removeChildren();
    if (fogAtivo) {
      const cobEsq = limites ? Math.max(esq, limites.x0) : esq;
      const cobTopo = limites ? Math.max(topo, limites.y0) : topo;
      const cobDir = limites ? Math.min(dir, limites.x1) : dir;
      const cobBaixo = limites ? Math.min(baixo, limites.y1) : baixo;
      const cobertura = new Graphics();
      if (cobDir > cobEsq && cobBaixo > cobTopo) {
        cobertura
          .rect(cobEsq, cobTopo, cobDir - cobEsq, cobBaixo - cobTopo)
          .fill({ color: 0x000000, alpha: comoJogador ? 1 : 0.45 });
      }
      p.fogLayer.addChild(cobertura);

      const colMin = Math.floor(esq / cel) - 1;
      const colMax = Math.ceil(dir / cel) + 1;
      const linMin = Math.floor(topo / cel) - 1;
      const linMax = Math.ceil(baixo / cel) + 1;
      const naVista = (col, lin) => col >= colMin && col <= colMax && lin >= linMin && lin <= linMax;

      const abertas = new Set(fogRevelado);
      if (celulasVisiveis) for (const chave of celulasVisiveis) abertas.add(chave);

      const buracos = new Graphics();
      for (const chave of abertas) {
        const [col, lin] = chave.split(',').map(Number);
        if (!naVista(col, lin)) continue;
        buracos.rect(col * cel, lin * cel, cel, cel);
      }
      buracos.fill(0x000000);
      buracos.blendMode = 'erase';
      p.fogLayer.addChild(buracos);

      // Penumbra sobre o que já foi explorado mas está fora da visão atual
      if (celulasVisiveis && comoJogador) {
        const veu = new Graphics();
        let algum = false;
        for (const chave of fogRevelado) {
          if (celulasVisiveis.has(chave)) continue;
          const [col, lin] = chave.split(',').map(Number);
          if (!naVista(col, lin)) continue;
          veu.rect(col * cel, lin * cel, cel, cel);
          algum = true;
        }
        if (algum) {
          veu.fill({ color: 0x000000, alpha: 0.68 });
          p.fogLayer.addChild(veu);
        }
      }
    }

    // Áreas de efeito e quem está dentro delas
    const a = p.areasLayer;
    a.clear();
    a.__escala = scale;
    const atingidos = new Set();
    const todasAreas = previaArea ? [...areas, previaArea] : areas;

    for (const area of todasAreas) {
      desenharArea(a, area, gridSize, area === previaArea ? { preenchimento: 0.1, traco: 0.5 } : undefined);
      for (const t of tokensComVida) {
        if (tokenNaArea(t, area, gridSize)) atingidos.add(t.id);
      }
    }

    for (const id of atingidos) {
      const t = tokensComVida.find((x) => x.id === id);
      if (!t || !tokenVisivelNaNevoa(t, contextoNevoa)) continue;
      a.circle(t.x, t.y, t.radius * (t.scaleX || 1) + 5 / scale).stroke({
        width: 2 / scale,
        color: COR.erro,
        alpha: 0.9,
      });
    }

    // Paredes — só o mestre vê o traçado
    const w = p.paredesLayer;
    w.clear();
    if (ehMestre && !verComoJogador && mostrarParedes) {
      for (const parede of paredes) {
        const info = TIPOS_PAREDE.find((t) => t.id === parede.tipo) || TIPOS_PAREDE[0];
        const aberta = parede.tipo === 'porta' && parede.aberta;
        w.moveTo(parede.x1, parede.y1).lineTo(parede.x2, parede.y2);
        w.stroke({
          width: (parede.tipo === 'janela' ? 2.5 : 3.5) / scale,
          color: info.cor,
          alpha: aberta ? 0.3 : 0.9,
        });
        for (const [px, py] of [
          [parede.x1, parede.y1],
          [parede.x2, parede.y2],
        ]) {
          w.circle(px, py, 3 / scale).fill({ color: info.cor, alpha: aberta ? 0.3 : 0.9 });
        }
      }

      // Segmento em construção
      if (tracado) {
        w.circle(tracado.x, tracado.y, 5 / scale).fill({ color: COR.texto, alpha: 0.9 });
        if (cursorParede) {
          const info = TIPOS_PAREDE.find((t) => t.id === modoParede) || TIPOS_PAREDE[0];
          w.moveTo(tracado.x, tracado.y).lineTo(cursorParede.x, cursorParede.y);
          w.stroke({ width: 3 / scale, color: info.cor, alpha: 0.5 });
        }
      }
    }

    // Régua
    const inv = 1 / scale;
    p.linhaMedida.clear();
    p.fundoTexto.clear();
    p.textoMedida.visible = false;
    if (medida) {
      const { de, para } = medida;
      p.linhaMedida
        .moveTo(de.x, de.y)
        .lineTo(para.x, para.y)
        .stroke({ width: 2 * inv, color: COR.turquesa, alpha: 0.95 });
      p.linhaMedida.circle(de.x, de.y, 4 * inv).fill(COR.turquesa);
      p.linhaMedida.circle(para.x, para.y, 4 * inv).fill(COR.turquesa);

      const distPx = Math.hypot(para.x - de.x, para.y - de.y);
      const quadrados = distPx / cel;
      const metros = quadrados * METROS_POR_QUADRADO;
      const limite = medida.limite || 0;
      const estourou = limite > 0 && metros > limite + 0.01;

      p.textoMedida.text = limite
        ? `${metros.toFixed(1)} m de ${limite} m${estourou ? ' — passou' : ''}`
        : `${quadrados.toFixed(1)} qd · ${metros.toFixed(1)} m`;
      p.textoMedida.style.fill = estourou ? CSS.erro : CSS.texto;
      p.textoMedida.scale.set(inv);
      p.textoMedida.position.set(para.x + 12 * inv, para.y - 22 * inv);
      p.textoMedida.visible = true;
      p.fundoTexto
        .roundRect(
          para.x + 8 * inv,
          para.y - 26 * inv,
          p.textoMedida.width + 10 * inv,
          p.textoMedida.height + 8 * inv,
          2
        )
        .fill({ color: COR.vazio, alpha: 0.88 })
        .stroke({ width: 1 * inv, color: COR.ouro, alpha: 0.3 });
    }

    p.desenharSobreposicoes?.();
  }, [
    ready,
    stagePos,
    scale,
    fogAtivo,
    fogRevelado,
    ehMestre,
    verComoJogador,
    comoJogador,
    celulasVisiveis,
    contextoNevoa,
    medida,
    gridSize,
    limites,
    areas,
    previaArea,
    tokensComVida,
    paredes,
    mostrarParedes,
    tracado,
    cursorParede,
    modoParede,
  ]);

  useEffect(() => {
    redraw();
    if (pixiRef.current) pixiRef.current.redraw = redraw;
  }, [redraw]);

  useEffect(() => {
    const p = pixiRef.current;
    if (!p?.app || !ready) return;
    const aoRedimensionar = () => {
      setStagePos((prev) => limitarPosRef.current(prev, p.world?.scale?.x || 1));
      pixiRef.current?.redraw?.();
    };
    p.app.renderer.on('resize', aoRedimensionar);
    return () => {
      p.app?.renderer?.off?.('resize', aoRedimensionar);
    };
  }, [ready]);

  // Ao definir/alterar a área, traz a vista de volta pra dentro dos limites
  useEffect(() => {
    if (!ready || !limites) return;
    setStagePos((prev) => limitarPos(prev, scale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limites, ready]);

  // Sincroniza tokens com o Pixi
  useEffect(() => {
    const p = pixiRef.current;
    if (!p?.tokensLayer || !ready) return;

    const vistos = new Set();
    for (const token of tokensComVida) {
      vistos.add(token.id);
      let view = p.tokenViews.get(token.id);
      if (!view) {
        view = createTokenView(token);
        p.ligarToken(view, token.id);
        p.tokensLayer.addChild(view);
        p.tokenViews.set(token.id, view);
      }
      redrawTokenView(view, token, token.id === selectedId);
      view.visible = tokenVisivelNaNevoa(token, contextoNevoa);
      view.eventMode = view.visible ? 'static' : 'none';
      view.zIndex = token.camada ?? 0;
    }

    for (const [id, view] of Array.from(p.tokenViews.entries())) {
      if (!vistos.has(id)) {
        view.destroy({ children: true });
        p.tokenViews.delete(id);
      }
    }

    const selecionado = tokensComVida.find((t) => t.id === selectedId) ?? null;
    const podeTransformar = podeControlarToken({
      ehMestre,
      userId: perfil?.id,
      token: selecionado,
    });
    if (selecionado && podeTransformar && tokenVisivelNaNevoa(selecionado, contextoNevoa)) {
      positionSelectionHandles(p.selectionHandles, selecionado, 1 / p.world.scale.x);
    }
    else p.selectionHandles.visible = false;
    if (selecionado && !tokenVisivelNaNevoa(selecionado, contextoNevoa)) setSelectedId(null);
  }, [tokensComVida, selectedId, ready, ehMestre, perfil?.id, contextoNevoa]);

  useEffect(() => {
    if (ferramenta !== 'parede') {
      setTracado(null);
      setCursorParede(null);
    }
  }, [ferramenta]);

  // Cursor conforme ferramenta
  useEffect(() => {
    const p = pixiRef.current;
    if (!p?.fundo) return;
    p.fundo.cursor =
      ferramenta === 'medir' ? 'crosshair' : ferramenta === 'token' ? 'copy' : ferramenta === 'selecionar' ? 'grab' : 'cell';
  }, [ferramenta, ready]);

  const tokenSelecionado = tokensComVida.find((t) => t.id === selectedId) ?? null;
  const podeEditarTokenSelecionado = podeControlarToken({
    ehMestre,
    userId: perfil?.id,
    token: tokenSelecionado,
  });
  const portas = paredes.filter((p) => p.tipo === 'porta');
  const ferramentasVisiveis = FERRAMENTAS.filter((f) => !f.mestreApenas || ehMestre).filter(
    (f) => !(f.id === 'revelar' || f.id === 'esconder') || fogAtivo
  );

  return (
    <div className={`mesa-wrap ${dockAberto ? 'com-dock' : ''}`}>
      {/* Barra superior: contexto e navegação */}
      <header className="mesa-topbar">
        <button className="mesa-btn mesa-btn--fantasma" onClick={onVoltarCampanha}>
          ← Campanha
        </button>
        <span className="mesa-brand">
          Allies <small>Mesa</small>
        </span>
        <div className="mesa-contexto">{seletor}</div>

        <div className="mesa-topbar-direita">
          {ehMestre && (
            <>
              <button
                className={`mesa-btn ${fogAtivo ? 'is-ativo' : ''}`}
                onClick={alternarFog}
                title="Liga ou desliga a névoa de guerra desta cena"
              >
                Névoa {fogAtivo ? 'ligada' : 'desligada'}
              </button>
              {fogAtivo && (
                <>
                  <button
                    className={`mesa-btn ${verComoJogador ? 'is-ativo' : ''}`}
                    onClick={() => setVerComoJogador((v) => !v)}
                  >
                    Ver como jogador
                  </button>
                  {verComoJogador && (
                    <select className="mesa-btn" aria-label="Jogador da prévia de visão"
                      value={donoDaVisao || ''} onChange={e => setObservadorId(e.target.value)}>
                      {!observadores.length && <option value="">Nenhum token de jogador</option>}
                      {observadores.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                    </select>
                  )}
                  <button className="mesa-btn" onClick={limparNevoa}>
                    Limpar
                  </button>
                </>
              )}
              <button
                className={`mesa-btn ${iluminacao === 'noite' ? 'is-ativo' : ''}`}
                onClick={() => salvarCena({ iluminacao: iluminacao === 'dia' ? 'noite' : 'dia' })}
                title="Dia: todos enxergam a área explorada. Noite: cada token enxerga só o próprio alcance."
              >
                {iluminacao === 'dia' ? '☀ Dia' : '☾ Noite'}
              </button>
              <button
                className="mesa-btn"
                onClick={() =>
                  setConfigMapa({
                    url: cena?.mapa_url || '',
                    grid: gridSize,
                    larguraPx: limites ? Math.round(limites.largura) : '',
                    alturaPx: limites ? Math.round(limites.altura) : '',
                    limitar: !!limites,
                    autoTamanho: cena?.mapa_auto_tamanho !== false,
                    visaoDinamica,
                    autoExplorar,
                    proporcao: null,
                    enviando: false,
                    erro: '',
                  })
                }
              >
                Cena
              </button>
            </>
          )}
          <span className="mesa-zoom">{Math.round(scale * 100)}%</span>
          <button className="mesa-btn" onClick={centralizar} title="Ajusta o zoom para a mesa caber na tela">
            {limites ? 'Enquadrar' : 'Centralizar'}
          </button>
          <button className="mesa-icone-btn" onClick={() => setMostrarAjuda((v) => !v)} title="Atalhos">
            ?
          </button>
          {sincronizando && <span className="mesa-sync">Sincronizando…</span>}
        </div>
      </header>

      {/* Trilho de ferramentas */}
      <nav className="mesa-trilho">
        {ferramentasVisiveis.map((f) => (
          <button
            key={f.id}
            className={`ferramenta ${ferramenta === f.id ? 'is-ativa' : ''}`}
            onClick={() => setFerramenta(f.id)}
            title={`${f.rotulo} (${f.atalho})`}
          >
            <span className="ferramenta-icone">{f.icone}</span>
            <span className="ferramenta-rotulo">{f.rotulo}</span>
          </button>
        ))}
      </nav>

      {/* Canvas */}
      <div ref={containerRef} className="mesa-stage">
        <Dado3DHost cenaId={cenaId} scale={scale} stagePos={stagePos} />
      </div>

      {ferramenta === 'parede' && ehMestre && (
        <div className="ferramenta-config">
          <span className="ferramenta-config-titulo">Paredes</span>
          <div className="ferramenta-config-grupo">
            {TIPOS_PAREDE.map((t) => (
              <button
                key={t.id}
                className={`mesa-btn ${modoParede === t.id ? 'is-ativo' : ''}`}
                onClick={() => {
                  setModoParede(t.id);
                  setTracado(null);
                }}
                title={t.dica}
              >
                {t.rotulo}
              </button>
            ))}
            <button
              className={`mesa-btn ${modoParede === 'apagar' ? 'is-ativo' : ''}`}
              onClick={() => {
                setModoParede('apagar');
                setTracado(null);
              }}
              title="Clique em cima de uma parede pra apagar"
            >
              Apagar
            </button>
          </div>

          <span className="token-bar-sep" />
          <button
            className={`mesa-btn ${mostrarParedes ? 'is-ativo' : ''}`}
            onClick={() => setMostrarParedes((v) => !v)}
            title="Esconde o traçado sem apagar nada"
          >
            Ver traçado
          </button>
          {tracado && (
            <button className="mesa-btn" onClick={() => setTracado(null)}>
              Encerrar linha
            </button>
          )}
          <button className="mesa-btn" onClick={limparParedes} disabled={paredes.length === 0}>
            Limpar tudo
          </button>

          <span className="ferramenta-config-dica">
            {modoParede === 'apagar'
              ? 'Clique em cima da parede pra apagar.'
              : tracado
                ? 'Clique pra continuar a linha · Esc encerra · Alt solta da grade.'
                : 'Clique pra começar. Os pontos encaixam nos cantos da grade.'}
          </span>

          {portas.length > 0 && (
            <div className="areas-postas">
              {portas.map((porta, i) => (
                <button
                  key={porta.id}
                  className={`area-chip ${porta.aberta ? 'is-aberta' : ''}`}
                  onClick={() => alternarPorta(porta)}
                >
                  Porta {i + 1} <em>{porta.aberta ? 'aberta' : 'fechada'}</em>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {ferramenta === 'area' && (
        <div className="ferramenta-config">
          <span className="ferramenta-config-titulo">Área de efeito</span>
          <div className="ferramenta-config-grupo">
            {FORMAS.map((f) => (
              <button
                key={f.id}
                className={`mesa-btn ${configArea.forma === f.id ? 'is-ativo' : ''}`}
                onClick={() => setConfigArea((c) => ({ ...c, forma: f.id }))}
                title={f.dica}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
          <span className="token-bar-sep" />
          <div className="ferramenta-config-grupo">
            {TAMANHOS_SUGERIDOS.map((t) => (
              <button
                key={t}
                className={`mesa-btn ${configArea.tamanho === t ? 'is-ativo' : ''}`}
                onClick={() => setConfigArea((c) => ({ ...c, tamanho: t }))}
              >
                {String(t).replace('.', ',')}m
              </button>
            ))}
          </div>
          <span className="token-bar-sep" />
          <button className="mesa-btn" onClick={limparAreas} disabled={areas.length === 0}>
            Limpar tudo
          </button>

          {areas.length > 0 && (
            <div className="areas-postas">
              {areas.map((a) => (
                <button
                  key={a.id}
                  className="area-chip"
                  onClick={() => removerArea(a.id)}
                  title="Remover esta área"
                >
                  {FORMAS.find((f) => f.id === a.forma)?.rotulo || a.forma} {String(a.tamanho).replace('.', ',')}m
                  <em>×</em>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {erroMapa && (
        <div className="mesa-aviso">
          {erroMapa}
          <button className="mesa-icone-btn" onClick={() => setErroMapa('')} title="Fechar">
            ×
          </button>
        </div>
      )}

      {/* Barra contextual do token selecionado */}
      {tokenSelecionado && (
        <div className="token-bar">
          <span className="token-bar-identidade">
            <span
              className="token-bar-avatar"
              style={
                tokenSelecionado.imagemUrl
                  ? { backgroundImage: `url(${tokenSelecionado.imagemUrl})` }
                  : { background: tokenSelecionado.color }
              }
            />
            <span className="token-bar-titulo">{tokenSelecionado.label || 'Token'}</span>
          </span>

          {podeEditarTokenSelecionado && tokenSelecionado.pvTotal > 0 && (
            <>
              <span className="token-bar-sep" />
              <span className="token-bar-pv">
                {tokenSelecionado.pvAtual}
                <small>/{tokenSelecionado.pvTotal}</small>
              </span>
              <button
                className="mesa-btn mesa-btn--dano"
                onClick={() => {
                  const v = Math.abs(parseInt(danoRapido, 10) || 0);
                  if (v) aplicarDanoNoToken(tokenSelecionado.id, v);
                  setDanoRapido('');
                }}
              >
                Dano
              </button>
              <input
                className="token-bar-dano"
                value={danoRapido}
                onChange={(e) => setDanoRapido(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  const v = Math.abs(parseInt(danoRapido, 10) || 0);
                  if (v) aplicarDanoNoToken(tokenSelecionado.id, e.shiftKey ? -v : v);
                  setDanoRapido('');
                }}
                placeholder="0"
                inputMode="numeric"
                title="Enter aplica dano · Shift+Enter cura"
              />
              <button
                className="mesa-btn mesa-btn--cura"
                onClick={() => {
                  const v = Math.abs(parseInt(danoRapido, 10) || 0);
                  if (v) aplicarDanoNoToken(tokenSelecionado.id, -v);
                  setDanoRapido('');
                }}
              >
                Cura
              </button>
            </>
          )}

          {tokenSelecionado.condicoes?.length > 0 && (
            <>
              <span className="token-bar-sep" />
              <span className="token-bar-condicoes">
                {tokenSelecionado.condicoes.map((id) => {
                  const c = CONDICAO_POR_ID[id];
                  if (!c) return null;
                  return (
                    <span
                      key={id}
                      className="token-bar-condicao"
                      style={{ background: `#${c.cor.toString(16).padStart(6, '0')}` }}
                      title={c.nome}
                    >
                      {c.sigla}
                    </span>
                  );
                })}
              </span>
            </>
          )}

          <span className="token-bar-sep" />
          <button
            className="mesa-btn"
            onClick={() => {
              setAbaDock('token');
              setDockAberto(true);
            }}
          >
            Detalhes
          </button>
          {podeEditarTokenSelecionado && (
            <button className="mesa-btn mesa-btn--perigo" onClick={removerToken}>
              Remover
            </button>
          )}
        </div>
      )}

      <input
        ref={inputImagemRef}
        type="file"
        accept="image/*"
        onChange={trocarImagemToken}
        style={{ display: 'none' }}
      />

      {/* Painel lateral */}
      <aside className={`mesa-dock ${dockAberto ? '' : 'is-fechado'}`}>
        <div className="dock-abas">
          {ABAS_DOCK.map((a) => (
            <button
              key={a.id}
              className={`dock-aba ${abaDock === a.id && dockAberto ? 'is-ativa' : ''}`}
              onClick={() => {
                if (abaDock === a.id && dockAberto) setDockAberto(false);
                else {
                  setAbaDock(a.id);
                  setDockAberto(true);
                }
              }}
            >
              {a.rotulo}
            </button>
          ))}
          <button
            className="dock-colapsar"
            onClick={() => setDockAberto((v) => !v)}
            title={dockAberto ? 'Recolher painel' : 'Abrir painel'}
          >
            {dockAberto ? '›' : '‹'}
          </button>
        </div>

        {dockAberto && perfil && (
          <div className="dock-conteudo">
            {abaDock === 'ficha' && (
              <FichaPanel
                campanhaId={campanhaId}
                cenaId={cenaId}
                userId={perfil.id}
                autorNome={perfil.nome}
                ehMestre={ehMestre}
                modoRolagem={modoRolagem}
                onModoRolagem={setModoRolagem}
                onCriarTokenDaFicha={criarTokenDaFicha}
              />
            )}
            {abaDock === 'token' && (
              <TokenPanel
                token={tokenSelecionado}
                ehMestre={ehMestre}
                podeEditar={podeEditarTokenSelecionado}
                fichas={fichas}
                fogAtivo={fogAtivo}
                visaoDinamica={visaoDinamica}
                onAtualizar={atualizarToken}
                onAlterarDados={alterarDadosToken}
                onDano={aplicarDanoNoToken}
                onRemover={removerToken}
                onRolarAtaque={rolarAtaqueDoToken}
                onEnviarImagem={() => inputImagemRef.current?.click()}
                onCamada={mudarCamada}
                enviandoImagem={enviandoImagem}
              />
            )}
            {abaDock === 'chat' && (
              <ChatPanel
                cenaId={cenaId}
                ehMestre={ehMestre}
                userId={perfil.id}
                autorNome={perfil.nome}
                modoRolagem={modoRolagem}
                onModoRolagem={setModoRolagem}
                alvo={tokenSelecionado}
                onAplicarDano={aplicarDanoNoToken}
              />
            )}
            {abaDock === 'iniciativa' && (
              <IniciativaPanel
                cenaId={cenaId}
                userId={perfil.id}
                autorNome={perfil.nome}
                ehMestre={ehMestre}
              />
            )}
            {abaDock === 'sons' && (
              <SoundboardPanel campanhaId={campanhaId} ehMestre={ehMestre} audio={audioMesa} />
            )}
          </div>
        )}
      </aside>

      {/* Configuração do mapa */}
      {configMapa && (
        <div className="mesa-modal-fundo" onClick={() => setConfigMapa(null)}>
          <div className="mesa-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Configuração da cena</h3>

            <div className="modal-mapa">
              {configMapa.url ? (
                <div className="modal-mapa-previa" style={{ backgroundImage: `url(${configMapa.url})` }} />
              ) : (
                <div className="modal-mapa-previa is-vazia">Sem mapa</div>
              )}
              <div className="modal-mapa-acoes">
                <input
                  ref={inputMapaRef}
                  type="file"
                  accept="image/*"
                  onChange={enviarMapaArquivo}
                  style={{ display: 'none' }}
                />
                <button
                  className="mesa-btn mesa-btn--primario"
                  onClick={() => inputMapaRef.current?.click()}
                  disabled={configMapa.enviando}
                >
                  {configMapa.enviando ? 'Enviando…' : 'Enviar imagem'}
                </button>
                {configMapa.url && (
                  <button
                    className="mesa-btn"
                    onClick={() => setConfigMapa((c) => ({ ...c, url: '' }))}
                    disabled={configMapa.enviando}
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
            {configMapa.erro && <p className="chat-erro">{configMapa.erro}</p>}

            <label className="modal-campo">
              <span>Ou cole uma URL</span>
              <div className="modal-url">
                <input
                  value={configMapa.url}
                  onChange={(e) => setConfigMapa((c) => ({ ...c, url: e.target.value }))}
                  placeholder="https://…"
                />
                <button
                  className="mesa-btn"
                  onClick={importarMapaDaUrl}
                  disabled={configMapa.enviando || !configMapa.url.trim()}
                  title="Baixa a imagem e hospeda junto com a campanha — sem isso, sites que bloqueiam CORS não aparecem no mapa"
                >
                  Importar
                </button>
              </div>
            </label>

            <label className="modal-opcao">
              <input
                type="checkbox"
                checked={configMapa.limitar}
                onChange={(e) => setConfigMapa((c) => ({ ...c, limitar: e.target.checked }))}
              />
              <span>
                <b>Limitar a mesa a uma área</b>
                <em>A grade existe só dentro do retângulo definido. Fora dele fica escuro e sem grade.</em>
              </span>
            </label>

            {configMapa.limitar && (
              <>
                <label className="modal-opcao">
                  <input
                    type="checkbox"
                    checked={configMapa.autoTamanho}
                    onChange={(e) => setConfigMapa((c) => ({ ...c, autoTamanho: e.target.checked }))}
                  />
                  <span>
                    <b>Acompanhar o tamanho da imagem</b>
                    <em>A área fica igual à imagem do mapa, sem esticar. Troque o mapa e a área se ajusta sozinha.</em>
                  </span>
                </label>

                <div className="modal-area">
                  <label className="modal-campo">
                    <span>Largura (px)</span>
                    <input
                      type="number"
                      min="1"
                      value={configMapa.larguraPx}
                      disabled={configMapa.autoTamanho}
                      onChange={(e) => setConfigMapa((c) => ({ ...c, larguraPx: e.target.value }))}
                    />
                  </label>
                  <label className="modal-campo">
                    <span>Altura (px)</span>
                    <input
                      type="number"
                      min="1"
                      value={configMapa.alturaPx}
                      disabled={configMapa.autoTamanho}
                      onChange={(e) => setConfigMapa((c) => ({ ...c, alturaPx: e.target.value }))}
                    />
                  </label>
                  {!configMapa.autoTamanho && configMapa.proporcao && (
                    <button
                      className="mesa-btn"
                      onClick={() =>
                        setConfigMapa((c) => ({
                          ...c,
                          alturaPx: Math.max(1, Math.round((Number(c.larguraPx) || 1) / c.proporcao)),
                        }))
                      }
                      title="Ajusta a altura pela proporção da imagem"
                    >
                      Manter proporção da imagem
                    </button>
                  )}
                  <p className="modal-medida">
                    {(() => {
                      const grid = Math.max(10, Number(configMapa.grid) || GRID_PADRAO);
                      const c = (Number(configMapa.larguraPx) || 0) / grid;
                      const l = (Number(configMapa.alturaPx) || 0) / grid;
                      if (!c || !l) return 'Defina a área da mesa.';
                      return `≈ ${c.toFixed(1)} × ${l.toFixed(1)} quadrados · ${(c * METROS_POR_QUADRADO).toFixed(0)} × ${(
                        l * METROS_POR_QUADRADO
                      ).toFixed(0)} m`;
                    })()}
                  </p>
                </div>
              </>
            )}

            <label className="modal-campo">
              <span>Tamanho do quadrado (px)</span>
              <input
                type="number"
                value={configMapa.grid}
                onChange={(e) => setConfigMapa((c) => ({ ...c, grid: e.target.value }))}
              />
            </label>

            <div className="modal-opcoes">
              <label className="modal-opcao">
                <input
                  type="checkbox"
                  checked={configMapa.visaoDinamica}
                  onChange={(e) => setConfigMapa((c) => ({ ...c, visaoDinamica: e.target.checked }))}
                />
                <span>
                  <b>Visão por token</b>
                  <em>À noite, cada jogador só enxerga o alcance de visão do próprio personagem.</em>
                </span>
              </label>
              <label className="modal-opcao">
                <input
                  type="checkbox"
                  checked={configMapa.autoExplorar}
                  onChange={(e) => setConfigMapa((c) => ({ ...c, autoExplorar: e.target.checked }))}
                />
                <span>
                  <b>Explorar andando</b>
                  <em>O que o token enxerga fica revelado no mapa daqui pra frente.</em>
                </span>
              </label>
            </div>

            <p className="modal-dica">
              O mapa preenche exatamente a área definida. Para casar a grade com o desenho do mapa, mexa no tamanho do
              quadrado. Um quadrado equivale a {METROS_POR_QUADRADO} m.
            </p>
            <div className="modal-acoes">
              <button
                className="mesa-btn mesa-btn--primario"
                disabled={configMapa.enviando}
                onClick={async () => {
                  // URL de fora precisa vir pro nosso storage, senão o canvas
                  // não consegue desenhar (CORS). Fazemos isso sem o mestre
                  // precisar clicar em "Importar".
                  let url = (configMapa.url || '').trim();
                  if (url && !url.includes('/storage/v1/object/public/mesa-')) {
                    setConfigMapa((c) => ({ ...c, enviando: true, erro: '' }));
                    try {
                      url = await importarDeUrl(url, `mapas/${campanhaId}`, { mapa: true });
                    } catch (erro) {
                      setConfigMapa((c) =>
                        c ? { ...c, enviando: false, erro: erro.message || 'Falha ao importar a URL.' } : c
                      );
                      return;
                    }
                  }

                  const larguraPx = Math.max(1, Math.round(Number(configMapa.larguraPx) || 0));
                  const alturaPx = Math.max(1, Math.round(Number(configMapa.alturaPx) || 0));
                  const limitar = configMapa.limitar && larguraPx > 1 && alturaPx > 1;
                  salvarCena({
                    mapa_url: url || null,
                    grid_tamanho: Math.max(10, Number(configMapa.grid) || GRID_PADRAO),
                    largura_px: limitar ? larguraPx : null,
                    altura_px: limitar ? alturaPx : null,
                    mapa_auto_tamanho: !!configMapa.autoTamanho,
                    visao_dinamica: !!configMapa.visaoDinamica,
                    auto_explorar: !!configMapa.autoExplorar,
                  });
                  setConfigMapa(null);
                }}
              >
                {configMapa.enviando ? 'Importando…' : 'Aplicar'}
              </button>
              <button className="mesa-btn" onClick={() => setConfigMapa(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ajuda */}
      {mostrarAjuda && (
        <div className="mesa-ajuda">
          <strong>Atalhos</strong>
          <ul>
            <li><b>W A S D</b> ou setas: move o token selecionado uma casa</li>
            <li><b>V</b> selecionar e arrastar o mapa</li>
            <li><b>T</b> colocar token no ponto clicado</li>
            <li><b>M</b> medir distância</li>
            <li><b>Q</b> área de efeito (arraste pra mirar cone e linha)</li>
            <li><b>P</b> paredes · <b>R</b> revelar · <b>C</b> cobrir névoa</li>
            <li><b>Alt + clique</b> ping para todos</li>
            <li><b>Ctrl+Z</b> desfazer no mapa</li>
            <li><b>Delete</b> remover token selecionado</li>
            <li><b>Esc</b> cancelar</li>
            <li>Roda do mouse: zoom · arrastar token mostra a distância</li>
          </ul>
          <button className="mesa-btn" onClick={() => setMostrarAjuda(false)}>
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
