// ======================= CONFIG =======================
const SUPABASE_URL = 'https://lhrrnpyjkzcucifxesxt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocnJucHlqa3pjdWNpZnhlc3h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTE0NTQsImV4cCI6MjEwMzI2NzQ1NH0.CgKlVutCoe2fdnIL0zVXpWAD5dOSAD0iZ8bEVYVfnSY';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======================= STATE =======================
let currentUser = null;
let profilesCache = {};
let campanhas = [];
let campanhaAtual = null;
let campanhaEditando = null;
let fichaEditando = null;
let modoAuth = 'login'; // 'login' | 'signup'

// ======================= HELPERS =======================
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

let toastTimer = null;
function toast(msg, tipo = 'info') {
  const el = $('#toast');
  const icone = tipo === 'erro' ? '✕' : tipo === 'sucesso' ? '✓' : '→';
  el.innerHTML = `<span class="toast-icon">${icone}</span><span>${msg}</span>`;
  el.classList.remove('toast-erro', 'toast-sucesso');
  if (tipo === 'erro') el.classList.add('toast-erro');
  if (tipo === 'sucesso') el.classList.add('toast-sucesso');
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2600);
}

function showAuthError(msg) {
  const el = $('#auth-error');
  el.textContent = msg;
  el.classList.add('visible');
}
function hideAuthError() {
  $('#auth-error').classList.remove('visible');
}

// Modal de confirmação próprio — o confirm() nativo não aparece no navegador
// embutido do VS Code e destoa do resto da interface.
let confirmarResolve = null;
function confirmar(titulo, texto, rotuloOk = 'Confirmar') {
  $('#modal-confirmar-titulo').textContent = titulo;
  $('#modal-confirmar-texto').textContent = texto;
  $('#modal-confirmar-ok').textContent = rotuloOk;
  $('#modal-confirmar').classList.add('visible');
  return new Promise(resolve => { confirmarResolve = resolve; });
}
function fecharConfirmar(resposta) {
  $('#modal-confirmar').classList.remove('visible');
  if (confirmarResolve) { confirmarResolve(resposta); confirmarResolve = null; }
}
$('#modal-confirmar-ok').addEventListener('click', () => fecharConfirmar(true));
$('#modal-confirmar-cancelar').addEventListener('click', () => fecharConfirmar(false));
$('#modal-confirmar').addEventListener('click', (e) => {
  if (e.target === $('#modal-confirmar')) fecharConfirmar(false);
});

function switchView(id) {
  $all('.view').forEach(v => v.classList.remove('active'));
  $(`#${id}`).classList.add('active');
}

function initials(nome) {
  if (!nome) return '?';
  return nome.trim().slice(0, 2).toUpperCase();
}

// ======================= AUTH =======================
$('#auth-switch-btn').addEventListener('click', () => {
  modoAuth = modoAuth === 'login' ? 'signup' : 'login';
  hideAuthError();
  if (modoAuth === 'signup') {
    $('#auth-title').textContent = 'Criar conta';
    $('#tome-sub').textContent = 'Escolha um nome de usuário e uma senha.';
    $('#field-nome').style.display = 'block';
    $('#nome').required = true;
    $('#auth-submit').textContent = 'Criar conta';
    $('#auth-switch-text').textContent = 'Já tem conta?';
    $('#auth-switch-btn').textContent = 'Entrar';
  } else {
    $('#auth-title').textContent = 'Entrar';
    $('#tome-sub').textContent = 'Acesse suas campanhas, fichas e mesas.';
    $('#field-nome').style.display = 'none';
    $('#nome').required = false;
    $('#auth-submit').textContent = 'Entrar';
    $('#auth-switch-text').textContent = 'Ainda não tem conta?';
    $('#auth-switch-btn').textContent = 'Criar conta';
  }
});

$('#auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAuthError();
  const usuarioRaw = $('#usuario').value.trim();
  const senha = $('#senha').value;
  const btn = $('#auth-submit');

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(usuarioRaw)) {
    showAuthError('Usuário deve ter de 3 a 20 caracteres: letras, números ou underscore.');
    return;
  }
  const usuario = usuarioRaw.toLowerCase();
  const emailInterno = `${usuario}@allies.local`;
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = modoAuth === 'signup' ? 'Criando…' : 'Entrando…';

  const reabilitar = () => { btn.disabled = false; btn.textContent = textoOriginal; };

  try {
    if (modoAuth === 'signup') {
      const nome = $('#nome').value.trim();
      if (!nome) { showAuthError('Informe seu nome.'); reabilitar(); return; }
      const { data, error } = await sb.auth.signUp({ email: emailInterno, password: senha });
      if (error) throw error;
      if (data.user) {
        const { error: profErr } = await sb.from('profiles').insert({ id: data.user.id, nome, usuario });
        if (profErr) {
          if (profErr.code === '23505') { showAuthError('Este nome de usuário já existe.'); reabilitar(); return; }
          throw profErr;
        }
      }
      if (!data.session) {
        showAuthError('Conta criada! Entre com seu usuário e senha.');
        reabilitar();
        return;
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email: emailInterno, password: senha });
      if (error) throw error;
    }
  } catch (err) {
    showAuthError(traduzErro(err.message));
  }
  reabilitar();
});

function traduzErro(msg) {
  if (/invalid login credentials/i.test(msg)) return 'Usuário ou senha incorretos.';
  if (/already registered/i.test(msg)) return 'Este usuário já possui uma conta.';
  if (/password/i.test(msg) && /6/i.test(msg)) return 'A senha precisa de pelo menos 6 caracteres.';
  return msg;
}

$('#logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
});

sb.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    currentUser = session.user;
    await ensureProfile();
    $('#auth-screen').classList.remove('visible');
    $('#app').classList.add('visible');
    $('#header-user').textContent = (profilesCache[currentUser.id]?.nome || currentUser.email);
    switchView('view-dashboard');
    await carregarCampanhas();
    const campanhaDaUrl = new URLSearchParams(window.location.search).get('campanha');
    if (campanhaDaUrl && campanhas.some(c => c.id === campanhaDaUrl)) {
      abrirCampanha(campanhaDaUrl);
    }
  } else {
    currentUser = null;
    $('#app').classList.remove('visible');
    $('#auth-screen').classList.add('visible');
  }
});

async function ensureProfile() {
  const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
  if (data) {
    profilesCache[currentUser.id] = data;
  } else {
    const nome = currentUser.email.split('@')[0];
    await sb.from('profiles').insert({ id: currentUser.id, nome });
    profilesCache[currentUser.id] = { id: currentUser.id, nome };
  }
}

async function carregarPerfis(ids) {
  const faltando = [...new Set(ids)].filter(id => !profilesCache[id]);
  if (!faltando.length) return;
  const { data } = await sb.from('profiles').select('*').in('id', faltando);
  (data || []).forEach(p => { profilesCache[p.id] = p; });
}

// ======================= CAMPANHAS =======================

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// "23 ago · 20h" / "30 ago · 19h30" — nulo vira "A combinar"
function formatarSessao(ts) {
  if (!ts) return 'A combinar';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'A combinar';
  const min = d.getMinutes();
  const hora = min ? `${d.getHours()}h${String(min).padStart(2, '0')}` : `${d.getHours()}h`;
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${hora}`;
}

// timestamp ISO -> valor de <input type="datetime-local"> (que é hora local, sem fuso)
function tsParaInputLocal(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

let fichasPorCampanha = {};

async function carregarCampanhas() {
  $('#dashboard-sub').textContent = 'carregando…';
  const { data, error } = await sb.from('campanhas').select('*').order('criado_em', { ascending: false });
  if (error) { toast('Erro ao carregar campanhas', 'erro'); return; }
  campanhas = data || [];

  // Contagem real de fichas por campanha (o RLS já limita ao que o usuário pode ver)
  fichasPorCampanha = {};
  const { data: fichasRows } = await sb.from('fichas').select('campanha_id');
  (fichasRows || []).forEach(f => {
    fichasPorCampanha[f.campanha_id] = (fichasPorCampanha[f.campanha_id] || 0) + 1;
  });

  await carregarPerfis(campanhas.map(c => c.mestre_id));
  renderShelf();
  $('#dashboard-sub').textContent = resumoDashboard();
}

function resumoDashboard() {
  const n = campanhas.length;
  if (!n) return 'Nenhuma campanha ainda';
  const partes = [`${n} campanha${n === 1 ? '' : 's'}`];

  const comoMestre = campanhas.filter(c => c.mestre_id === currentUser?.id).length;
  if (comoMestre) partes.push(`${comoMestre} como mestre`);

  const agora = Date.now();
  const proxima = campanhas
    .map(c => c.proxima_sessao)
    .filter(ts => ts && new Date(ts).getTime() >= agora)
    .sort((a, b) => new Date(a) - new Date(b))[0];
  if (proxima) {
    const d = new Date(proxima);
    partes.push(`próxima sessão em ${d.getDate()} ${MESES[d.getMonth()]}`);
  }
  return partes.join(' · ');
}

function renderShelf() {
  const shelf = $('#shelf');
  const colunas = $('#dashboard-colunas');

  if (!campanhas.length) {
    colunas.style.display = 'none';
    shelf.innerHTML = `<div class="empty-state">
      <strong>Nenhuma campanha ainda</strong>
      Crie a primeira e convide seus jogadores.
    </div>`;
    return;
  }
  colunas.style.display = '';

  shelf.innerHTML = campanhas.map((c, i) => {
    const nFichas = fichasPorCampanha[c.id] || 0;
    return `
    <div class="linha" data-id="${c.id}" role="button" tabindex="0">
      <span class="linha-num num">${String(i + 1).padStart(2, '0')}</span>
      <div class="linha-main">
        <div class="linha-titulo">${escapeHtml(c.nome)}</div>
        <div class="linha-desc">${escapeHtml(c.descricao || 'Sem descrição.')}</div>
      </div>
      <span class="chip-sistema">${escapeHtml(c.sistema || 'Livre')}</span>
      <span class="linha-mestre">${escapeHtml(profilesCache[c.mestre_id]?.nome || '—')}</span>
      <div>
        <div class="linha-sessao num">${escapeHtml(formatarSessao(c.proxima_sessao))}</div>
        <div class="cap linha-contagem">${nFichas} ficha${nFichas === 1 ? '' : 's'}</div>
      </div>
      <span class="linha-seta" aria-hidden="true">→</span>
    </div>`;
  }).join('');

  $all('.linha[data-id]').forEach(el => {
    const abrir = () => abrirCampanha(el.dataset.id);
    el.addEventListener('click', abrir);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
    });
  });
}

$('#nova-campanha-btn').addEventListener('click', () => {
  campanhaEditando = null;
  $('#modal-campanha-titulo').textContent = 'Nova campanha';
  $('#camp-nome').value = '';
  $('#camp-sistema').value = '';
  $('#camp-desc').value = '';
  $('#camp-proxima').value = '';
  $('#modal-campanha').classList.add('visible');
});
$('#modal-campanha-cancelar').addEventListener('click', () => $('#modal-campanha').classList.remove('visible'));

$('#editar-campanha-btn').addEventListener('click', () => {
  if (!campanhaAtual) return;
  campanhaEditando = campanhaAtual.id;
  $('#modal-campanha-titulo').textContent = 'Editar campanha';
  $('#camp-nome').value = campanhaAtual.nome;
  $('#camp-sistema').value = campanhaAtual.sistema || '';
  $('#camp-desc').value = campanhaAtual.descricao || '';
  $('#camp-proxima').value = tsParaInputLocal(campanhaAtual.proxima_sessao);
  $('#modal-campanha').classList.add('visible');
});

$('#excluir-campanha-btn').addEventListener('click', async () => {
  if (!campanhaAtual) return;
  const ok = await confirmar('Excluir campanha',
    `Excluir "${campanhaAtual.nome}"? Isso também apaga todas as fichas dela. Não é possível desfazer.`, 'Excluir');
  if (!ok) return;
  const { error } = await sb.from('campanhas').delete().eq('id', campanhaAtual.id);
  if (error) { toast('Erro ao excluir campanha', 'erro'); return; }
  toast('Campanha excluída.', 'sucesso');
  switchView('view-dashboard');
  campanhaAtual = null;
  carregarCampanhas();
});

$('#form-campanha').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = $('#camp-nome').value.trim();
  const sistema = $('#camp-sistema').value.trim();
  const descricao = $('#camp-desc').value.trim();
  const proximaRaw = $('#camp-proxima').value;
  const proxima_sessao = proximaRaw ? new Date(proximaRaw).toISOString() : null;

  let error;
  if (campanhaEditando) {
    ({ error } = await sb.from('campanhas').update({ nome, sistema, descricao, proxima_sessao }).eq('id', campanhaEditando));
  } else {
    ({ error } = await sb.from('campanhas').insert({ nome, sistema, descricao, proxima_sessao, mestre_id: currentUser.id }));
  }
  if (error) { toast('Erro ao salvar campanha', 'erro'); return; }
  $('#modal-campanha').classList.remove('visible');
  toast(campanhaEditando ? 'Campanha atualizada.' : 'Campanha criada.', 'sucesso');

  if (campanhaEditando && campanhaAtual && campanhaEditando === campanhaAtual.id) {
    campanhaAtual = { ...campanhaAtual, nome, sistema, descricao, proxima_sessao };
    $('#campanha-nome').textContent = nome;
    $('#campanha-sistema').textContent = subtituloCampanha(campanhaAtual);
    $('#campanha-desc').textContent = descricao || '';
  }
  campanhaEditando = null;
  carregarCampanhas();
});

function subtituloCampanha(c) {
  const partes = [c.sistema || 'Sistema livre'];
  if (c.proxima_sessao) partes.push(`Próxima sessão: ${formatarSessao(c.proxima_sessao)}`);
  return partes.join(' · ');
}

async function abrirCampanha(id) {
  const c = campanhas.find(c => c.id === id);
  if (!c) return;
  campanhaAtual = c;
  $('#campanha-nome').textContent = c.nome;
  $('#campanha-sistema').textContent = subtituloCampanha(c);
  $('#campanha-desc').textContent = c.descricao || '';
  const souMestre = c.mestre_id === currentUser.id;
  $('#editar-campanha-btn').style.display = souMestre ? 'inline-flex' : 'none';
  $('#excluir-campanha-btn').style.display = souMestre ? 'inline-flex' : 'none';
  $('#convidar-btn').style.display = souMestre ? 'inline-flex' : 'none';
  $('#sair-campanha-btn').style.display = souMestre ? 'none' : 'inline-flex';
  switchView('view-campanha');
  await carregarParticipantes(id);
  await carregarFichas(id);
}

$('#mesa-virtual-btn').addEventListener('click', () => {
  if (!campanhaAtual) return;
  window.location.href = `mesa/index.html?campanha=${campanhaAtual.id}`;
});

async function carregarParticipantes(campanhaId) {
  const el = $('#participantes');
  const { data, error } = await sb.from('campanha_membros').select('usuario_id').eq('campanha_id', campanhaId);
  if (error || !data) { el.innerHTML = ''; return; }
  await carregarPerfis(data.map(m => m.usuario_id));
  el.innerHTML = data.map(m => {
    const ehMestre = m.usuario_id === campanhaAtual.mestre_id;
    const nome = profilesCache[m.usuario_id]?.nome || '—';
    return `<span class="participante-chip${ehMestre ? ' mestre-chip' : ''}">${escapeHtml(nome)}${ehMestre ? ' · Mestre' : ''}</span>`;
  }).join('');
}

$('#convidar-btn').addEventListener('click', () => {
  $('#convidar-usuario').value = '';
  $('#modal-convidar').classList.add('visible');
});
$('#modal-convidar-cancelar').addEventListener('click', () => $('#modal-convidar').classList.remove('visible'));

$('#form-convidar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usuario = $('#convidar-usuario').value.trim().toLowerCase();
  if (!campanhaAtual) return;

  const { data: perfil, error: buscaErr } = await sb.from('profiles').select('id, nome').ilike('usuario', usuario).maybeSingle();
  if (buscaErr || !perfil) { toast('Usuário não encontrado', 'erro'); return; }

  const { error } = await sb.from('campanha_membros').insert({ campanha_id: campanhaAtual.id, usuario_id: perfil.id });
  if (error) {
    if (error.code === '23505') { toast('Esse jogador já está na campanha', 'erro'); }
    else { toast('Erro ao convidar', 'erro'); }
    return;
  }
  toast(`${perfil.nome} entrou na campanha!`, 'sucesso');
  $('#modal-convidar').classList.remove('visible');
  carregarParticipantes(campanhaAtual.id);
});

$('#sair-campanha-btn').addEventListener('click', async () => {
  if (!campanhaAtual) return;
  const ok = await confirmar('Sair da campanha',
    `Você deixará de ver "${campanhaAtual.nome}" e as fichas dela.`, 'Sair');
  if (!ok) return;
  const { error } = await sb.from('campanha_membros').delete().eq('campanha_id', campanhaAtual.id).eq('usuario_id', currentUser.id);
  if (error) { toast('Erro ao sair da campanha', 'erro'); return; }
  toast('Você saiu da campanha.', 'sucesso');
  switchView('view-dashboard');
  campanhaAtual = null;
  carregarCampanhas();
});

$('#voltar-dashboard-btn').addEventListener('click', () => {
  switchView('view-dashboard');
  campanhaAtual = null;
});

// ======================= FICHAS =======================
async function carregarFichas(campanhaId) {
  $('#fichas-grid').innerHTML = `<div class="loading-msg">carregando fichas...</div>`;
  const { data, error } = await sb.from('fichas').select('*').eq('campanha_id', campanhaId).order('criado_em', { ascending: true });
  if (error) { toast('Erro ao carregar fichas', 'erro'); return; }
  await carregarPerfis(data.map(f => f.usuario_id));
  renderFichas(data || []);
}

function renderFichas(fichas) {
  const grid = $('#fichas-grid');
  if (!fichas.length) {
    grid.innerHTML = `<div class="empty-state">Nenhuma ficha nesta campanha ainda.</div>`;
    return;
  }
  grid.innerHTML = fichas.map(f => {
    const d = f.dados || {};
    const dono = f.usuario_id === currentUser.id;
    return `
      <div class="ficha-card" data-id="${f.id}">
        <div class="wax-seal">${initials(f.nome_personagem)}</div>
        <h4>${escapeHtml(f.nome_personagem)}</h4>
        <div class="autor">${escapeHtml(d.classe || 'Aventureiro')} · por ${escapeHtml(profilesCache[f.usuario_id]?.nome || '—')}</div>
        <div class="stat-row">
          <div class="stat"><span class="val">${d.pvAtual ?? '—'}/${d.pvMax ?? '—'}</span><span class="lbl">PV</span></div>
          <div class="stat"><span class="val">${d.ca ?? '—'}</span><span class="lbl">CA</span></div>
        </div>
        <div class="ficha-card-actions">
          <button data-action="abrir">${dono ? 'Abrir Ficha' : 'Ver Ficha'}</button>
          ${dono ? '<button data-action="excluir">Excluir</button>' : ''}
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.ficha-card').forEach(card => {
    const id = card.dataset.id;
    const abrir = card.querySelector('[data-action="abrir"]');
    const excluir = card.querySelector('[data-action="excluir"]');
    if (abrir) abrir.addEventListener('click', () => abrirFicha(id));
    if (excluir) excluir.addEventListener('click', () => excluirFicha(id));
  });
}

$('#nova-ficha-btn').addEventListener('click', async () => {
  const nome = prompt('Nome do personagem:');
  if (!nome || !nome.trim()) return;
  const { data, error } = await sb.from('fichas').insert({
    campanha_id: campanhaAtual.id, usuario_id: currentUser.id, nome_personagem: nome.trim(), dados: {}
  }).select().single();
  if (error) { toast('Erro ao criar ficha', 'erro'); return; }
  toast('Ficha criada!', 'sucesso');
  await carregarFichas(campanhaAtual.id);
  abrirFicha(data.id);
});

async function excluirFicha(id) {
  const ok = await confirmar('Excluir ficha', 'Não é possível desfazer.', 'Excluir');
  if (!ok) return;
  const { error } = await sb.from('fichas').delete().eq('id', id);
  if (error) { toast('Erro ao excluir', 'erro'); return; }
  toast('Ficha excluída.', 'sucesso');
  carregarFichas(campanhaAtual.id);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// ======================= FICHA COMPLETA (D&D 5e) =======================
const ATRIBUTOS = [
  { id: 'for', nome: 'Força' },
  { id: 'des', nome: 'Destreza' },
  { id: 'con', nome: 'Constituição' },
  { id: 'int', nome: 'Inteligência' },
  { id: 'sab', nome: 'Sabedoria' },
  { id: 'car', nome: 'Carisma' },
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

let fichaAberta = null; // { id, campanha_id, usuario_id, nome_personagem, dados }
let fichaSomenteLeitura = false;

function mod(score) {
  return Math.floor((Number(score || 10) - 10) / 2);
}
function fmtMod(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

// ---- Construção da estrutura estática (uma vez) ----
function montarEsqueletoFicha() {
  // Atributos
  $('#attr-block-grid').innerHTML = ATRIBUTOS.map(a => `
    <div class="attr-block">
      <label>${a.nome}</label>
      <input type="number" id="attr-${a.id}" data-attr="${a.id}" value="10" />
      <div class="attr-mod" id="attr-${a.id}-mod">+0</div>
    </div>
  `).join('');

  // Salvaguardas
  $('#saves-list').innerHTML = ATRIBUTOS.map(a => `
    <div class="check-row">
      <input type="checkbox" class="save-check" data-attr="${a.id}" />
      <span class="check-nome">${a.nome}</span>
      <span class="check-bonus" id="save-bonus-${a.id}">+0</span>
    </div>
  `).join('');

  // Perícias
  $('#pericias-list').innerHTML = PERICIAS.map(p => `
    <div class="check-row">
      <input type="checkbox" class="pericia-check" data-id="${p.id}" data-attr="${p.attr}" />
      <span class="check-nome">${p.nome}</span>
      <span class="check-attr">${p.attr}</span>
      <span class="check-bonus" id="pericia-bonus-${p.id}">+0</span>
    </div>
  `).join('');

  // Níveis de magia 1-9
  $('#magias-niveis').innerHTML = [1,2,3,4,5,6,7,8,9].map(n => `
    <div class="magia-nivel-block">
      <div class="magia-nivel-header">
        <h5>Nível ${n}</h5>
        <input type="number" id="magia-${n}-total" placeholder="Espaços" min="0" />
        <input type="number" id="magia-${n}-usados" placeholder="Usados" min="0" />
      </div>
      <textarea id="magia-${n}-lista" rows="3" placeholder="Uma magia por linha"></textarea>
    </div>
  `).join('');

  // Recalcular ao digitar atributos / bônus / marcar proficiências
  $all('.attr-block input').forEach(i => i.addEventListener('input', recalcularFicha));
  $('#f-prof-bonus').addEventListener('input', recalcularFicha);
  $all('.save-check').forEach(c => c.addEventListener('change', recalcularFicha));
  $all('.pericia-check').forEach(c => c.addEventListener('change', recalcularFicha));

  // Ataques dinâmicos
  $('#add-ataque-btn').addEventListener('click', () => adicionarLinhaAtaque());

  // Tabs
  $all('.sheet-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $all('.sheet-tab').forEach(t => t.classList.remove('active'));
      $all('.sheet-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $(`.sheet-panel[data-panel="${tab.dataset.tab}"]`).classList.add('active');
    });
  });
}
montarEsqueletoFicha();

function adicionarLinhaAtaque(valores = {}) {
  const row = document.createElement('div');
  row.className = 'ataque-row';
  row.innerHTML = `
    <input type="text" placeholder="Nome" class="atk-nome" value="${escapeHtml(valores.nome || '')}" />
    <input type="text" placeholder="Bônus" class="atk-bonus" value="${escapeHtml(valores.bonus || '')}" />
    <input type="text" placeholder="Dano/Tipo" class="atk-dano" value="${escapeHtml(valores.dano || '')}" />
    <button type="button" class="atk-remover">✕</button>
  `;
  row.querySelector('.atk-remover').addEventListener('click', () => row.remove());
  $('#ataques-list').appendChild(row);
}

function recalcularFicha() {
  // Modificadores de atributo
  const mods = {};
  ATRIBUTOS.forEach(a => {
    const score = Number($(`#attr-${a.id}`).value) || 10;
    const m = mod(score);
    mods[a.id] = m;
    $(`#attr-${a.id}-mod`).textContent = fmtMod(m);
  });

  const profBonus = Number($('#f-prof-bonus').value) || 0;

  // Salvaguardas
  $all('.save-check').forEach(c => {
    const attr = c.dataset.attr;
    const bonus = mods[attr] + (c.checked ? profBonus : 0);
    $(`#save-bonus-${attr}`).textContent = fmtMod(bonus);
  });

  // Perícias
  $all('.pericia-check').forEach(c => {
    const id = c.dataset.id;
    const attr = c.dataset.attr;
    const bonus = mods[attr] + (c.checked ? profBonus : 0);
    $(`#pericia-bonus-${id}`).textContent = fmtMod(bonus);
  });

  // Sabedoria passiva (Percepção)
  const percepcaoCheck = $('.pericia-check[data-id="percepcao"]');
  const percepcaoBonus = mods.sab + (percepcaoCheck?.checked ? profBonus : 0);
  $('#f-sab-passiva').value = 10 + percepcaoBonus;
}

async function abrirFicha(id) {
  const { data, error } = await sb.from('fichas').select('*').eq('id', id).maybeSingle();
  if (error || !data) { toast('Erro ao abrir ficha', 'erro'); return; }
  fichaAberta = data;
  fichaSomenteLeitura = data.usuario_id !== currentUser.id;
  const d = data.dados || {};

  $('#sheet-nome-personagem').value = data.nome_personagem || '';
  $('#f-classe').value = d.classe || '';
  $('#f-antecedente').value = d.antecedente || '';
  $('#f-jogador').value = d.nomeJogador || '';
  $('#f-raca').value = d.raca || '';
  $('#f-alinhamento').value = d.alinhamento || '';
  $('#f-xp').value = d.xp ?? '';
  $('#f-inspiracao').checked = !!d.inspiracao;
  $('#f-prof-bonus').value = d.profBonus ?? 2;
  $('#f-outras-prof').value = d.outrasProf || '';

  ATRIBUTOS.forEach(a => { $(`#attr-${a.id}`).value = d.atributos?.[a.id] ?? 10; });
  $all('.save-check').forEach(c => { c.checked = !!d.saves?.[c.dataset.attr]; });
  $all('.pericia-check').forEach(c => { c.checked = !!d.pericias?.[c.dataset.id]; });

  $('#f-ca').value = d.ca ?? '';
  $('#f-iniciativa').value = d.iniciativa ?? '';
  $('#f-deslocamento').value = d.deslocamento || '';
  $('#f-pv-max').value = d.pvMax ?? '';
  $('#f-pv-atual').value = d.pvAtual ?? '';
  $('#f-pv-temp').value = d.pvTemp ?? '';
  $('#f-dado-vida-total').value = d.dadoVidaTotal || '';
  $('#f-dado-vida-usado').value = d.dadoVidaUsado || '';

  $all('.ds-sucesso').forEach(c => { c.checked = Number(c.dataset.i) < (d.salvMorte?.sucessos ?? 0); });
  $all('.ds-falha').forEach(c => { c.checked = Number(c.dataset.i) < (d.salvMorte?.falhas ?? 0); });

  $('#ataques-list').innerHTML = '';
  (d.ataques || []).forEach(a => adicionarLinhaAtaque(a));

  $('#f-pc').value = d.moedas?.pc ?? '';
  $('#f-pp').value = d.moedas?.pp ?? '';
  $('#f-pe').value = d.moedas?.pe ?? '';
  $('#f-po').value = d.moedas?.po ?? '';
  $('#f-pl').value = d.moedas?.pl ?? '';
  $('#f-equipamento').value = d.equipamento || '';

  $('#f-tracos').value = d.personalidade?.tracos || '';
  $('#f-ideais').value = d.personalidade?.ideais || '';
  $('#f-vinculos').value = d.personalidade?.vinculos || '';
  $('#f-fraquezas').value = d.personalidade?.fraquezas || '';
  $('#f-caracteristicas').value = d.caracteristicas || '';
  $('#f-idade').value = d.fisico?.idade || '';
  $('#f-altura').value = d.fisico?.altura || '';
  $('#f-peso').value = d.fisico?.peso || '';
  $('#f-olhos').value = d.fisico?.olhos || '';
  $('#f-pele').value = d.fisico?.pele || '';
  $('#f-cabelo').value = d.fisico?.cabelo || '';
  $('#f-aparencia').value = d.aparencia || '';
  $('#f-aliados').value = d.aliados || '';
  $('#f-historia').value = d.historia || '';
  $('#f-tesouros').value = d.tesouros || '';

  $('#f-classe-conjuradora').value = d.magia?.classeConjuradora || '';
  $('#f-attr-conjuracao').value = d.magia?.atributoConjuracao || '';
  $('#f-cd-magia').value = d.magia?.cd ?? '';
  $('#f-ataque-magico').value = d.magia?.bonusAtaque ?? '';
  $('#f-truques').value = d.magia?.truques || '';
  for (let n = 1; n <= 9; n++) {
    $(`#magia-${n}-total`).value = d.magia?.niveis?.[n]?.total ?? '';
    $(`#magia-${n}-usados`).value = d.magia?.niveis?.[n]?.usados ?? '';
    $(`#magia-${n}-lista`).value = d.magia?.niveis?.[n]?.magias || '';
  }

  // Aplica somente-leitura se não for o dono
  $all('#view-ficha input, #view-ficha textarea').forEach(el => {
    if (fichaSomenteLeitura) el.setAttribute('disabled', 'disabled');
    else el.removeAttribute('disabled');
  });
  $('#sheet-nome-personagem').toggleAttribute('readonly', fichaSomenteLeitura);
  $('#salvar-ficha-btn').style.display = fichaSomenteLeitura ? 'none' : 'inline-flex';
  $('#sheet-readonly-note').style.display = fichaSomenteLeitura ? 'inline' : 'none';
  $('#add-ataque-btn').style.display = fichaSomenteLeitura ? 'none' : 'inline-flex';
  $all('.atk-remover').forEach(b => b.style.display = fichaSomenteLeitura ? 'none' : 'inline-flex');

  recalcularFicha();
  $all('.sheet-tab')[0].click();
  switchView('view-ficha');
}

$('#voltar-campanha-btn').addEventListener('click', () => {
  switchView('view-campanha');
  if (campanhaAtual) carregarFichas(campanhaAtual.id);
});

$('#salvar-ficha-btn').addEventListener('click', async () => {
  if (!fichaAberta || fichaSomenteLeitura) return;

  const atributos = {};
  ATRIBUTOS.forEach(a => { atributos[a.id] = Number($(`#attr-${a.id}`).value) || 10; });

  const saves = {};
  $all('.save-check').forEach(c => { saves[c.dataset.attr] = c.checked; });

  const pericias = {};
  $all('.pericia-check').forEach(c => { pericias[c.dataset.id] = c.checked; });

  const ataques = $all('#ataques-list .ataque-row').map(row => ({
    nome: row.querySelector('.atk-nome').value.trim(),
    bonus: row.querySelector('.atk-bonus').value.trim(),
    dano: row.querySelector('.atk-dano').value.trim(),
  })).filter(a => a.nome || a.bonus || a.dano);

  const niveis = {};
  for (let n = 1; n <= 9; n++) {
    niveis[n] = {
      total: $(`#magia-${n}-total`).value ? Number($(`#magia-${n}-total`).value) : null,
      usados: $(`#magia-${n}-usados`).value ? Number($(`#magia-${n}-usados`).value) : null,
      magias: $(`#magia-${n}-lista`).value,
    };
  }

  const dados = {
    classe: $('#f-classe').value.trim(),
    antecedente: $('#f-antecedente').value.trim(),
    nomeJogador: $('#f-jogador').value.trim(),
    raca: $('#f-raca').value.trim(),
    alinhamento: $('#f-alinhamento').value.trim(),
    xp: $('#f-xp').value ? Number($('#f-xp').value) : null,
    inspiracao: $('#f-inspiracao').checked,
    profBonus: Number($('#f-prof-bonus').value) || 2,
    atributos,
    saves,
    pericias,
    outrasProf: $('#f-outras-prof').value.trim(),
    ca: $('#f-ca').value ? Number($('#f-ca').value) : null,
    iniciativa: $('#f-iniciativa').value ? Number($('#f-iniciativa').value) : null,
    deslocamento: $('#f-deslocamento').value.trim(),
    pvMax: $('#f-pv-max').value ? Number($('#f-pv-max').value) : null,
    pvAtual: $('#f-pv-atual').value ? Number($('#f-pv-atual').value) : null,
    pvTemp: $('#f-pv-temp').value ? Number($('#f-pv-temp').value) : null,
    dadoVidaTotal: $('#f-dado-vida-total').value.trim(),
    dadoVidaUsado: $('#f-dado-vida-usado').value.trim(),
    salvMorte: {
      sucessos: $all('.ds-sucesso').filter(c => c.checked).length,
      falhas: $all('.ds-falha').filter(c => c.checked).length,
    },
    ataques,
    moedas: {
      pc: $('#f-pc').value ? Number($('#f-pc').value) : null,
      pp: $('#f-pp').value ? Number($('#f-pp').value) : null,
      pe: $('#f-pe').value ? Number($('#f-pe').value) : null,
      po: $('#f-po').value ? Number($('#f-po').value) : null,
      pl: $('#f-pl').value ? Number($('#f-pl').value) : null,
    },
    equipamento: $('#f-equipamento').value.trim(),
    personalidade: {
      tracos: $('#f-tracos').value.trim(),
      ideais: $('#f-ideais').value.trim(),
      vinculos: $('#f-vinculos').value.trim(),
      fraquezas: $('#f-fraquezas').value.trim(),
    },
    caracteristicas: $('#f-caracteristicas').value.trim(),
    fisico: {
      idade: $('#f-idade').value.trim(),
      altura: $('#f-altura').value.trim(),
      peso: $('#f-peso').value.trim(),
      olhos: $('#f-olhos').value.trim(),
      pele: $('#f-pele').value.trim(),
      cabelo: $('#f-cabelo').value.trim(),
    },
    aparencia: $('#f-aparencia').value.trim(),
    aliados: $('#f-aliados').value.trim(),
    historia: $('#f-historia').value.trim(),
    tesouros: $('#f-tesouros').value.trim(),
    magia: {
      classeConjuradora: $('#f-classe-conjuradora').value.trim(),
      atributoConjuracao: $('#f-attr-conjuracao').value.trim(),
      cd: $('#f-cd-magia').value ? Number($('#f-cd-magia').value) : null,
      bonusAtaque: $('#f-ataque-magico').value ? Number($('#f-ataque-magico').value) : null,
      truques: $('#f-truques').value,
      niveis,
    },
  };

  const nome_personagem = $('#sheet-nome-personagem').value.trim() || 'Sem nome';

  const { error } = await sb.from('fichas')
    .update({ nome_personagem, dados, atualizado_em: new Date().toISOString() })
    .eq('id', fichaAberta.id);
  if (error) { toast('Erro ao salvar ficha', 'erro'); return; }
  fichaAberta.nome_personagem = nome_personagem;
  fichaAberta.dados = dados;
  toast('Ficha salva!', 'sucesso');
});
