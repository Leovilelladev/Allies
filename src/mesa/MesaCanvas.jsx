import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Text, Transformer } from 'react-konva';
import Token, { tokenColor } from './Token';
import ChatPanel from './ChatPanel';
import IniciativaPanel from './IniciativaPanel';
import SoundboardPanel from './SoundboardPanel';
import { sb } from '../shared/supabaseClient';

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const GRID_SIZE = 70; // px por célula no zoom 1x
const GRID_COLOR = 'rgba(243, 242, 242, 0.13)';
const GRID_COLOR_STRONG = 'rgba(243, 242, 242, 0.26)';
const TOKEN_RADIUS = 28;

let contadorTokens = 0;

function snapToGrid(value) {
  return Math.floor(value / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
}

function linhaParaToken(row) {
  return {
    id: row.id,
    x: row.x,
    y: row.y,
    rotation: row.rotacao,
    scaleX: row.escala,
    scaleY: row.escala,
    radius: row.raio,
    color: row.cor,
    label: row.nome,
    camada: row.camada ?? 0,
    fichaId: row.ficha_id ?? null,
  };
}

const ROTATION_SNAPS = Array.from({ length: 24 }, (_, i) => i * 15);

export default function MesaCanvas({ cenaId, campanhaId, seletor, onVoltarCampanha }) {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [tokens, setTokens] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sincronizando, setSincronizando] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [ehMestre, setEhMestre] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showIniciativa, setShowIniciativa] = useState(false);
  const [showSoundboard, setShowSoundboard] = useState(false);
  const [fichas, setFichas] = useState([]);
  const [fogAtivo, setFogAtivo] = useState(false);
  const [fogRevelado, setFogRevelado] = useState([]);
  const [modoNevoa, setModoNevoa] = useState(null); // null | 'revelar' | 'esconder'
  const [verComoJogador, setVerComoJogador] = useState(false);
  const isPanning = useRef(false);
  const isPintandoNevoa = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const shapeRefs = useRef({});
  const trRef = useRef(null);
  const userIdRef = useRef(null);
  const fogRevelaSetRef = useRef(new Set());

  // Reajusta tamanho do stage no redimensionamento da janela
  useEffect(() => {
    function onResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Carrega tokens e névoa da cena e assina atualizações Realtime
  useEffect(() => {
    let ativo = true;
    if (!cenaId) return;

    async function carregar() {
      const { data: userData } = await sb.auth.getUser();
      const uid = userData?.user?.id ?? null;
      if (!ativo) return;
      userIdRef.current = uid;

      if (uid) {
        const { data: perfilData } = await sb
          .from('profiles')
          .select('nome, usuario')
          .eq('id', uid)
          .single();
        if (ativo) {
          setPerfil({ id: uid, nome: perfilData?.nome || perfilData?.usuario || 'Anônimo' });
        }
      }

      if (uid && campanhaId) {
        const { data: campanhaData } = await sb
          .from('campanhas')
          .select('mestre_id')
          .eq('id', campanhaId)
          .single();
        if (ativo) setEhMestre(campanhaData?.mestre_id === uid);

        const { data: fichasData } = await sb
          .from('fichas')
          .select('id, nome_personagem, usuario_id')
          .eq('campanha_id', campanhaId);
        if (ativo) setFichas(fichasData ?? []);
      }

      const { data: cenaData, error: cenaError } = await sb
        .from('cenas')
        .select('fog_ativo, fog_revelado')
        .eq('id', cenaId)
        .single();
      if (!ativo) return;
      if (cenaError) {
        console.error('Falha ao carregar estado da cena:', cenaError.message);
      } else if (cenaData) {
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
      if (error) {
        console.error('Falha ao carregar tokens:', error.message);
      } else if (data) {
        setTokens(data.map(linhaParaToken));
      }
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
              const semTemp = prev.filter((t) => !(t.id.startsWith('temp-') && t.label === novo.label));
              return semTemp.some((t) => t.id === novo.id) ? semTemp : [...semTemp, novo];
            });
          } else if (payload.eventType === 'UPDATE') {
            const atualizado = linhaParaToken(payload.new);
            setTokens((prev) => prev.map((t) => (t.id === atualizado.id ? atualizado : t)));
          } else if (payload.eventType === 'DELETE') {
            setTokens((prev) => prev.filter((t) => t.id !== payload.old.id));
            delete shapeRefs.current[payload.old.id];
            setSelectedId((atual) => (atual === payload.old.id ? null : atual));
          }
        }
      )
      .subscribe();

    const canalCena = sb
      .channel(`mesa-cena-${cenaId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cenas', filter: `id=eq.${cenaId}` },
        (payload) => {
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

  // Navegação: Pan e Zoom
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const zoomFactor = 1.1;
    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const rawScale = direction > 0 ? oldScale * zoomFactor : oldScale / zoomFactor;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));

    setScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, []);

  const pontoTelaParaMundo = useCallback(
    (posTela) => ({
      x: (posTela.x - stagePos.x) / scale,
      y: (posTela.y - stagePos.y) / scale,
    }),
    [stagePos, scale]
  );

  const pontoParaChaveGrade = useCallback((mundo) => {
    const col = Math.floor(mundo.x / GRID_SIZE);
    const row = Math.floor(mundo.y / GRID_SIZE);
    return `${col},${row}`;
  }, []);

  const aplicarPinturaNevoaNoPonto = useCallback(
    (posTela) => {
      if (!modoNevoa) return;
      const mundo = pontoTelaParaMundo(posTela);
      const chave = pontoParaChaveGrade(mundo);
      const set = fogRevelaSetRef.current;
      const alterou = modoNevoa === 'revelar' ? !set.has(chave) : set.has(chave);
      if (!alterou) return;

      if (modoNevoa === 'revelar') set.add(chave);
      else set.delete(chave);

      setFogRevelado(Array.from(set));
    },
    [modoNevoa, pontoTelaParaMundo, pontoParaChaveGrade]
  );

  const salvarNevoaNoBanco = useCallback(() => {
    const lista = Array.from(fogRevelaSetRef.current);
    sb.from('cenas')
      .update({ fog_revelado: lista })
      .eq('id', cenaId)
      .then(({ error }) => {
        if (error) console.error('Falha ao salvar névoa:', error.message);
      });
  }, [cenaId]);

  const handleMouseDown = useCallback(
    (e) => {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (modoNevoa && ehMestre) {
        isPintandoNevoa.current = true;
        const pos = e.target.getStage().getPointerPosition();
        if (pos) aplicarPinturaNevoaNoPonto(pos);
        return;
      }
      if (clickedOnEmpty) {
        setSelectedId(null);
        isPanning.current = true;
        lastPointer.current = { x: e.evt.clientX, y: e.evt.clientY };
      }
    },
    [modoNevoa, ehMestre, aplicarPinturaNevoaNoPonto]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (isPintandoNevoa.current && modoNevoa) {
        const pos = e.target.getStage().getPointerPosition();
        if (pos) aplicarPinturaNevoaNoPonto(pos);
        return;
      }
      if (!isPanning.current) return;
      const dx = e.evt.clientX - lastPointer.current.x;
      const dy = e.evt.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.evt.clientX, y: e.evt.clientY };
      setStagePos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    },
    [modoNevoa, aplicarPinturaNevoaNoPonto]
  );

  const handleMouseUp = useCallback(() => {
    if (isPintandoNevoa.current) {
      isPintandoNevoa.current = false;
      salvarNevoaNoBanco();
    }
    isPanning.current = false;
  }, [salvarNevoaNoBanco]);

  const alternarFogAtivo = useCallback(() => {
    const proximo = !fogAtivo;
    setFogAtivo(proximo);
    if (!proximo) setModoNevoa(null);
    sb.from('cenas')
      .update({ fog_ativo: proximo })
      .eq('id', cenaId)
      .then(({ error }) => {
        if (error) console.error('Falha ao alternar névoa ativa:', error.message);
      });
  }, [fogAtivo, cenaId]);

  const limparNevoa = useCallback(() => {
    fogRevelaSetRef.current = new Set();
    setFogRevelado([]);
    sb.from('cenas')
      .update({ fog_revelado: [] })
      .eq('id', cenaId)
      .then(({ error }) => {
        if (error) console.error('Falha ao limpar névoa:', error.message);
      });
  }, [cenaId]);

  const resetView = useCallback(() => {
    setScale(1);
    setStagePos({ x: size.width / 2, y: size.height / 2 });
  }, [size]);

  // Manipulação de Tokens
  const addToken = useCallback(() => {
    contadorTokens += 1;
    const viewCenterX = (-stagePos.x + size.width / 2) / scale;
    const viewCenterY = (-stagePos.y + size.height / 2) / scale;
    const x = snapToGrid(viewCenterX);
    const y = snapToGrid(viewCenterY);

    const proximaCamada = tokens.length > 0 ? Math.max(...tokens.map((t) => t.camada ?? 0)) + 1 : 0;
    const tempId = `temp-${Date.now()}`;
    const cor = tokenColor(tokens.length);
    const nome = `T${contadorTokens}`;

    const novoLocal = {
      id: tempId,
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      radius: TOKEN_RADIUS,
      color: cor,
      label: nome,
      camada: proximaCamada,
      fichaId: null,
    };
    setTokens((prev) => [...prev, novoLocal]);
    setSelectedId(tempId);

    sb.from('mesa_tokens')
      .insert({
        cena_id: cenaId,
        nome,
        cor,
        x,
        y,
        raio: TOKEN_RADIUS,
        rotacao: 0,
        escala: 1,
        camada: proximaCamada,
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Falha ao persistir token:', error.message);
          setTokens((prev) => prev.filter((t) => t.id !== tempId));
          return;
        }
        if (data) {
          const definitivo = linhaParaToken(data);
          setTokens((prev) => prev.map((t) => (t.id === tempId ? definitivo : t)));
          setSelectedId((atual) => (atual === tempId ? definitivo.id : atual));
        }
      });
  }, [cenaId, stagePos, size, scale, tokens]);

  const handleTokenDragEnd = useCallback((id, rawX, rawY) => {
    const x = snapToGrid(rawX);
    const y = snapToGrid(rawY);

    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));

    const node = shapeRefs.current[id];
    if (node) {
      node.position({ x, y });
      node.getLayer()?.batchDraw();
    }

    if (!id.startsWith('temp-')) {
      sb.from('mesa_tokens')
        .update({ x, y })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Falha ao atualizar posição do token:', error.message);
        });
    }
  }, []);

  const handleTransformEnd = useCallback(
    (id) => {
      const node = shapeRefs.current[id];
      if (!node) return;

      const scaleX = node.scaleX();
      const rotation = Math.round(node.rotation()) % 360;
      const x = Math.round(node.x());
      const y = Math.round(node.y());

      setTokens((prev) =>
        prev.map((t) => (t.id === id ? { ...t, x, y, rotation, scaleX, scaleY: scaleX } : t))
      );

      if (!id.startsWith('temp-')) {
        sb.from('mesa_tokens')
          .update({ x, y, rotacao: rotation, escala: scaleX })
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('Falha ao atualizar transformação do token:', error.message);
          });
      }
    },
    []
  );

  const mudarCamada = useCallback(
    (direcao) => {
      if (!selectedId) return;
      const camadasAtuais = tokens.map((t) => t.camada ?? 0);
      const minCamada = Math.min(...camadasAtuais, 0);
      const maxCamada = Math.max(...camadasAtuais, 0);
      const novaCamada = direcao === 'frente' ? maxCamada + 1 : minCamada - 1;

      setTokens((prev) => prev.map((t) => (t.id === selectedId ? { ...t, camada: novaCamada } : t)));
      if (!selectedId.startsWith('temp-')) {
        sb.from('mesa_tokens')
          .update({ camada: novaCamada })
          .eq('id', selectedId)
          .then(({ error }) => {
            if (error) console.error('Falha ao atualizar camada:', error.message);
          });
      }
    },
    [selectedId, tokens]
  );

  const vincularFicha = useCallback(
    (fichaId) => {
      if (!selectedId) return;
      const valor = fichaId || null;
      setTokens((prev) => prev.map((t) => (t.id === selectedId ? { ...t, fichaId: valor } : t)));
      if (!selectedId.startsWith('temp-')) {
        sb.from('mesa_tokens')
          .update({ ficha_id: valor })
          .eq('id', selectedId)
          .then(({ error }) => {
            if (error) console.error('Falha ao vincular ficha ao token:', error.message);
          });
      }
    },
    [selectedId]
  );

  const removeSelectedToken = useCallback(() => {
    if (!selectedId) return;
    const idParaRemover = selectedId;
    setTokens((prev) => prev.filter((t) => t.id !== idParaRemover));
    delete shapeRefs.current[idParaRemover];
    setSelectedId(null);
    if (!idParaRemover.startsWith('temp-')) {
      sb.from('mesa_tokens')
        .delete()
        .eq('id', idParaRemover)
        .then(({ error }) => {
          if (error) console.error('Falha ao remover token:', error.message);
        });
    }
  }, [selectedId]);

  // Teclado: Delete ou Backspace remove token
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        removeSelectedToken();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, removeSelectedToken]);

  // Transformer do Konva
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedId ? shapeRefs.current[selectedId] : null;
    if (node) {
      tr.nodes([node]);
      tr.getLayer().batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [selectedId, tokens.length]);

  const limitesVisiveis = useMemo(() => {
    const viewLeft = -stagePos.x / scale;
    const viewTop = -stagePos.y / scale;
    return {
      viewLeft,
      viewTop,
      viewRight: viewLeft + size.width / scale,
      viewBottom: viewTop + size.height / scale,
    };
  }, [stagePos, scale, size]);

  // Grid
  const gridLines = useMemo(() => {
    const lines = [];
    const cell = GRID_SIZE;
    const { viewLeft, viewTop, viewRight, viewBottom } = limitesVisiveis;

    const startX = Math.floor(viewLeft / cell) * cell;
    const endX = Math.ceil(viewRight / cell) * cell;
    const startY = Math.floor(viewTop / cell) * cell;
    const endY = Math.ceil(viewBottom / cell) * cell;

    for (let x = startX; x <= endX; x += cell) {
      const strong = x % (cell * 5) === 0;
      lines.push(
        <Line
          key={`v${x}`}
          points={[x, startY, x, endY]}
          stroke={strong ? GRID_COLOR_STRONG : GRID_COLOR}
          strokeWidth={strong ? 1.4 / scale : 1 / scale}
        />
      );
    }
    for (let y = startY; y <= endY; y += cell) {
      const strong = y % (cell * 5) === 0;
      lines.push(
        <Line
          key={`h${y}`}
          points={[startX, y, endX, y]}
          stroke={strong ? GRID_COLOR_STRONG : GRID_COLOR}
          strokeWidth={strong ? 1.4 / scale : 1 / scale}
        />
      );
    }
    return lines;
  }, [limitesVisiveis, scale]);

  const buracosDeNevoaVisiveis = useMemo(() => {
    if (!fogAtivo || fogRevelado.length === 0) return [];
    const { viewLeft, viewTop, viewRight, viewBottom } = limitesVisiveis;
    const colMin = Math.floor(viewLeft / GRID_SIZE) - 1;
    const colMax = Math.ceil(viewRight / GRID_SIZE) + 1;
    const rowMin = Math.floor(viewTop / GRID_SIZE) - 1;
    const rowMax = Math.ceil(viewBottom / GRID_SIZE) + 1;
    return fogRevelado
      .map((chave) => chave.split(',').map(Number))
      .filter(([col, row]) => col >= colMin && col <= colMax && row >= rowMin && row <= rowMax);
  }, [fogAtivo, fogRevelado, limitesVisiveis]);

  const tokenSelecionado = useMemo(
    () => tokens.find((t) => t.id === selectedId) ?? null,
    [tokens, selectedId]
  );

  const tokensOrdenados = useMemo(
    () => [...tokens].sort((a, b) => (a.camada ?? 0) - (b.camada ?? 0)),
    [tokens]
  );

  return (
    <div className="mesa-wrap">
      <div className="mesa-topbar">
        <button className="mesa-btn" onClick={onVoltarCampanha} title="Voltar para a campanha">
          ← Campanha
        </button>
        <span className="mesa-brand">
          Allies <small>Mesa Virtual</small>
        </span>
        {seletor}
        <span className="mesa-topbar-sep" />
        <button className="mesa-btn" onClick={addToken} disabled={sincronizando}>
          + Token
        </button>
        <button className="mesa-btn" onClick={removeSelectedToken} disabled={!selectedId}>
          Remover token
        </button>
        <button className="mesa-btn" onClick={() => mudarCamada('frente')} disabled={!selectedId}>
          Pra frente
        </button>
        <button className="mesa-btn" onClick={() => mudarCamada('atras')} disabled={!selectedId}>
          Pra trás
        </button>
        {ehMestre && selectedId && (
          <select
            className="mesa-select"
            value={tokenSelecionado?.fichaId || ''}
            onChange={(e) => vincularFicha(e.target.value)}
            title="Vincular token a uma ficha"
          >
            <option value="">Sem ficha vinculada</option>
            {fichas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome_personagem}
              </option>
            ))}
          </select>
        )}
        <button className="mesa-btn" onClick={() => setShowChat((v) => !v)}>
          {showChat ? 'Fechar chat' : 'Chat'}
        </button>
        <button className="mesa-btn" onClick={() => setShowIniciativa((v) => !v)}>
          {showIniciativa ? 'Fechar iniciativa' : 'Iniciativa'}
        </button>
        <button className="mesa-btn" onClick={() => setShowSoundboard((v) => !v)}>
          {showSoundboard ? 'Fechar sons' : 'Sons'}
        </button>
        {ehMestre && (
          <>
            <button
              className={`mesa-btn ${fogAtivo ? 'mesa-btn--ativo' : ''}`}
              onClick={alternarFogAtivo}
            >
              Névoa: {fogAtivo ? 'Ligada' : 'Desligada'}
            </button>
            {fogAtivo && (
              <>
                <button
                  className={`mesa-btn ${modoNevoa === 'revelar' ? 'mesa-btn--ativo' : ''}`}
                  onClick={() => setModoNevoa((m) => (m === 'revelar' ? null : 'revelar'))}
                >
                  Revelar
                </button>
                <button
                  className={`mesa-btn ${modoNevoa === 'esconder' ? 'mesa-btn--ativo' : ''}`}
                  onClick={() => setModoNevoa((m) => (m === 'esconder' ? null : 'esconder'))}
                >
                  Esconder
                </button>
                <button className="mesa-btn" onClick={limparNevoa}>
                  Limpar névoa
                </button>
                <button
                  className={`mesa-btn ${verComoJogador ? 'mesa-btn--ativo' : ''}`}
                  onClick={() => setVerComoJogador((v) => !v)}
                >
                  Ver como jogador
                </button>
              </>
            )}
          </>
        )}
        <span className="mesa-zoom">{Math.round(scale * 100)}%</span>
        <button className="mesa-btn" onClick={resetView}>
          Centralizar
        </button>
        {sincronizando && <span className="mesa-sync">Sincronizando…</span>}
      </div>

      {showChat && perfil && (
        <ChatPanel cenaId={cenaId} userId={perfil.id} autorNome={perfil.nome} />
      )}
      {showIniciativa && perfil && (
        <IniciativaPanel
          cenaId={cenaId}
          userId={perfil.id}
          autorNome={perfil.nome}
          ehMestre={ehMestre}
          deslocado={showChat}
        />
      )}
      {showSoundboard && (
        <SoundboardPanel cenaId={cenaId} campanhaId={campanhaId} ehMestre={ehMestre} />
      )}

      <Stage
        width={size.width}
        height={size.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={scale}
        scaleY={scale}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="mesa-stage"
      >
        <Layer listening={false}>
          {gridLines}
          <Text
            text="Arraste para mover · role o mouse para zoom · + Token pra adicionar"
            x={20}
            y={20}
            fontSize={16 / scale}
            fontFamily="Archivo, system-ui, sans-serif"
            fill="rgba(235, 224, 195, 0.35)"
          />
        </Layer>

        <Layer>
          {tokensOrdenados.map((token) => (
            <Token
              key={token.id}
              token={token}
              isSelected={token.id === selectedId}
              onSelect={() => setSelectedId(token.id)}
              onDragEnd={handleTokenDragEnd}
              shapeRef={(node) => {
                if (node) shapeRefs.current[token.id] = node;
              }}
            />
          ))}
          <Transformer
            ref={trRef}
            rotateEnabled
            rotationSnaps={ROTATION_SNAPS}
            keepRatio
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 20 || newBox.height < 20) return oldBox;
              return newBox;
            }}
            onTransformEnd={() => {
              if (selectedId) handleTransformEnd(selectedId);
            }}
          />
        </Layer>

        {fogAtivo && (
          <Layer listening={false}>
            <Rect
              x={limitesVisiveis.viewLeft}
              y={limitesVisiveis.viewTop}
              width={limitesVisiveis.viewRight - limitesVisiveis.viewLeft}
              height={limitesVisiveis.viewBottom - limitesVisiveis.viewTop}
              fill="#000000"
              opacity={ehMestre && !verComoJogador ? 0.4 : 1}
            />
            {buracosDeNevoaVisiveis.map(([col, row]) => (
              <Rect
                key={`${col},${row}`}
                x={col * GRID_SIZE}
                y={row * GRID_SIZE}
                width={GRID_SIZE}
                height={GRID_SIZE}
                fill="#000000"
                globalCompositeOperation="destination-out"
              />
            ))}
          </Layer>
        )}
      </Stage>
    </div>
  );
}
