/* DÍGITO — gerador paramétrico (capa + pegas + telemóvel). mm, vista traseira: x→direita, y→cima, z→para fora das costas. */
import * as THREE from 'three';
import * as E from './engine.js';
const GAP = 0.10;           // folga entre telemóvel e parede interior (TPU, ligeiro aperto)
const BACK = 3.0;           // espessura da placa traseira: 0,8 interior + 1,0 média + 1,2 exterior (alvéolos)
const L_IN = 0.8, L_MID = 1.0, L_OUT = 1.2;
const BOSS_H = 1.5, BOSS_R = 9.0;
const HEX_AF = 10.0;        // abertura do encaixe hexagonal (entre faces)
const PLUG_H = 2.6;         // altura do macho hexagonal da pega
const MAG_D = 6.2, MAG_H = 2.1; // sede do íman Ø6×2 (N42)
const LIP_H = 1.0, LIP_IN = 1.0;
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/* ---------- contorno do telemóvel: retângulo arredondado amostrado por comprimento de arco ---------- */
function roundedRect(W, L, r, N) {
  const a = W / 2 - r, b = L / 2 - r, arc = Math.PI * r / 2;
  const segs = [
    { len: a, f: t => [t * a, -L / 2, 0, -1] },
    { len: arc, f: t => { const q = -Math.PI / 2 + t * Math.PI / 2; return [a + r * Math.cos(q), -b + r * Math.sin(q), Math.cos(q), Math.sin(q)]; }, corner: 0 },
    { len: 2 * b, f: t => [W / 2, -b + 2 * b * t, 1, 0] },
    { len: arc, f: t => { const q = t * Math.PI / 2; return [a + r * Math.cos(q), b + r * Math.sin(q), Math.cos(q), Math.sin(q)]; }, corner: 1 },
    { len: 2 * a, f: t => [a - 2 * a * t, L / 2, 0, 1] },
    { len: arc, f: t => { const q = Math.PI / 2 + t * Math.PI / 2; return [-a + r * Math.cos(q), b + r * Math.sin(q), Math.cos(q), Math.sin(q)]; }, corner: 2 },
    { len: 2 * b, f: t => [-W / 2, b - 2 * b * t, -1, 0] },
    { len: arc, f: t => { const q = Math.PI + t * Math.PI / 2; return [-a + r * Math.cos(q), -b + r * Math.sin(q), Math.cos(q), Math.sin(q)]; }, corner: 3 },
    { len: a, f: t => [-a + a * t, -L / 2, 0, -1] }
  ];
  const P = segs.reduce((s, g) => s + g.len, 0);
  // centro de arco de cada canto, em comprimento de arco
  const cornerS = []; let acc = 0;
  segs.forEach(g => { if (g.corner !== undefined) cornerS.push(acc + g.len / 2); acc += g.len; });
  const pts = [];
  for (let i = 0; i < N; i++) {
    let s = i / N * P, ss = s, k = 0;
    while (k < segs.length - 1 && ss > segs[k].len) { ss -= segs[k].len; k++; }
    const [x, y, nx, ny] = segs[k].f(segs[k].len ? ss / segs[k].len : 0);
    let dc = Infinity; cornerS.forEach(c => { const d = Math.min(Math.abs(s - c), P - Math.abs(s - c)); if (d < dc) dc = d; });
    pts.push({ x, y, nx, ny, s, dc });
  }
  return { pts, P };
}
function shapeFromPts(pts, off = 0, step = 2) {
  const xy = []; for (let i = 0; i < pts.length; i += step) { const p = pts[i]; xy.push([p.x + p.nx * off, p.y + p.ny * off]); }
  return polyPath(xy, false);
}
function rrPath(cx, cy, w, h, r, hole, n = 10) {
  r = Math.min(r, w / 2, h / 2); const xy = [];
  const cs = [[cx + w / 2 - r, cy - h / 2 + r, -Math.PI / 2], [cx + w / 2 - r, cy + h / 2 - r, 0], [cx - w / 2 + r, cy + h / 2 - r, Math.PI / 2], [cx - w / 2 + r, cy - h / 2 + r, Math.PI]];
  cs.forEach(([x, y, a0]) => { for (let k = 0; k <= n; k++) { const a = a0 + k / n * Math.PI / 2; xy.push([x + r * Math.cos(a), y + r * Math.sin(a)]); } });
  return polyPath(xy, hole);
}
function hexPath(cx, cy, af, rot, hole) {
  const R = af / Math.sqrt(3), xy = [];
  for (let i = 0; i < 6; i++) { const a = rot + Math.PI / 6 + i * Math.PI / 3; xy.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
  return polyPath(xy, hole);
}
// polígonos explícitos: contorno exterior anti-horário, furos horários, sem ponto final duplicado
function polyPath(xy, hole) {
  let area = 0; for (let i = 0; i < xy.length; i++) { const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length]; area += x1 * y2 - x2 * y1; }
  if ((area > 0) === !!hole) xy = xy.slice().reverse();
  const p = hole ? new THREE.Path() : new THREE.Shape();
  xy.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p;
}
function circlePath(cx, cy, r, hole, n = 48) { const xy = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; xy.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return polyPath(xy, hole); }
function extrude(shape, z0, depth, curveSegments = 24) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments });
  g.translate(0, 0, z0); return g;
}

/* ---------- parede: perfil varrido ao longo do contorno (lóbulos de canto + cortes em U) ---------- */
function wallGeometry(phone, tSide, tCorner) {
  const N = 360;
  const { pts, P } = roundedRect(phone.W, phone.L, phone.r, N);
  const T = phone.T, zTop = BACK, zBot = -(T + LIP_H), H = zTop - zBot;
  const f = 1.2; // raio dos arredondamentos
  const nz = 10;
  const notchK = pts.map(p => {
    let k = 0;
    phone.notches.forEach(n => {
      let along, on;
      if (n.side === 'bottom') { on = p.ny < -0.7; along = p.x; }
      else if (n.side === 'right') { on = p.nx > 0.7; along = p.y; }
      else { on = p.nx < -0.7; along = p.y; }
      if (!on) return;
      const d = Math.abs(along - n.c) - n.w / 2;
      k = Math.max(k, 1 - smooth(-1.5, 1.5, d));
    });
    return k;
  });
  const zCut = -1.4; // fundo do corte em U (mm abaixo das costas do telemóvel)
  const tw = (i, z) => {
    const psi = E.cornerPsi(pts[i].dc);
    const phi = Math.pow(Math.max(0, Math.sin(Math.PI * (zTop - z) / H)), 0.6);
    return tSide + (tCorner - tSide) * psi * phi;
  };
  const profile = i => {
    const pr = [];
    pr.push([GAP - 3.0, zTop]);
    // aresta traseira arredondada
    const tb = tw(i, zTop - f);
    for (let k = 0; k <= 4; k++) { const a = Math.PI / 2 - k / 4 * Math.PI / 2; pr.push([GAP + tb - f + f * Math.cos(a), zTop - f + f * Math.sin(a)]); }
    for (let k = 1; k < nz; k++) { const z = zTop - f - k / nz * (H - 2 * f); pr.push([GAP + tw(i, z), z]); }
    const tf = tw(i, zBot + f);
    for (let k = 0; k <= 4; k++) { const a = -k / 4 * Math.PI / 2; pr.push([GAP + tf - f + f * Math.cos(a), zBot + f + f * Math.sin(a)]); }
    pr.push([GAP - LIP_IN + 0.3, zBot]);
    pr.push([GAP - LIP_IN, zBot + 0.3]);
    pr.push([GAP - LIP_IN, -(T + 0.15)]);
    pr.push([GAP, -T + 0.5]);
    pr.push([GAP, 0]);
    pr.push([GAP - 3.0, 0]);
    // corte em U: tudo o que fica abaixo de zCut sobe até zCut; o lábio recolhe
    // (compressão afim com k ≤ 0,985: o perfil nunca degenera, a malha continua fechada)
    const k = Math.min(0.985, notchK[i]);
    if (k > 0) pr.forEach(q => { if (q[1] < zCut) { q[1] = q[1] + k * (zCut - q[1]); if (q[0] < GAP) q[0] = q[0] + k * 0.9 * (GAP - q[0]); } });
    return pr;
  };
  const rings = pts.map((p, i) => profile(i).map(([u, z]) => [p.x + p.nx * u, p.y + p.ny * u, z]));
  const M = rings[0].length;
  const pos = new Float32Array(N * M * 3);
  rings.forEach((ring, i) => ring.forEach((v, j) => pos.set(v, (i * M + j) * 3)));
  const idx = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = i * M + j, b = ((i + 1) % N) * M + j, c = ((i + 1) % N) * M + (j + 1) % M, d = i * M + (j + 1) % M;
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
  if (signedVolume(g) < 0) { const ix = g.index.array; for (let q = 0; q < ix.length; q += 3) { const t = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = t; } }
  g.computeVertexNormals();
  // volume de um lóbulo de canto (para a capacidade de energia): parede acima de t_lado, numa janela de ±22 mm
  const ds = P / N; let vLobe = 0;
  pts.forEach((p, i) => { if (p.dc < 22) { let acc = 0; for (let k = 0; k < 12; k++) { const z = zTop - (k + 0.5) / 12 * H; acc += tw(i, z); } vLobe += (acc / 12) * H * ds; } });
  return { geom: g, pts, cornerVol: vLobe / 4 };
}

/* ---------- placa traseira, alvéolos, bossas dos encaixes e proteção da câmara ---------- */
function backGeometries(phone, socks, pts) {
  const cb = E.camBox(phone), m = 1.2;
  const camHole = () => rrPath((cb.xmin + cb.xmax) / 2, (cb.ymin + cb.ymax) / 2, phone.camW + 2 * m, phone.camH + 2 * m, phone.camR + m, true);
  const s1 = shapeFromPts(pts, GAP - 0.6); s1.holes.push(camHole());
  const g1 = extrude(s1, 0, L_IN);
  const s2 = shapeFromPts(pts, GAP - 0.6); s2.holes.push(camHole());
  socks.forEach(s => s2.holes.push(circlePath(s.x, s.y, MAG_D / 2, true)));
  const g2 = extrude(s2, L_IN, L_MID);
  const s3 = shapeFromPts(pts, GAP - 0.6); s3.holes.push(camHole());
  socks.forEach(s => s3.holes.push(hexPath(s.x, s.y, HEX_AF, s.theta * Math.PI / 180, true)));
  // alvéolos hexagonais 2,5D (R = 3,0 mm, passo 7,27 mm)
  const R = 3.0, pitch = 7.27, inset = 5.0 + R;
  const inside = (x, y) => { // SDF do retângulo arredondado
    const rr = phone.r, qx = Math.abs(x) - (phone.W / 2 - rr), qy = Math.abs(y) - (phone.L / 2 - rr);
    const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
    return sd < -inset;
  };
  let cells = 0;
  for (let row = -14; row <= 14; row++) for (let col = -8; col <= 8; col++) {
    const x = col * pitch + (row & 1 ? pitch / 2 : 0), y = row * pitch * Math.sqrt(3) / 2;
    if (!inside(x, y)) continue;
    if (x > cb.xmin - m - R - 2.5 && x < cb.xmax + m + R + 2.5 && y > cb.ymin - m - R - 2.5 && y < cb.ymax + m + R + 2.5) continue;
    if (socks.some(s => Math.hypot(x - s.x, y - s.y) < BOSS_R + R + 1.5)) continue;
    s3.holes.push(hexPath(x, y, R * Math.sqrt(3), 0, true)); cells++;
  }
  const g3 = extrude(s3, L_IN + L_MID, L_OUT, 12);
  const bosses = socks.map(s => {
    const sh = circlePath(s.x, s.y, BOSS_R, false); sh.holes.push(hexPath(s.x, s.y, HEX_AF, s.theta * Math.PI / 180, true));
    return extrude(sh, BACK, BOSS_H, 40);
  });
  // proteção elevada à volta da câmara (bump + 0,8 mm)
  const gh = phone.bump - BACK + 0.8;
  const gs = rrPath((cb.xmin + cb.xmax) / 2, (cb.ymin + cb.ymax) / 2, phone.camW + 2 * m + 3.2, phone.camH + 2 * m + 3.2, phone.camR + m + 1.6, false);
  gs.holes.push(camHole());
  const guard = extrude(gs, BACK, gh);
  return { parts: [g1, g2, g3, guard, ...bosses], cells };
}

/* ---------- pegas ---------- */
// corpo em mapa de alturas sobre uma pegada em estádio (comprimento ao longo de x local)
function podBody(Lp, Wp, heightFn, edgeH = null, fillet = 0.12) {
  const NA = 72, NR = 14, a = Lp / 2, b = Wp / 2;
  // pegada em superelipse (n = 4): retângulo de cantos muito suaves, sem arestas vivas
  const rho = phi => { const c = Math.abs(Math.cos(phi)), s = Math.abs(Math.sin(phi)); return Math.pow(Math.pow(c / a, 4) + Math.pow(s / b, 4), -0.25); };
  const ring = []; for (let i = 0; i < NA; i++) { const phi = i / NA * Math.PI * 2; ring.push([Math.cos(phi) * rho(phi), Math.sin(phi) * rho(phi)]); }
  const pos = [], idx = [];
  const top = (x, y, r) => { const h = heightFn(x, y); const eh = edgeH == null ? Math.max(0.8, 0.55 * h) : edgeH; const e = r < 1 - fillet ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((r - (1 - fillet)) / fillet, 2))); return eh + (h - eh) * e; };
  pos.push(0, 0, top(0, 0, 0)); // polo
  for (let k = 1; k <= NR; k++) { const r = k / NR; ring.forEach(([x, y]) => pos.push(x * r, y * r, top(x * r, y * r, r))); }
  const vid = (k, i) => 1 + (k - 1) * NA + (i % NA);
  for (let i = 0; i < NA; i++) idx.push(0, vid(1, i), vid(1, i + 1));
  for (let k = 1; k < NR; k++) for (let i = 0; i < NA; i++) { const a1 = vid(k, i), b1 = vid(k + 1, i), c1 = vid(k + 1, i + 1), d1 = vid(k, i + 1); idx.push(a1, b1, c1, a1, c1, d1); }
  const base = pos.length / 3; ring.forEach(([x, y]) => pos.push(x, y, 0));
  for (let i = 0; i < NA; i++) { const a1 = vid(NR, i), b1 = base + i, c1 = base + (i + 1) % NA, d1 = vid(NR, i + 1); idx.push(a1, b1, c1, a1, c1, d1); }
  const ctr = pos.length / 3; pos.push(0, 0, 0);
  for (let i = 0; i < NA; i++) idx.push(ctr, base + (i + 1) % NA, base + i);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  if (signedVolume(g) < 0) flip(g);
  g.computeVertexNormals(); return g;
}
function plugGeometries(c) {
  const af = HEX_AF - 2 * c;
  const s1 = hexPath(0, 0, af, 0, false); s1.holes.push(circlePath(0, 0, MAG_D / 2, true));
  const g1 = extrude(s1, -PLUG_H, MAG_H, 32);
  const g2 = extrude(hexPath(0, 0, af, 0, false), -PLUG_H + MAG_H, PLUG_H - MAG_H);
  return [g1, g2];
}
/** Gera as peças de uma pega em coordenadas locais (encaixe na origem, topo da bossa em z = 0). */
export function gripParts(sock, type, mat) {
  const c = E.MATERIALS[mat].c, w = sock.w;
  const parts = plugGeometries(c);
  let extra = null;
  if (type === 'blank') {
    return { parts, extra, label: 'Tampa cega' };
  }
  if (type === 'ring') {
    const ped = podBody(15, 11, () => 3.0, 0.8, 0.35);
    const id = w + 1.2, band = 3.0, depth = 5.0, Ro = id / 2 + band;
    const ann = circlePath(0, 0, Ro, false); ann.holes.push(circlePath(0, 0, id / 2, true));
    const rg = new THREE.ExtrudeGeometry(ann, { depth, bevelEnabled: false });
    rg.translate(0, 0, -depth / 2); rg.rotateY(Math.PI / 2); rg.translate(0, 0, 2.2 + Ro);
    parts.push(ped, rg);
    return { parts, extra, label: 'Anel Ø' + id.toFixed(1) };
  }
  if (sock.role === 'shelf') {
    const Lp = E.clamp(1.3 * w, 18, 28), Wp = E.clamp(0.75 * w, 11, 16);
    parts.push(podBody(Lp, Wp, (x, y) => 4.0 + 3.0 * smooth(-0.15 * Wp, -0.5 * Wp, y) + 0.6 * Math.pow(x / (Lp / 2), 2)));
    return { parts, extra, label: 'Apoio do mindinho' };
  }
  // sela: calha côncava ao longo do dedo (eixo x), com a largura do dedo e raio R_s = w / (2·sin 72°);
  // paredes laterais de 2 mm e extremidades rebaixadas para o dedo entrar e sair
  const Lp = E.clamp(0.9 * w + 4, 18, 27), Wp = E.clamp(w + 4.5, 17, 31), Rs = Math.max(sock.rs, w / 2 + 0.3);
  const hp = E.clamp(0.36 * sock.d, 6.0, 9.5);
  const half = Math.min(w / 2, Wp / 2 - 1.2);
  const depth = Math.min(0.5 * hp, Rs - Math.sqrt(Math.max(0, Rs * Rs - half * half)));
  const groove = y => { const u = Math.min(1, Math.abs(y) / half); return depth * (1 - u * u) * (1 - 0.15 * u); };
  const fn = (x, y) => hp * (1 - 0.28 * Math.pow(x / (Lp / 2), 2)) - groove(y);
  parts.push(podBody(Lp, Wp, fn, null, 0.16));
  return { parts, extra, label: 'Sela R' + Rs.toFixed(1), Lp, Wp };
}

/* ---------- telemóvel (para pré-visualização) ---------- */
export function phoneGroup(phone, mats) {
  const g = new THREE.Group();
  const body = new THREE.ExtrudeGeometry(rrPath(0, 0, phone.W - 1.0, phone.L - 1.0, Math.max(1, phone.r - 0.5), false), { depth: phone.T - 1.0, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 4, curveSegments: 24 });
  body.translate(0, 0, -phone.T + 0.5);
  g.add(new THREE.Mesh(body, mats.phone));
  const cb = E.camBox(phone), cx = (cb.xmin + cb.xmax) / 2, cy = (cb.ymin + cb.ymax) / 2;
  const isl = new THREE.ExtrudeGeometry(rrPath(cx, cy, phone.camW, phone.camH, phone.camR, false), { depth: phone.bump - 0.6, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 3, curveSegments: 24 });
  g.add(new THREE.Mesh(isl, mats.phone));
  const lr = Math.min(phone.camW, phone.camH) * 0.2;
  const lenses = phone.camH > phone.camW * 0.8
    ? [[cb.xmin + phone.camW * 0.3, cb.ymax - phone.camH * 0.27], [cb.xmin + phone.camW * 0.3, cb.ymin + phone.camH * 0.27], [cb.xmin + phone.camW * 0.72, cy]]
    : [[cb.xmin + phone.camW * 0.2, cy], [cx, cy], [cb.xmin + phone.camW * 0.8, cy]];
  lenses.forEach(([x, y]) => {
    const ring = new THREE.CylinderGeometry(lr, lr, 1.2, 40); ring.rotateX(Math.PI / 2); ring.translate(x, y, phone.bump + 0.4);
    g.add(new THREE.Mesh(ring, mats.lensRing));
    const gl = new THREE.CylinderGeometry(lr * 0.66, lr * 0.66, 1.25, 40); gl.rotateX(Math.PI / 2); gl.translate(x, y, phone.bump + 0.45);
    g.add(new THREE.Mesh(gl, mats.lens));
  });
  return g;
}

/* ---------- montagem completa ---------- */
export function build(cfg) {
  const { phone, socks, types, gripMat, tSide, tCorner } = cfg;
  const wall = wallGeometry(phone, tSide, tCorner);
  const back = backGeometries(phone, socks, wall.pts);
  const caseParts = [wall.geom, ...back.parts];
  const grips = socks.map((s, i) => {
    const gp = gripParts(s, types[i], gripMat);
    return { sock: s, type: types[i], ...gp, vol: gp.parts.reduce((v, g) => v + Math.abs(signedVolume(g)), 0) };
  });
  // volume da capa: parede + placa (as camadas sobrepostas são < 2 %; descontamos a sobreposição parede/placa)
  const overlap = (wall.pts.length ? 3.0 * BACK * perimeter(wall.pts) : 0) * 0.6;
  const caseVol = caseParts.reduce((v, g) => v + Math.abs(signedVolume(g)), 0) - overlap;
  return { caseParts, grips, caseVol, cornerVol: wall.cornerVol, cells: back.cells };
}
function perimeter(pts) { let p = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; p += Math.hypot(a.x - b.x, a.y - b.y); } return p; }
export function signedVolume(g) {
  const p = g.attributes.position.array, ix = g.index ? g.index.array : null, n = ix ? ix.length : p.length / 3;
  let v = 0;
  for (let i = 0; i < n; i += 3) {
    const a = (ix ? ix[i] : i) * 3, b = (ix ? ix[i + 1] : i + 1) * 3, c = (ix ? ix[i + 2] : i + 2) * 3;
    v += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  return v / 6;
}
function flip(g) { const ix = g.index.array; for (let q = 0; q < ix.length; q += 3) { const t = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = t; } }

/* ---------- STL binário ---------- */
export function toSTL(geoms, matrix) {
  let tri = 0; geoms.forEach(g => { tri += (g.index ? g.index.count : g.attributes.position.count) / 3; });
  const buf = new ArrayBuffer(84 + tri * 50), dv = new DataView(buf);
  const head = 'PHALANX parametric export - units mm';
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < head.length ? head.charCodeAt(i) : 32);
  dv.setUint32(80, tri, true);
  let o = 84; const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), cb = new THREE.Vector3(), ab = new THREE.Vector3();
  geoms.forEach(g => {
    const p = g.attributes.position, ix = g.index ? g.index.array : null, n = ix ? ix.length : p.count;
    for (let i = 0; i < n; i += 3) {
      va.fromBufferAttribute(p, ix ? ix[i] : i); vb.fromBufferAttribute(p, ix ? ix[i + 1] : i + 1); vc.fromBufferAttribute(p, ix ? ix[i + 2] : i + 2);
      if (matrix) { va.applyMatrix4(matrix); vb.applyMatrix4(matrix); vc.applyMatrix4(matrix); }
      cb.subVectors(vc, vb); ab.subVectors(va, vb); cb.cross(ab).normalize();
      [cb, va, vb, vc].forEach(v => { dv.setFloat32(o, v.x, true); dv.setFloat32(o + 4, v.y, true); dv.setFloat32(o + 8, v.z, true); o += 12; });
      dv.setUint16(o, 0, true); o += 2;
    }
  });
  return buf;
}


export const consts = { GAP, BACK, BOSS_H, HEX_AF, PLUG_H, MAG_D, MAG_H };
