/**
 * Allies — Camada de acesso às notificações (tabela public.notificacoes).
 *
 * As notificações são geradas por triggers no Postgres:
 *  - convite_campanha      → jogador adicionado a uma campanha
 *  - personagem_adicionado → mestre avisado de personagem novo na mesa
 *  - nova_sessao           → sessão agendada na campanha
 *  - sessao_remarcada      → data da sessão alterada
 *  - sessao_proxima        → lembrete (RPC gerar_lembretes_sessoes, janela de 48h)
 */
import { sb } from './supabaseClient';

export const TIPOS_NOTIFICACAO = {
  convite_campanha: { icone: 'castle', rotulo: 'Campanha', prefChave: 'convites' },
  personagem_adicionado: { icone: 'person_add', rotulo: 'Personagem', prefChave: 'personagens' },
  nova_sessao: { icone: 'event', rotulo: 'Sessão', prefChave: 'sessoes' },
  sessao_remarcada: { icone: 'edit_calendar', rotulo: 'Sessão', prefChave: 'sessoes' },
  sessao_proxima: { icone: 'notifications_active', rotulo: 'Lembrete', prefChave: 'lembretes' },
};

export const PREFS_NOTIFICACAO_PADRAO = {
  convites: true,
  sessoes: true,
  personagens: true,
  lembretes: true,
};

export function metaNotificacao(tipo) {
  return TIPOS_NOTIFICACAO[tipo] || { icone: 'info', rotulo: 'Aviso', prefChave: null };
}

export async function listarNotificacoes(usuarioId, limite = 50) {
  if (!usuarioId) return [];
  const { data, error } = await sb
    .from('notificacoes')
    .select('*')
    .eq('usuario_id', Number(usuarioId))
    .order('criado_em', { ascending: false })
    .limit(limite);

  if (error) {
    console.warn('Erro ao carregar notificações:', error.message);
    return [];
  }
  return data || [];
}

export async function marcarComoLida(id) {
  const { error } = await sb.from('notificacoes').update({ lida: true }).eq('id', id);
  if (error) throw error;
}

export async function marcarTodasComoLidas(usuarioId) {
  const { error } = await sb
    .from('notificacoes')
    .update({ lida: true })
    .eq('usuario_id', Number(usuarioId))
    .eq('lida', false);
  if (error) throw error;
}

export async function excluirNotificacao(id) {
  const { error } = await sb.from('notificacoes').delete().eq('id', id);
  if (error) throw error;
}

export async function limparLidas(usuarioId) {
  const { error } = await sb
    .from('notificacoes')
    .delete()
    .eq('usuario_id', Number(usuarioId))
    .eq('lida', true);
  if (error) throw error;
}

/** Gera os lembretes de sessões que acontecem nas próximas 48h (sem duplicar). */
export async function gerarLembretesSessoes() {
  const { data, error } = await sb.rpc('gerar_lembretes_sessoes');
  if (error) {
    console.warn('Erro ao gerar lembretes de sessão:', error.message);
    return 0;
  }
  return data || 0;
}

/** Assina inserções em tempo real. Devolve a função de cancelamento. */
export function inscreverNotificacoes(usuarioId, aoReceber) {
  if (!usuarioId) return () => {};

  const canal = sb
    .channel(`notificacoes-${usuarioId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notificacoes',
        filter: `usuario_id=eq.${Number(usuarioId)}`,
      },
      (payload) => aoReceber(payload.new)
    )
    .subscribe();

  return () => sb.removeChannel(canal);
}

/**
 * Lembretes dispensados: o RPC recria o lembrete de uma sessão futura sempre que
 * o hub abre, então guardamos localmente quais o usuário já descartou.
 */
const CHAVE_DISPENSADOS = 'allies_lembretes_dispensados';

export function lembretesDispensados() {
  try {
    const bruto = localStorage.getItem(CHAVE_DISPENSADOS);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.map(Number) : [];
  } catch {
    return [];
  }
}

export function dispensarLembrete(sessaoId) {
  if (!sessaoId) return;
  try {
    const atual = new Set(lembretesDispensados());
    atual.add(Number(sessaoId));
    localStorage.setItem(CHAVE_DISPENSADOS, JSON.stringify([...atual].slice(-200)));
  } catch {
    /* localStorage indisponível — segue sem persistir */
  }
}

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

export function tempoRelativo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dif = Date.now() - d.getTime();

  if (dif < MINUTO) return 'agora';
  if (dif < HORA) return `${Math.floor(dif / MINUTO)} min`;
  if (dif < DIA) return `${Math.floor(dif / HORA)} h`;
  if (dif < 7 * DIA) return `${Math.floor(dif / DIA)} d`;

  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
