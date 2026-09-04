// Condições de D&D 5e usadas na mesa. `sigla` é o que aparece no token,
// `cor` diferencia de longe sem precisar ler.
export const CONDICOES = [
  { id: 'agarrado', nome: 'Agarrado', sigla: 'AG', cor: 0x8a6a3d },
  { id: 'amedrontado', nome: 'Amedrontado', sigla: 'AM', cor: 0x8a5cb8 },
  { id: 'atordoado', nome: 'Atordoado', sigla: 'AT', cor: 0xd4a017 },
  { id: 'caido', nome: 'Caído', sigla: 'CA', cor: 0x7a7a7a },
  { id: 'cego', nome: 'Cego', sigla: 'CE', cor: 0x4a4a55 },
  { id: 'concentracao', nome: 'Concentração', sigla: 'CC', cor: 0x2d7cb8 },
  { id: 'enfeiticado', nome: 'Enfeitiçado', sigla: 'EN', cor: 0xc060a0 },
  { id: 'envenenado', nome: 'Envenenado', sigla: 'EV', cor: 0x3d8c5a },
  { id: 'exausto', nome: 'Exausto', sigla: 'EX', cor: 0x9a6b4a },
  { id: 'impedido', nome: 'Impedido', sigla: 'IM', cor: 0x6a8a3d },
  { id: 'incapacitado', nome: 'Incapacitado', sigla: 'IN', cor: 0xb84a4a },
  { id: 'invisivel', nome: 'Invisível', sigla: 'IV', cor: 0x5aa8c8 },
  { id: 'paralisado', nome: 'Paralisado', sigla: 'PA', cor: 0xc87a2d },
  { id: 'petrificado', nome: 'Petrificado', sigla: 'PE', cor: 0x6b6b6b },
  { id: 'surdo', nome: 'Surdo', sigla: 'SU', cor: 0x5a5a70 },
  { id: 'inconsciente', nome: 'Inconsciente', sigla: 'IC', cor: 0xff5858 },
];

export const CONDICAO_POR_ID = Object.fromEntries(CONDICOES.map((c) => [c.id, c]));

export function corHex(numero) {
  return `#${numero.toString(16).padStart(6, '0')}`;
}
