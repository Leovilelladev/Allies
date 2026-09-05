import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepararRolagem3D } from '../src/mesa/diceEvents.js';

const formula = (faces, rolagens) => ({ dados: { total: rolagens.reduce((a,b)=>a+b,0), partes: [{ tipo:'dado', faces, rolagens, sinal:1 }] } });
for (const faces of [4,6,8,10,12,20]) {
  const r = prepararRolagem3D(formula(faces,[1,faces]));
  assert.deepEqual(r.visual.modelos.map(m=>m.face), [1,faces]);
  assert.ok(r.visual.modelos.every(m=>m.modelo===faces));
}
for (const [valor, expected] of [[1,[10,1]],[10,[1,10]],[99,[9,9]],[100,[10,10]]]) {
  const r = prepararRolagem3D(formula(100,[valor]));
  assert.deepEqual(r.visual.modelos.map(m=>m.face),expected);
  assert.equal(r.visual.total,valor);
}
assert.equal(prepararRolagem3D(formula(3,[2])),null);
const vantagem = { valores:[3,19], escolhido:19, total:21, modo:'vantagem' };
assert.equal(prepararRolagem3D({d20:vantagem}).visual.total,21);
const mix = prepararRolagem3D({dados:{total:12,partes:[{tipo:'dado',faces:8,rolagens:[4]},{tipo:'dado',faces:6,rolagens:[3,5]}]}});
assert.deepEqual(mix.visual.modelos.map(m=>m.modelo),[8,6,6]);

for (const tipo of [4,6,8,10,12,20,'percent','units']) {
  const bytes=fs.readFileSync(new URL(`../public/models/reliquia_leo/d${tipo}_leo.glb`,import.meta.url));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const nodes=new Map(gltf.nodes.map(n=>[n.name,n]));
  assert.ok(nodes.has('DiceBody'),`corpo d${tipo}`);
  const count=typeof tipo==='number'?tipo:10;
  for(let n=1;n<=count;n++) {
    const node=nodes.get(`Face_${String(n).padStart(2,'0')}`);
    assert.ok(node,`face ${n} de d${tipo}`);
    assert.ok(Math.abs(Math.hypot(...node.extras.normal)-1)<1e-5);
  }
}
console.log('ok: família GLB, fórmulas mistas, vantagem e d100 (1, 10, 99, 100)');
