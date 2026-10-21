// Astra: autenticação sem consultar ou armazenar senhas na tabela de perfis.
async function Astra_perfil(client, user) {
  if (!user?.id) throw new Error('Não foi possível validar a conta autenticada.');
  const { data: perfil, error } = await client.from('usuarios')
    .select('id, auth_id, nome_usuario, nome_exibicao').eq('auth_id', user.id).maybeSingle();
  if (error) throw error;
  if (!perfil) throw new Error('Não foi possível encontrar o perfil desta conta.');
  return {
    id: perfil.id,
    nome_usuario: perfil.nome_usuario,
    nome_exibicao: perfil.nome_exibicao || perfil.nome_usuario,
    email: user.email,
  };
}

export async function Astra_login(client, usuario, senha) {
  const identificador = String(usuario || '').trim().toLowerCase();
  const email = identificador.includes('@') ? identificador : `${identificador}@allies.local`;
  const { data, error } = await client.auth.signInWithPassword({
    email, password: senha,
  });
  if (error) throw error;
  if (!data?.session || !data?.user) throw new Error('Não foi possível iniciar a sessão. Tente novamente.');
  return Astra_perfil(client, data.user);
}

export async function Astra_restaurarSessao(client) {
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  return Astra_perfil(client, data.user);
}
