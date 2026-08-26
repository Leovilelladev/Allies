import { useCallback, useEffect, useState } from 'react';
import MesaCanvas from './MesaCanvas';
import { sb } from './supabaseClient';

function getCampanhaIdFromUrl() {
  return new URLSearchParams(window.location.search).get('campanha');
}

export default function App() {
  // carregando | sem-campanha | sem-sessao | erro | pronto
  const [status, setStatus] = useState('carregando');
  const [cena, setCena] = useState(null);
  const [erro, setErro] = useState('');
  const [campanhaId] = useState(getCampanhaIdFromUrl);

  const carregarCena = useCallback(async () => {
    if (!campanhaId) {
      setStatus('sem-campanha');
      return;
    }

    const { data: sessionData } = await sb.auth.getSession();
    if (!sessionData?.session) {
      setStatus('sem-sessao');
      return;
    }

    // Usa a cena mais antiga da campanha; se ainda não existir nenhuma, cria a primeira
    // (RLS só deixa o mestre criar cena, então isso falha graciosamente pro jogador)
    const { data: cenasExistentes, error: erroBusca } = await sb
      .from('cenas')
      .select('*')
      .eq('campanha_id', campanhaId)
      .order('criado_em', { ascending: true })
      .limit(1);

    if (erroBusca) {
      setErro(erroBusca.message);
      setStatus('erro');
      return;
    }

    if (cenasExistentes && cenasExistentes.length > 0) {
      setCena(cenasExistentes[0]);
      setStatus('pronto');
      return;
    }

    const { data: novaCena, error: erroCriar } = await sb
      .from('cenas')
      .insert({ campanha_id: campanhaId, nome: 'Cena 1' })
      .select()
      .single();

    if (erroCriar) {
      // Código 23505 = violou o índice único (alguém, ou outra aba/efeito duplicado,
      // criou a cena entre a busca e o insert). Não é erro de verdade: só busca a que já existe.
      if (erroCriar.code === '23505') {
        const { data: cenaExistente, error: erroReconsulta } = await sb
          .from('cenas')
          .select('*')
          .eq('campanha_id', campanhaId)
          .single();
        if (!erroReconsulta && cenaExistente) {
          setCena(cenaExistente);
          setStatus('pronto');
          return;
        }
      }
      setErro(
        'Ainda não existe uma cena nessa campanha, e só o mestre pode criar a primeira. Peça pro mestre abrir a Mesa Virtual antes.'
      );
      setStatus('erro');
      return;
    }

    setCena(novaCena);
    setStatus('pronto');
  }, [campanhaId]);

  useEffect(() => {
    carregarCena();
  }, [carregarCena]);

  if (status === 'carregando') {
    return <MensagemCentral texto="Carregando a mesa…" />;
  }
  if (status === 'sem-campanha') {
    return (
      <MensagemCentral texto="Abra a Mesa Virtual a partir de uma campanha (falta o parâmetro ?campanha=... na URL)." />
    );
  }
  if (status === 'sem-sessao') {
    return <TelaLogin onEntrar={carregarCena} />;
  }
  if (status === 'erro') {
    return <MensagemCentral texto={erro} />;
  }

  return <MesaCanvas cenaId={cena.id} campanhaId={campanhaId} />;
}

function MensagemCentral({ texto }) {
  return (
    <div className="mesa-msg-central">
      <p>{texto}</p>
    </div>
  );
}

// Login próprio, só pra quando a Mesa Virtual for aberta separada do site principal
// (dev local em outra porta, por exemplo) — em produção, no mesmo domínio, a sessão
// do site principal já chega compartilhada e essa tela nem aparece.
function TelaLogin({ onEntrar }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    const usuarioLimpo = usuario.trim().toLowerCase();
    if (!usuarioLimpo || !senha) {
      setErro('Preenche usuário e senha.');
      return;
    }
    setCarregando(true);
    const { error } = await sb.auth.signInWithPassword({
      email: `${usuarioLimpo}@allies.local`,
      password: senha,
    });
    setCarregando(false);
    if (error) {
      setErro('Usuário ou senha inválidos.');
      return;
    }
    onEntrar();
  }

  return (
    <div className="mesa-msg-central">
      <form className="mesa-login" onSubmit={handleSubmit}>
        <h1>Allies <small>Mesa Virtual</small></h1>
        <label>
          Usuário
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
        </label>
        <label>
          Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        {erro && <p className="mesa-login-erro">{erro}</p>}
        <button className="mesa-btn" type="submit" disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
