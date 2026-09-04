import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const DURACAO_GIRO = 1050;
const DURACAO_POUSO = 650;
const DURACAO_MAO = 1150;
const DURACAO_QUEDA = 850;

function suavizar(t) {
  return 1 - Math.pow(1 - t, 4);
}

function estrelaGeometria(raio = 0.13) {
  const forma = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const angulo = Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 ? raio * 0.42 : raio;
    const x = Math.cos(angulo) * r;
    const y = Math.sin(angulo) * r;
    if (i === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
  }
  forma.closePath();
  return new THREE.ShapeGeometry(forma);
}

function criarMestre() {
  const grupo = new THREE.Group();
  const roxo = new THREE.MeshStandardMaterial({ color: 0x3d176f, roughness: 0.58, metalness: 0.08 });
  const roxoEscuro = new THREE.MeshStandardMaterial({ color: 0x16082f, roughness: 0.7 });
  const azul = new THREE.MeshStandardMaterial({ color: 0x168ebc, roughness: 0.3, metalness: 0.35 });
  const dourado = new THREE.MeshStandardMaterial({ color: 0xe4ad3d, roughness: 0.25, metalness: 0.72 });
  const pele = new THREE.MeshStandardMaterial({ color: 0xc8875f, roughness: 0.62 });

  const corpo = new THREE.Mesh(new THREE.ConeGeometry(2.15, 4.5, 32, 1, true), roxo);
  corpo.position.set(0, 1.55, -1.65);
  grupo.add(corpo);
  const gola = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.12, 10, 32, Math.PI), azul);
  gola.position.set(0, 3.55, -1.2);
  gola.rotation.z = Math.PI;
  grupo.add(gola);
  const capuz = new THREE.Mesh(new THREE.SphereGeometry(0.74, 24, 18), roxoEscuro);
  capuz.scale.set(1.05, 1.18, 0.55);
  capuz.position.set(0, 3.75, -1.45);
  grupo.add(capuz);
  const rosto = new THREE.Mesh(new THREE.SphereGeometry(0.47, 20, 16), pele);
  rosto.scale.z = 0.55;
  rosto.position.set(0, 3.68, -0.96);
  grupo.add(rosto);

  [[-0.9, 2.65, 0.18], [0.72, 2.25, -0.12], [-0.45, 1.55, -0.1], [0.42, 0.72, 0.14], [-1.15, 0.45, -0.2]].forEach(
    ([x, y, giro], indice) => {
      const estrela = new THREE.Mesh(estrelaGeometria(indice % 2 ? 0.11 : 0.15), dourado);
      estrela.position.set(x, y, -0.52);
      estrela.rotation.z = giro;
      grupo.add(estrela);
    }
  );
  [-0.62, 0.62].forEach((x) => {
    const detalhe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.25, 0.06), azul);
    detalhe.position.set(x, 1.55, -0.58);
    detalhe.rotation.z = x * 0.13;
    grupo.add(detalhe);
  });
  const mesa = new THREE.Mesh(
    new THREE.CircleGeometry(3.7, 48),
    new THREE.MeshStandardMaterial({ color: 0x091a28, roughness: 0.48, metalness: 0.22 })
  );
  mesa.scale.y = 0.3;
  mesa.position.set(0, -1.05, -0.75);
  grupo.add(mesa);
  const bordaMesa = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.045, 8, 48), dourado);
  bordaMesa.scale.y = 0.3;
  bordaMesa.position.copy(mesa.position);
  grupo.add(bordaMesa);

  const braco = new THREE.Group();
  braco.position.set(1.25, 2.75, -0.45);
  const manga = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.35, 10, 20), roxo);
  manga.position.y = -0.85;
  braco.add(manga);
  const punho = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.09, 10, 24), azul);
  punho.position.y = -1.58;
  punho.rotation.x = Math.PI / 2;
  braco.add(punho);
  const mao = new THREE.Group();
  mao.position.set(0, -1.88, 0.28);
  const palma = new THREE.Mesh(new THREE.SphereGeometry(0.43, 20, 14), pele);
  palma.scale.set(1.05, 0.8, 0.4);
  mao.add(palma);
  [-0.29, -0.1, 0.1, 0.29].forEach((x, indice) => {
    const dedo = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.4 - indice * 0.025, 6, 10), pele);
    dedo.position.set(x, -0.31, 0.03);
    dedo.rotation.z = x * -0.55;
    mao.add(dedo);
  });
  braco.add(mao);
  braco.rotation.z = -0.72;
  grupo.add(braco);
  return { grupo, braco, mao };
}

function posicaoFinal(indice, quantidade) {
  const colunas = quantidade === 4 ? 2 : 3;
  const linhas = Math.ceil(quantidade / colunas);
  const coluna = indice % colunas;
  const linha = Math.floor(indice / colunas);
  return new THREE.Vector3(
    (coluna - (colunas - 1) / 2) * (colunas === 2 ? 2.05 : 1.55),
    ((linhas - 1) / 2 - linha) * 1.55 + 0.2,
    0
  );
}

export default function Dado3DOverlay({ rolagem, onClose }) {
  const canvasRef = useRef(null);
  const [mostrarResultados, setMostrarResultados] = useState(rolagem.d20.valores.length <= 3);

  useEffect(() => {
    if (!rolagem || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 8.2);

    scene.add(new THREE.HemisphereLight(0x9adfff, 0x07101f, 2.1));
    const key = new THREE.DirectionalLight(0xffc56f, 4.0);
    key.position.set(4, -3, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x20d9d0, 3.2);
    rim.position.set(-5, 2, 3);
    scene.add(rim);

    let frame = 0;
    let dados = [];
    let inicio = 0;
    let inicioPouso = null;
    let cancelado = false;
    let mestre = null;
    let timerResultados = 0;

    const ajustar = () => {
      const lado = Math.max(260, Math.min(520, canvas.parentElement?.clientWidth || 420));
      renderer.setSize(lado, lado, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };
    ajustar();

    const loader = new GLTFLoader();
    loader.load(
      '/models/d20_allies_leo.glb',
      (gltf) => {
        if (cancelado) return;
        const valores = rolagem.d20.valores.slice(0, 6);
        const usaMao = valores.length > 3;
        const escala = usaMao ? 0.38 : valores.length > 2 ? 0.48 : valores.length === 2 ? 0.56 : 1.08;
        const espacamento = valores.length > 2 ? 1.65 : 2.25;
        dados = valores.map((valor, indice) => {
          const dado = gltf.scene.clone(true);
          dado.scale.setScalar(escala);
          const final = usaMao
            ? posicaoFinal(indice, valores.length)
            : new THREE.Vector3((indice - (valores.length - 1) / 2) * espacamento, 0, 0);
          const inicial = usaMao
            ? new THREE.Vector3((indice % 3 - 1) * 0.32, 1.2 + Math.floor(indice / 3) * 0.22, 0.45)
            : final.clone();
          dado.position.copy(inicial);
          scene.add(dado);
          dado.updateMatrixWorld(true);
          const face = dado.getObjectByName(`Face_${String(valor).padStart(2, '0')}`);
          let alvo = new THREE.Quaternion();
          if (face) {
            const corpo = dado.getObjectByName('D20_Allies_Leo');
            const centro = corpo?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3();
            const normal = face.getWorldPosition(new THREE.Vector3()).sub(centro).normalize();
            alvo = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 0, 1));
          }
          dado.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
          return { dado, alvo, inicial, final };
        });
        if (usaMao) {
          mestre = criarMestre();
          scene.add(mestre.grupo);
          timerResultados = window.setTimeout(() => setMostrarResultados(true), DURACAO_MAO + DURACAO_QUEDA);
        }
        inicio = performance.now();
        frame = requestAnimationFrame(animar);
      },
      undefined,
      () => onClose()
    );

    function animar(agora) {
      if (!dados.length || cancelado) return;
      const decorrido = agora - inicio;
      const usaMao = dados.length > 3;

      if (usaMao && decorrido < DURACAO_MAO) {
        const pulso = Math.sin(decorrido / 65);
        mestre.braco.rotation.z = -0.72 + pulso * 0.13;
        mestre.braco.rotation.x = Math.cos(decorrido / 90) * 0.06;
        dados.forEach(({ dado, inicial }, indice) => {
          const angulo = decorrido / 125 + indice * (Math.PI * 2 / dados.length);
          dado.position.copy(inicial).add(new THREE.Vector3(Math.cos(angulo) * 0.28, Math.sin(angulo) * 0.18, 0));
          dado.rotateX(0.13 + indice * 0.006);
          dado.rotateY(0.18 + indice * 0.008);
        });
      } else if (usaMao && decorrido < DURACAO_MAO + DURACAO_QUEDA) {
        const t = (decorrido - DURACAO_MAO) / DURACAO_QUEDA;
        const queda = suavizar(t);
        mestre.braco.rotation.z = -0.72 + queda * 1.35;
        mestre.braco.rotation.x = -queda * 0.22;
        dados.forEach(({ dado, inicial, final }, indice) => {
          dado.position.lerpVectors(inicial, final, queda);
          dado.position.y += Math.sin(Math.PI * t) * (0.9 + indice * 0.08);
          dado.rotateX(0.2 * (1 - t));
          dado.rotateY(0.25 * (1 - t));
        });
      } else if (!usaMao && decorrido < DURACAO_GIRO) {
        const freio = 1 - decorrido / DURACAO_GIRO;
        dados.forEach(({ dado }, indice) => {
          dado.rotateX((0.15 + indice * 0.012) * (0.35 + freio));
          dado.rotateY((0.21 + indice * 0.015) * (0.35 + freio));
          dado.rotateZ(0.09 * freio);
          dado.position.y = Math.sin(decorrido / 145 + indice) * 0.16;
        });
      } else {
        if (mestre) mestre.braco.visible = false;
        if (!inicioPouso) inicioPouso = agora;
        const t = Math.min(1, (agora - inicioPouso) / DURACAO_POUSO);
        dados.forEach(({ dado, alvo }) => {
          dado.quaternion.slerp(alvo, suavizar(t));
          dado.position.y *= 0.82;
        });
      }

      renderer.render(scene, camera);
      frame = requestAnimationFrame(animar);
    }

    return () => {
      cancelado = true;
      window.clearTimeout(timerResultados);
      cancelAnimationFrame(frame);
      renderer.dispose();
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
        const materiais = Array.isArray(obj.material) ? obj.material : [obj.material];
        materiais.filter(Boolean).forEach((mat) => mat.dispose?.());
      });
    };
  }, [rolagem, onClose]);

  if (!rolagem) return null;
  const { d20 } = rolagem;

  return (
    <div className="dado3d-overlay" role="status" aria-live="polite">
      <div className="dado3d-brilho" />
      <canvas ref={canvasRef} className="dado3d-canvas" />
      {d20.multiplos && mostrarResultados && (
        <div className="dado3d-valores" aria-label="Resultados individuais">
          {d20.valores.slice(0, 6).map((valor, indice) => (
            <span key={`${indice}-${valor}`}>Dado {indice + 1}: <strong>{valor}</strong></span>
          ))}
        </div>
      )}
      <div className={`dado3d-resultado${mostrarResultados ? '' : ' is-oculto'}`}>
        <span>{rolagem.titulo || 'd20'}</span>
        <strong className={d20.critico ? 'is-critico' : d20.falha ? 'is-falha' : ''}>
          {d20.total}
        </strong>
        {d20.valores?.length > 1 && (
          <small>
            {d20.valores.join(' / ')} · {d20.multiplos ? 'soma' : d20.modo}
          </small>
        )}
      </div>
      <button className="dado3d-fechar" onClick={onClose} aria-label="Fechar animação do dado">
        ×
      </button>
    </div>
  );
}
