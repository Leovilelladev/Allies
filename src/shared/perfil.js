/**
 * Allies — Perfil da conta (tabela public.usuarios).
 * Campos editáveis: nome_exibicao, titulo, bio, avatar_url, cor_destaque, preferencias.
 * A senha vive no Supabase Auth (login usa <usuario>@allies.local).
 */
import { sb } from './supabaseClient';
import { PREFS_NOTIFICACAO_PADRAO } from './notificacoes';

export const CAMPOS_PERFIL =
  'id, nome_usuario, nome_exibicao, avatar_url, bio, titulo, cor_destaque, preferencias, criado_em';

export const COR_PADRAO = '#c8aa6e';

export const CORES_DESTAQUE = [
  { valor: '#c8aa6e', nome: 'Ouro Antigo' },
  { valor: '#0ac8b9', nome: 'Teal Arcano' },
  { valor: '#0bc6e3', nome: 'Cristal Hextech' },
  { valor: '#a86ee0', nome: 'Púrpura Feiticeiro' },
  { valor: '#e0603c', nome: 'Brasa' },
  { valor: '#6ee08a', nome: 'Verde Bosque' },
  { valor: '#e06e9e', nome: 'Rosa Fada' },
  { valor: '#9aa7bd', nome: 'Aço' },
];

export const LIMITE_BIO = 280;
export const LIMITE_TITULO = 40;

export function normalizarPerfil(linha) {
  if (!linha) return null;
  const prefs = linha.preferencias || {};
  return {
    id: linha.id,
    nome_usuario: linha.nome_usuario,
    nome_exibicao: linha.nome_exibicao || linha.nome_usuario,
    avatar_url: linha.avatar_url || '',
    bio: linha.bio || '',
    titulo: linha.titulo || '',
    cor_destaque: linha.cor_destaque || COR_PADRAO,
    criado_em: linha.criado_em,
    preferencias: {
      ...prefs,
      notificacoes: { ...PREFS_NOTIFICACAO_PADRAO, ...(prefs.notificacoes || {}) },
    },
  };
}

export async function carregarPerfil(id) {
  if (!id) return null;
  const { data, error } = await sb
    .from('usuarios')
    .select(CAMPOS_PERFIL)
    .eq('id', Number(id))
    .maybeSingle();

  if (error) throw error;
  return normalizarPerfil(data);
}

export async function salvarPerfil(id, campos) {
  const payload = {};

  if (campos.nome_exibicao !== undefined) {
    const nome = String(campos.nome_exibicao).trim();
    if (nome.length < 2) throw new Error('O nome de exibição precisa de pelo menos 2 caracteres.');
    payload.nome_exibicao = nome.slice(0, 60);
  }
  if (campos.titulo !== undefined) {
    payload.titulo = String(campos.titulo).trim().slice(0, LIMITE_TITULO) || null;
  }
  if (campos.bio !== undefined) {
    payload.bio = String(campos.bio).trim().slice(0, LIMITE_BIO) || null;
  }
  if (campos.avatar_url !== undefined) {
    payload.avatar_url = campos.avatar_url || null;
  }
  if (campos.cor_destaque !== undefined) {
    const cor = String(campos.cor_destaque).trim();
    payload.cor_destaque = /^#[0-9a-fA-F]{6}$/.test(cor) ? cor : COR_PADRAO;
  }
  if (campos.preferencias !== undefined) {
    payload.preferencias = campos.preferencias;
  }

  payload.atualizado_em = new Date().toISOString();

  const { data, error } = await sb
    .from('usuarios')
    .update(payload)
    .eq('id', Number(id))
    .select(CAMPOS_PERFIL)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Não foi possível salvar o perfil (permissão negada).');
  return normalizarPerfil(data);
}

/** Troca a senha no Supabase Auth, revalidando a senha atual antes. */
export async function alterarSenha(nomeUsuario, senhaAtual, novaSenha) {
  if (!nomeUsuario) throw new Error('Conta sem nome de usuário vinculado.');
  if (!novaSenha || novaSenha.length < 6) {
    throw new Error('A nova senha precisa de pelo menos 6 caracteres.');
  }
  if (senhaAtual === novaSenha) {
    throw new Error('A nova senha precisa ser diferente da atual.');
  }

  const email = `${String(nomeUsuario).trim().toLowerCase()}@allies.local`;

  const { error: erroLogin } = await sb.auth.signInWithPassword({ email, password: senhaAtual });
  if (erroLogin) throw new Error('Senha atual incorreta.');

  const { error } = await sb.auth.updateUser({ password: novaSenha });
  if (error) throw new Error('Erro ao atualizar a senha: ' + error.message);
}
