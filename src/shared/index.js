export { sb } from './supabaseClient';
export { ToastProvider, useToast } from './Toast';
export { ConfirmProvider, useConfirm } from './ModalConfirmar';
export { RETRATOS_CLASSES, obterRetratoPersonagem, obterRetratoPorClasse } from './characterPortraits';
export {
  calcMod,
  fmtMod,
  extrairStatsContexto,
  resolverFormulaDinamica,
  calcularBonusAtaque,
  calcularCDSalvaguarda,
  rolarDadosFormula,
  executarRolagemAcao,
  aplicarDescansoAcoes,
  ACOES_PRESETS,
} from './actionEngine';
export { redimensionarImagem } from './imageUtils';



export { default as Avatar, iniciaisDe } from './Avatar';
export { default as useFecharFora } from './useFecharFora';
export {
  TIPOS_NOTIFICACAO,
  PREFS_NOTIFICACAO_PADRAO,
  metaNotificacao,
  listarNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  excluirNotificacao,
  limparLidas,
  gerarLembretesSessoes,
  inscreverNotificacoes,
  tempoRelativo,
} from './notificacoes';
export {
  CAMPOS_PERFIL,
  CORES_DESTAQUE,
  COR_PADRAO,
  LIMITE_BIO,
  LIMITE_TITULO,
  carregarPerfil,
  salvarPerfil,
  alterarSenha,
  normalizarPerfil,
} from './perfil';
