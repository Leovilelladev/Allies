import { useState, useEffect, useCallback } from 'react';
import { sb } from '../shared/supabaseClient';
import { useToast } from '../shared/Toast';
import { useConfirm } from '../shared/ModalConfirmar';
import Dashboard from './Dashboard';
import SessoesView from './SessoesView';
import PersonagensView from './PersonagensView';
import CampanhaView from './CampanhaView';
import FichaView from './FichaView';
import ModalCampanha from './components/ModalCampanha';
import ModalSessao from './components/ModalSessao';
import ModalNovaFicha from './components/ModalNovaFicha';
import ModalConvidar from './components/ModalConvidar';
import ModalCriacaoCampeaoHextech from './components/ModalCriacaoCampeaoHextech';

function initials(nome) {
  if (!nome) return 'A';
  return nome.trim().slice(0, 2).toUpperCase();
}

export default function Home({
  usuarioAtual,
  onLogout,
  onAbrirMesa,
  campanhaInicialId,
}) {
  const { toast } = useToast();
  const { confirmar } = useConfirm();

  const [view, setView] = useState('dashboard'); // 'dashboard' | 'sessoes' | 'personagens' | 'campanha' | 'ficha'
  const [menuAtivo, setMenuAtivo] = useState('campanhas'); // 'campanhas' | 'personagens' | 'sessoes' | 'assets' | 'amigos'
  const [termoBusca, setTermoBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Estados principais do banco de dados
  const [campanhas, setCampanhas] = useState([]);
  const [todasFichas, setTodasFichas] = useState([]);
  const [todasSessoes, setTodasSessoes] = useState([]);
  const [campanhaPersonagens, setCampanhaPersonagens] = useState([]);
  const [participantesSessao, setParticipantesSessao] = useState({});
  const [campanhaAtual, setCampanhaAtual] = useState(null);
  const [participantesCampanha, setParticipantesCampanha] = useState([]);
  const [sessoesCampanha, setSessoesCampanha] = useState([]);
  const [fichasCampanha, setFichasCampanha] = useState([]);
  const [fichaAberta, setFichaAberta] = useState(null);
  const [perfis, setPerfis] = useState({});
  const [fichasPorCampanha, setFichasPorCampanha] = useState({});
  const [proximaSessaoPorCampanha, setProximaSessaoPorCampanha] = useState({});

  // Modais
  const [modalCampanha, setModalCampanha] = useState(null);
  const [modalSessao, setModalSessao] = useState(null);
  const [modalNovaFicha, setModalNovaFicha] = useState(false);
  const [modalConvidar, setModalConvidar] = useState(false);

  // 1. Carregar perfis dos usuários a partir da tabela public.usuarios
  const carregarPerfis = useCallback(
    async (ids) => {
      const idsLimpos = [...new Set(ids)].filter((id) => id !== null && id !== undefined && !perfis[id]);
      if (!idsLimpos.length) return;

      const { data, error } = await sb
        .from('usuarios')
        .select('id, nome_usuario, nome_exibicao, avatar_url, criado_em')
        .in('id', idsLimpos);

      if (!error && data) {
        setPerfis((prev) => {
          const novo = { ...prev };
          data.forEach((p) => {
            novo[p.id] = {
              id: p.id,
              nome: p.nome_exibicao || p.nome_usuario,
              nome_exibicao: p.nome_exibicao || p.nome_usuario,
              usuario: p.nome_usuario,
              nome_usuario: p.nome_usuario,
              avatar_url: p.avatar_url,
            };
          });
          return novo;
        });
      }
    },
    [perfis]
  );

  // 2. Carregar todos os dados do Hub a partir do Supabase
  const carregarDadosHub = useCallback(async () => {
    setCarregando(true);
    try {
      // Campanhas
      const { data: campsData, error: campsErr } = await sb
        .from('campanhas')
        .select('*')
        .order('criado_em', { ascending: false });

      if (campsErr) throw campsErr;
      const listaCampanhas = campsData || [];
      setCampanhas(listaCampanhas);

      // Personagens
      const { data: persData, error: persErr } = await sb
        .from('personagens')
        .select('*')
        .order('criado_em', { ascending: false });

      if (persErr) throw persErr;
      const listaPersonagens = persData || [];

      // Vínculos de Campanha x Personagens
      const { data: cpData } = await sb.from('campanha_personagens').select('*');
      const listaCp = cpData || [];
      setCampanhaPersonagens(listaCp);

      // Associa campanha_id em cada personagem a partir de campanha_personagens
      const cpMap = {};
      listaCp.forEach((item) => {
        cpMap[item.personagem_id] = item.campanha_id;
      });

      const personagensComCampanha = listaPersonagens.map((p) => ({
        ...p,
        campanha_id: cpMap[p.id] || p.campanha_id || null,
        nome_personagem: p.nome || p.nome_personagem,
        dados: p.dados_ficha || p.dados || {},
      }));

      setTodasFichas(personagensComCampanha);

      // Contagem de fichas por campanha
      const fCount = {};
      listaCp.forEach((cp) => {
        if (cp.campanha_id) {
          fCount[cp.campanha_id] = (fCount[cp.campanha_id] || 0) + 1;
        }
      });
      setFichasPorCampanha(fCount);

      // Sessões
      const { data: sessData, error: sessErr } = await sb
        .from('sessoes')
        .select('*')
        .order('data_agendada', { ascending: true });

      if (sessErr) throw sessErr;
      const listaSessoes = (sessData || []).map((s) => ({
        ...s,
        nome: s.titulo || s.nome,
        data: s.data_agendada || s.data,
        resumo: s.descricao || s.resumo,
      }));
      setTodasSessoes(listaSessoes);

      // Participantes de Sessão
      const { data: partData } = await sb.from('sessao_participantes').select('*');
      const partsObj = {};
      (partData || []).forEach((p) => {
        if (!partsObj[p.sessao_id]) partsObj[p.sessao_id] = [];
        partsObj[p.sessao_id].push(p);
      });
      setParticipantesSessao(partsObj);

      // Próxima sessão por campanha
      const agora = Date.now();
      const proxObj = {};
      listaSessoes.forEach((s) => {
        const d = s.data_agendada || s.data;
        if (d && s.campanha_id) {
          const t = new Date(d).getTime();
          if (t >= agora || !proxObj[s.campanha_id]) {
            const atual = proxObj[s.campanha_id];
            if (!atual || t < new Date(atual).getTime()) {
              proxObj[s.campanha_id] = d;
            }
          }
        }
      });
      setProximaSessaoPorCampanha(proxObj);

      // Carrega perfis
      const userIds = [
        ...listaCampanhas.map((c) => c.mestre_id),
        ...listaPersonagens.map((p) => p.usuario_id),
        ...listaCp.map((cp) => cp.usuario_id),
        ...(partData || []).map((pt) => pt.usuario_id),
        usuarioAtual?.id,
      ].filter(Boolean);

      await carregarPerfis(userIds);
    } catch (err) {
      toast('Erro ao sincronizar com o Supabase: ' + (err.message || err), 'erro');
    } finally {
      setCarregando(false);
    }
  }, [toast, carregarPerfis, usuarioAtual?.id]);

  useEffect(() => {
    carregarDadosHub();
  }, [carregarDadosHub]);

  // 3. Abrir Detalhes de Campanha
  const abrirCampanha = useCallback(
    async (id) => {
      const c = campanhas.find((x) => String(x.id) === String(id));
      if (!c) return;
      setCampanhaAtual(c);
      setView('campanha');
      setMenuAtivo('campanhas');

      // Membros da campanha (a partir de campanha_personagens e mestre)
      const { data: membrosCp } = await sb
        .from('campanha_personagens')
        .select('usuario_id')
        .eq('campanha_id', id);

      const userSet = new Set([c.mestre_id, ...(membrosCp || []).map((m) => m.usuario_id)]);
      const listaMembros = Array.from(userSet).map((uId) => ({ usuario_id: uId }));
      setParticipantesCampanha(listaMembros);
      await carregarPerfis(listaMembros.map((m) => m.usuario_id));

      // Sessões da campanha
      const { data: sessData } = await sb
        .from('sessoes')
        .select('*')
        .eq('campanha_id', id)
        .order('data_agendada', { ascending: true });

      setSessoesCampanha((sessData || []).map((s) => ({
        ...s,
        nome: s.titulo || s.nome,
        data: s.data_agendada || s.data,
        resumo: s.descricao || s.resumo,
      })));

      // Fichas da campanha
      const { data: cpLinks } = await sb
        .from('campanha_personagens')
        .select('personagem_id')
        .eq('campanha_id', id);

      const pIds = (cpLinks || []).map((item) => item.personagem_id);
      if (pIds.length > 0) {
        const { data: fichasData } = await sb
          .from('personagens')
          .select('*')
          .in('id', pIds);

        const fs = (fichasData || []).map((f) => ({
          ...f,
          campanha_id: id,
          nome_personagem: f.nome || f.nome_personagem,
          dados: f.dados_ficha || f.dados || {},
        }));
        setFichasCampanha(fs);
        await carregarPerfis(fs.map((f) => f.usuario_id));
      } else {
        setFichasCampanha([]);
      }
    },
    [campanhas, carregarPerfis]
  );

  useEffect(() => {
    if (campanhaInicialId && campanhas.length > 0) {
      const existe = campanhas.some((c) => String(c.id) === String(campanhaInicialId));
      if (existe) abrirCampanha(campanhaInicialId);
    }
  }, [campanhaInicialId, campanhas, abrirCampanha]);

  // 4. Ações de Campanha no Supabase
  const handleSalvarCampanha = async (dados) => {
    let error;
    let novaCampanhaId = dados.id;

    const payload = {
      titulo: dados.titulo || dados.nome,
      sistema: dados.sistema || 'D&D 5E',
      descricao: dados.descricao || '',
      visibilidade: dados.visibilidade || 'publica',
      imagem_capa_url: dados.imagem_capa_url || null,
      mestre_id: Number(usuarioAtual.id),
    };

    if (dados.id) {
      ({ error } = await sb
        .from('campanhas')
        .update(payload)
        .eq('id', dados.id));
    } else {
      const { data, error: insErr } = await sb
        .from('campanhas')
        .insert(payload)
        .select()
        .single();
      error = insErr;
      if (data) novaCampanhaId = data.id;
    }

    if (error) {
      toast('Erro ao salvar campanha no Supabase: ' + error.message, 'erro');
      return;
    }

    // Se houver jogadores convidados no passo 2
    if (novaCampanhaId && dados.jogadores?.length) {
      for (const username of dados.jogadores) {
        const { data: usuarioDb } = await sb
          .from('usuarios')
          .select('id')
          .ilike('nome_usuario', username)
          .maybeSingle();

        if (usuarioDb) {
          // Cria convite de personagem placeholder ou vínculo
          await sb
            .from('campanha_personagens')
            .insert({ campanha_id: novaCampanhaId, usuario_id: usuarioDb.id, personagem_id: null });
        }
      }
    }

    setModalCampanha(null);
    toast(dados.id ? 'Campanha atualizada no Supabase!' : 'Campanha criada no Supabase com sucesso!', 'sucesso');
    await carregarDadosHub();
    if (campanhaAtual && String(dados.id) === String(campanhaAtual.id)) {
      setCampanhaAtual((prev) => ({ ...prev, ...payload }));
    }
  };

  const handleExcluirCampanha = async () => {
    if (!campanhaAtual) return;
    const ok = await confirmar(
      'Excluir campanha',
      `Excluir "${campanhaAtual.titulo || campanhaAtual.nome}" do Supabase? Isso apagará as sessões e vínculos desta campanha.`,
      'Excluir'
    );
    if (!ok) return;

    // Remove dependências primeiro
    await sb.from('sessao_participantes').delete().in(
      'sessao_id',
      sessoesCampanha.map((s) => s.id)
    );
    await sb.from('sessoes').delete().eq('campanha_id', campanhaAtual.id);
    await sb.from('campanha_personagens').delete().eq('campanha_id', campanhaAtual.id);

    const { error } = await sb.from('campanhas').delete().eq('id', campanhaAtual.id);
    if (error) {
      toast('Erro ao excluir campanha: ' + error.message, 'erro');
      return;
    }

    toast('Campanha excluída do Supabase.', 'sucesso');
    setCampanhaAtual(null);
    setView('dashboard');
    carregarDadosHub();
  };

  const handleSairCampanha = async () => {
    if (!campanhaAtual) return;
    const ok = await confirmar(
      'Sair da campanha',
      `Você deixará de participar de "${campanhaAtual.titulo || campanhaAtual.nome}".`,
      'Sair'
    );
    if (!ok) return;

    const { error } = await sb
      .from('campanha_personagens')
      .delete()
      .eq('campanha_id', campanhaAtual.id)
      .eq('usuario_id', Number(usuarioAtual.id));

    if (error) {
      toast('Erro ao sair da campanha: ' + error.message, 'erro');
      return;
    }

    toast('Você saiu da campanha.', 'sucesso');
    setCampanhaAtual(null);
    setView('dashboard');
    carregarDadosHub();
  };

  const handleConvidar = async (usuarioNome) => {
    if (!campanhaAtual) return;
    const { data: usuarioDb, error: buscaErr } = await sb
      .from('usuarios')
      .select('id, nome_exibicao, nome_usuario')
      .ilike('nome_usuario', usuarioNome)
      .maybeSingle();

    if (buscaErr || !usuarioDb) {
      toast('Usuário não encontrado no Supabase', 'erro');
      return;
    }

    const { error } = await sb
      .from('campanha_personagens')
      .insert({ campanha_id: campanhaAtual.id, usuario_id: usuarioDb.id, personagem_id: null });

    if (error) {
      toast('Erro ao convidar jogador: ' + error.message, 'erro');
      return;
    }

    toast(`${usuarioDb.nome_exibicao || usuarioDb.nome_usuario} entrou na campanha!`, 'sucesso');
    setModalConvidar(false);
    abrirCampanha(campanhaAtual.id);
  };

  // 5. Ações de Sessão no Supabase
  const handleSalvarSessao = async (dados) => {
    const cId = dados.campanha_id || campanhaAtual?.id || (campanhas[0]?.id || null);
    if (!cId) {
      toast('Selecione uma campanha para a sessão.', 'erro');
      return;
    }

    const payload = {
      campanha_id: Number(cId),
      titulo: dados.titulo,
      descricao: dados.descricao || '',
      data_agendada: dados.data_agendada,
      status: dados.status || 'agendada',
    };

    let error;
    if (dados.id) {
      ({ error } = await sb
        .from('sessoes')
        .update(payload)
        .eq('id', dados.id));
    } else {
      ({ error } = await sb
        .from('sessoes')
        .insert(payload));
    }

    if (error) {
      toast('Erro ao salvar sessão no Supabase: ' + error.message, 'erro');
      return;
    }

    toast(dados.id ? 'Sessão atualizada no Supabase!' : 'Sessão agendada com sucesso no Supabase!', 'sucesso');
    setModalSessao(null);
    await carregarDadosHub();
    if (campanhaAtual && String(cId) === String(campanhaAtual.id)) {
      abrirCampanha(campanhaAtual.id);
    }
  };

  const handleExcluirSessao = async (s) => {
    const ok = await confirmar(
      `Excluir Sessão`,
      `Excluir "${s.titulo || s.nome || 'Sessão'}" do Supabase? Não é possível desfazer.`,
      'Excluir'
    );
    if (!ok) return;

    await sb.from('sessao_participantes').delete().eq('sessao_id', s.id);
    const { error } = await sb.from('sessoes').delete().eq('id', s.id);
    if (error) {
      toast('Erro ao excluir sessão: ' + error.message, 'erro');
      return;
    }

    toast('Sessão excluída do Supabase.', 'sucesso');
    setTodasSessoes((prev) => prev.filter((item) => item.id !== s.id));
    setSessoesCampanha((prev) => prev.filter((item) => item.id !== s.id));
    carregarDadosHub();
  };

  const handleAlternarPresenca = async (sessaoId, novoStatus) => {
    if (!usuarioAtual) return;

    const { error } = await sb
      .from('sessao_participantes')
      .upsert({
        sessao_id: sessaoId,
        usuario_id: Number(usuarioAtual.id),
        presente: novoStatus,
      });

    if (error) {
      toast('Erro ao atualizar presença: ' + error.message, 'erro');
      return;
    }

    toast(novoStatus ? 'Presença confirmada!' : 'Presença cancelada.', 'sucesso');
    carregarDadosHub();
  };

  // 6. Ações de Personagem / Ficha no Supabase
  const handleCriarFicha = async (payload) => {
    const nomePersonagem = payload.nome || 'Personagem';
    const cId = payload.campanhaId || campanhaAtual?.id || null;
    const dadosIniciais = payload.dadosIniciais || {};
    const uId = Number(usuarioAtual?.id) || 1;

    const dbPayload = {
      usuario_id: uId,
      nome: nomePersonagem,
      raca: payload.raca || 'Humano',
      classe: payload.classe || 'Guerreiro',
      subclasse: payload.subclasse || null,
      nivel: Number(payload.nivel) || 1,
      antecedente: payload.antecedente || null,
      alinhamento: payload.alinhamento || null,
      avatar_url: payload.avatar_url || null,
      token_url: payload.token_url || null,
      background_url: payload.background_url || null,
      cor_tema: payload.cor_tema || 'padrao',
      pv_atual: Number(dadosIniciais.pv_atual ?? dadosIniciais.pv_total ?? 10),
      pv_total: Number(dadosIniciais.pv_total ?? 10),
      pv_temp: Number(dadosIniciais.pvTemp ?? 0),
      dados_vida: dadosIniciais.dadosVida || '1d8',
      ca: Number(dadosIniciais.ca ?? 14),
      deslocamento: dadosIniciais.deslocamento || '30ft',
      iniciativa: Number(dadosIniciais.iniciativa ?? 2),
      proficiencia: 2,
      forca: Number(dadosIniciais.for ?? 15),
      destreza: Number(dadosIniciais.des ?? 14),
      constituicao: Number(dadosIniciais.con ?? 14),
      inteligencia: Number(dadosIniciais.int ?? 10),
      sabedoria: Number(dadosIniciais.sab ?? 12),
      carisma: Number(dadosIniciais.car ?? 8),
      pericias: dadosIniciais.pericias || { atletismo: true, percepcao: true },
      ataques: dadosIniciais.ataques || [],
      magias: dadosIniciais.magias || [],
      espacos_magia: dadosIniciais.espacos_magia || dadosIniciais.spellSlots || { 1: { total: 4, gastos: 0 } },
      moedas: dadosIniciais.moedas || { po: 50, pp: 0, pc: 0 },
      equipamento: dadosIniciais.equipamento || '',
      tracos: dadosIniciais.tracos || '',
      historia: dadosIniciais.historia || '',
      dados_ficha: dadosIniciais,
    };

    const { data: novoPers, error } = await sb
      .from('personagens')
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      toast('Erro ao salvar personagem no Supabase: ' + error.message, 'erro');
      throw error;
    }

    // Se vinculado a uma campanha, insere em campanha_personagens
    if (cId && novoPers) {
      try {
        await sb.from('campanha_personagens').insert({
          campanha_id: Number(cId),
          usuario_id: uId,
          personagem_id: novoPers.id,
        });
      } catch (cpErr) {
        console.warn('Erro ao vincular à campanha:', cpErr);
      }
    }

    toast(`Ficha de ${nomePersonagem} criada e salva com sucesso!`, 'sucesso');
    setModalNovaFicha(false);

    const fichaFormatada = {
      ...novoPers,
      campanha_id: cId,
      nome_personagem: novoPers.nome,
      dados: novoPers.dados_ficha,
    };

    setTodasFichas((prev) => [fichaFormatada, ...prev]);
    if (campanhaAtual && String(cId) === String(campanhaAtual.id)) {
      setFichasCampanha((prev) => [...prev, fichaFormatada]);
    }
    setFichaAberta(fichaFormatada);
    setMenuAtivo('personagens');
    setView('ficha');
    carregarDadosHub();
  };

  const handleAbrirFicha = async (arg) => {
    if (!arg) return;

    // Se já foi passado o objeto do personagem
    if (typeof arg === 'object' && arg.id) {
      setFichaAberta(arg);
      setView('ficha');
      return;
    }

    const fichaId = arg;
    const f = todasFichas.find((x) => String(x.id) === String(fichaId)) ||
              fichasCampanha.find((x) => String(x.id) === String(fichaId));

    if (f) {
      setFichaAberta(f);
      setView('ficha');
      return;
    }

    const { data, error } = await sb.from('personagens').select('*').eq('id', fichaId).maybeSingle();
    if (!error && data) {
      const fObj = {
        ...data,
        nome_personagem: data.nome || data.nome_personagem,
        dados: data.dados_ficha || data.dados || {},
      };
      setFichaAberta(fObj);
      setView('ficha');
    }
  };

  const handleSalvarFicha = async (dados) => {
    const payload = {
      nome: dados.nome || dados.nome_personagem || 'Personagem',
      raca: dados.raca || 'Humano',
      classe: dados.classe || 'Guerreiro',
      subclasse: dados.subclasse || null,
      nivel: Number(dados.nivel) || 1,
      antecedente: dados.antecedente || null,
      alinhamento: dados.alinhamento || null,
      avatar_url: dados.avatar_url || dados.token_url || null,
      token_url: dados.token_url || dados.avatar_url || null,
      background_url: dados.background_url || null,
      cor_tema: dados.cor_tema || 'padrao',
      // Colunas dedicadas
      pv_atual: Number(dados.pv_atual) || 0,
      pv_total: Number(dados.pv_total) || 0,
      pv_temp: Number(dados.pv_temp ?? dados.pvTemp) || 0,
      dados_vida: dados.dados_vida || dados.dadosVida || '1d8',
      ca: Number(dados.ca) || 10,
      deslocamento: dados.deslocamento || '30ft',
      iniciativa: Number(dados.iniciativa) || 0,
      proficiencia: Number(dados.proficiencia ?? dados.profBonus) || 2,
      forca: Number(dados.forca ?? dados.atributos?.for) || 10,
      destreza: Number(dados.destreza ?? dados.atributos?.des) || 10,
      constituicao: Number(dados.constituicao ?? dados.atributos?.con) || 10,
      inteligencia: Number(dados.inteligencia ?? dados.atributos?.int) || 10,
      sabedoria: Number(dados.sabedoria ?? dados.atributos?.sab) || 10,
      carisma: Number(dados.carisma ?? dados.atributos?.car) || 10,
      pericias: dados.pericias || {},
      ataques: dados.ataques || [],
      magias: dados.magias || [],
      espacos_magia: dados.espacos_magia || dados.spellSlots || {},
      moedas: dados.moedas || { po: 0, pp: 0, pc: 0 },
      equipamento: dados.equipamento || '',
      tracos: dados.tracos || '',
      historia: dados.historia || '',
      dados_ficha: dados.dados_ficha || dados.dados || {},
      atualizado_em: new Date().toISOString(),
    };

    const { error } = await sb
      .from('personagens')
      .update(payload)
      .eq('id', dados.id);

    if (error) {
      toast('Erro ao salvar ficha no Supabase: ' + error.message, 'erro');
      return;
    }

    toast('Ficha salva no Supabase com sucesso!', 'sucesso');
    const fAtualizada = {
      ...dados,
      ...payload,
      nome_personagem: payload.nome,
      dados: payload.dados_ficha,
    };
    setFichaAberta(fAtualizada);
    setTodasFichas((prev) => prev.map((f) => (String(f.id) === String(dados.id) ? fAtualizada : f)));
    setFichasCampanha((prev) => prev.map((f) => (String(f.id) === String(dados.id) ? fAtualizada : f)));
  };

  const handleExcluirFicha = async (fichaId) => {
    const ok = await confirmar(
      'Excluir personagem',
      'Não é possível desfazer. Isso apagará o personagem do Supabase permanentemente.',
      'Excluir'
    );
    if (!ok) return;

    await sb.from('campanha_personagens').delete().eq('personagem_id', fichaId);
    const { error } = await sb.from('personagens').delete().eq('id', fichaId);

    if (error) {
      toast('Erro ao excluir personagem do Supabase: ' + error.message, 'erro');
      return;
    }

    toast('Personagem excluído do Supabase.', 'sucesso');
    setTodasFichas((prev) => prev.filter((f) => f.id !== fichaId));
    setFichasCampanha((prev) => prev.filter((f) => f.id !== fichaId));
    if (fichaAberta?.id === fichaId) {
      setView('personagens');
      setFichaAberta(null);
    }
    carregarDadosHub();
  };

  const nomeExibicao =
    usuarioAtual?.nome_exibicao ||
    perfis[usuarioAtual?.id]?.nome ||
    perfis[usuarioAtual?.id]?.usuario ||
    usuarioAtual?.nome_usuario ||
    'Master Architect';

  return (
    <div className="nexus-app-shell">
      {/* TopNavBar */}
      <nav className="nexus-top-nav">
        <div className="nexus-nav-inner">
          <div
            className="flex items-center gap-3"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => {
              setView('dashboard');
              setMenuAtivo('campanhas');
              setCampanhaAtual(null);
            }}
          >
            <div className="hextech-gem-icon" />
            <span className="nexus-brand-title">ALLIES</span>
          </div>

          <div className="nexus-search-wrap">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Buscar campanhas, sessões ou heróis..."
              className="nexus-search-input"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
          </div>

          <div className="nexus-nav-actions">
            <button className="nexus-icon-btn" title="Notificações">
              <span className="material-symbols-outlined text-2xl">notifications</span>
              <span className="nexus-notification-dot"></span>
            </button>

            <button className="nexus-icon-btn" title="Configurações">
              <span className="material-symbols-outlined text-2xl">settings</span>
            </button>

            <div className="nexus-user-profile-badge">
              <div className="nexus-user-name">{nomeExibicao}</div>
              <div className="nexus-avatar-ring">{initials(nomeExibicao)}</div>
            </div>

            <button className="nexus-logout-btn" onClick={onLogout} title="Sair da conta">
              Sair
            </button>
          </div>
        </div>
      </nav>

      {/* Main Wrapper com Hextech Background e Sidebar */}
      <div className="nexus-main-wrap hex-bg">
        {/* SideNavBar */}
        <aside className="nexus-sidebar">
          {/* Perfil no Topo da Sidebar */}
          <div className="nexus-sidebar-profile">
            <div className="nexus-avatar-large-wrap">
              <div className="nexus-avatar-large-img">{initials(nomeExibicao)}</div>
            </div>
            <h2 className="nexus-profile-title">{nomeExibicao}</h2>
          </div>

          {/* Navegação Principal */}
          <nav className="nexus-nav-group">
            <button
              className={`nexus-nav-item ${menuAtivo === 'sessoes' ? 'active' : ''}`}
              onClick={() => {
                setMenuAtivo('sessoes');
                setView('sessoes');
                setCampanhaAtual(null);
              }}
            >
              <span className="material-symbols-outlined text-2xl">calendar_month</span>
              <span>Sessões</span>
            </button>

            <button
              className={`nexus-nav-item ${menuAtivo === 'personagens' ? 'active' : ''}`}
              onClick={() => {
                setMenuAtivo('personagens');
                setView('personagens');
                setCampanhaAtual(null);
              }}
            >
              <span className="material-symbols-outlined text-2xl">person</span>
              <span>Personagens</span>
            </button>

            <button
              className={`nexus-nav-item ${menuAtivo === 'assets' ? 'active' : ''}`}
              onClick={() => {
                setMenuAtivo('assets');
                if (campanhas.length > 0) onAbrirMesa(campanhas[0].id);
              }}
            >
              <span className="material-symbols-outlined text-2xl">inventory_2</span>
              <span>Assets</span>
            </button>
          </nav>

          {/* Botão de Destaque CAMPANHAS */}
          <button
            className={`gold-gradient-btn nexus-btn-campanhas ${menuAtivo === 'campanhas' ? 'active-border' : ''}`}
            onClick={() => {
              setMenuAtivo('campanhas');
              setView('dashboard');
              setCampanhaAtual(null);
            }}
          >
            <span className="material-symbols-outlined">castle</span>
            <span>CAMPANHAS</span>
          </button>

          {/* Rodapé da Sidebar: Friends */}
          <div className="nexus-sidebar-footer">
            <button
              className={`nexus-nav-item ${menuAtivo === 'amigos' ? 'active' : ''}`}
              onClick={() => {
                setMenuAtivo('amigos');
                setModalConvidar(true);
              }}
            >
              <span className="material-symbols-outlined text-xl">group</span>
              <span>Friends</span>
            </button>
          </div>
        </aside>

        {/* Área de Conteúdo Principal */}
        <main className="nexus-content-area">
          <div className="nexus-content-inner">
            {view === 'dashboard' && (
              <Dashboard
                campanhas={campanhas}
                carregando={carregando}
                fichasPorCampanha={fichasPorCampanha}
                proximaSessaoPorCampanha={proximaSessaoPorCampanha}
                perfis={perfis}
                usuarioAtual={usuarioAtual}
                termoBusca={termoBusca}
                onNovaCampanha={() => setModalCampanha({ modo: 'criar' })}
                onAbrirCampanha={abrirCampanha}
              />
            )}

            {view === 'sessoes' && (
              <SessoesView
                sessoes={todasSessoes}
                campanhas={campanhas}
                participantesPorSessao={participantesSessao}
                perfis={perfis}
                usuarioAtual={usuarioAtual}
                termoBusca={termoBusca}
                onNovaSessao={() => setModalSessao({ modo: 'criar' })}
                onEditarSessao={(s) => setModalSessao({ modo: 'editar', sessao: s })}
                onExcluirSessao={handleExcluirSessao}
                onAbrirMesa={(cId, sId) => onAbrirMesa(cId, sId)}
                onAlternarPresenca={handleAlternarPresenca}
              />
            )}

            {view === 'personagens' && (
              <PersonagensView
                fichas={todasFichas}
                campanhas={campanhas}
                perfis={perfis}
                usuarioAtual={usuarioAtual}
                termoBusca={termoBusca}
                onNovaFicha={() => setModalNovaFicha(true)}
                onAbrirFicha={handleAbrirFicha}
                onExcluirFicha={handleExcluirFicha}
              />
            )}

            {view === 'campanha' && campanhaAtual && (
              <CampanhaView
                campanha={campanhaAtual}
                usuarioAtual={usuarioAtual}
                participantes={participantesCampanha}
                sessoes={sessoesCampanha}
                fichas={fichasCampanha}
                perfis={perfis}
                proximaSessao={proximaSessaoPorCampanha[campanhaAtual.id]}
                onVoltar={() => {
                  setView('dashboard');
                  setCampanhaAtual(null);
                }}
                onEditarCampanha={() =>
                  setModalCampanha({ modo: 'editar', campanha: campanhaAtual })
                }
                onExcluirCampanha={handleExcluirCampanha}
                onSairCampanha={handleSairCampanha}
                onConvidar={() => setModalConvidar(true)}
                onAbrirMesa={(cId, sId) => onAbrirMesa(cId, sId)}
                onNovaFicha={() => setModalNovaFicha(true)}
                onAbrirFicha={handleAbrirFicha}
                onExcluirFicha={handleExcluirFicha}
                onNovaSessao={() => setModalSessao({ modo: 'criar' })}
                onEditarSessao={(s) => setModalSessao({ modo: 'editar', sessao: s })}
                onExcluirSessao={handleExcluirSessao}
              />
            )}

            {view === 'ficha' && (
              fichaAberta ? (
                <FichaView
                  ficha={fichaAberta}
                  usuarioAtual={usuarioAtual}
                  onVoltar={() => {
                    if (menuAtivo === 'personagens') setView('personagens');
                    else if (campanhaAtual) setView('campanha');
                    else setView('dashboard');
                  }}
                  onSalvar={handleSalvarFicha}
                />
              ) : (
                <div
                  className="hex-card"
                  style={{
                    padding: '60px 24px',
                    textAlign: 'center',
                    borderRadius: '12px',
                  }}
                >
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '15px' }}>
                    Carregando dados do personagem...
                  </p>
                </div>
              )
            )}
          </div>
        </main>
      </div>

      {/* Modais */}
      {modalCampanha && (
        <ModalCampanha
          campanha={modalCampanha.campanha}
          onSalvar={handleSalvarCampanha}
          onCancelar={() => setModalCampanha(null)}
        />
      )}

      {modalSessao && (
        <ModalSessao
          sessao={modalSessao.sessao}
          campanhas={campanhas}
          campanhaPadraoId={campanhaAtual?.id}
          onSalvar={handleSalvarSessao}
          onCancelar={() => setModalSessao(null)}
        />
      )}

      {modalNovaFicha && (
        <ModalCriacaoCampeaoHextech
          campanhas={campanhas}
          campanhaPadraoId={campanhaAtual?.id}
          onCriar={handleCriarFicha}
          onCancelar={() => setModalNovaFicha(false)}
        />
      )}

      {modalConvidar && (
        <ModalConvidar
          onConvidar={handleConvidar}
          onCancelar={() => setModalConvidar(false)}
        />
      )}
    </div>
  );
}
