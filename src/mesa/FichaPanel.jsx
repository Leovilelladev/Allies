import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sb } from '../shared/supabaseClient';
import { executarRolagemAcao, extrairStatsContexto, aplicarDescansoAcoes } from '../shared/actionEngine';
import { rolarD20, rolarFormula, enviarRolagem, fmtMod, MODOS } from './rolagem';
import { enviarImagem, importarDeUrl } from './imagens';
import { lerFicha, montarAtualizacao } from './fichaLegado';

export const ATRIBUTOS = [
  { id: 'for', sigla: 'FOR', nome: 'Força' },
  { id: 'des', sigla: 'DES', nome: 'Destreza' },
  { id: 'con', sigla: 'CON', nome: 'Constituição' },
  { id: 'int', sigla: 'INT', nome: 'Inteligência' },
  { id: 'sab', sigla: 'SAB', nome: 'Sabedoria' },
  { id: 'car', sigla: 'CAR', nome: 'Carisma' },
];

const PERICIAS = [
  { id: 'acrobacia', nome: 'Acrobacia', attr: 'des' },
  { id: 'arcanismo', nome: 'Arcanismo', attr: 'int' },
  { id: 'atletismo', nome: 'Atletismo', attr: 'for' },
  { id: 'atuacao', nome: 'Atuação', attr: 'car' },
  { id: 'enganacao', nome: 'Enganação', attr: 'car' },
  { id: 'furtividade', nome: 'Furtividade', attr: 'des' },
  { id: 'historia', nome: 'História', attr: 'int' },
  { id: 'intimidacao', nome: 'Intimidação', attr: 'car' },
  { id: 'intuicao', nome: 'Intuição', attr: 'sab' },
  { id: 'investigacao', nome: 'Investigação', attr: 'int' },
  { id: 'lidarAnimais', nome: 'Lidar com Animais', attr: 'sab' },
  { id: 'medicina', nome: 'Medicina', attr: 'sab' },
  { id: 'natureza', nome: 'Natureza', attr: 'int' },
  { id: 'percepcao', nome: 'Percepção', attr: 'sab' },
  { id: 'persuasao', nome: 'Persuasão', attr: 'car' },
  { id: 'prestidigitacao', nome: 'Prestidigitação', attr: 'des' },
  { id: 'religiao', nome: 'Religião', attr: 'int' },
  { id: 'sobrevivencia', nome: 'Sobrevivência', attr: 'sab' },
];

function mod(score) {
  return Math.floor(((Number(score) || 10) - 10) / 2);
}

function iniciais(nome) {
  return (nome || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

const FICHA_NOVA = {
  classe: '',
  especie: '',
  nivel: 1,
  profBonus: 2,
  ca: 10,
  deslocamento: '9m',
  dadosVida: '1d8',
  visaoClara: 18,
  visaoEscuro: 0,
  pv_total: 10,
  pv_atual: 10,
  pvTemp: 0,
  atributos: { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 },
  pericias: {},
  salvaguardas: {},
  acoes: [],
  inventario: [],
  moedas: { po: 0, pp: 0, pc: 0 },
  magias: [],
  espacos: {},
  atributoConjuracao: 'int',
};

export const ESCOLAS = [
  'Abjuração',
  'Adivinhação',
  'Conjuração',
  'Encantamento',
  'Evocação',
  'Ilusão',
  'Necromancia',
  'Transmutação',
];

export const NIVEIS_MAGIA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export const rotuloNivel = (n) => (n === 0 ? 'Truques' : `${n}º círculo`);

export const TIPOS_ITEM = [
  { id: 'equipamento', rotulo: 'Equipamento' },
  { id: 'arma', rotulo: 'Arma' },
  { id: 'armadura', rotulo: 'Armadura' },
  { id: 'consumivel', rotulo: 'Consumível' },
  { id: 'tesouro', rotulo: 'Tesouro' },
];

export default function FichaPanel({
  campanhaId,
  cenaId,
  userId,
  autorNome,
  ehMestre,
  modoRolagem,
  onModoRolagem,
  onCriarTokenDaFicha,
}) {
  const [fichas, setFichas] = useState([]);
  const [fichaId, setFichaId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState('atributos'); // atributos | pericias | acoes
  const [criando, setCriando] = useState(false);
  const [nomeNova, setNomeNova] = useState('');
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(null);
  const [ajustePv, setAjustePv] = useState('');
  const [enviandoRetrato, setEnviandoRetrato] = useState(false);
  const inputRetratoRef = useRef(null);

  const chaveLocal = `allies_ficha_ativa_${campanhaId}`;

  const carregar = useCallback(async () => {
    if (!campanhaId) return;
    setCarregando(true);
    // `personagens` não tem campanha: o elenco vem de campanha_personagens
    const { data, error } = await sb
      .from('campanha_personagens')
      .select('personagem_id, personagens(*)')
      .eq('campanha_id', campanhaId);
    if (error) {
      console.error('Falha ao carregar fichas:', error.message);
      setCarregando(false);
      return;
    }
    let lista = (data ?? []).map((e) => e.personagens).filter(Boolean);
    if (!ehMestre) lista = lista.filter((f) => Number(f.usuario_id) === Number(userId));
    lista.sort((a, b) => a.id - b.id);
    setFichas(lista);
    setFichaId((atual) => {
      if (atual && lista.some((f) => f.id === atual)) return atual;
      const salva = localStorage.getItem(chaveLocal);
      if (salva && lista.some((f) => f.id === salva)) return salva;
      const minha = lista.find((f) => Number(f.usuario_id) === Number(userId));
      return (minha || lista[0])?.id ?? null;
    });
    setCarregando(false);
  }, [campanhaId, ehMestre, userId, chaveLocal]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!campanhaId) return;
    const canal = sb
      .channel(`mesa-fichas-lista-${campanhaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'personagens' },
        (payload) => {
          setFichas((prev) => {
            if (payload.eventType === 'DELETE') return prev.filter((f) => f.id !== payload.old.id);
            // Só atualiza quem já faz parte do elenco carregado
            if (!prev.some((f) => f.id === payload.new.id)) return prev;
            return prev.map((f) => (f.id === payload.new.id ? payload.new : f));
          });
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(canal);
    };
  }, [campanhaId, ehMestre, userId]);

  useEffect(() => {
    if (fichaId) localStorage.setItem(chaveLocal, fichaId);
  }, [fichaId, chaveLocal]);

  const fichaBruta = useMemo(() => fichas.find((f) => f.id === fichaId) ?? null, [fichas, fichaId]);
  const ficha = useMemo(() => (fichaBruta ? lerFicha(fichaBruta) : null), [fichaBruta]);
  const souDono = Number(fichaBruta?.usuario_id) === Number(userId) || ehMestre;

  // ---- Gravação -------------------------------------------------------
  const salvarDados = useCallback(
    async (patch) => {
      if (!fichaBruta) return;
      const update = montarAtualizacao(fichaBruta, patch);
      setFichas((prev) => prev.map((f) => (f.id === fichaBruta.id ? { ...f, ...update } : f)));
      const { error } = await sb.from('personagens').update(update).eq('id', fichaBruta.id);
      if (error) console.error('Falha ao salvar ficha:', error.message);
    },
    [fichaBruta]
  );

  const criarFicha = useCallback(async () => {
    const nome = nomeNova.trim();
    if (!nome) return;
    // Cria o personagem como o site cria, e já vincula ele à campanha
    const { data, error } = await sb
      .from('personagens')
      .insert({
        usuario_id: userId,
        nome,
        raca: '',
        classe: '',
        nivel: 1,
        proficiencia: 2,
        ca: 10,
        deslocamento: '9m',
        dados_vida: '1d8',
        pv_atual: 10,
        pv_total: 10,
        forca: 10,
        destreza: 10,
        constituicao: 10,
        inteligencia: 10,
        sabedoria: 10,
        carisma: 10,
        pericias: {},
        ataques: [],
        magias: [],
        espacos_magia: {},
        moedas: { po: 0, pp: 0, pc: 0 },
        dados_ficha: { nome, nivel: 1, ca: 10, pv_total: 10, pv_atual: 10 },
      })
      .select()
      .single();
    if (error) {
      console.error('Falha ao criar ficha:', error.message);
      return;
    }

    const { error: erroVinculo } = await sb
      .from('campanha_personagens')
      .insert({ campanha_id: campanhaId, usuario_id: userId, personagem_id: data.id });
    if (erroVinculo) console.error('Falha ao vincular à campanha:', erroVinculo.message);

    setFichas((prev) => [...prev.filter((f) => f.id !== data.id), data]);
    setFichaId(data.id);
    setNomeNova('');
    setCriando(false);
    setEditando(true);
  }, [nomeNova, campanhaId, userId]);

  const trocarRetrato = useCallback(
    async (e) => {
      const arquivo = e.target.files?.[0];
      e.target.value = '';
      if (!arquivo) return;
      setEnviandoRetrato(true);
      try {
        const url = await enviarImagem(arquivo, `fichas/${campanhaId}`);
        await salvarDados({ retrato_url: url });
      } catch (erro) {
        console.error('Falha ao enviar o retrato:', erro.message || erro);
      } finally {
        setEnviandoRetrato(false);
      }
    },
    [campanhaId, salvarDados]
  );

  // ---- Rolagens -------------------------------------------------------
  const publicar = useCallback(
    (payload) => {
      enviarRolagem({
        cenaId,
        userId,
        autorNome: ficha?.nome || autorNome,
        payload: { ...payload, personagem: ficha?.nome },
      });
    },
    [cenaId, userId, autorNome, ficha]
  );

  const rolarAtributo = useCallback(
    (attrId, tipo = 'teste') => {
      if (!ficha) return;
      const bonus =
        mod(ficha.atributos[attrId]) + (tipo === 'save' && ficha.salvaguardas[attrId] ? ficha.profBonus : 0);
      const info = ATRIBUTOS.find((a) => a.id === attrId);
      publicar({
        categoria: tipo === 'save' ? 'salvaguarda' : 'atributo',
        titulo: tipo === 'save' ? `Salvaguarda de ${info.nome}` : `Teste de ${info.nome}`,
        d20: rolarD20({ bonus, modo: modoRolagem }),
      });
    },
    [ficha, modoRolagem, publicar]
  );

  const rolarPericia = useCallback(
    (pericia) => {
      if (!ficha) return;
      const nivelProf = ficha.pericias[pericia.id];
      const extra = nivelProf === 'expert' ? ficha.profBonus * 2 : nivelProf ? ficha.profBonus : 0;
      const bonus = mod(ficha.atributos[pericia.attr]) + extra;
      publicar({
        categoria: 'pericia',
        titulo: pericia.nome,
        d20: rolarD20({ bonus, modo: modoRolagem }),
      });
    },
    [ficha, modoRolagem, publicar]
  );

  const rolarIniciativa = useCallback(async () => {
    if (!ficha) return;
    const r = rolarD20({ bonus: mod(ficha.atributos.des), modo: modoRolagem });
    publicar({ categoria: 'iniciativa', titulo: 'Iniciativa', d20: r });
    const { error } = await sb.from('mesa_iniciativa').insert({
      cena_id: cenaId,
      nome: ficha.nome,
      valor: r.total,
      criado_por: userId,
    });
    if (error) console.error('Falha ao entrar na iniciativa:', error.message);
  }, [ficha, modoRolagem, publicar, cenaId, userId]);

  const rolarAcao = useCallback(
    (acao) => {
      if (!ficha) return;
      const stats = extrairStatsContexto({
        dados: {
          nivel: ficha.nivel,
          profBonus: ficha.profBonus,
          ca: ficha.ca,
          atributos: ficha.atributos,
        },
      });
      const r = executarRolagemAcao(acao, stats);
      publicar({
        categoria: 'ataque',
        titulo: r.nomeAcao,
        subtitulo: [acao.alcance, acao.alvo].filter(Boolean).join(' · '),
        d20: r.acerto
          ? {
              valores: [r.acerto.d20],
              escolhido: r.acerto.d20,
              modo: MODOS.NORMAL,
              bonus: r.acerto.modificador,
              total: r.acerto.total,
              critico: r.acerto.ehCritico,
              falha: r.acerto.ehFalhaCritica,
            }
          : null,
        dano: r.dano
          ? {
              formula: r.dano.formulaResolvida,
              detalhe: r.dano.detalhes,
              total: r.dano.total,
              tipo: r.dano.tipoDano,
              critico: r.acerto?.ehCritico || false,
            }
          : null,
        cd: r.saveDC ? { valor: r.saveDC.dc, atributo: r.saveDC.atributo } : null,
      });
    },
    [ficha, publicar]
  );

  // ---- Inventário -----------------------------------------------------
  const salvarInventario = useCallback(
    (lista) => salvarDados({ inventario: lista }),
    [salvarDados]
  );

  const adicionarItem = useCallback(
    (item) => {
      if (!ficha) return;
      salvarInventario([...ficha.inventario, { id: `i-${Date.now()}`, ...item }]);
    },
    [ficha, salvarInventario]
  );

  const alterarItem = useCallback(
    (id, patch) => {
      if (!ficha) return;
      salvarInventario(ficha.inventario.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    },
    [ficha, salvarInventario]
  );

  const removerItem = useCallback(
    (id) => {
      if (!ficha) return;
      salvarInventario(ficha.inventario.filter((i) => i.id !== id));
    },
    [ficha, salvarInventario]
  );

  const mostrarItemNoChat = useCallback(
    (item) => {
      publicar({
        categoria: 'item',
        titulo: item.nome,
        item: {
          qtd: Number(item.qtd) || 1,
          tipo: item.tipo || 'equipamento',
          peso: Number(item.peso) || 0,
          descricao: item.descricao || '',
          equipado: !!item.equipado,
        },
      });
    },
    [publicar]
  );

  const usarItem = useCallback(
    (item) => {
      const rolagem = item.formula ? rolarFormula(item.formula) : null;
      publicar({
        categoria: 'item',
        titulo: item.nome,
        subtitulo: 'usou',
        dados: rolagem,
        item: {
          qtd: Math.max(0, (Number(item.qtd) || 1) - 1),
          tipo: item.tipo || 'equipamento',
          peso: Number(item.peso) || 0,
          descricao: item.descricao || '',
          equipado: !!item.equipado,
        },
      });
      // Consumível gasta uma unidade; some do inventário ao zerar
      if (item.tipo === 'consumivel') {
        const restante = (Number(item.qtd) || 1) - 1;
        if (restante <= 0) removerItem(item.id);
        else alterarItem(item.id, { qtd: restante });
      }
    },
    [publicar, alterarItem, removerItem]
  );

  // ---- Magias ---------------------------------------------------------
  const gastarEspaco = useCallback(
    (nivel, delta) => {
      if (!ficha || nivel === 0) return;
      const atual = ficha.espacos[nivel] || { total: 0, gastos: 0 };
      const gastos = Math.max(0, Math.min(atual.total, (atual.gastos || 0) + delta));
      salvarDados({ espacos: { ...ficha.espacos, [nivel]: { ...atual, gastos } } });
    },
    [ficha, salvarDados]
  );

  const conjurar = useCallback(
    (magia, nivelUsado) => {
      if (!ficha) return;
      const nivel = Math.max(magia.nivel || 0, Number(nivelUsado) || magia.nivel || 0);

      // Truque não gasta espaço; magia de círculo gasta um do nível escolhido
      if (nivel > 0) {
        const espaco = ficha.espacos[nivel] || { total: 0, gastos: 0 };
        if ((espaco.gastos || 0) >= (espaco.total || 0)) return;
        gastarEspaco(nivel, 1);
      }

      const stats = extrairStatsContexto({
        dados: { nivel: ficha.nivel, profBonus: ficha.profBonus, ca: ficha.ca, atributos: ficha.atributos },
      });

      // Conjurar acima do círculo original soma o dado de escala por círculo
      // extra: escala "1d6" dois círculos acima vira "+2d6".
      let formula = magia.formula_dano || '';
      const acima = nivel - (magia.nivel || 0);
      if (formula && acima > 0 && magia.escala_por_nivel) {
        const dado = magia.escala_por_nivel.match(/(\d*)d(\d+)/i);
        if (dado) formula = `${formula}+${(Number(dado[1]) || 1) * acima}d${dado[2]}`;
      }

      const acao = {
        id: magia.id,
        nome: magia.nome,
        tipo: 'magia',
        atributo_base: ficha.atributoConjuracao,
        proficiente: true,
        tem_ataque: !!magia.tem_ataque,
        formula_dano: formula,
        tipo_dano: magia.tipo_dano || '',
        tem_salvaguarda: !!magia.tem_salvaguarda,
        salvaguarda_atributo: magia.salvaguarda_atributo || 'des',
        alcance: magia.alcance || '',
      };

      const r = executarRolagemAcao(acao, stats);
      publicar({
        categoria: 'magia',
        titulo: magia.nome,
        subtitulo: [
          nivel === 0 ? 'truque' : `${nivel}º círculo${acima > 0 ? ' (elevada)' : ''}`,
          magia.escola,
          magia.alcance,
        ]
          .filter(Boolean)
          .join(' · '),
        magia: {
          concentracao: !!magia.concentracao,
          duracao: magia.duracao || '',
          descricao: magia.descricao || '',
        },
        d20: r.acerto
          ? {
              valores: [r.acerto.d20],
              escolhido: r.acerto.d20,
              modo: MODOS.NORMAL,
              bonus: r.acerto.modificador,
              total: r.acerto.total,
              critico: r.acerto.ehCritico,
              falha: r.acerto.ehFalhaCritica,
            }
          : null,
        dano: r.dano
          ? {
              formula: r.dano.formulaResolvida,
              detalhe: r.dano.detalhes,
              total: r.dano.total,
              tipo: r.dano.tipoDano,
              critico: r.acerto?.ehCritico || false,
            }
          : null,
        cd: r.saveDC ? { valor: r.saveDC.dc, atributo: r.saveDC.atributo } : null,
      });
    },
    [ficha, gastarEspaco, publicar]
  );

  const salvarMagias = useCallback((lista) => salvarDados({ magias: lista }), [salvarDados]);

  // ---- Descanso -------------------------------------------------------
  const descansar = useCallback(
    (tipo) => {
      if (!ficha) return;
      const patch = {};

      // Ações com cargas recarregam conforme o tipo de descanso
      patch.acoes = aplicarDescansoAcoes(ficha.acoes, tipo === 'longo' ? 'long_rest' : 'short_rest');

      if (tipo === 'longo') {
        patch.pv_atual = ficha.pvTotal;
        patch.pvTemp = 0;
        const espacos = {};
        for (const [nivel, e] of Object.entries(ficha.espacos)) {
          espacos[nivel] = { ...e, gastos: 0 };
        }
        patch.espacos = espacos;
      }

      salvarDados(patch);
      publicar({
        categoria: 'descanso',
        titulo: tipo === 'longo' ? 'Descanso longo' : 'Descanso curto',
        subtitulo:
          tipo === 'longo' ? 'vida cheia, espaços e usos restaurados' : 'usos de descanso curto restaurados',
      });
    },
    [ficha, salvarDados, publicar]
  );

  const gastarDadoDeVida = useCallback(() => {
    if (!ficha) return;
    const r = rolarFormula(ficha.dadosVida || '1d8');
    if (!r) return;
    const bonus = mod(ficha.atributos.con);
    const curado = Math.max(1, r.total + bonus);
    const novo = Math.min(ficha.pvTotal, ficha.pvAtual + curado);
    salvarDados({ pv_atual: novo });
    publicar({
      categoria: 'descanso',
      titulo: 'Dado de vida',
      subtitulo: `recuperou ${curado} PV`,
      dados: { ...r, formula: `${ficha.dadosVida}${fmtMod(bonus)}`, total: curado },
    });
  }, [ficha, salvarDados, publicar]);

  // ---- PV -------------------------------------------------------------
  const aplicarPv = useCallback(
    (sinal) => {
      if (!ficha) return;
      const valor = Math.abs(parseInt(ajustePv, 10) || 0);
      if (!valor) return;
      const novo = Math.max(0, Math.min(ficha.pvTotal, ficha.pvAtual + sinal * valor));
      salvarDados({ pv_atual: novo });
      setAjustePv('');
    },
    [ficha, ajustePv, salvarDados]
  );

  // ---- Render ---------------------------------------------------------
  if (carregando) {
    return <div className="dock-vazio">Carregando fichas…</div>;
  }

  if (!ficha) {
    return (
      <div className="ficha-vazia">
        <p className="dock-vazio">
          {ehMestre
            ? 'Nenhuma ficha nesta campanha ainda.'
            : 'Você ainda não tem uma ficha nesta campanha.'}
        </p>
        {criando ? (
          <div className="ficha-nova">
            <input
              autoFocus
              value={nomeNova}
              onChange={(e) => setNomeNova(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && criarFicha()}
              placeholder="Nome do personagem"
            />
            <div className="ficha-nova-acoes">
              <button className="mesa-btn mesa-btn--primario" onClick={criarFicha}>
                Criar
              </button>
              <button className="mesa-btn" onClick={() => setCriando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button className="mesa-btn mesa-btn--primario" onClick={() => setCriando(true)}>
            Criar ficha
          </button>
        )}
      </div>
    );
  }

  const pctPv = Math.max(0, Math.min(100, (ficha.pvAtual / Math.max(1, ficha.pvTotal)) * 100));
  const estadoPv = pctPv <= 25 ? 'critico' : pctPv <= 50 ? 'ferido' : 'ok';

  return (
    <div className="ficha">
      {/* Cabeçalho */}
      <div className="ficha-topo">
        <button
          className={`ficha-avatar ${souDono ? 'is-editavel' : ''}`}
          style={
            ficha.retratoUrl
              ? { backgroundImage: `url(${ficha.retratoUrl})` }
              : { background: ficha.cor }
          }
          onClick={() => souDono && inputRetratoRef.current?.click()}
          title={souDono ? 'Trocar a foto do personagem' : ficha.nome}
          disabled={!souDono}
        >
          {!ficha.retratoUrl && !enviandoRetrato && iniciais(ficha.nome)}
          {enviandoRetrato && <span className="ficha-avatar-carregando">…</span>}
          {souDono && <span className="ficha-avatar-lapis">✎</span>}
        </button>
        <input
          ref={inputRetratoRef}
          type="file"
          accept="image/*"
          onChange={trocarRetrato}
          style={{ display: 'none' }}
        />
        <div className="ficha-identidade">
          {fichas.length > 1 ? (
            <select className="ficha-seletor" value={fichaId} onChange={(e) => setFichaId(e.target.value)}>
              {fichas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          ) : (
            <span className="ficha-nome">{ficha.nome}</span>
          )}
          <span className="ficha-subtitulo">
            {[ficha.especie, ficha.classe].filter(Boolean).join(' · ') || 'Sem classe'} · Nível {ficha.nivel}
          </span>
        </div>
        {souDono && (
          <button
            className={`mesa-icone-btn ${editando ? 'is-ativo' : ''}`}
            onClick={() => {
              setRascunho(editando ? null : { ...ficha._raw, ...ficha, atributos: { ...ficha.atributos } });
              setEditando((v) => !v);
            }}
            title="Editar ficha"
          >
            {editando ? '✓' : '✎'}
          </button>
        )}
      </div>

      {editando && rascunho ? (
        <EditorFicha
          rascunho={rascunho}
          setRascunho={setRascunho}
          campanhaId={campanhaId}
          onSalvar={async (dados) => {
            await salvarDados(dados);
            setEditando(false);
            setRascunho(null);
          }}
          onCancelar={() => {
            setEditando(false);
            setRascunho(null);
          }}
        />
      ) : (
        <>
          {/* Vitais */}
          <div className="ficha-vitais">
            <div className="vital">
              <span className="vital-rotulo">CA</span>
              <span className="vital-valor">{ficha.ca}</span>
            </div>
            <div className="vital">
              <span className="vital-rotulo">Desloc.</span>
              <span className="vital-valor vital-valor--pequeno">{ficha.deslocamento}</span>
            </div>
            <div className="vital">
              <span className="vital-rotulo">Prof.</span>
              <span className="vital-valor">{fmtMod(ficha.profBonus)}</span>
            </div>
            <div className="vital" title="Alcance de visão com luz · visão no escuro">
              <span className="vital-rotulo">Visão</span>
              <span className="vital-valor vital-valor--pequeno">
                {ficha.visaoClara}m{ficha.visaoEscuro > 0 ? ` · ${ficha.visaoEscuro}m` : ''}
              </span>
            </div>
          </div>

          {/* Pontos de vida */}
          <div className="ficha-pv">
            <div className="ficha-pv-cabecalho">
              <span className="vital-rotulo">Pontos de vida</span>
              <span className={`ficha-pv-numeros is-${estadoPv}`}>
                {ficha.pvAtual}
                <small> / {ficha.pvTotal}</small>
                {ficha.pvTemp > 0 && <em> +{ficha.pvTemp}</em>}
              </span>
            </div>
            <div className="ficha-pv-barra">
              <div className={`ficha-pv-preenchimento is-${estadoPv}`} style={{ width: `${pctPv}%` }} />
            </div>
            {souDono && (
              <div className="ficha-descanso">
                <button className="mesa-btn" onClick={gastarDadoDeVida} title={`Rola ${ficha.dadosVida} + CON e cura`}>
                  Dado de vida
                </button>
                <button className="mesa-btn" onClick={() => descansar('curto')}>
                  Descanso curto
                </button>
                <button className="mesa-btn" onClick={() => descansar('longo')}>
                  Longo
                </button>
              </div>
            )}
            {souDono && (
              <div className="ficha-pv-controles">
                <button className="mesa-btn mesa-btn--dano" onClick={() => aplicarPv(-1)}>
                  Dano
                </button>
                <input
                  value={ajustePv}
                  onChange={(e) => setAjustePv(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') aplicarPv(e.shiftKey ? 1 : -1);
                  }}
                  placeholder="0"
                  inputMode="numeric"
                />
                <button className="mesa-btn mesa-btn--cura" onClick={() => aplicarPv(1)}>
                  Cura
                </button>
              </div>
            )}
          </div>

          {/* Modo de rolagem */}
          <div className="ficha-modo">
            {[
              { id: MODOS.DESVANTAGEM, rotulo: 'Desv.' },
              { id: MODOS.NORMAL, rotulo: 'Normal' },
              { id: MODOS.VANTAGEM, rotulo: 'Vant.' },
            ].map((m) => (
              <button
                key={m.id}
                className={`ficha-modo-btn ${modoRolagem === m.id ? 'is-ativo' : ''}`}
                onClick={() => onModoRolagem(m.id)}
              >
                {m.rotulo}
              </button>
            ))}
          </div>

          {/* Abas */}
          <div className="ficha-abas">
            {[
              { id: 'atributos', rotulo: 'Atributos' },
              { id: 'pericias', rotulo: 'Perícias' },
              { id: 'acoes', rotulo: 'Ações' },
              { id: 'magias', rotulo: 'Magias' },
              { id: 'itens', rotulo: 'Itens' },
            ].map((a) => (
              <button
                key={a.id}
                className={`ficha-aba ${aba === a.id ? 'is-ativa' : ''}`}
                onClick={() => setAba(a.id)}
              >
                {a.rotulo}
              </button>
            ))}
          </div>

          <div className="ficha-conteudo">
            {aba === 'atributos' && (
              <>
                <div className="ficha-atributos">
                  {ATRIBUTOS.map((a) => (
                    <button
                      key={a.id}
                      className="atributo"
                      onClick={() => rolarAtributo(a.id, 'teste')}
                      title={`Rolar teste de ${a.nome}`}
                    >
                      <span className="atributo-sigla">{a.sigla}</span>
                      <span className="atributo-mod">{fmtMod(mod(ficha.atributos[a.id]))}</span>
                      <span className="atributo-valor">{ficha.atributos[a.id]}</span>
                    </button>
                  ))}
                </div>
                <div className="ficha-secao-rotulo">Salvaguardas</div>
                <div className="ficha-saves">
                  {ATRIBUTOS.map((a) => {
                    const prof = !!ficha.salvaguardas[a.id];
                    const bonus = mod(ficha.atributos[a.id]) + (prof ? ficha.profBonus : 0);
                    return (
                      <button
                        key={a.id}
                        className={`save ${prof ? 'is-proficiente' : ''}`}
                        onClick={() => rolarAtributo(a.id, 'save')}
                      >
                        <span className="save-nome">{a.sigla}</span>
                        <span className="save-bonus">{fmtMod(bonus)}</span>
                      </button>
                    );
                  })}
                </div>
                <button className="mesa-btn mesa-btn--largo" onClick={rolarIniciativa}>
                  Rolar iniciativa e entrar na ordem
                </button>
                {onCriarTokenDaFicha && (
                  <button
                    className="mesa-btn mesa-btn--largo"
                    onClick={() => onCriarTokenDaFicha(ficha)}
                  >
                    Colocar token no mapa
                  </button>
                )}
              </>
            )}

            {aba === 'pericias' && (
              <div className="ficha-pericias">
                {PERICIAS.map((p) => {
                  const nivelProf = ficha.pericias[p.id];
                  const extra = nivelProf === 'expert' ? ficha.profBonus * 2 : nivelProf ? ficha.profBonus : 0;
                  const bonus = mod(ficha.atributos[p.attr]) + extra;
                  return (
                    <button key={p.id} className="pericia" onClick={() => rolarPericia(p)}>
                      <span className={`pericia-marca ${nivelProf ? `is-${nivelProf === 'expert' ? 'expert' : 'prof'}` : ''}`} />
                      <span className="pericia-nome">{p.nome}</span>
                      <span className="pericia-attr">{p.attr.toUpperCase()}</span>
                      <span className="pericia-bonus">{fmtMod(bonus)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {aba === 'acoes' && (
              <div className="ficha-acoes">
                {ficha.acoes.length === 0 && (
                  <p className="dock-vazio">
                    Nenhuma ação configurada. Use o botão de editar pra adicionar ataques e magias.
                  </p>
                )}
                {ficha.acoes.map((acao) => {
                  const stats = extrairStatsContexto({
                    dados: { nivel: ficha.nivel, profBonus: ficha.profBonus, ca: ficha.ca, atributos: ficha.atributos },
                  });
                  const attrMod = stats.mods[(acao.atributo_base || 'for').toLowerCase()] ?? 0;
                  const bonusAtaque = attrMod + (acao.proficiente !== false ? ficha.profBonus : 0) + Number(acao.bonus_adicional_acerto || 0);
                  return (
                    <button key={acao.id || acao.nome} className="acao" onClick={() => rolarAcao(acao)}>
                      <span className="acao-nome">{acao.nome}</span>
                      <span className="acao-detalhes">
                        {acao.tem_ataque !== false && <em>{fmtMod(bonusAtaque)} acerto</em>}
                        {acao.formula_dano && <em>{acao.formula_dano} dano</em>}
                        {acao.alcance && <em>{acao.alcance}</em>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {aba === 'magias' && (
              <Magias
                ficha={ficha}
                souDono={souDono}
                onConjurar={conjurar}
                onGastarEspaco={gastarEspaco}
                onSalvarMagias={salvarMagias}
                onEspacos={(espacos) => salvarDados({ espacos })}
                onAtributo={(attr) => salvarDados({ atributoConjuracao: attr })}
              />
            )}

            {aba === 'itens' && (
              <Inventario
                ficha={ficha}
                souDono={souDono}
                onAdicionar={adicionarItem}
                onAlterar={alterarItem}
                onRemover={removerItem}
                onMostrar={mostrarItemNoChat}
                onUsar={usarItem}
                onMoedas={(moedas) => salvarDados({ moedas })}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Magias
// ---------------------------------------------------------------------
function Magias({ ficha, souDono, onConjurar, onGastarEspaco, onSalvarMagias, onEspacos, onAtributo }) {
  const [abertaId, setAbertaId] = useState(null);
  const [nova, setNova] = useState(null);
  const [editandoEspacos, setEditandoEspacos] = useState(false);

  const cd = 8 + ficha.profBonus + mod(ficha.atributos[ficha.atributoConjuracao]);
  const ataque = ficha.profBonus + mod(ficha.atributos[ficha.atributoConjuracao]);

  const porNivel = NIVEIS_MAGIA.map((n) => ({
    nivel: n,
    magias: ficha.magias.filter((m) => (m.nivel || 0) === n),
  })).filter((g) => g.magias.length > 0 || (g.nivel > 0 && (ficha.espacos[g.nivel]?.total || 0) > 0));

  const campo = (c, v) => setNova((x) => ({ ...x, [c]: v }));

  const salvarNova = () => {
    const nome = (nova?.nome || '').trim();
    if (!nome) return;
    const magia = {
      id: nova.id || `m-${Date.now()}`,
      nome,
      nivel: Math.max(0, Math.min(9, Number(nova.nivel) || 0)),
      escola: nova.escola || '',
      alcance: (nova.alcance || '').trim(),
      duracao: (nova.duracao || '').trim(),
      concentracao: !!nova.concentracao,
      preparada: nova.preparada !== false,
      descricao: (nova.descricao || '').trim(),
      tem_ataque: !!nova.tem_ataque,
      tem_salvaguarda: !!nova.tem_salvaguarda,
      salvaguarda_atributo: nova.salvaguarda_atributo || 'des',
      formula_dano: (nova.formula_dano || '').trim(),
      tipo_dano: (nova.tipo_dano || '').trim(),
      escala_por_nivel: (nova.escala_por_nivel || '').trim(),
    };
    const lista = nova.id ? ficha.magias.map((m) => (m.id === magia.id ? magia : m)) : [...ficha.magias, magia];
    onSalvarMagias(lista);
    setNova(null);
  };

  return (
    <div className="magias">
      {/* Conjuração */}
      <div className="conjuracao">
        <label className="conjuracao-attr">
          <span className="vital-rotulo">Atributo</span>
          <select
            value={ficha.atributoConjuracao}
            onChange={(e) => onAtributo(e.target.value)}
            disabled={!souDono}
          >
            {ATRIBUTOS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.sigla}
              </option>
            ))}
          </select>
        </label>
        <div className="vital">
          <span className="vital-rotulo">CD</span>
          <span className="vital-valor">{cd}</span>
        </div>
        <div className="vital">
          <span className="vital-rotulo">Ataque</span>
          <span className="vital-valor">{fmtMod(ataque)}</span>
        </div>
      </div>

      {/* Espaços de magia */}
      <div className="espacos">
        <div className="espacos-topo">
          <span className="ficha-secao-rotulo">Espaços de magia</span>
          {souDono && (
            <button className="mesa-icone-btn" onClick={() => setEditandoEspacos((v) => !v)} title="Definir quantos espaços você tem">
              {editandoEspacos ? '✓' : '✎'}
            </button>
          )}
        </div>

        {editandoEspacos ? (
          <div className="espacos-editor">
            {NIVEIS_MAGIA.filter((n) => n > 0).map((n) => (
              <label key={n}>
                <span>{n}º</span>
                <input
                  type="number"
                  min="0"
                  max="9"
                  value={ficha.espacos[n]?.total ?? 0}
                  onChange={(e) => {
                    const total = Math.max(0, Number(e.target.value) || 0);
                    const atual = ficha.espacos[n] || { total: 0, gastos: 0 };
                    onEspacos({
                      ...ficha.espacos,
                      [n]: { total, gastos: Math.min(atual.gastos || 0, total) },
                    });
                  }}
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="espacos-lista">
            {NIVEIS_MAGIA.filter((n) => n > 0 && (ficha.espacos[n]?.total || 0) > 0).map((n) => {
              const e = ficha.espacos[n];
              const gastos = e.gastos || 0;
              return (
                <div key={n} className="espaco-linha">
                  <span className="espaco-nivel">{n}º</span>
                  <div className="espaco-pips">
                    {Array.from({ length: e.total }).map((_, i) => (
                      <button
                        key={i}
                        className={`pip ${i < e.total - gastos ? 'is-cheio' : ''}`}
                        onClick={() => souDono && onGastarEspaco(n, i < e.total - gastos ? 1 : -1)}
                        title={i < e.total - gastos ? 'Gastar' : 'Recuperar'}
                        disabled={!souDono}
                      />
                    ))}
                  </div>
                  <span className="espaco-conta">
                    {e.total - gastos}/{e.total}
                  </span>
                </div>
              );
            })}
            {NIVEIS_MAGIA.filter((n) => n > 0 && (ficha.espacos[n]?.total || 0) > 0).length === 0 && (
              <p className="dock-vazio">Sem espaços definidos. Use o lápis pra dizer quantos você tem por círculo.</p>
            )}
          </div>
        )}
      </div>

      {/* Lista de magias */}
      <div className="magias-lista">
        {ficha.magias.length === 0 && <p className="dock-vazio">Nenhuma magia no grimório ainda.</p>}

        {porNivel.map((grupo) => (
          <section key={grupo.nivel} className="magia-grupo">
            <span className="ficha-secao-rotulo">{rotuloNivel(grupo.nivel)}</span>
            {grupo.magias.map((m) => {
              const aberta = abertaId === m.id;
              const espaco = ficha.espacos[m.nivel] || { total: 0, gastos: 0 };
              const semEspaco = m.nivel > 0 && (espaco.gastos || 0) >= (espaco.total || 0);
              return (
                <div key={m.id} className={`magia ${aberta ? 'is-aberta' : ''}`}>
                  <button className="magia-linha" onClick={() => setAbertaId(aberta ? null : m.id)}>
                    <span className={`magia-marca ${m.preparada !== false ? 'is-preparada' : ''}`} />
                    <span className="magia-nome">{m.nome}</span>
                    {m.concentracao && <span className="magia-conc" title="Concentração">C</span>}
                    <span className="magia-escola">{m.escola}</span>
                  </button>

                  {aberta && (
                    <div className="magia-detalhe">
                      {m.descricao && <p className="item-descricao">{m.descricao}</p>}
                      <div className="item-meta">
                        {m.alcance && <span>{m.alcance}</span>}
                        {m.duracao && <span>{m.duracao}</span>}
                        {m.formula_dano && <span>{m.formula_dano} {m.tipo_dano}</span>}
                        {m.tem_salvaguarda && <span>salva {m.salvaguarda_atributo?.toUpperCase()} CD {cd}</span>}
                        {m.escala_por_nivel && <span>+{m.escala_por_nivel} por círculo</span>}
                      </div>

                      {souDono && (
                        <div className="magia-conjurar">
                          <button
                            className="mesa-btn mesa-btn--primario"
                            onClick={() => onConjurar(m, m.nivel)}
                            disabled={semEspaco}
                          >
                            {m.nivel === 0 ? 'Conjurar' : semEspaco ? 'Sem espaço' : `Conjurar ${m.nivel}º`}
                          </button>
                          {m.nivel > 0 &&
                            NIVEIS_MAGIA.filter(
                              (n) => n > m.nivel && (ficha.espacos[n]?.total || 0) > (ficha.espacos[n]?.gastos || 0)
                            ).map((n) => (
                              <button key={n} className="mesa-btn" onClick={() => onConjurar(m, n)} title={`Conjurar usando espaço de ${n}º`}>
                                {n}º
                              </button>
                            ))}
                        </div>
                      )}

                      {souDono && (
                        <div className="item-controles">
                          <button
                            className={`mesa-btn ${m.preparada !== false ? 'is-ativo' : ''}`}
                            onClick={() =>
                              onSalvarMagias(
                                ficha.magias.map((x) => (x.id === m.id ? { ...x, preparada: x.preparada === false } : x))
                              )
                            }
                          >
                            {m.preparada !== false ? 'Preparada' : 'Preparar'}
                          </button>
                          <button className="mesa-icone-btn" onClick={() => setNova({ ...m })} title="Editar">
                            ✎
                          </button>
                          <button
                            className="mesa-icone-btn"
                            onClick={() => onSalvarMagias(ficha.magias.filter((x) => x.id !== m.id))}
                            title="Remover"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>

      {/* Adicionar magia */}
      {souDono &&
        (nova ? (
          <div className="item-novo">
            <input
              autoFocus
              placeholder="Nome da magia"
              value={nova.nome || ''}
              onChange={(e) => campo('nome', e.target.value)}
            />
            <div className="item-novo-linha">
              <select value={nova.nivel ?? 0} onChange={(e) => campo('nivel', e.target.value)}>
                {NIVEIS_MAGIA.map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? 'Truque' : `${n}º`}
                  </option>
                ))}
              </select>
              <select value={nova.escola || ''} onChange={(e) => campo('escola', e.target.value)}>
                <option value="">Escola</option>
                {ESCOLAS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <input
                placeholder="Alcance"
                value={nova.alcance || ''}
                onChange={(e) => campo('alcance', e.target.value)}
              />
            </div>
            <div className="item-novo-linha">
              <input
                placeholder="Dano (3d6)"
                value={nova.formula_dano || ''}
                onChange={(e) => campo('formula_dano', e.target.value)}
              />
              <input
                placeholder="Tipo (fogo)"
                value={nova.tipo_dano || ''}
                onChange={(e) => campo('tipo_dano', e.target.value)}
              />
              <input
                placeholder="+/círculo (1d6)"
                value={nova.escala_por_nivel || ''}
                onChange={(e) => campo('escala_por_nivel', e.target.value)}
              />
            </div>
            <input
              placeholder="Duração (1 minuto)"
              value={nova.duracao || ''}
              onChange={(e) => campo('duracao', e.target.value)}
            />
            <input
              placeholder="Descrição"
              value={nova.descricao || ''}
              onChange={(e) => campo('descricao', e.target.value)}
            />
            <div className="magia-flags">
              <label className="editor-check">
                <input type="checkbox" checked={!!nova.tem_ataque} onChange={(e) => campo('tem_ataque', e.target.checked)} />
                <span>Ataque</span>
              </label>
              <label className="editor-check">
                <input
                  type="checkbox"
                  checked={!!nova.tem_salvaguarda}
                  onChange={(e) => campo('tem_salvaguarda', e.target.checked)}
                />
                <span>Salvaguarda</span>
              </label>
              {nova.tem_salvaguarda && (
                <select
                  value={nova.salvaguarda_atributo || 'des'}
                  onChange={(e) => campo('salvaguarda_atributo', e.target.value)}
                >
                  {ATRIBUTOS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.sigla}
                    </option>
                  ))}
                </select>
              )}
              <label className="editor-check">
                <input
                  type="checkbox"
                  checked={!!nova.concentracao}
                  onChange={(e) => campo('concentracao', e.target.checked)}
                />
                <span>Concentração</span>
              </label>
            </div>
            <div className="ficha-nova-acoes">
              <button className="mesa-btn mesa-btn--primario" onClick={salvarNova}>
                Salvar
              </button>
              <button className="mesa-btn" onClick={() => setNova(null)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button className="mesa-btn mesa-btn--largo" onClick={() => setNova({ nivel: 0 })}>
            + Magia
          </button>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// Inventário
// ---------------------------------------------------------------------
function Inventario({ ficha, souDono, onAdicionar, onAlterar, onRemover, onMostrar, onUsar, onMoedas }) {
  const [abertoId, setAbertoId] = useState(null);
  const [novo, setNovo] = useState(null);

  const capacidade = (ficha.atributos.for || 10) * 7.5;
  const pesoTotal = ficha.inventario.reduce(
    (soma, i) => soma + (Number(i.peso) || 0) * (Number(i.qtd) || 1),
    0
  );
  const sobrecarregado = pesoTotal > capacidade;

  const campoNovo = (campo, valor) => setNovo((n) => ({ ...n, [campo]: valor }));

  const confirmarNovo = () => {
    const nome = (novo?.nome || '').trim();
    if (!nome) return;
    onAdicionar({
      nome,
      qtd: Math.max(1, Number(novo.qtd) || 1),
      peso: Math.max(0, Number(novo.peso) || 0),
      tipo: novo.tipo || 'equipamento',
      descricao: (novo.descricao || '').trim(),
      formula: (novo.formula || '').trim(),
      equipado: false,
    });
    setNovo(null);
  };

  return (
    <div className="inventario">
      {/* Moedas */}
      <div className="moedas">
        {[
          { id: 'po', rotulo: 'PO' },
          { id: 'pp', rotulo: 'PP' },
          { id: 'pc', rotulo: 'PC' },
        ].map((m) => (
          <label key={m.id} className="moeda">
            <span>{m.rotulo}</span>
            <input
              type="number"
              min="0"
              value={ficha.moedas[m.id]}
              disabled={!souDono}
              onChange={(e) => onMoedas({ ...ficha.moedas, [m.id]: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
        ))}
      </div>

      <div className={`carga ${sobrecarregado ? 'is-excedida' : ''}`}>
        <span className="dock-rotulo">Carga</span>
        <span className="carga-valor">
          {pesoTotal.toFixed(1)} <small>/ {capacidade.toFixed(0)} kg</small>
        </span>
      </div>

      {/* Lista */}
      <div className="itens">
        {ficha.inventario.length === 0 && <p className="dock-vazio">Mochila vazia.</p>}
        {ficha.inventario.map((item) => {
          const aberto = abertoId === item.id;
          return (
            <div key={item.id} className={`item ${aberto ? 'is-aberto' : ''} ${item.equipado ? 'is-equipado' : ''}`}>
              <button className="item-linha" onClick={() => setAbertoId(aberto ? null : item.id)}>
                <span className="item-qtd">{Number(item.qtd) || 1}×</span>
                <span className="item-nome">{item.nome}</span>
                <span className="item-tipo">{item.tipo}</span>
              </button>

              {aberto && (
                <div className="item-detalhe">
                  {item.descricao && <p className="item-descricao">{item.descricao}</p>}
                  <div className="item-meta">
                    {(Number(item.peso) || 0) > 0 && <span>{Number(item.peso).toFixed(2)} kg cada</span>}
                    {item.formula && <span>rola {item.formula}</span>}
                  </div>

                  <div className="item-acoes">
                    <button className="mesa-btn" onClick={() => onMostrar(item)}>
                      Mostrar no chat
                    </button>
                    {souDono && (item.formula || item.tipo === 'consumivel') && (
                      <button className="mesa-btn mesa-btn--primario" onClick={() => onUsar(item)}>
                        Usar
                      </button>
                    )}
                  </div>

                  {souDono && (
                    <div className="item-controles">
                      <div className="item-quantidade">
                        <button
                          className="mesa-icone-btn"
                          onClick={() => onAlterar(item.id, { qtd: Math.max(1, (Number(item.qtd) || 1) - 1) })}
                        >
                          −
                        </button>
                        <span>{Number(item.qtd) || 1}</span>
                        <button
                          className="mesa-icone-btn"
                          onClick={() => onAlterar(item.id, { qtd: (Number(item.qtd) || 1) + 1 })}
                        >
                          +
                        </button>
                      </div>
                      <button
                        className={`mesa-btn ${item.equipado ? 'is-ativo' : ''}`}
                        onClick={() => onAlterar(item.id, { equipado: !item.equipado })}
                      >
                        {item.equipado ? 'Equipado' : 'Equipar'}
                      </button>
                      <button className="mesa-icone-btn" onClick={() => onRemover(item.id)} title="Descartar">
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Adicionar */}
      {souDono &&
        (novo ? (
          <div className="item-novo">
            <input
              autoFocus
              placeholder="Nome do item"
              value={novo.nome || ''}
              onChange={(e) => campoNovo('nome', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmarNovo()}
            />
            <div className="item-novo-linha">
              <input
                type="number"
                min="1"
                placeholder="Qtd"
                value={novo.qtd || ''}
                onChange={(e) => campoNovo('qtd', e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Peso (kg)"
                value={novo.peso || ''}
                onChange={(e) => campoNovo('peso', e.target.value)}
              />
              <select value={novo.tipo || 'equipamento'} onChange={(e) => campoNovo('tipo', e.target.value)}>
                {TIPOS_ITEM.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <input
              placeholder="Descrição (opcional)"
              value={novo.descricao || ''}
              onChange={(e) => campoNovo('descricao', e.target.value)}
            />
            <input
              placeholder="Fórmula pra rolar ao usar (ex: 2d4+2)"
              value={novo.formula || ''}
              onChange={(e) => campoNovo('formula', e.target.value)}
            />
            <div className="ficha-nova-acoes">
              <button className="mesa-btn mesa-btn--primario" onClick={confirmarNovo}>
                Adicionar
              </button>
              <button className="mesa-btn" onClick={() => setNovo(null)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button className="mesa-btn mesa-btn--largo" onClick={() => setNovo({ qtd: 1, tipo: 'equipamento' })}>
            + Item
          </button>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// Editor compacto da ficha
// ---------------------------------------------------------------------
function EditorFicha({ rascunho, setRascunho, campanhaId, onSalvar, onCancelar }) {
  const [importando, setImportando] = useState(false);
  const [erroUrl, setErroUrl] = useState('');

  const importarFoto = async () => {
    const url = (rascunho.retratoUrl ?? rascunho.retrato_url ?? '').trim();
    if (!url) return;
    setImportando(true);
    setErroUrl('');
    try {
      const nova = await importarDeUrl(url, `fichas/${campanhaId}`);
      setRascunho((r) => ({ ...r, retratoUrl: nova }));
    } catch (erro) {
      setErroUrl(erro.message || 'Falha ao importar a imagem.');
    } finally {
      setImportando(false);
    }
  };

  const set = (campo, valor) => setRascunho((r) => ({ ...r, [campo]: valor }));
  const setAttr = (id, valor) =>
    setRascunho((r) => ({ ...r, atributos: { ...r.atributos, [id]: Number(valor) || 0 } }));
  const togglePericia = (id) =>
    setRascunho((r) => {
      const atual = r.pericias?.[id];
      const proximo = !atual ? true : atual === true ? 'expert' : undefined;
      const pericias = { ...(r.pericias || {}) };
      if (proximo === undefined) delete pericias[id];
      else pericias[id] = proximo;
      return { ...r, pericias };
    });
  const toggleSave = (id) =>
    setRascunho((r) => {
      const salvaguardas = { ...(r.salvaguardas || {}) };
      if (salvaguardas[id]) delete salvaguardas[id];
      else salvaguardas[id] = true;
      return { ...r, salvaguardas };
    });

  const addAcao = () =>
    setRascunho((r) => ({
      ...r,
      acoes: [
        ...(r.acoes || []),
        {
          id: `a-${Date.now()}`,
          nome: 'Nova ação',
          tipo: 'action',
          atributo_base: 'for',
          proficiente: true,
          bonus_adicional_acerto: 0,
          tem_ataque: true,
          formula_dano: '1d6',
          tipo_dano: 'cortante',
          alcance: '',
        },
      ],
    }));

  const setAcao = (idx, campo, valor) =>
    setRascunho((r) => {
      const acoes = [...(r.acoes || [])];
      acoes[idx] = { ...acoes[idx], [campo]: valor };
      return { ...r, acoes };
    });

  const removerAcao = (idx) =>
    setRascunho((r) => ({ ...r, acoes: (r.acoes || []).filter((_, i) => i !== idx) }));

  const salvar = () => {
    onSalvar({
      classe: rascunho.classe,
      especie: rascunho.especie,
      nivel: Number(rascunho.nivel) || 1,
      profBonus: Number(rascunho.profBonus) || 2,
      ca: Number(rascunho.ca) || 10,
      deslocamento: rascunho.deslocamento,
      dadosVida: rascunho.dadosVida,
      pv_total: Number(rascunho.pvTotal ?? rascunho.pv_total) || 10,
      pv_atual: Math.min(
        Number(rascunho.pvAtual ?? rascunho.pv_atual) || 10,
        Number(rascunho.pvTotal ?? rascunho.pv_total) || 10
      ),
      atributos: rascunho.atributos,
      pericias: rascunho.pericias || {},
      salvaguardas: rascunho.salvaguardas || {},
      acoes: rascunho.acoes || [],
      cor: rascunho.cor,
      retrato_url: (rascunho.retratoUrl ?? rascunho.retrato_url) || null,
      visaoClara: Math.max(0, Number(rascunho.visaoClara) || 0),
      visaoEscuro: Math.max(0, Number(rascunho.visaoEscuro) || 0),
    });
  };

  return (
    <div className="ficha-editor">
      <div className="editor-grade">
        <label>
          <span>Espécie</span>
          <input value={rascunho.especie || ''} onChange={(e) => set('especie', e.target.value)} />
        </label>
        <label>
          <span>Classe</span>
          <input value={rascunho.classe || ''} onChange={(e) => set('classe', e.target.value)} />
        </label>
        <label>
          <span>Nível</span>
          <input type="number" value={rascunho.nivel} onChange={(e) => set('nivel', e.target.value)} />
        </label>
        <label>
          <span>Proficiência</span>
          <input type="number" value={rascunho.profBonus} onChange={(e) => set('profBonus', e.target.value)} />
        </label>
        <label>
          <span>CA</span>
          <input type="number" value={rascunho.ca} onChange={(e) => set('ca', e.target.value)} />
        </label>
        <label>
          <span>Deslocamento</span>
          <input value={rascunho.deslocamento || ''} onChange={(e) => set('deslocamento', e.target.value)} />
        </label>
        <label>
          <span>PV total</span>
          <input
            type="number"
            value={rascunho.pvTotal ?? rascunho.pv_total ?? 10}
            onChange={(e) => set('pvTotal', e.target.value)}
          />
        </label>
        <label>
          <span>PV atual</span>
          <input
            type="number"
            value={rascunho.pvAtual ?? rascunho.pv_atual ?? 10}
            onChange={(e) => set('pvAtual', e.target.value)}
          />
        </label>
        <label>
          <span>Dado de vida</span>
          <input value={rascunho.dadosVida || ''} onChange={(e) => set('dadosVida', e.target.value)} />
        </label>
        <label>
          <span>Visão com luz (m)</span>
          <input
            type="number"
            value={rascunho.visaoClara ?? 18}
            onChange={(e) => set('visaoClara', e.target.value)}
          />
        </label>
        <label>
          <span>Visão no escuro (m)</span>
          <input
            type="number"
            value={rascunho.visaoEscuro ?? 0}
            onChange={(e) => set('visaoEscuro', e.target.value)}
          />
        </label>
        <label>
          <span>Cor do token</span>
          <input type="color" value={rascunho.cor || '#785a28'} onChange={(e) => set('cor', e.target.value)} />
        </label>
        <label className="editor-campo-largo">
          <span>Foto (URL) — ou clique no avatar pra enviar</span>
          <div className="modal-url">
            <input
              value={rascunho.retratoUrl || rascunho.retrato_url || ''}
              onChange={(e) => set('retratoUrl', e.target.value)}
              placeholder="https://…"
            />
            <button
              className="mesa-btn"
              type="button"
              onClick={importarFoto}
              disabled={importando || !(rascunho.retratoUrl || rascunho.retrato_url || '').trim()}
              title="Baixa a imagem e hospeda junto com a campanha — imagens de outros sites costumam não aparecer no token"
            >
              {importando ? '…' : 'Importar'}
            </button>
          </div>
          {erroUrl && <em className="editor-erro">{erroUrl}</em>}
        </label>
      </div>

      <div className="ficha-secao-rotulo">Atributos</div>
      <div className="editor-atributos">
        {ATRIBUTOS.map((a) => (
          <label key={a.id}>
            <span>{a.sigla}</span>
            <input
              type="number"
              value={rascunho.atributos?.[a.id] ?? 10}
              onChange={(e) => setAttr(a.id, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="ficha-secao-rotulo">Salvaguardas proficientes</div>
      <div className="editor-chips">
        {ATRIBUTOS.map((a) => (
          <button
            key={a.id}
            className={`chip ${rascunho.salvaguardas?.[a.id] ? 'is-ativo' : ''}`}
            onClick={() => toggleSave(a.id)}
          >
            {a.sigla}
          </button>
        ))}
      </div>

      <div className="ficha-secao-rotulo">Perícias — clique: proficiente → especialista → nenhum</div>
      <div className="editor-chips">
        {PERICIAS.map((p) => {
          const nivel = rascunho.pericias?.[p.id];
          return (
            <button
              key={p.id}
              className={`chip ${nivel ? (nivel === 'expert' ? 'is-expert' : 'is-ativo') : ''}`}
              onClick={() => togglePericia(p.id)}
            >
              {p.nome}
            </button>
          );
        })}
      </div>

      <div className="ficha-secao-rotulo">Ações e ataques</div>
      <div className="editor-acoes">
        {(rascunho.acoes || []).map((acao, idx) => (
          <div key={acao.id || idx} className="editor-acao">
            <div className="editor-acao-linha">
              <input
                className="editor-acao-nome"
                value={acao.nome}
                onChange={(e) => setAcao(idx, 'nome', e.target.value)}
                placeholder="Nome"
              />
              <button className="mesa-icone-btn" onClick={() => removerAcao(idx)} title="Remover">
                ×
              </button>
            </div>
            <div className="editor-acao-linha">
              <select value={acao.atributo_base || 'for'} onChange={(e) => setAcao(idx, 'atributo_base', e.target.value)}>
                {ATRIBUTOS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.sigla}
                  </option>
                ))}
              </select>
              <input
                value={acao.formula_dano || ''}
                onChange={(e) => setAcao(idx, 'formula_dano', e.target.value)}
                placeholder="Dano: 1d8+@mod_for"
              />
            </div>
            <div className="editor-acao-linha">
              <input
                value={acao.alcance || ''}
                onChange={(e) => setAcao(idx, 'alcance', e.target.value)}
                placeholder="Alcance"
              />
              <label className="editor-check">
                <input
                  type="checkbox"
                  checked={acao.proficiente !== false}
                  onChange={(e) => setAcao(idx, 'proficiente', e.target.checked)}
                />
                <span>Proficiente</span>
              </label>
            </div>
          </div>
        ))}
        <button className="mesa-btn mesa-btn--largo" onClick={addAcao}>
          + Ação
        </button>
      </div>

      <div className="ficha-editor-rodape">
        <button className="mesa-btn mesa-btn--primario" onClick={salvar}>
          Salvar ficha
        </button>
        <button className="mesa-btn" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
