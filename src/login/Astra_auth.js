// Astra: autenticação sem consultar ou armazenar senhas na tabela de perfis.
async function Astra_perfil(client, user) {
  const { data: id, error: vinculoError } = await client.rpc('current_user_id');
  if (vinculoError) throw vinculoError;
  if (!id) throw new Error('Não foi possível encontrar o perfil desta conta.');
  const { data: perfil, error } = await client.from('usuarios')
    .select('id, nome_usuario, nome_exibicao').eq('id', id).maybeSingle();
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
  const { data, error } = await client.auth.signInWithPassword({
    email: `${usuario.trim().toLowerCase()}@allies.local`, password: senha,
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
