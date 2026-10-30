// Verificação 3D (2,5D por colunas) de colisões entre pegas e de pegas fora da capa.
// Usa as malhas reais do gerador: é a referência para o algoritmo de posicionamento.
import * as THREE from 'three';
import * as E from '../src/lib/engine.js';
import * as G from '../src/lib/geometry.js';

const CELL = 0.5;
function columns(geoms, m) {
  // devolve Map "i,j" -> [[zmin,zmax],...] (intervalos por coluna) por rasterização de triângulos
  const cols = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const g of geoms) {
    const p = g.attributes.position, ix = g.index ? g.index.array : null, n = ix ? ix.length : p.count;
    for (let t = 0; t < n; t += 3) {
      a.fromBufferAttribute(p, ix ? ix[t] : t).applyMatrix4(m); b.fromBufferAttribute(p, ix ? ix[t + 1] : t + 1).applyMatrix4(m); c.fromBufferAttribute(p, ix ? ix[t + 2] : t + 2).applyMatrix4(m);
      // rasterização exata: centros de célula dentro da projeção do triângulo, z por interpolação baricêntrica
      const d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
      if (Math.abs(d) < 1e-9) continue; // triângulo vertical: não define colunas
      const x0 = Math.floor(Math.min(a.x, b.x, c.x) / CELL), x1 = Math.floor(Math.max(a.x, b.x, c.x) / CELL), y0 = Math.floor(Math.min(a.y, b.y, c.y) / CELL), y1 = Math.floor(Math.max(a.y, b.y, c.y) / CELL);
      for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
        const px = (i + 0.5) * CELL, py = (j + 0.5) * CELL;
        const l1 = ((b.y - c.y) * (px - c.x) + (c.x - b.x) * (py - c.y)) / d, l2 = ((c.y - a.y) * (px - c.x) + (a.x - c.x) * (py - c.y)) / d, l3 = 1 - l1 - l2;
        if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
        const z = l1 * a.z + l2 * b.z + l3 * c.z;
        const k = i + ',' + j; const v = cols.get(k);
        if (v) v.push(z); else cols.set(k, [z]);
      }
    }
  }
  // cada coluna: pares (entrada, saída) ordenados → intervalos de material
  for (const [k, zs] of cols) { zs.sort((p, q) => p - q); const iv = []; for (let i = 0; i + 1 < zs.length; i += 2) iv.push([zs[i], zs[i + 1]]); if (zs.length % 2) iv.push([zs[zs.length - 1], zs[zs.length - 1]]); cols.set(k, iv); }
  return cols;
}
export function check(cfg) {
  const { phone, style, hand, types, mat = 'FDM_PETG_CF' } = cfg;
  const socks = cfg.socks || E.sockets(hand, phone, style, types);
  const b = G.build({ phone, socks, types, gripMat: mat, tSide: 2.4, tCorner: 4.2 });
  const z0 = G.consts.BACK + G.consts.BOSS_H;
  const occ = b.grips.map(gr => {
    const m = new THREE.Matrix4().makeRotationZ(gr.sock.theta * Math.PI / 180).setPosition(gr.sock.x, gr.sock.y, z0);
    const merged = new Map();
    for (const part of gr.parts) for (const [k, iv] of columns([part], m)) { const v = merged.get(k); if (v) v.push(...iv); else merged.set(k, iv.slice()); }
    return merged;
  });
  const issues = [];
  // pares
  for (let i = 0; i < occ.length; i++) for (let j = i + 1; j < occ.length; j++) {
    let worst = 0;
    for (const [k, IA] of occ[i]) { const IB = occ[j].get(k); if (!IB) continue; for (const A of IA) for (const B of IB) { const ov = Math.min(A[1], B[1]) - Math.max(A[0], B[0]); if (ov > worst) worst = ov; } }
    if (worst > 0.05) issues.push({ kind: 'colisao', a: socks[i].finger, b: socks[j].finger, ta: types[i], tb: types[j], mm: +worst.toFixed(2) });
  }
  // dentro da capa (planta): contorno exterior do telemóvel + parede 2,4 mm, menos 1 mm de margem
  const hw = phone.W / 2 + 2.4 - 1.0, hl = phone.L / 2 + 2.4 - 1.0, rr = phone.r + 2.4;
  const inside = (x, y) => { const qx = Math.abs(x) - (hw - rr), qy = Math.abs(y) - (hl - rr); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr <= 0; };
  const cb = E.camBox(phone);
  occ.forEach((o, i) => {
    let out = 0, cam = 0;
    for (const k of o.keys()) { const [ii, jj] = k.split(',').map(Number); const x = (ii + 0.5) * CELL, y = (jj + 0.5) * CELL;
      if (!inside(x, y)) out++;
      if (x > cb.xmin - 2.5 && x < cb.xmax + 2.5 && y > cb.ymin - 2.5 && y < cb.ymax + 2.5) cam++; }
    if (out) issues.push({ kind: 'fora_da_capa', a: socks[i].finger, t: types[i], cells: out });
    if (cam) issues.push({ kind: 'camara', a: socks[i].finger, t: types[i], cells: cam });
  });
  // bossas (encaixes) a sobreporem-se
  for (let i = 0; i < socks.length; i++) for (let j = i + 1; j < socks.length; j++) {
    const d = Math.hypot(socks[i].x - socks[j].x, socks[i].y - socks[j].y);
    if (d < 2 * 9.0 + 0.6) issues.push({ kind: 'bossas', a: socks[i].finger, b: socks[j].finger, d: +d.toFixed(1) });
  }
  return { issues, socks };
}

// varrimento de todas as combinações
if (process.argv[1].endsWith('collide.mjs')) {
  const TYPES = [['sela', 'sela', 'sela', 'sela'], ['sela', 'ring', 'sela', 'sela'], ['ring', 'sela', 'sela', 'sela'], ['sela', 'sela', 'ring', 'sela'], ['ring', 'ring', 'ring', 'ring'], ['sela', 'ring', 'ring', 'sela'], ['blank', 'ring', 'blank', 'sela']];
  let total = 0, bad = 0, silent = 0; const kinds = {}; const examples = [];
  for (const pid of Object.keys(E.PHONES)) for (const style of Object.keys(E.STYLES)) for (const h of [145, 160, 172, 185, 200]) for (const sex of ['F', 'M']) for (const hd of ['RIGHT', 'LEFT']) for (const types of TYPES) {
    const hand = E.estimateHand({ heightCm: h, sex, hand: hd });
    const r = check({ phone: E.PHONES[pid], style, hand, types });
    total++; if (r.issues.length && !(r.socks.issues || []).length) silent++;
    if (r.issues.length) { bad++; r.issues.forEach(x => { kinds[x.kind] = (kinds[x.kind] || 0) + 1; }); if (examples.length < 30) examples.push({ pid, style, h, sex, hd, types: types.join('/'), issues: r.issues.slice(0, 3).map(x => x.kind + ':' + (x.a || '') + '-' + (x.b || '') + (x.mm ? ' ' + x.mm : '') + (x.d ? ' d' + x.d : '')), flagged: (r.socks.issues || []).map(x => x.kind) }); }
  }
  console.log(`configurações: ${total}  com problemas: ${bad} (${(100 * bad / total).toFixed(1)} %)`);
  console.log('por tipo:', kinds, '| falhas NÃO assinaladas pelo algoritmo:', silent);
  examples.forEach(e => console.log(`${e.pid} ${e.style} ${e.h}${e.sex} ${e.hd} ${e.types} :: ${e.issues.join(', ')} :: algoritmo: ${e.flagged.join(',') || '—'}`));
}
