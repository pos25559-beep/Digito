/* DÍGITO — gerador paramétrico (capa + pegas + telemóvel). mm, vista traseira: x→direita, y→cima, z→para fora das costas. */
import * as THREE from 'three';
import * as E from './engine.js';
import { LK, D2R, arcPts, sectorXY, insertOutlineXY, solidSectors, armXY } from './lock.js';
export { lockPlan } from './lock.js';
const GAP = 0.10;           // folga entre telemóvel e parede interior (TPU, ligeiro aperto)
const BACK = 3.2;           // traseira lisa: 0,8 interior + 1,2 média + 0,6 exterior + 0,6 de acabamento. O DÍGITO Lock v3 fica rente.
const L_IN = 0.8, L_MID = 1.2, L_OUT = 0.6, L_FIN = 0.6;
const BOSS_H = 0, BOSS_R = 9.4;
const GRIP_Z = BACK + LK.push;          // base da pega (assenta no topo do insert)
const PLUG_H = GRIP_Z - LK.z_lug0;      // 3,05: o macho desce da base da pega até 0,3 mm do telemóvel
const HEX_AF = 10.0, MAG_D = 6.2, MAG_H = 2.1;   // (encaixe antigo; já não é usado)
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
function wallGeometry(phone, tSide, tCorner, groove = null) {
  const N = 360;
  const { pts, P } = roundedRect(phone.W, phone.L, phone.r, N);
  const T = phone.T, zTop = BACK, zBot = -(T + LIP_H), H = zTop - zBot;
  const f = 1.2; // raio dos arredondamentos
  const nz = 10;
  const notchK = pts.map(p => {
    let k = 0;
    E.cutsOf(phone).forEach(n => {
      let along, on;
      if (n.side === 'bottom') { on = p.ny < -0.7; along = p.x; }
      else if (n.side === 'top') { on = p.ny > 0.7; along = p.x; }
      else if (n.side === 'right') { on = p.nx > 0.7; along = p.y; }
      else { on = p.nx < -0.7; along = p.y; }
      if (!on) return;
      const d = Math.abs(along - n.c) - n.w / 2;
      k = Math.max(k, 1 - smooth(-1.5, 1.5, d));
    });
    return k;
  });
  const zCut = -1.4; // fundo do corte em U (mm abaixo das costas do telemóvel)
  // vincos laterais: o lado dos dedos engrossa GROOVE.EXTRA e cada vinco (cosseno) tira GROOVE.DEPTH a meia altura
  const gside = pts.map(p => {
    if (!groove || !groove.grooves.length) return { extra: 0, cut: 0 };
    const on = groove.side > 0 ? p.nx > 0.7 : p.nx < -0.7; if (!on) return { extra: 0, cut: 0 };
    const ends = groove.grooves.reduce((o, g) => [Math.min(o[0], g.y - g.w / 2 - 6), Math.max(o[1], g.y + g.w / 2 + 6)], [Infinity, -Infinity]);
    const ramp = smooth(ends[0], ends[0] + 6, p.y) * (1 - smooth(ends[1] - 6, ends[1], p.y));   // engrossa só na zona dos vincos
    let cut = 0; groove.grooves.forEach(g => { const u = Math.abs(p.y - g.y) / (g.w / 2); if (u < 1) cut = Math.max(cut, 0.5 * (1 + Math.cos(Math.PI * u))); });
    return { extra: E.GROOVE.EXTRA * ramp, cut: E.GROOVE.DEPTH * cut };
  });
  const tw = (i, z) => {
    const psi = E.cornerPsi(pts[i].dc);
    const phi = Math.pow(Math.max(0, Math.sin(Math.PI * (zTop - z) / H)), 0.6);
    const gs = gside[i]; const band = Math.pow(Math.max(0, Math.sin(Math.PI * (zTop - z) / H)), 1.4);
    return tSide + (tCorner - tSide) * psi * phi + gs.extra * Math.min(1, 1.6 * band) - gs.cut * band;
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

function placeXY(xy, s) { const c = Math.cos(s.theta * D2R), sn = Math.sin(s.theta * D2R); return xy.map(([x, y]) => [s.x + x * c - y * sn, s.y + x * sn + y * c]); }
/** insert v3 (PETG) de um encaixe, em coordenadas do mundo: lista de extrusões (sólidos sobrepostos, como numa união) */
function insertGeoms(s) {
  const P = xy => polyPath(placeXY(xy, s), false);
  const ring = polyPath(placeXY(insertOutlineXY(), s), false); ring.holes.push(polyPath(placeXY(arcPts(LK.r_ring_i, 0, 360, 120).slice(0, -1), s), true));
  const out = [extrude(ring, 0, BACK, 4)];
  const sol = solidSectors();
  sol.forEach(([a0, a1]) => {
    out.push(extrude(P(sectorXY(LK.r_ch, LK.r_ring_i + 0.01, a0, a1)), 0, LK.z_lug1, 4));          // parede por baixo da aba
    out.push(extrude(P(sectorXY(LK.r_bore, LK.r_ring_i + 0.01, a0, a1)), LK.z_lug1, BACK - LK.z_lug1, 4)); // aba
    out.push(extrude(P(sectorXY(LK.r_lug - 0.6, LK.r_ch + 0.01, a1 - LK.stop, a1)), 0, LK.z_lug1, 4));   // batente
  });
  LK.keyTabs.forEach(([ka, kb]) => out.push(extrude(P(sectorXY(LK.r_bore, LK.r_lug, ka - 0.5, kb + 0.5)), LK.z_lug1 + 0.15, BACK - LK.z_lug1 - 0.15, 4)));
  const ends = Object.fromEntries(LK.lugs.map((E, i) => [E, sol[i][1]]));
  const order = [...LK.lugs].sort((p, q) => p - q);
  order.forEach((E, i) => {
    const prev = order[(i - 1 + order.length) % order.length]; const root = prev < E ? ends[prev] : ends[prev] - 360;
    out.push(extrude(P(armXY(E, root)), 0, LK.arm_h, 4));
    out.push(extrude(P(sectorXY(LK.r_ch, LK.r_ring_i + 0.01, root - 0.01, root + 3)), 0, LK.arm_h, 4));
  });
  return out;
}

/* ---------- placa traseira (rente ao encaixe), acabamento e proteção da câmara ---------- */
function backGeometries(phone, socks, pts, finish = 'liso') {
  const cb = E.camBox(phone), m = 1.2;
  const camHole = () => rrPath((cb.xmin + cb.xmax) / 2, (cb.ymin + cb.ymax) / 2, phone.camW + 2 * m, phone.camH + 2 * m, phone.camR + m, true);
  const pocket = s => polyPath(placeXY(insertOutlineXY(0.02), s), true);
  const layer = (z0, h, extra) => { const sh = shapeFromPts(pts, GAP - 0.6); sh.holes.push(camHole()); socks.forEach(s => sh.holes.push(pocket(s))); if (extra) extra(sh); return extrude(sh, z0, h, 12); };
  const parts = [layer(0, L_IN), layer(L_IN, L_MID), layer(L_IN + L_MID, L_OUT)];
  // acabamento das costas (0,6 mm de cima): longe dos encaixes, da câmara e da borda
  const inset = 5.5;
  const sd = (x, y, grow = 0) => { const rr = phone.r, qx = Math.abs(x) - (phone.W / 2 - rr), qy = Math.abs(y) - (phone.L / 2 - rr); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr - grow; };
  const camGuardPad = 1.6 + 2.0;
  const free = (x, y, rad) => sd(x, y) < -(inset + rad)
    && !(x > cb.xmin - m - camGuardPad - rad && x < cb.xmax + m + camGuardPad + rad && y > cb.ymin - m - camGuardPad - rad && y < cb.ymax + m + camGuardPad + rad)
    && !socks.some(s => Math.hypot(x - s.x, y - s.y) < LK.r_out + LK.key_out + 2.2 + rad);
  let cells = 0;
  parts.push(layer(L_IN + L_MID + L_OUT, L_FIN, sh => {
    if (finish === 'favo') {
      const R = 3.0, pitch = 7.27;
      for (let row = -16; row <= 16; row++) for (let col = -8; col <= 8; col++) {
        const x = col * pitch + (row & 1 ? pitch / 2 : 0), y = row * pitch * Math.sqrt(3) / 2;
        if (free(x, y, R)) { sh.holes.push(hexPath(x, y, R * Math.sqrt(3), 0, true)); cells++; }
      }
    } else if (finish === 'canelado') {
      const pitch = 3.2, wr = 0.7;                       // nervuras: ranhuras de 1,4 mm, passo 3,2 mm, ao comprido
      for (let x = -phone.W / 2 + 4; x <= phone.W / 2 - 4; x += pitch) {
        let y0 = null; const step = 1.0;
        for (let y = -phone.L / 2; y <= phone.L / 2 + step; y += step) {
          const ok = y <= phone.L / 2 && free(x, y, wr + 0.3);
          if (ok && y0 === null) y0 = y;
          if (!ok && y0 !== null) { const y1 = y - step; if (y1 - y0 > 6) { sh.holes.push(rrPath(x, (y0 + y1) / 2, 2 * wr, y1 - y0, wr, true, 4)); cells++; } y0 = null; }
        }
      }
    } else if (finish === 'pontos') {
      const pitch = 4.6, rd = 0.9;
      for (let row = -24; row <= 24; row++) for (let col = -10; col <= 10; col++) {
        const x = col * pitch + (row & 1 ? pitch / 2 : 0), y = row * pitch * 0.866;
        if (free(x, y, rd)) { sh.holes.push(circlePath(x, y, rd, true, 10)); cells++; }
      }
    }
  }));
  // proteção elevada à volta da câmara (vidro das lentes + 0,8 mm), só se a câmara sair acima das costas
  const gh = phone.bump - BACK + 0.8;
  if (gh > 0.3) {
    const gs = rrPath((cb.xmin + cb.xmax) / 2, (cb.ymin + cb.ymax) / 2, phone.camW + 2 * m + 3.2, phone.camH + 2 * m + 3.2, phone.camR + m + 1.6, false);
    gs.holes.push(camHole());
    parts.push(extrude(gs, BACK, gh));
  }
  const inserts = socks.map(s => insertGeoms(s));
  return { parts, inserts, cells };
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
/** macho do DÍGITO Lock v3, em coordenadas locais da pega (base da pega em z = 0; o macho desce até -PLUG_H).
 *  As patilhas estão na posição bloqueada (E + 60°), a frente chanfrada em planta e a face de trás reta. */
function plugGeometries() {
  const core = extrude(circlePath(0, 0, LK.r_core, false, 72), -PLUG_H, PLUG_H + 0.02, 24);
  const lugs = LK.lugs.map(E => {
    const a = E + LK.turn, a0 = a - LK.half, a1 = a + LK.half;
    const xy = [...arcPts(LK.r_core - 0.6, a0, a1), [ (LK.r_lug - 0.6) * Math.cos(a1 * D2R), (LK.r_lug - 0.6) * Math.sin(a1 * D2R) ], ...arcPts(LK.r_lug, a1 - 5, a0)];
    return extrude(polyPath(xy, false), -PLUG_H, LK.z_lug1 - LK.z_lug0, 4);
  });
  return [core, ...lugs];
}
/** Gera as peças de uma pega em coordenadas locais (centro do encaixe na origem, base da pega em z = 0). */
export function gripParts(sock, type, mat) {
  const w = sock.w;
  const parts = plugGeometries();
  let extra = null;
  if (type === 'blank') {   // tampa cega: disco fino que fecha o encaixe (fica 0,75 mm acima das costas)
    parts.push(extrude(circlePath(0, 0, LK.r_out - 0.2, false, 72), 0, 0.6, 24));
    return { parts, extra, label: 'Tampa cega' };
  }
  if (type === 'ring') {
    const ped = podBody(2 * E.LOCK.BOSS_R, 2 * E.LOCK.BOSS_R, () => 3.0, 0.8, 0.35); // pedestal com a largura da bossa: maior braço contra o momento do anel
    const id = w + 1.2, band = E.LOCK.RING_BAND, depth = E.LOCK.RING_DEPTH, Ro = id / 2 + band;
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
  const env = sock.env || E.gripEnvelope(sock, type, sock.role);
  const Lp = env.Lp, Wp = sock.Wp || env.Wp, Rs = Math.max(sock.rs, w / 2 + 0.3);
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
  const isl = new THREE.ExtrudeGeometry(rrPath(cx, cy, phone.camW, phone.camH, phone.camR, false), { depth: Math.max(0.2, (phone.plateau || phone.bump) - 0.6), bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 3, curveSegments: 24 });
  g.add(new THREE.Mesh(isl, mats.phone));
  // planalto de câmara a toda a largura (iPhone 17 Pro e seguintes, Air): lentes nas posições do desenho, medidas do canto superior esquerdo
  const X0 = -phone.W / 2, Y0 = phone.L / 2;
  const lr = phone.plateau ? 8.1 : Math.min(phone.camW, phone.camH) * 0.2;
  const lenses = phone.plateau
    ? (phone.camH > 30 ? [[X0 + 14.37, Y0 - 14.37], [X0 + 14.37, Y0 - 33.61], [X0 + 32.36, Y0 - 23.99]] : [[X0 + 12.5, Y0 - 11.5]])
    : phone.camH > phone.camW * 0.8
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
  const { phone, socks, types, gripMat, tSide, tCorner, finish = 'liso', groove = null } = cfg;
  const wall = wallGeometry(phone, tSide, tCorner, groove);
  const back = backGeometries(phone, socks, wall.pts, finish);
  const caseParts = [wall.geom, ...back.parts];
  const grips = socks.map((s, i) => {
    const gp = gripParts(s, types[i], gripMat);
    return { sock: s, type: types[i], ...gp, vol: gp.parts.reduce((v, g) => v + Math.abs(signedVolume(g)), 0) };
  });
  // volume da capa: parede + placa (as camadas sobrepostas são < 2 %; descontamos a sobreposição parede/placa)
  const overlap = (wall.pts.length ? 3.0 * BACK * perimeter(wall.pts) : 0) * 0.6;
  const caseVol = caseParts.reduce((v, g) => v + Math.abs(signedVolume(g)), 0) - overlap;
  const inserts = back.inserts.flat();
  const insertVol = inserts.reduce((v, g) => v + Math.abs(signedVolume(g)), 0);
  return { caseParts, inserts, insertVol, grips, caseVol, cornerVol: wall.cornerVol, cells: back.cells };
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


export const consts = { GAP, BACK, BOSS_H, PLUG_H, GRIP_Z, LK };

