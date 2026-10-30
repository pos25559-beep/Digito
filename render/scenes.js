import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as E from '/src/lib/engine.js';
import * as G from '/src/lib/geometry.js';
const q = new URLSearchParams(location.search);
const W = +q.get('w') || 1920, H = +q.get('h') || 1080, scene = q.get('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
document.body.appendChild(renderer.domElement);
const S = new THREE.Scene();
const pm = new THREE.PMREMGenerator(renderer);
S.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
const cam = new THREE.PerspectiveCamera(30, W / H, 1, 5000);

/* ---------- utilidades de fatiagem ---------- */
function worldGeoms(obj) { const out = []; obj.updateMatrixWorld(true); obj.traverse(o => { if (o.isMesh) { const g = o.geometry.clone().applyMatrix4(o.matrixWorld); out.push(g); } }); return out; }
function sliceSegs(geoms, z) {
  const segs = [];
  geoms.forEach(g => { const p = g.attributes.position.array, ix = g.index ? g.index.array : null, n = ix ? ix.length : p.length / 3;
    for (let i = 0; i < n; i += 3) {
      const v = [0, 1, 2].map(k => { const j = (ix ? ix[i + k] : i + k) * 3; return [p[j], p[j + 1], p[j + 2]]; });
      const pts = [];
      for (let k = 0; k < 3; k++) { const a = v[k], b = v[(k + 1) % 3]; if ((a[1] - z) * (b[1] - z) < 0) { const t = (z - a[1]) / (b[1] - a[1]); pts.push([a[0] + t * (b[0] - a[0]), a[2] + t * (b[2] - a[2])]); } }
      if (pts.length === 2) segs.push(pts);
    } });
  return segs;
}
// liga segmentos em percursos contínuos (perímetros)
function chain(segs) {
  const key = p => Math.round(p[0] * 50) + ',' + Math.round(p[1] * 50), map = new Map();
  segs.forEach((s, i) => [0, 1].forEach(e => { const k = key(s[e]); if (!map.has(k)) map.set(k, []); map.get(k).push([i, e]); }));
  const used = new Uint8Array(segs.length), paths = [];
  for (let i = 0; i < segs.length; i++) { if (used[i]) continue; used[i] = 1; const path = [segs[i][0], segs[i][1]]; let cur = segs[i][1];
    for (let guard = 0; guard < 5000; guard++) { const c = (map.get(key(cur)) || []).find(([j]) => !used[j]); if (!c) break; used[c[0]] = 1; const nxt = segs[c[0]][1 - c[1]]; path.push(nxt); cur = nxt; }
    if (path.length > 3) paths.push(path); }
  return paths;
}
function hatch(segs, ang, sp) {
  const c = Math.cos(ang), s = Math.sin(ang), rot = p => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c], un = p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  const R = segs.map(([a, b]) => [rot(a), rot(b)]); let y0 = Infinity, y1 = -Infinity; R.forEach(([a, b]) => { y0 = Math.min(y0, a[1], b[1]); y1 = Math.max(y1, a[1], b[1]); });
  const lines = []; let flip = false;
  for (let y = y0 + sp / 2; y < y1; y += sp) { const xs = []; R.forEach(([a, b]) => { if ((a[1] - y) * (b[1] - y) < 0) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }); xs.sort((m, n) => m - n);
    const row = []; for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > 0.4) row.push([un([xs[i] + 0.2, y]), un([xs[i + 1] - 0.2, y])]);
    if (flip) row.reverse().forEach(r => r.reverse()); flip = !flip; row.forEach(r => lines.push(r)); }
  return lines;
}

/* ---------- camadas sólidas a partir dos contornos (aspeto real de FDM) ---------- */
function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return a / 2; }
function inside(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) c = !c; } return c; }
function layerShapes(loops) {
  loops = loops.filter(l => Math.abs(area(l)) > 0.3).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  const depth = loops.map((l, i) => loops.slice(0, i).filter(o => inside(l[0], o)).length);
  const shapes = [];
  loops.forEach((l, i) => { if (depth[i] % 2) return; const pts = area(l) < 0 ? l.slice().reverse() : l; const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1])));
    loops.forEach((h, j) => { if (depth[j] === depth[i] + 1 && inside(h[0], l)) { const hp = area(h) > 0 ? h.slice().reverse() : h; sh.holes.push(new THREE.Path(hp.map(p => new THREE.Vector2(p[0], -p[1])))); } });
    shapes.push(sh); });
  return shapes;
}
function buildLayers(geomsList, LH, top) {
  const NL = Math.ceil(top / LH), layers = [];
  for (let l = 0; l < NL; l++) {
    const z = (l + 0.5) * LH, slabs = [], path = [];
    geomsList.forEach(gs => { const segs = sliceSegs(gs, z); const loops = chain(segs); loops.forEach(p => { path.push({ x: p[0][0], y: p[0][1], ex: 0 }); p.forEach(v => path.push({ x: v[0], y: v[1], ex: 1 })); });
      layerShapes(loops).forEach(sh => { const g = new THREE.ExtrudeGeometry(sh, { depth: LH * 0.96, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); g.translate(0, l * LH, 0); slabs.push(g); }); });
    layers.push({ z, path, slabs });
  }
  return layers;
}
/* ---------- tampas por stencil (secção sólida no plano de corte) ---------- */
function clippedWithCaps(geoms, mat, plane, capColor, group, order) {
  geoms.forEach((g, i) => {
    const base = new THREE.Group(); group.add(base);
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; base.add(m);
    const back = new THREE.MeshBasicMaterial({ side: THREE.BackSide, clippingPlanes: [plane], depthWrite: false, depthTest: false, colorWrite: false, stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilFail: THREE.IncrementWrapStencilOp, stencilZFail: THREE.IncrementWrapStencilOp, stencilZPass: THREE.IncrementWrapStencilOp });
    const front = back.clone(); front.side = THREE.FrontSide; front.stencilFail = front.stencilZFail = front.stencilZPass = THREE.DecrementWrapStencilOp;
    const mb = new THREE.Mesh(g, back); mb.renderOrder = order + i * 3; base.add(mb);
    const mf = new THREE.Mesh(g, front); mf.renderOrder = order + i * 3; base.add(mf);
    const capMat = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.55, metalness: 0, emissive: new THREE.Color('#ff5a10'), emissiveIntensity: 0.0, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp });
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), capMat); cap.rotation.x = -Math.PI / 2; cap.renderOrder = order + i * 3 + 1.1; cap.onAfterRender = r => r.clearStencil(); cap.userData.cap = true;
    group.add(cap); group.userData.caps = (group.userData.caps || []).concat(cap);
  });
}
/* ---------- impressora: mesa, cabeça, bico ---------- */
function printer(bedColor = '#1d1f22') {
  const g = new THREE.Group();
  const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d'); x.fillStyle = bedColor; x.fillRect(0, 0, 1024, 1024); for (let i = 0; i < 60000; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; x.fillRect(Math.random() * 1024, Math.random() * 1024, 1.5, 1.5); } x.strokeStyle = 'rgba(233,162,59,.07)'; x.lineWidth = 1; for (let i = 0; i <= 1024; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 1024); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(1024, i); x.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t; })();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(600, 4, 600), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.15, envMapIntensity: 0.25 })); bed.position.y = -2; bed.receiveShadow = true; g.add(bed);
  const head = new THREE.Group();
  const alu = new THREE.MeshStandardMaterial({ color: '#b9bcc2', roughness: 0.35, metalness: 1 });
  const brass = new THREE.MeshStandardMaterial({ color: '#d9a441', roughness: 0.25, metalness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.5, metalness: 0.4 });
  const block = new THREE.Mesh(new THREE.BoxGeometry(20, 11, 16), alu); block.position.y = 14.5 + 6; head.add(block);
  const sock = new THREE.Mesh(new THREE.BoxGeometry(21.5, 12, 17.5), new THREE.MeshStandardMaterial({ color: '#3b3d41', roughness: 0.9 })); sock.position.y = 20.5; sock.scale.set(1, 1, 1); head.add(sock);
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 3.2, 5, 6), brass); nz.position.y = 2.5 + 3; head.add(nz);
  const nz2 = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 3, 6), brass); nz2.position.y = 9.5; head.add(nz2);
  const heat = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 30, 24), dark); heat.position.y = 42; head.add(heat);
  for (let i = 0; i < 9; i++) { const fin = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 1.2, 32), alu); fin.position.y = 32 + i * 2.6; head.add(fin); }
  const glow = new THREE.PointLight(0xff7a2a, 0, 40, 2); glow.position.y = 1.5; head.add(glow); head.userData.glow = glow;
  head.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  g.add(head); g.userData.head = head;
  return g;
}
function lights(intensity = 1) {
  const key = new THREE.DirectionalLight(0xfff2e0, 3.0 * intensity); key.position.set(160, 260, 140); key.castShadow = true; key.shadow.mapSize.set(4096, 4096); Object.assign(key.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 10, far: 900 }); key.shadow.radius = 4; key.shadow.bias = -0.0003; S.add(key);
  const rim = new THREE.DirectionalLight(0xbcd2ff, 2.0 * intensity); rim.position.set(-200, 120, -220); S.add(rim);
  S.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.35 * intensity));
  return key;
}
function phoneObj(type = 'case') {}
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ======================= CENAS ======================= */
const SC = {};
// ---- impressão de pegas (hero) ----
SC.hero = () => {
  S.background = new THREE.Color('#060708'); S.fog = new THREE.Fog('#060708', 160, 420); renderer.toneMappingExposure = 1.0;
  lights(1.1);
  const pr = printer('#121315'); S.add(pr); const head = pr.userData.head;
  const hand = E.estimateHand({ heightCm: 176, sex: 'M' }), ph = E.PHONES.IPHONE_16_PRO_MAX, socks = E.sockets(hand, ph, 'FULL_4_FINGER');
  const geomsList = socks.map((s, i) => { const gp = G.gripParts({ ...s, theta: 0 }, 'sela', 'FDM_PETG_CF'); const grp = new THREE.Group(); gp.parts.forEach(g => grp.add(new THREE.Mesh(g))); grp.rotation.x = -Math.PI / 2; grp.rotation.z = 0.2; grp.position.set(-39 + i * 26, G.consts.PLUG_H, (i % 2) * 6); const t = new THREE.Group(); t.add(grp); return worldGeoms(t); });
  let top = 0; geomsList.flat().forEach(g => { g.computeBoundingBox(); top = Math.max(top, g.boundingBox.max.y); });
  const LH = 0.2, layers = buildLayers(geomsList, LH, top), NL = layers.length;
  const mat = new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.58, metalness: 0.08 });
  const hotMat = new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.4, emissive: new THREE.Color('#ff6a1a'), emissiveIntensity: 0.9 });
  const meshes = layers.map(L => { const grp = new THREE.Group(); L.slabs.forEach(g => { const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; grp.add(m); }); grp.visible = false; S.add(grp); return grp; });
  const lineGeo = new THREE.BufferGeometry(); S.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: '#ffc070' })));
  const FR = +q.get('frames') || 300;
  return f => {
    const t = f / FR, prog = Math.min(0.999, t * 1.02) * NL, L = Math.floor(prog), lt = prog - L, lay = layers[Math.min(L, NL - 1)];
    meshes.forEach((m, i) => { m.visible = i < L; m.children.forEach(c => { c.material = i === L - 1 ? hotMat : mat; }); });
    hotMat.emissiveIntensity = 0.32;
    const n = Math.max(1, Math.floor(lt * (lay.path.length - 1))), pts = [];
    for (let i = 1; i <= n; i++) { const a = lay.path[i - 1], b = lay.path[i]; if (b.ex) pts.push(a.x, lay.z + 0.08, a.y, b.x, lay.z + 0.08, b.y); }
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts.length ? pts : [0, 0, 0, 0, 0, 0], 3));
    const p = lay.path[n] || lay.path[0]; head.position.set(p.x, lay.z + 0.25, p.y); head.userData.glow.intensity = 60;
    const a = -0.9 + ease(t) * 1.1; cam.position.set(Math.sin(a) * 92, 30 + 8 * Math.sin(t * 3.1), Math.cos(a) * 92); cam.lookAt(0, 6, 0);
  };
};
// ---- impressão da capa ----
SC.print = () => {
  S.background = new THREE.Color('#F8F9FA'); S.fog = new THREE.Fog('#F8F9FA', 300, 760); S.add(new THREE.HemisphereLight(0xffffff, 0xd0d4da, 1.1)); renderer.toneMappingExposure = 1.0;
  lights(1.1);
  const pr = printer('#E8EAED'); S.add(pr); const head = pr.userData.head;
  const ph = E.PHONES.IPHONE_16_PRO, hand = E.estimateHand({ heightCm: 172 }), socks = E.sockets(hand, ph, 'PINKY_SHELF'), imp = E.impact({ phone: ph, h: 1.2 });
  const b = G.build({ phone: ph, socks, types: ['sela', 'sela', 'sela', 'sela'], gripMat: 'FDM_PETG_CF', tSide: imp.tSide, tCorner: imp.tCorner });
  const geomsList = b.caseParts.map(g => { const t = new THREE.Group(); const grp = new THREE.Group(); grp.add(new THREE.Mesh(g)); grp.rotation.x = Math.PI / 2; grp.position.y = G.consts.BACK + G.consts.BOSS_H; const r = new THREE.Group(); r.rotation.y = Math.PI / 2; r.add(grp); t.add(r); return worldGeoms(t); });
  let top = 0; geomsList.flat().forEach(g => { g.computeBoundingBox(); top = Math.max(top, g.boundingBox.max.y); });
  const LH = 0.3, layers = buildLayers(geomsList, LH, top), NL = layers.length;
  const mat = new THREE.MeshPhysicalMaterial({ color: '#4A4F55', roughness: 0.78 });
  const hotMat = new THREE.MeshStandardMaterial({ color: '#1A73E8', roughness: 0.5, emissive: new THREE.Color('#1A73E8'), emissiveIntensity: 0.15 });
  const meshes = layers.map(L => { const grp = new THREE.Group(); L.slabs.forEach(g => { const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; grp.add(m); }); grp.visible = false; S.add(grp); return grp; });
  const lineGeo = new THREE.BufferGeometry(); S.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: '#1A73E8' })));
  const FR = +q.get('frames') || 300;
  return f => {
    const t = f / FR, prog = Math.min(0.999, t) * NL, L = Math.floor(prog), lt = prog - L, lay = layers[Math.min(L, NL - 1)];
    meshes.forEach((m, i) => { m.visible = i < L; m.children.forEach(c => { c.material = i === L - 1 ? hotMat : mat; }); });
    const n = Math.max(1, Math.floor(lt * (lay.path.length - 1))), pts = [];
    for (let i = 1; i <= n; i++) { const a = lay.path[i - 1], bb = lay.path[i]; if (bb.ex) pts.push(a.x, lay.z + 0.08, a.y, bb.x, lay.z + 0.08, bb.y); }
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts.length ? pts : [0, 0, 0, 0, 0, 0], 3));
    const p = lay.path[n] || lay.path[0]; head.position.set(p.x, lay.z + 0.3, p.y); head.userData.glow.intensity = 0;
    const a = 0.35 + ease(t) * 0.8; cam.position.set(Math.sin(a) * 175, 95 - t * 35, Math.cos(a) * 175); cam.lookAt(0, 3, 0);
  };
};
// ---- geração: pega a mudar com a largura do dedo ----
SC.generate = () => {
  S.background = new THREE.Color('#F8F9FA'); renderer.toneMappingExposure = 1.0; lights(1); S.add(new THREE.HemisphereLight(0xffffff, 0xd0d4da, 1.0));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.ShadowMaterial({ opacity: 0.14 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(40, 42, 3, 96), new THREE.MeshStandardMaterial({ color: '#E8EAED', roughness: 0.5, metalness: 0.1 })); disc.position.y = 1.5; disc.receiveShadow = true; S.add(disc);
  const grp = new THREE.Group(); S.add(grp);
  const mat = new THREE.MeshStandardMaterial({ color: '#4A4F55', roughness: 0.6, metalness: 0.05 });
  const wire = new THREE.LineBasicMaterial({ color: '#1A73E8', transparent: true, opacity: 0.5 });
  const dim = new THREE.Group(); S.add(dim);
  const FR = +q.get('frames') || 240;
  return f => {
    const t = f / FR, w = 19 + 4 * Math.sin(t * Math.PI * 2);
    const fr = E.fingerRecord(w, 20.4 * w / 18.6);
    const gp = G.gripParts({ finger: 'middle', role: 'dorsal', x: 0, y: 0, theta: 0, ...fr }, 'sela', 'FDM_PETG_CF');
    grp.children.forEach(c => c.geometry.dispose()); grp.clear();
    gp.parts.forEach(g => { const m = new THREE.Mesh(g, mat); m.castShadow = true; grp.add(m); const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), wire); grp.add(e); });
    grp.rotation.set(-Math.PI / 2, 0, t * Math.PI * 2 * 0.5); grp.position.y = 3 + G.consts.PLUG_H; grp.scale.setScalar(2.2);
    dim.clear(); const Wp = E.clamp(0.9 * w, 13, 22) * 2.2 / 2, yv = 34, zz = 0;
    const P = [[-Wp, yv, zz], [Wp, yv, zz], [-Wp, yv - 4, zz], [-Wp, yv + 4, zz], [Wp, yv - 4, zz], [Wp, yv + 4, zz]].map(v => new THREE.Vector3(...v));
    dim.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(P), new THREE.LineBasicMaterial({ color: '#202124' })));
    window.__w = w;
    cam.position.set(0, 70, 120); cam.lookAt(0, 12, 0);
  };
};
// ---- fotografias de produto ----
SC.product = () => {
  const kind = q.get('kind');
  S.background = new THREE.Color('#ffffff'); renderer.toneMappingExposure = 1.1;
  const key = lights(1.05); key.shadow.radius = 10;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.16 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor);
  const hand = E.estimateHand({ heightCm: 176 }), ph = E.PHONES.IPHONE_16_PRO, socks = E.sockets(hand, ph, 'FULL_4_FINGER'), imp = E.impact({ phone: ph, h: 1.2 });
  const pet = new THREE.MeshStandardMaterial({ color: '#2f3135', roughness: 0.6, metalness: 0.05, envMapIntensity: 0.6 });
  const pa = new THREE.MeshStandardMaterial({ color: '#4b4c4f', roughness: 0.95, envMapIntensity: 0.5 });
  const ti = new THREE.MeshPhysicalMaterial({ color: '#b6b9be', roughness: 0.28, metalness: 1 });
  const tpu = new THREE.MeshPhysicalMaterial({ color: '#202225', roughness: 0.85, sheen: 0.5, sheenColor: new THREE.Color('#44474c'), envMapIntensity: 0.5 });
  const add = (geoms, m, pos, rot) => { const g = new THREE.Group(); geoms.forEach(x => { const me = new THREE.Mesh(x, m); me.castShadow = true; me.receiveShadow = true; g.add(me); }); g.position.set(...pos); g.rotation.set(...rot); S.add(g); return g; };
  const grip = (type, i = 0) => G.gripParts({ ...socks[i], theta: 0 }, type, 'FDM_PETG_CF').parts;
  if (kind === 'capa') { const b = G.build({ phone: ph, socks, types: ['sela', 'sela', 'sela', 'sela'], gripMat: 'FDM_PETG_CF', tSide: imp.tSide, tCorner: imp.tCorner }); add(b.caseParts, tpu, [0, 10, 0], [-Math.PI / 2 + 0.0, 0, 0.35]); b.grips.slice(0, 2).forEach((gr, i) => add(gr.parts, pet, [70 + i * 22, G.consts.PLUG_H, 40 - i * 30], [-Math.PI / 2, 0, 0.4])); cam.position.set(70, 300, 250); cam.lookAt(18, 0, 0); }
  if (kind === 'sela') { [0, 1, 2, 3].forEach(i => add(grip('sela', i), pet, [-36 + i * 24, G.consts.PLUG_H, (i % 2) * 10 - 5], [-Math.PI / 2, 0, Math.PI / 2 + 0.25])); cam.position.set(16, 160, 150); cam.lookAt(0, 4, 0); }
  if (kind === 'anel') { add(grip('ring', 1), pa, [0, G.consts.PLUG_H, 0], [-Math.PI / 2, 0, -0.9]); cam.position.set(52, 34, 46); cam.lookAt(0, 13, 0); }
  if (kind === 'tampa') { [0, 1, 2, 3].forEach(i => add(grip('blank'), pet, [-21 + i * 14, G.consts.PLUG_H, (i % 2) * 6], [i % 2 ? Math.PI / 2 : -Math.PI / 2, 0, i * 0.5])); cam.position.set(10, 62, 78); cam.lookAt(0, 1, 0); }
  if (kind === 'imanes') { const nm = new THREE.MeshPhysicalMaterial({ color: '#8f9499', roughness: 0.22, metalness: 1, envMapIntensity: 0.7 }); for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 2, 48), nm); c.castShadow = true; c.position.set(-12 + (i % 4) * 8, 1 + (i > 5 ? 2 : 0), i < 4 ? -5 : 5); if (i > 5) c.position.x = -2 + (i - 6) * 7; S.add(c); } cam.position.set(18, 46, 56); cam.lookAt(0, 1, 0); }
  if (kind === 'titanio') { add(grip('sela', 1), ti, [0, G.consts.PLUG_H, 0], [-Math.PI / 2, 0, 0.5]); cam.position.set(32, 34, 46); cam.lookAt(0, 5, 0); }
  return () => {};
};
const step = SC[scene]();
cam.aspect = W / H; cam.updateProjectionMatrix();
window.renderFrame = f => { step(f); renderer.render(S, cam); return renderer.domElement.toDataURL('image/jpeg', 0.93); };
window.ready = true;
