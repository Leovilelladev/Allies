import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Text, Transformer } from 'react-konva';
import Token, { tokenColor } from './Token';
import ChatPanel from './ChatPanel';
import IniciativaPanel from './IniciativaPanel';
import SoundboardPanel from './SoundboardPanel';
import { sb } from './supabaseClient';

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const GRID_SIZE = 70; // px por célula no zoom 1x
const GRID_COLOR = 'rgba(243, 242, 242, 0.13)'; // grade neutra sobre fundo escuro
const GRID_COLOR_STRONG = 'rgba(243, 242, 242, 0.26)';
const TOKEN_RADIUS = 28; // precisa bater com o default da coluna "raio" no banco

let contadorTokens = 0;

// Encaixa uma coordenada do "mundo" no centro da célula de grade mais próxima
function snapToGrid(value) {
  return Math.floor(value / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
}

// Converte uma linha da tabela mesa_tokens pro formato usado no canvas
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

// Ângulos que o Transformer "gruda" ao girar, de 15 em 15 graus
const ROTATION_SNAPS = Array.from({ length: 24 }, (_, i) => i * 15);

export default function MesaCanvas({ cenaId, campanhaId, seletor }) {
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

  // Reajusta o tamanho do stage quando a janela muda
  useMemo(() => {
    function onResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---- Carrega tokens da cena e assina atualizações em tempo real ----
  useEffect(() => {
    let ativo = true;
    if (!cenaId) return;

    async function carregar() {
      const { data: userData } = await sb.auth.getUser();
      const uid = userData?.user?.id ?? null;
      if (!ativo) return;
      userIdRef.current = uid;

      if (uid) {
        const { data: perfilData } = await sb.from('profiles').select('nome, usuario').eq('id', uid).single();
        if (ativo) {
          setPerfil({ id: uid, nome: perfilData?.nome || perfilData?.usuario || 'Anônimo' });
        }
      }

      if (uid && campanhaId) {
        const { data: campanhaData } = await sb.from('campanhas').select('mestre_id').eq('id', campanhaId).single();
        if (ativo) setEhMestre(campanhaData?.mestre_id === uid);

        const { data: fichasData } = await sb
          .from('fichas')
          .select('id, nome_personagem')
          .eq('campanha_id', campanhaId);
        if (ativo) setFichas(fichasData ?? []);
      }

      const { data, error } = await sb.from('mesa_tokens').select('*').eq('cena_id', cenaId);
      if (!ativo) return;
      if (error) {
        console.error('Falha ao carregar tokens da mesa:', error.message);
      } else {
        setTokens((data ?? []).map(linhaParaToken));
      }

      const { data: cenaData } = await sb
        .from('cenas')
        .select('fog_ativo, fog_revelado')
        .eq('id', cenaId)
        .single();
      if (ativo && cenaData) {
        setFogAtivo(cenaData.fog_ativo);
        setFogRevelado(cenaData.fog_revelado ?? []);
      }

      setSincronizando(false);
    }
    carregar();

    const canal = sb
      .channel(`mesa-tokens-${cenaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mesa_tokens', filter: `cena_id=eq.${cenaId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setTokens((prev) => prev.filter((t) => t.id !== payload.old.id));
            setSelectedId((prev) => (prev === payload.old.id ? null : prev));
            return;
          }
          const token = linhaParaToken(payload.new);
          setTokens((prev) => {
            const existe = prev.some((t) => t.id === token.id);
            return existe ? prev.map((t) => (t.id === token.id ? token : t)) : [...prev, token];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cenas', filter: `id=eq.${cenaId}` },
        (payload) => {
          setFogAtivo(payload.new.fog_ativo);
          setFogRevelado(payload.new.fog_revelado ?? []);
        }
      )
      .subscribe();

    return () => {
      ativo = false;
      sb.removeChannel(canal);
    };
  }, [cenaId]);

  // ---- Zoom com a roda do mouse, centrado no cursor ----
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = scale;
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const zoomIntensity = 1.08;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * zoomIntensity : oldScale / zoomIntensity;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    setScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, [scale, stagePos]);

  // Converte a posição do ponteiro (tela) pra chave "col,row" da célula da grade no "mundo"
  const pointerParaCelula = useCallback(
    (stage) => {
      const pointer = stage.getPointerPosition();
      if (!pointer) return null;
      const worldX = (pointer.x - stagePos.x) / scale;
      const worldY = (pointer.y - stagePos.y) / scale;
      const col = Math.floor(worldX / GRID_SIZE);
      const row = Math.floor(worldY / GRID_SIZE);
      return `${col},${row}`;
    },
    [stagePos, scale]
  );

  const pintarCelula = useCallback(
    (chave) => {
      const set = fogRevelaSetRef.current;
      const jaTem = set.has(chave);
      if (modoNevoa === 'revelar' && jaTem) return;
      if (modoNevoa === 'esconder' && !jaTem) return;
      if (modoNevoa === 'revelar') set.add(chave);
      else set.delete(chave);
      setFogRevelado(Array.from(set));
    },
    [modoNevoa]
  );

  // ---- Pan (ou pintura de névoa) : clicar e arrastar no fundo vazio ----
  const handleMouseDown = useCallback(
    (e) => {
      if (e.target !== e.target.getStage()) return;
      if (modoNevoa && ehMestre) {
        isPintandoNevoa.current = true;
        fogRevelaSetRef.current = new Set(fogRevelado);
        pintarCelula(pointerParaCelula(e.target.getStage()));
        return;
      }
      isPanning.current = true;
      lastPointer.current = e.target.getStage().getPointerPosition();
      setSelectedId(null);
    },
    [modoNevoa, ehMestre, fogRevelado, pintarCelula, pointerParaCelula]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (isPintandoNevoa.current) {
        pintarCelula(pointerParaCelula(e.target.getStage()));
        return;
      }
      if (!isPanning.current) return;
      const stage = e.target.getStage();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const dx = pointer.x - lastPointer.current.x;
      const dy = pointer.y - lastPointer.current.y;
      setStagePos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPointer.current = pointer;
    },
    [pintarCelula, pointerParaCelula]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    if (isPintandoNevoa.current) {
      isPintandoNevoa.current = false;
      sb.from('cenas')
        .update({ fog_revelado: Array.from(fogRevelaSetRef.current) })
        .eq('id', cenaId)
        .then(({ error }) => {
          if (error) console.error('Falha ao salvar névoa:', error.message);
        });
    }
  }, [cenaId]);

  const alternarFogAtivo = useCallback(() => {
    const novoValor = !fogAtivo;
    setFogAtivo(novoValor);
    if (!novoValor) setModoNevoa(null);
    sb.from('cenas').update({ fog_ativo: novoValor }).eq('id', cenaId).then(({ error }) => {
      if (error) console.error('Falha ao alternar névoa:', error.message);
    });
  }, [fogAtivo, cenaId]);

  const limparNevoa = useCallback(() => {
    setFogRevelado([]);
    sb.from('cenas').update({ fog_revelado: [] }).eq('id', cenaId).then(({ error }) => {
      if (error) console.error('Falha ao limpar névoa:', error.message);
    });
  }, [cenaId]);

  function resetView() {
    setScale(1);
    setStagePos({ x: 0, y: 0 });
  }

  // ---- Tokens ----
  const addToken = useCallback(async () => {
    if (!cenaId || !userIdRef.current) return;
    const worldCenterX = (size.width / 2 - stagePos.x) / scale;
    const worldCenterY = (size.height / 2 - stagePos.y) / scale;
    contadorTokens += 1;

    const novaLinha = {
      cena_id: cenaId,
      nome: `T${contadorTokens}`,
      cor: tokenColor(contadorTokens - 1),
      x: snapToGrid(worldCenterX),
      y: snapToGrid(worldCenterY),
      rotacao: 0,
      escala: 1,
      raio: TOKEN_RADIUS,
      criado_por: userIdRef.current,
    };

    // Otimista: mostra o token na hora, a linha real do banco chega pelo realtime e substitui
    const idTemporario = `temp-${contadorTokens}`;
    setTokens((prev) => [...prev, linhaParaToken({ id: idTemporario, ...novaLinha })]);
    setSelectedId(idTemporario);

    const { data, error } = await sb.from('mesa_tokens').insert(novaLinha).select().single();
    if (error) {
      console.error('Falha ao criar token:', error.message);
      setTokens((prev) => prev.filter((t) => t.id !== idTemporario));
      setSelectedId((prev) => (prev === idTemporario ? null : prev));
      return;
    }
    setTokens((prev) => prev.map((t) => (t.id === idTemporario ? linhaParaToken(data) : t)));
    setSelectedId(data.id);
  }, [cenaId, size, stagePos, scale]);

  const handleTokenDragEnd = useCallback(
    (id, x, y) => {
      const snapped = { x: snapToGrid(x), y: snapToGrid(y) };
      setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, ...snapped } : t)));
      const node = shapeRefs.current[id];
      if (node) node.position(snapped);
      if (!id.startsWith('temp-')) {
        sb.from('mesa_tokens').update(snapped).eq('id', id).then(({ error }) => {
          if (error) console.error('Falha ao salvar posição do token:', error.message);
        });
      }
    },
    []
  );

  const handleTransformEnd = useCallback((id) => {
    const node = shapeRefs.current[id];
    if (!node) return;
    const atualizado = { x: node.x(), y: node.y(), rotation: node.rotation(), scaleX: node.scaleX(), scaleY: node.scaleY() };
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, ...atualizado } : t)));
    if (!id.startsWith('temp-')) {
      sb.from('mesa_tokens')
        .update({ x: atualizado.x, y: atualizado.y, rotacao: atualizado.rotation, escala: atualizado.scaleX })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Falha ao salvar transformação do token:', error.message);
        });
    }
  }, []);

  const mudarCamada = useCallback(
    (direcao) => {
      if (!selectedId) return;
      const camadas = tokens.map((t) => t.camada ?? 0);
      const novaCamada =
        direcao === 'frente' ? Math.max(0, ...camadas) + 1 : Math.min(0, ...camadas) - 1;
      setTokens((prev) => prev.map((t) => (t.id === selectedId ? { ...t, camada: novaCamada } : t)));
      if (!selectedId.startsWith('temp-')) {
        sb.from('mesa_tokens').update({ camada: novaCamada }).eq('id', selectedId).then(({ error }) => {
          if (error) console.error('Falha ao mudar camada do token:', error.message);
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
        sb.from('mesa_tokens').update({ ficha_id: valor }).eq('id', selectedId).then(({ error }) => {
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

  // Deletar/Backspace remove o token selecionado (só quando o foco não está em um input/textarea)
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

  // Liga o Transformer ao token selecionado
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

  // Retângulo visível atual, em coordenadas do "mundo" (antes do scale/posição do stage)
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

  // ---- Grid ----
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
  }, [limitesVisiveis]);

  // Buracos de névoa revelados que caem dentro da área visível atual
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

  const tokenSelecionado = useMemo(() => tokens.find((t) => t.id === selectedId) ?? null, [tokens, selectedId]);

  // Ordena por camada pra desenhar quem está "atrás" primeiro (embaixo)
  const tokensOrdenados = useMemo(
    () => [...tokens].sort((a, b) => (a.camada ?? 0) - (b.camada ?? 0)),
    [tokens]
  );

  return (
    <div className="mesa-wrap">
      <div className="mesa-topbar">
        <a className="mesa-btn" href={`../index.html?campanha=${campanhaId}`}>← Campanha</a>
        <span className="mesa-brand">Allies <small>Mesa Virtual</small></span>
        {seletor}
        <span className="mesa-topbar-sep" />
        <button className="mesa-btn" onClick={addToken} disabled={sincronizando}>+ Token</button>
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
            title="Vincular este token a uma ficha (o dono da ficha também pode controlá-lo)"
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
        <button
          className="mesa-btn"
          onClick={() => setShowIniciativa((v) => !v)}
        >
          {showIniciativa ? 'Fechar iniciativa' : 'Iniciativa'}
        </button>
        <button className="mesa-btn" onClick={() => setShowSoundboard((v) => !v)}>
          {showSoundboard ? 'Fechar sons' : 'Sons'}
        </button>
        {ehMestre && (
          <>
            <button className={`mesa-btn ${fogAtivo ? 'mesa-btn--ativo' : ''}`} onClick={alternarFogAtivo}>
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
                <button className="mesa-btn" onClick={limparNevoa}>Limpar névoa</button>
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
        <button className="mesa-btn" onClick={resetView}>Centralizar</button>
        {sincronizando && <span className="mesa-sync">Sincronizando…</span>}
      </div>

      {showChat && perfil && <ChatPanel cenaId={cenaId} userId={perfil.id} autorNome={perfil.nome} />}
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
