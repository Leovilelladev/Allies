import { Assets, Container, Graphics, Sprite, Text } from 'pixi.js';
import { CONDICAO_POR_ID } from './condicoes';
import { COR, CSS, FONTE_SANS, PALETA_TOKEN } from './paleta';

export function tokenColor(index) {
  return PALETA_TOKEN[index % PALETA_TOKEN.length];
}

function iniciais(nome) {
  return (nome || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const FONTE = FONTE_SANS;

/**
 * Estrutura da view de um token:
 *
 *   container            → só posição (nunca gira)
 *     ├ giro             → rotação + escala (corpo + seta de direção)
 *     ├ sigla            → iniciais, escalam mas não giram
 *     ├ placa            → nome, sempre legível e do mesmo tamanho
 *     └ vida             → barra de PV quando o token tem ficha vinculada
 */
export function createTokenView(token) {
  const container = new Container();
  container.eventMode = 'static';
  container.cursor = 'grab';

  const giro = new Container();
  const corpo = new Graphics();
  const seta = new Graphics();
  giro.addChild(corpo, seta);

  const sigla = new Text({
    text: '',
    style: { fontFamily: FONTE, fontSize: 15, fontWeight: '700', fill: CSS.texto, align: 'center' },
  });
  sigla.anchor.set(0.5);

  // Retrato: sprite recortado num círculo, entra no lugar das iniciais.
  // A máscara fica no mesmo nível do conteúdo mascarado (padrão do Pixi),
  // não como filha dele.
  const retrato = new Container();
  const retratoMascara = new Graphics();
  retrato.visible = false;

  const placaFundo = new Graphics();
  const placa = new Text({
    text: '',
    style: { fontFamily: FONTE, fontSize: 11, fontWeight: '600', fill: CSS.texto, align: 'center' },
  });
  placa.anchor.set(0.5, 0);

  const vida = new Graphics();
  const condicoes = new Container();

  container.addChild(giro, retratoMascara, retrato, sigla, vida, placaFundo, placa, condicoes);
  retrato.mask = retratoMascara;
  Object.assign(container, {
    giro,
    corpo,
    seta,
    sigla,
    placa,
    placaFundo,
    vida,
    retrato,
    retratoMascara,
    retratoSprite: null,
    retratoUrl: null,
    condicoes,
    condicoesChave: null,
  });

  redrawTokenView(container, token, false);
  return container;
}

export function redrawTokenView(container, token, isSelected) {
  const { corpo, seta, sigla, placa, placaFundo, vida, giro } = container;
  const raio = token.radius;
  const escala = token.scaleX || 1;

  corpo.clear();
  corpo.circle(0, 0, raio).fill(token.color);
  corpo.stroke({
    width: isSelected ? 3 : 1.5,
    color: isSelected ? COR.ouro : COR.texto,
    alpha: isSelected ? 1 : 0.45,
  });

  // Seta de direção
  seta.clear();
  const ay = -raio - 3;
  seta.poly([0, ay - 7, -7, ay + 4, 7, ay + 4]).fill(COR.ouro);

  const texto = iniciais(token.label);
  if (sigla.text !== texto) sigla.text = texto;

  // Retrato assume o lugar das iniciais quando o token tem imagem
  aplicarImagemToken(container, token.imagemUrl || null);
  const temRetrato = !!container.retratoSprite && !!token.imagemUrl;
  sigla.visible = !temRetrato;
  container.retrato.visible = temRetrato;
  if (temRetrato) {
    container.retratoMascara.clear();
    container.retratoMascara.circle(0, 0, raio * escala - 1).fill(0xffffff);
    const tex = container.retratoSprite.texture;
    const lado = Math.min(tex.width, tex.height) || 1;
    const cobrir = ((raio * escala - 1) * 2) / lado;
    container.retratoSprite.scale.set(cobrir);
  }

  // Nome sempre horizontal e do mesmo tamanho, abaixo do token
  const nome = token.label || '';
  if (placa.text !== nome) placa.text = nome;
  const raioVisual = raio * escala;
  const temVida = token.pvTotal > 0;
  const yPlaca = raioVisual + (temVida ? 12 : 6);
  placa.position.set(0, yPlaca);

  placaFundo.clear();
  if (nome) {
    const larg = placa.width + 10;
    const alt = placa.height + 4;
    placaFundo
      .roundRect(-larg / 2, yPlaca - 2, larg, alt, 2)
      .fill({ color: COR.vazio, alpha: 0.78 })
      .stroke({ width: 1, color: COR.ouro, alpha: 0.22 });
  }

  // Barra de vida
  vida.clear();
  if (temVida) {
    const larg = Math.max(34, raioVisual * 1.8);
    const alt = 5;
    const y = raioVisual + 2;
    const pct = Math.max(0, Math.min(1, token.pvAtual / token.pvTotal));
    const cor = pct <= 0.25 ? COR.erro : pct <= 0.5 ? COR.ouro : COR.turquesa;
    vida.rect(-larg / 2, y, larg, alt).fill({ color: COR.vazio, alpha: 0.85 });
    if (pct > 0) vida.rect(-larg / 2, y, larg * pct, alt).fill(cor);
    vida.rect(-larg / 2, y, larg, alt).stroke({ width: 1, color: COR.ouro, alpha: 0.35 });
  }

  desenharCondicoes(container, token, raio * escala);

  container.__raioAtual = raio * escala;
  container.position.set(token.x, token.y);
  giro.rotation = (token.rotation * Math.PI) / 180;
  giro.scale.set(escala, escala);
  sigla.scale.set(escala, escala);
}

/**
 * Marcadores de condição em arco na borda superior direita do token.
 * Cada um é uma bolinha colorida com a sigla — legível sem hover.
 */
function desenharCondicoes(container, token, raioVisual) {
  const lista = Array.isArray(token.condicoes) ? token.condicoes : [];
  const chave = lista.join(',');
  if (container.condicoesChave === chave && container.__raioCondicoes === raioVisual) return;
  container.condicoesChave = chave;
  container.__raioCondicoes = raioVisual;

  container.condicoes.removeChildren().forEach((f) => f.destroy({ children: true }));
  if (!lista.length) return;

  const r = 9;
  const passo = 0.62; // radianos entre marcadores
  const inicio = -Math.PI / 4; // começa no canto superior direito
  const distancia = raioVisual + r * 0.6;

  lista.slice(0, 6).forEach((id, i) => {
    const info = CONDICAO_POR_ID[id];
    if (!info) return;
    const ang = inicio + i * passo;
    const x = Math.cos(ang) * distancia;
    const y = Math.sin(ang) * distancia;

    const marca = new Container();
    marca.position.set(x, y);

    const bolha = new Graphics()
      .circle(0, 0, r)
      .fill(info.cor)
      .stroke({ width: 1.5, color: COR.vazio, alpha: 0.85 });

    const texto = new Text({
      text: info.sigla,
      style: { fontFamily: FONTE, fontSize: 8.5, fontWeight: '800', fill: '#ffffff' },
    });
    texto.anchor.set(0.5);

    marca.addChild(bolha, texto);
    container.condicoes.addChild(marca);
  });
}

/**
 * Carrega (uma vez por URL) a imagem do token e a coloca dentro da máscara.
 * O carregamento é assíncrono: quando a textura chega, o sprite aparece.
 */
export function aplicarImagemToken(container, url) {
  if (container.retratoUrl === url) return;
  container.retratoUrl = url;

  if (container.retratoSprite) {
    container.retratoSprite.destroy();
    container.retratoSprite = null;
  }
  if (!url) {
    container.retrato.visible = false;
    container.sigla.visible = true;
    return;
  }

  Assets.load(url)
    .then((textura) => {
      // O token pode ter sido destruído ou trocado de imagem no meio do caminho
      if (container.destroyed || container.retratoUrl !== url) return;
      const sprite = new Sprite(textura);
      sprite.anchor.set(0.5);
      container.retrato.addChild(sprite);
      container.retratoSprite = sprite;
      container.retrato.visible = true;
      container.sigla.visible = false;

      const lado = Math.min(textura.width, textura.height) || 1;
      const raio = container.__raioAtual || 28;
      container.retratoMascara.clear();
      container.retratoMascara.circle(0, 0, raio - 1).fill(0xffffff);
      sprite.scale.set(((raio - 1) * 2) / lado);
    })
    .catch((e) => {
      console.error('Falha ao carregar imagem do token:', e);
      container.retratoUrl = null;
    });
}

// ------------------------------------------------------------------
// Handles de seleção (girar / redimensionar) — ficam por cima do token
// ------------------------------------------------------------------
export function createSelectionHandles() {
  const root = new Container();
  root.visible = false;

  const rotateHandle = new Graphics()
    .circle(0, 0, 7)
    .fill(COR.ouro)
    .stroke({ width: 1.5, color: COR.vazio });
  rotateHandle.eventMode = 'static';
  rotateHandle.cursor = 'grab';

  const resizeHandle = new Graphics()
    .rect(-6, -6, 12, 12)
    .fill(COR.ouro)
    .stroke({ width: 1.5, color: COR.vazio });
  resizeHandle.eventMode = 'static';
  resizeHandle.cursor = 'nwse-resize';

  const rotateLine = new Graphics();
  const anel = new Graphics();

  root.addChild(anel, rotateLine, rotateHandle, resizeHandle);
  Object.assign(root, { rotateHandle, resizeHandle, rotateLine, anel });
  return root;
}

export function positionSelectionHandles(handles, token, invEscala = 1) {
  const raio = token.radius * (token.scaleX || 1);
  const rad = (token.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const paraMundo = (p) => ({
    x: token.x + p.x * cos - p.y * sin,
    y: token.y + p.x * sin + p.y * cos,
  });

  const pontoGirar = paraMundo({ x: 0, y: -raio - 26 * invEscala });
  const pontoTamanho = paraMundo({ x: raio * 0.7071, y: raio * 0.7071 });
  const pontaSeta = paraMundo({ x: 0, y: -raio - 8 * invEscala });

  handles.rotateHandle.position.set(pontoGirar.x, pontoGirar.y);
  handles.rotateHandle.scale.set(invEscala);
  handles.resizeHandle.position.set(pontoTamanho.x, pontoTamanho.y);
  handles.resizeHandle.scale.set(invEscala);

  handles.rotateLine
    .clear()
    .moveTo(pontaSeta.x, pontaSeta.y)
    .lineTo(pontoGirar.x, pontoGirar.y)
    .stroke({ width: 1.5 * invEscala, color: COR.ouro, alpha: 0.7 });

  handles.anel
    .clear()
    .circle(token.x, token.y, raio + 4 * invEscala)
    .stroke({ width: 1 * invEscala, color: COR.ouro, alpha: 0.4 });

  handles.visible = true;
}
