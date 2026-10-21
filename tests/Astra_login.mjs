import assert from 'node:assert/strict';
import { Astra_login, Astra_restaurarSessao } from '../src/login/Astra_auth.js';

const user = { id: '8c62b8f7-6b9d-4c92-a0c8-1d5f2a8f7a10', email: 'mestre_um@allies.local', user_metadata: { usuario: 'outro' } };
let consultas = 0;
const client = {
  auth: {
    async signInWithPassword(credentials) {
      assert.deepEqual(credentials, { email: user.email, password: 'senha-teste' });
      return { data: { user, session: { user } } };
    },
    async getUser() { return { data: { user } }; },
  },
  from(table) {
    consultas++;
    assert.equal(table, 'usuarios');
    return { select(fields) {
      assert.equal(fields, 'id, auth_id, nome_usuario, nome_exibicao');
      return { eq(key, value) {
        assert.equal(key, 'auth_id'); assert.equal(value, user.id);
        return { async maybeSingle() {
          return { data: { id: 7, auth_id: user.id, nome_usuario: 'mestre_um', nome_exibicao: 'Mestre' } };
        } };
      } };
    } };
  },
};
const expected = { id: 7, nome_usuario: 'mestre_um', nome_exibicao: 'Mestre', email: user.email };
assert.deepEqual(await Astra_login(client, ' Mestre_Um ', 'senha-teste'), expected);
assert.deepEqual(await Astra_restaurarSessao(client), expected);
const emailClient = { ...client, auth: {
  ...client.auth,
  async signInWithPassword(credentials) {
    assert.deepEqual(credentials, { email: user.email, password: 'senha-teste' });
    return { data: { user, session: { user } } };
  },
} };
assert.deepEqual(await Astra_login(emailClient, user.email, 'senha-teste'), expected);
const before = consultas;
const invalid = { ...client, auth: {
  signInWithPassword: async () => ({ error: new Error('Invalid login credentials') }),
  getUser: async () => ({ error: new Error('Invalid session') }),
} };
await assert.rejects(Astra_login(invalid, 'mestre_um', 'errada'), /Invalid login/);
assert.equal(await Astra_restaurarSessao(invalid), null);
assert.equal(consultas, before, 'Credenciais inválidas não consultam perfis');
await assert.rejects(Astra_login({ ...client, auth: {
  signInWithPassword: async () => ({ data: { user, session: null } }),
} }, 'mestre_um', 'senha-teste'), /iniciar a sessão/);
await assert.rejects(Astra_restaurarSessao({ ...client, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }), /perfil/);
await assert.rejects(Astra_restaurarSessao({ ...client, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ error: new Error('offline') }) }) }) }) }), /offline/);
console.log('Astra: login, restauração e falhas de autenticação verificados.');
