import assert from 'node:assert/strict';
import { Astra_login, Astra_restaurarSessao } from '../src/login/Astra_auth.js';

const user = { email: 'mestre_um@allies.local', user_metadata: { usuario: 'outro' } };
let consultas = 0;
const client = {
  auth: {
    async signInWithPassword(credentials) {
      assert.deepEqual(credentials, { email: user.email, password: 'senha-teste' });
      return { data: { user, session: { user } } };
    },
    async getUser() { return { data: { user } }; },
  },
  async rpc(name) { assert.equal(name, 'current_user_id'); return { data: 42 }; },
  from(table) {
    consultas++;
    assert.equal(table, 'usuarios');
    return { select(fields) {
      assert.equal(fields, 'id, nome_usuario, nome_exibicao');
      return { eq(key, value) {
        assert.equal(key, 'id'); assert.equal(value, 42);
        return { async maybeSingle() {
          return { data: { id: 42, nome_usuario: 'mestre_um', nome_exibicao: 'Mestre' } };
        } };
      } };
    } };
  },
};
const expected = { id: 42, nome_usuario: 'mestre_um', nome_exibicao: 'Mestre', email: user.email };
assert.deepEqual(await Astra_login(client, ' Mestre_Um ', 'senha-teste'), expected);
assert.deepEqual(await Astra_restaurarSessao(client), expected);
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
await assert.rejects(Astra_restaurarSessao({ ...client, rpc: async () => ({ data: null }) }), /perfil/);
await assert.rejects(Astra_restaurarSessao({ ...client, rpc: async () => ({ error: new Error('offline') }) }), /offline/);
console.log('Astra: login, restauração e falhas de autenticação verificados.');
