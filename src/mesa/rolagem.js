// Camada de rolagem da Mesa Virtual: gera as rolagens, monta a mensagem
// estruturada e publica no chat da cena. Toda rolagem feita na mesa (dado
// avulso, atributo, perícia, salvaguarda, ataque) passa por aqui, então o
// chat consegue renderizar todas com o mesmo formato.
import { sb } from '../shared/supabaseClient';
import { anunciarRolagem3D } from './diceEvents';

export const MODOS = { NORMAL: 'normal', VANTAGEM: 'vantagem', DESVANTAGEM: 'desvantagem' };

export function fmtMod(n) {
  const num = Number(n) || 0;
  return num >= 0 ? `+${num}` : `${num}`;
}

function d(faces) {
  return 1 + Math.floor(Math.random() * faces);
}

// Rolagem de d20 com vantagem/desvantagem
export function rolarD20({ bonus = 0, modo = MODOS.NORMAL } = {}) {
  const valores = modo === MODOS.NORMAL ? [d(20)] : [d(20), d(20)];
  const escolhido =
    modo === MODOS.VANTAGEM
      ? Math.max(...valores)
      : modo === MODOS.DESVANTAGEM
        ? Math.min(...valores)
        : valores[0];

  return {
    valores,
    escolhido,
    modo,
    bonus: Number(bonus) || 0,
    total: escolhido + (Number(bonus) || 0),
    critico: escolhido === 20,
    falha: escolhido === 1,
  };
}

// Parser de notação de dados: aceita "2d6+3", "d20", "4d6 - 1", "1d8+1d6+2"
const TOKEN_DADO = /([+-]?)\s*(\d*)d(\d+)|([+-]?)\s*(\d+)(?!\d*d)/gi;

export function rolarFormula(formula) {
  if (!formula || typeof formula !== 'string') return null;
  const limpa = formula.replace(/\s+/g, '');
  if (!/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/i.test(limpa)) return null;

  let total = 0;
  const partes = [];
  let match;
  TOKEN_DADO.lastIndex = 0;

  while ((match = TOKEN_DADO.exec(limpa)) !== null) {
    if (match[3]) {
      const sinal = match[1] === '-' ? -1 : 1;
      const qtd = Math.min(Number(match[2]) || 1, 100);
      const faces = Math.min(Number(match[3]) || 6, 1000);
      if (faces < 2) continue;
      const rolagens = Array.from({ length: qtd }, () => d(faces));
      const soma = rolagens.reduce((a, b) => a + b, 0);
      total += sinal * soma;
      partes.push({ tipo: 'dado', qtd, faces, rolagens, soma: sinal * soma, sinal });
    } else if (match[5]) {
      const sinal = match[4] === '-' ? -1 : 1;
      const valor = sinal * Number(match[5]);
      total += valor;
      partes.push({ tipo: 'fixo', valor });
    }
  }

  if (!partes.length) return null;
  return { formula: limpa, total, partes, detalhe: detalharPartes(partes) };
}

export function detalharPartes(partes) {
  return partes
    .map((p) =>
      p.tipo === 'dado'
        ? `${p.sinal < 0 ? '−' : ''}[${p.rolagens.join(', ')}]`
        : `${p.valor >= 0 ? '+' : '−'}${Math.abs(p.valor)}`
    )
    .join(' ')
    .replace(/^\+/, '');
}

// Resumo em texto puro — vai na coluna `texto` do chat como fallback
export function resumirRolagem(payload) {
  const partes = [payload.titulo];
  if (payload.d20) {
    partes.push(`d20 ${payload.d20.escolhido}${payload.d20.bonus ? ` ${fmtMod(payload.d20.bonus)}` : ''} = ${payload.d20.total}`);
  }
  if (payload.dados) partes.push(`${payload.dados.formula} = ${payload.dados.total}`);
  if (payload.dano) partes.push(`dano ${payload.dano.total}`);
  if (payload.cd) partes.push(`CD ${payload.cd.valor}`);
  return partes.join(' · ');
}

// Publica a rolagem no chat da cena
export async function enviarRolagem({ cenaId, userId, autorNome, payload }) {
  if (!cenaId || !userId) return { error: new Error('sem cena ou usuário') };
  anunciarRolagem3D(payload);
  return sb.from('mesa_chat').insert({
    cena_id: cenaId,
    usuario_id: userId,
    autor_nome: autorNome || 'Anônimo',
    tipo: 'rolagem',
    texto: resumirRolagem(payload),
    rolagem: payload,
  });
}

export async function enviarTexto({ cenaId, userId, autorNome, texto }) {
  if (!cenaId || !userId) return { error: new Error('sem cena ou usuário') };
  return sb.from('mesa_chat').insert({
    cena_id: cenaId,
    usuario_id: userId,
    autor_nome: autorNome || 'Anônimo',
    tipo: 'texto',
    texto,
  });
}
