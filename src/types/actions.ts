/**
 * Allies RPG - Modelagem de Dados de Ações e Engine D&D 5e
 */

export type AbilityScore = 'for' | 'des' | 'con' | 'int' | 'sab' | 'car' | 'str' | 'dex' | 'wis' | 'cha';

export type ActionType = 'action' | 'bonus_action' | 'reaction' | 'free' | 'special';

export type RechargeType = 'short_rest' | 'long_rest' | 'dawn' | 'none';

export type DamageType =
  | 'slashing'
  | 'piercing'
  | 'bludgeoning'
  | 'fire'
  | 'cold'
  | 'lightning'
  | 'acid'
  | 'poison'
  | 'necrotic'
  | 'radiant'
  | 'psychic'
  | 'force'
  | 'healing'
  | 'utility';

export interface ActionItem {
  id: string | number;
  nome: string;
  tipo: ActionType; // 'action' | 'bonus_action' | 'reaction' | 'free' | 'special'
  icone_url?: string;
  descricao?: string;
  alcance?: string; // Ex: 'Corpo a corpo', '18m / 60ft', 'Toque'
  alvo?: string; // Ex: '1 criatura', 'Esfera de 6m'

  // Mecânicas D&D 5e
  tem_ataque?: boolean; // Se faz rolagem de ataque (d20 + acerto)
  atributo_base?: AbilityScore; // 'for', 'des', 'con', 'int', 'sab', 'car'
  proficiente?: boolean; // Se adiciona bônus de proficiência no acerto
  bonus_adicional_acerto?: number; // Modificador fixo (+1, +2, etc.)

  // Fórmula Dinâmica de Dano / Efeito (Ex: '1d8 + @mod_str + @prof')
  formula_dano?: string;
  tipo_dano?: DamageType | string; // 'slashing', 'fire', 'healing', etc.
  formula_secundaria?: string; // Dano extra (ex: 1d6 fogo)
  tipo_dano_secundario?: DamageType | string;

  // Salvaguarda (Save DC)
  tem_salvaguarda?: boolean;
  salvaguarda_atributo?: AbilityScore; // Atributo que o alvo rola
  salvaguarda_dc_custom?: number; // Se for DC fixa; senão calcula 8 + prof + mod

  // Sistema de Cargas (Charges)
  tem_cargas?: boolean;
  max_cargas?: number;
  cargas_atuais?: number;
  tipo_recarga?: RechargeType; // 'short_rest' | 'long_rest' | 'dawn' | 'none'
}

export interface CharacterStats {
  nivel: number;
  proficiencia: number;
  ca: number;
  atributos: {
    for: number;
    des: number;
    con: number;
    int: number;
    sab: number;
    car: number;
  };
  modificadores: {
    for: number;
    des: number;
    con: number;
    int: number;
    sab: number;
    car: number;
  };
  atributo_conjuracao?: AbilityScore;
}

export interface RollBreakdown {
  d20: number;
  bonusAcerto: number;
  totalAcerto: number;
  ehCritico: boolean;
  ehFalhaCritica: boolean;
  danoDetalhes: {
    dadosRolados: { dado: string; resultados: number[]; subtotal: number }[];
    modificadores: { nome: string; valor: number }[];
    totalDano: number;
    tipoDano: string;
  };
}

export interface RollResult {
  actionId: string | number;
  nomeAcao: string;
  tipoAcao: ActionType;
  temAtaque: boolean;
  acerto?: {
    d20: number;
    modificador: number;
    total: number;
    ehCritico: boolean;
    ehFalhaCritica: boolean;
    formula: string;
  };
  dano?: {
    total: number;
    formulaResolvida: string;
    tipoDano: string;
    detalhes: string;
  };
  saveDC?: {
    dc: number;
    atributo: AbilityScore;
  };
  cargasRestantes?: number;
  descricao?: string;
}
