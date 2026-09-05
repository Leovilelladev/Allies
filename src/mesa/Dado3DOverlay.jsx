import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const DURACAO_FISICA = 1900;
const DURACAO_POUSO = 520;

function suavizar(t) { return 1 - Math.pow(1 - t, 4); }

function escalaPara(qtd) {
  if (qtd === 1) return 0.36;
  if (qtd === 2) return 0.29;
  if (qtd === 3) return 0.25;
  return 0.21;
}

export default function Dado3DOverlay({ rolagem, onClose, transformacaoMapa }) {
  const canvasRef = useRef(null);
  const transformacaoRef = useRef(transformacaoMapa);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  transformacaoRef.current = transformacaoMapa;

  useEffect(() => {
    if (!rolagem || !canvasRef.current) return undefined;
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 8.8);
    scene.add(new THREE.HemisphereLight(0x9adfff, 0x07101f, 2.25));
    const luz = new THREE.DirectionalLight(0xffc56f, 4.2);
    luz.position.set(4, -3, 6);
    scene.add(luz);
    const recorte = new THREE.DirectionalLight(0x20d9d0, 3.4);
    recorte.position.set(-5, 2, 3);
    scene.add(recorte);

    let frame = 0;
    let dados = [];
    let inicio = 0;
    let ultimoQuadro = 0;
    let cancelado = false;
    let timer = 0;
    const largura = canvasRef.current.parentElement?.clientWidth || 900;
    const altura = canvasRef.current.parentElement?.clientHeight || 600;
    renderer.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();

    const zBase = camera.position.z;
    const alturaMundo3D = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * zBase;
    const unidadePorPixel = alturaMundo3D / altura;
    const transformarCamera = () => {
      const atual = transformacaoRef.current || {};
      const zoom = Number(atual.scale) || 1;
      const pos = atual.stagePos || { x: 0, y: 0 };
      camera.position.x = ((largura / 2 - pos.x) / zoom) * unidadePorPixel;
      camera.position.y = -((altura / 2 - pos.y) / zoom) * unidadePorPixel;
      camera.position.z = zBase / zoom;
      camera.updateProjectionMatrix();
      return { zoom, centroX: camera.position.x, centroY: camera.position.y };
    };
    const cameraInicial = transformarCamera();
    const limiteY = alturaMundo3D / (2 * cameraInicial.zoom) - 0.5;
    const limiteX = limiteY * camera.aspect - 0.5;

    const mundo = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, -18) });
    mundo.allowSleep = true;
    mundo.broadphase = new CANNON.SAPBroadphase(mundo);
    const materialDado = new CANNON.Material('dado');
    const materialMesa = new CANNON.Material('mesa');
    mundo.addContactMaterial(new CANNON.ContactMaterial(materialDado, materialMesa, {
      friction: 0.34,
      restitution: 0.38,
    }));
    mundo.addContactMaterial(new CANNON.ContactMaterial(materialDado, materialDado, {
      friction: 0.22,
      restitution: 0.3,
    }));
    const mesa = new CANNON.Body({ mass: 0, material: materialMesa, shape: new CANNON.Plane() });
    mesa.position.z = -1.05;
    mundo.addBody(mesa);

    function adicionarParede(x, y, largura, altura) {
      const parede = new CANNON.Body({ mass: 0, material: materialMesa });
      parede.addShape(new CANNON.Box(new CANNON.Vec3(largura, altura, 1.8)));
      parede.position.set(x, y, 0.2);
      mundo.addBody(parede);
    }
    adicionarParede(cameraInicial.centroX - limiteX, cameraInicial.centroY, 0.08, limiteY + 0.4);
    adicionarParede(cameraInicial.centroX + limiteX, cameraInicial.centroY, 0.08, limiteY + 0.4);
    adicionarParede(cameraInicial.centroX, cameraInicial.centroY - limiteY, limiteX + 0.4, 0.08);
    adicionarParede(cameraInicial.centroX, cameraInicial.centroY + limiteY, limiteX + 0.4, 0.08);

    const modelos = rolagem.visual.modelos.slice(0, 20);
    const tipos = [...new Set(modelos.map(m => m.modelo))];
    const loader = new GLTFLoader();
    Promise.all(tipos.map(async tipo => [tipo, await loader.loadAsync(`/models/reliquia_leo/d${tipo}_leo.glb`)]))
    .then((carregados) => {
      if (cancelado) return;
      const assets = new Map(carregados);
      dados = modelos.map(({ modelo, face: valor }, indice) => {
        const gltf = assets.get(modelo);
        const dado = gltf.scene.clone(true);
        const escala = escalaPara(modelos.length);
        dado.scale.setScalar(escala);
        scene.add(dado);
        dado.updateMatrixWorld(true);
        const face = dado.getObjectByName(`Face_${String(valor).padStart(2, '0')}`);
        let alvo = new THREE.Quaternion();
        if (face) {
          const corpo = dado.getObjectByName('DiceBody');
          const centro = corpo?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3();
          if (face.userData.normal && face.userData.up) {
            const normal = new THREE.Vector3(...face.userData.normal).normalize();
            const up = new THREE.Vector3(...face.userData.up).normalize();
            const right = new THREE.Vector3().crossVectors(up, normal).normalize();
            alvo.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal)).invert();
          } else {
            alvo.setFromUnitVectors(face.getWorldPosition(new THREE.Vector3()).sub(centro).normalize(), new THREE.Vector3(0, 0, 1));
          }
        }
        const raio = escala * 1.62;
        const corpoFisico = new CANNON.Body({
          mass: 1,
          material: materialDado,
          shape: new CANNON.Sphere(raio),
          linearDamping: 0.18,
          angularDamping: 0.16,
          sleepSpeedLimit: 0.12,
          sleepTimeLimit: 0.4,
        });
        corpoFisico.position.set(
          cameraInicial.centroX + (Math.random() * 2 - 1) * limiteX * 0.62,
          cameraInicial.centroY + limiteY * (0.62 + Math.random() * 0.22),
          2.2 + Math.random() * 1.8
        );
        corpoFisico.velocity.set((Math.random() - 0.5) * 5.2, -2.8 - Math.random() * 3.2, -0.8 - Math.random());
        corpoFisico.angularVelocity.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);
        corpoFisico.quaternion.setFromEuler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        mundo.addBody(corpoFisico);
        return { dado, corpoFisico, alvo, posicaoPouso: null };
      });
      inicio = performance.now();
      ultimoQuadro = inicio;
      timer = window.setTimeout(() => setMostrarResultados(true), DURACAO_FISICA + DURACAO_POUSO - 80);
      frame = requestAnimationFrame(animar);
    }).catch(onClose);

    function animar(agora) {
      if (!dados.length || cancelado) return;
      const decorrido = agora - inicio;
      if (decorrido < DURACAO_FISICA) {
        const delta = Math.min((agora - ultimoQuadro) / 1000, 0.05);
        ultimoQuadro = agora;
        mundo.step(1 / 60, delta, 4);
        dados.forEach(({ dado, corpoFisico }) => {
          dado.position.copy(corpoFisico.position);
          dado.quaternion.copy(corpoFisico.quaternion);
        });
      } else {
        const t = Math.min(1, (decorrido - DURACAO_FISICA) / DURACAO_POUSO);
        dados.forEach((item) => {
          const { dado, alvo } = item;
          if (!item.posicaoPouso) item.posicaoPouso = dado.position.clone();
          dado.position.copy(item.posicaoPouso);
          dado.quaternion.slerp(alvo, suavizar(t));
        });
      }
      transformarCamera();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animar);
    }

    return () => {
      cancelado = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      renderer.dispose();
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
        const materiais = Array.isArray(obj.material) ? obj.material : [obj.material];
        materiais.filter(Boolean).forEach((material) => material.dispose?.());
      });
    };
  }, [rolagem, onClose]);

  const { d20, visual } = rolagem;
  return (
    <div className="dado3d-overlay dado3d-overlay--mapa" role="status" aria-live="polite">
      <canvas ref={canvasRef} className="dado3d-canvas" />
      <div className={`dado3d-resultado${mostrarResultados ? '' : ' is-oculto'}`}>
        <span>{rolagem.secreta ? 'Rolagem secreta' : rolagem.titulo || 'Dados'}</span>
        <strong className={d20?.critico ? 'is-critico' : d20?.falha ? 'is-falha' : ''}>{visual.total}</strong>
        <small>{visual.detalhe}</small>
        {visual.modelos.length > 20 && <small>Exibindo 20 de {visual.modelos.length} modelos; total completo acima.</small>}
      </div>
      <button className="dado3d-limpar" onClick={onClose}>Limpar dados</button>
    </div>
  );
}
