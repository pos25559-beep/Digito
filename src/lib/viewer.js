import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as E from './engine.js';

/** Visualizador 3D com iluminação de estúdio, sombra de contacto e render a pedido. */
export function makeViewer(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: !!opts.transparent, preserveDrawingBuffer: !!opts.preserve });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  if (!opts.transparent) scene.background = new THREE.Color(opts.bg || '#d9d6cf');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(opts.fov || 28, 1, 1, 5000);
  camera.position.set(...(opts.cam || [150, 60, 320]));
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
  controls.minDistance = opts.minD || 60; controls.maxDistance = opts.maxD || 900;
  if (opts.noZoom) controls.enableZoom = false;
  const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
  key.position.set(140, 260, 220); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -170, right: 170, top: 170, bottom: -170, near: 10, far: 900 });
  key.shadow.radius = 8; key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 1.1); rim.position.set(-220, 80, -160); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc9bd, 0.5));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.ShadowMaterial({ opacity: opts.shadow ?? 0.16 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const root = new THREE.Group(); scene.add(root);
  let dirty = true, auto = !!opts.autoRotate, raf = 0, visible = true, alive = true;
  controls.addEventListener('change', () => { dirty = true; });
  controls.addEventListener('start', () => { auto = false; });
  const resize = () => {
    const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); dirty = true;
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }); io.observe(canvas);
  const anims = new Set();
  const loop = t => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    if (auto) { root.rotation.y += opts.spin || 0.0035; dirty = true; }
    anims.forEach(a => { if (a(t) === false) anims.delete(a); dirty = true; });
    if (controls.update()) dirty = true;
    if (dirty) { renderer.render(scene, camera); dirty = false; }
  };
  raf = requestAnimationFrame(loop);
  return {
    THREE, renderer, scene, camera, controls, root, ground, key,
    invalidate() { dirty = true; }, animate(fn) { anims.add(fn); }, setAuto(v) { auto = v; dirty = true; }, resize,
    dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); controls.dispose(); disposeGroup(root); renderer.dispose(); pmrem.dispose(); }
  };
}
export function disposeGroup(g) { g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); g.clear(); }

const tuned = new WeakSet();
export function meshOf(geom, mat) {
  if (!tuned.has(mat) && mat.envMapIntensity !== undefined) { mat.envMapIntensity = mat.metalness > 0.5 ? 1.0 : 0.5; tuned.add(mat); }
  const m = new THREE.Mesh(geom, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
export function makeMats() {
  return {
    case: new THREE.MeshPhysicalMaterial({ color: '#1f2124', roughness: 0.82, metalness: 0, sheen: 0.5, sheenRoughness: 0.8, sheenColor: new THREE.Color('#44474c') }),
    phone: new THREE.MeshPhysicalMaterial({ color: '#2e3034', roughness: 0.3, metalness: 0.6, clearcoat: 0.7, clearcoatRoughness: 0.18 }),
    lensRing: new THREE.MeshStandardMaterial({ color: '#8a8e94', roughness: 0.28, metalness: 1 }),
    lens: new THREE.MeshPhysicalMaterial({ color: '#06070a', roughness: 0.05, metalness: 0.2, clearcoat: 1 }),
    accent: new THREE.MeshStandardMaterial({ color: '#E9A23B', roughness: 0.35, metalness: 0.6 })
  };
}
export function gripMaterial(id) {
  const M = E.MATERIALS[id];
  if (M.metal) return new THREE.MeshPhysicalMaterial({ color: '#b2b5ba', roughness: 0.3, metalness: 1 });
  if (id === 'SLA_TOUGH') return new THREE.MeshPhysicalMaterial({ color: '#2d3440', roughness: 0.25, metalness: 0, clearcoat: 0.6 });
  if (id === 'SLS_PA12') return new THREE.MeshStandardMaterial({ color: '#4a4b4e', roughness: 0.95, metalness: 0 });
  return new THREE.MeshStandardMaterial({ color: '#34363a', roughness: 0.6, metalness: 0.05 });
}
