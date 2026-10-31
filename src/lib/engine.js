/* DÍGITO — núcleo de engenharia: telemóveis, materiais, antropometria, encaixes e modelo de impacto. Lógica pura. */
export const r2 = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SIN72 = Math.sin(72 * Math.PI / 180);

/* ---------- 1. Telemóveis suportados: ver devices.js (medidas, botões, portas, origem das cotas) ---------- */
import { PHONES, cutsOf } from './devices.js';
export { PHONES, cutsOf };
export function camBox(p) {
  const xmin = -0.5 * p.W + p.camLeft, ymax = 0.5 * p.L - p.camTop;
  return { xmin, xmax: xmin + p.camW, ymin: ymax - p.camH, ymax };
}

/* ---------- 2. Materiais ---------- */
export const MATERIALS = {
  FDM_TPU_95A: { name: 'TPU 95A', proc: 'FDM', E: 26, sy: 18.5, rho: 1.22, c: 0.25, minStrut: 1.2, cg: 0.07, rate: 4.0, build: 18, post: 2.5, color: '#202226', note: 'Elastómero. Capa do protótipo.' },
  FDM_PETG_CF: { name: 'PETG-CF', proc: 'FDM', E: 3800, sy: 58, rho: 1.29, c: 0.20, minStrut: 1.0, cg: 0.08, rate: 4.2, build: 24, post: 3.0, color: '#2a2c30', note: 'Rígido, mate. Pegas do protótipo de laboratório.', hexF: 46.8, hexT: 1.42 },
  SLS_PA12: { name: 'PA12', proc: 'SLS', E: 1750, sy: 48, rho: 1.01, c: 0.15, minStrut: 0.85, cg: 0.14, rate: 14.0, build: 42, post: 7.5, color: '#3a3b3e', note: 'Sem suportes. Série pequena.', hexF: 51.2, hexT: 1.54 },
  SLA_TOUGH: { name: 'Tough 2000', proc: 'SLA', E: 2200, sy: 46, rho: 1.18, c: 0.08, minStrut: 0.8, cg: 0.22, rate: 8.5, build: 28, post: 6.5, color: '#30353f', note: 'Acabamento liso, tolerância fina.', hexF: 51.2, hexT: 1.54 },
  SLM_TI64: { name: 'Ti6Al4V', proc: 'SLM', E: 110000, sy: 880, rho: 4.43, c: 0.10, minStrut: 0.6, cg: 0.52, rate: 62.0, build: 16.5, post: 38.0, color: '#8d9198', note: 'Titânio. Edição premium.', hexF: 58.5, hexT: 1.78, metal: true }
};
// Por agora só se fabrica em FDM: capa em TPU 95A e pegas em PETG-CF. Os restantes materiais ficam definidos
// apenas para abrir designs antigos; não aparecem no configurador.
export const GRIP_MATERIALS = ['FDM_PETG_CF'];

/* ---------- 3. Estimativa antropométrica a partir da estatura ---------- */
const BASE_FINGERS = { index: [19.2, 18.5], middle: [20.1, 22.8], ring: [18.6, 20.4], pinky: [15.8, 15.2] };
export const FINGERS = ['index', 'middle', 'ring', 'pinky'];
export const FINGER_PT = { index: 'Indicador', middle: 'Médio', ring: 'Anelar', pinky: 'Mindinho' };

export function estimateHand({ heightCm = 172, sex = 'X', hand = 'RIGHT' } = {}) {
  const k = sex === 'F' ? 0.935 : sex === 'M' ? 1.035 : 0.985;
  const h = clamp(+heightCm, 140, 215);
  const palm = r2(84.0 * Math.pow(h / 172, 0.82) * k, 1);
  const s = palm / 86.4;
  const fingers = {};
  FINGERS.forEach(f => {
    const [bw, bd] = BASE_FINGERS[f];
    fingers[f] = fingerRecord(clamp(bw * s, 13, 25.5), clamp(bd * Math.pow(s, 0.92), 12, 27));
  });
  return { source: 'estimate', hand, palm, fingers };
}
export function fingerRecord(w, d) {
  return { w: r2(w), d: r2(d), rs: r2(w / (2 * SIN72)), ring: r2(w + 1.2) };
}

/* ---------- 4. Medição a partir dos 21 marcos da mão (MediaPipe) ---------- */
const MP = { index: [5, 6, 7], middle: [9, 10, 11], ring: [13, 14, 15], pinky: [17, 18, 19] }; // MCP, PIP, DIP
const WIDTH_RATIO = { index: 0.375, middle: 0.355, ring: 0.348, pinky: 0.365 };
const DEFAULT_CURL = { index: 18.5, middle: 22.8, ring: 20.4, pinky: 15.2 };
/** lm: 21 pontos em mm [{x,y}], widths: larguras medidas na foto {index: mm|null...} */
export function handFromLandmarks(lm, widths = {}, hand = 'RIGHT') {
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const palm = r2(d(lm[5], lm[17]) * 1.8565, 1);
  const fingers = {};
  const lengths = {};
  FINGERS.forEach(f => {
    const [m, p, q] = MP[f];
    const bone = d(lm[m], lm[q]);
    let w = bone * WIDTH_RATIO[f], src = 'ratio';
    const meas = widths[f];
    if (meas && meas >= 11 && meas <= 28) { w = meas; src = 'photo'; }
    w = clamp(w, 12.5, 26);
    const curl = DEFAULT_CURL[f] * Math.pow(palm / 86.4, 0.65);
    fingers[f] = Object.assign(fingerRecord(w, curl), { src });
    lengths[f] = r2(d(lm[m], lm[[8, 12, 16, 20][FINGERS.indexOf(f)]]), 1);
  });
  return { source: 'photo', hand, palm, fingers, lengths };
}

/* ---------- 5. Posição dos encaixes nas costas da capa ---------- */
export const STYLES = {
  FULL_4_FINGER: { name: 'Quatro dedos atrás', desc: 'Os quatro dedos apoiam-se nas costas. A mais estável para ler e escrever.' },
  PINKY_SHELF: { name: 'Mindinho por baixo', desc: 'Três dedos atrás e o mindinho a servir de prateleira. A pega mais comum.' },
  CAMERA_CLAW: { name: 'Modo câmara', desc: 'Pegas em diagonal, afastadas da câmara, para fotografar com uma mão.' },
  SIDE_GRIP: { name: 'Pela lateral', desc: 'Vincos à medida dos teus dedos na lateral da capa e o mindinho por baixo. Para quem segura pela borda.' }
};
/* ---------- 5b. Envelope das pegas e posicionamento sem colisões ----------
 * Cada pega tem uma "pegada" em planta (vista traseira), rodada pelo ângulo do encaixe.
 * O posicionamento desce os encaixes um a um até não haver sobreposição (folga ≥ GAP_GRIP),
 * respeita a proteção da câmara e o contorno da capa, e encolhe as selas antes de apertar os dedos.
 */
export const LOCK = { BOSS_R: 9.4, GAP_GRIP: 0.8, GAP_BOSS: 0.6, CAM_CLEAR: 3.8, EDGE_IN: 1.5, RING_BAND: 3.0, RING_DEPTH: 5.0 };
export function gripEnvelope(f, type, role, wpCap = Infinity) {
  const w = f.w;
  if (role === 'shelf') return { kind: 'shelf', Lp: clamp(1.3 * w, 18, 28), Wp: clamp(0.75 * w, 11, 16) };
  if (type === 'blank') return { kind: 'blank', R: LOCK.BOSS_R };
  if (type === 'ring') { const id = w + 1.2; return { kind: 'ring', R: LOCK.BOSS_R, id, Ro: id / 2 + LOCK.RING_BAND, depth: LOCK.RING_DEPTH }; }
  const Lp = clamp(0.9 * w + 4, 18, 27), WpIdeal = clamp(w + 4.5, 17, 31), WpMin = Math.max(w + 2.0, 2 * LOCK.BOSS_R);
  return { kind: 'sela', Lp, Wp: Math.max(WpMin, Math.min(WpIdeal, wpCap)), WpMin, WpIdeal };
}
// contorno (polígono) da pegada em coordenadas do mundo
function superellipse(a, b, n = 48) { const pts = []; for (let i = 0; i < n; i++) { const t = i / n * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t); pts.push([a * Math.sign(c) * Math.sqrt(Math.abs(c)), b * Math.sign(s) * Math.sqrt(Math.abs(s))]); } return pts; }
function circle(r, n = 32) { const pts = []; for (let i = 0; i < n; i++) { const t = i / n * 2 * Math.PI; pts.push([r * Math.cos(t), r * Math.sin(t)]); } return pts; }
function rect(hx, hy) { const pts = []; const k = 6; for (let i = 0; i <= k; i++) pts.push([-hx + 2 * hx * i / k, -hy]); for (let i = 0; i <= k; i++) pts.push([hx, -hy + 2 * hy * i / k]); for (let i = 0; i <= k; i++) pts.push([hx - 2 * hx * i / k, hy]); for (let i = 0; i <= k; i++) pts.push([-hx, hy - 2 * hy * i / k]); return pts; }
export function footprints(s) {
  const e = s.env, th = s.theta * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
  const tf = poly => poly.map(([x, y]) => [s.x + x * c - y * sn, s.y + x * sn + y * c]);
  if (e.kind === 'sela' || e.kind === 'shelf') return [tf(superellipse(e.Lp / 2, e.Wp / 2))];
  if (e.kind === 'ring') return [tf(superellipse(e.R, e.R)), tf(rect(e.depth / 2, e.Ro))]; // pedestal 18×18 (superelipse), banda do anel
  return [tf(circle(e.R))];
}
function pip(pt, poly) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside; } return inside; }
function segDist(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1; const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L, 0, 1); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
function polyDist(A, B) { // distância mínima entre contornos; negativa se se intersectam
  for (const p of A) if (pip(p, B)) return -1;
  for (const p of B) if (pip(p, A)) return -1;
  let d = Infinity;
  for (const p of A) for (let i = 0; i < B.length; i++) d = Math.min(d, segDist(p, B[i], B[(i + 1) % B.length]));
  for (const p of B) for (let i = 0; i < A.length; i++) d = Math.min(d, segDist(p, A[i], A[(i + 1) % A.length]));
  return d;
}
export function gripDistance(s1, s2) { let d = Infinity; for (const A of footprints(s1)) for (const B of footprints(s2)) d = Math.min(d, polyDist(A, B)); return d; }
function phoneSdf(phone, x, y, grow = 0) { const rr = phone.r + grow, qx = Math.abs(x) - (phone.W / 2 + grow - rr), qy = Math.abs(y) - (phone.L / 2 + grow - rr); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr; }
function camDist(phone, s) { // distância da pegada à proteção da câmara (caixa expandida)
  const cb = camBox(phone), g = LOCK.CAM_CLEAR;
  const box = rect((cb.xmax - cb.xmin) / 2 + g, (cb.ymax - cb.ymin) / 2 + g).map(([x, y]) => [x + (cb.xmin + cb.xmax) / 2, y + (cb.ymin + cb.ymax) / 2]);
  let d = Infinity; for (const A of footprints(s)) d = Math.min(d, polyDist(A, box)); return d;
}
function edgeOk(phone, s) { for (const A of footprints(s)) for (const [x, y] of A) if (phoneSdf(phone, x, y, 2.4 - LOCK.EDGE_IN) > 0) return false; return true; }

const NATURAL_GAP = { FULL_4_FINGER: 2.5, PINKY_SHELF: 3.2, CAMERA_CLAW: 2.5, SIDE_GRIP: 3.2 };
export function sockets(hand, phone, style, types = ['sela', 'sela', 'sela', 'sela']) {
  const chi = hand.hand === 'LEFT' ? -1 : 1;
  const F = hand.fingers;
  const cb = camBox(phone);
  const bottom = -0.5 * phone.L;
  const yCeil = Math.min(22, cb.ymin - 12.5);
  // posições de partida e ângulos por estilo (x positivo = lado do polegar na mão direita)
  let spec;
  if (style === 'FULL_4_FINGER') spec = [['index', -5, chi * 12], ['middle', -7.5, chi * 8], ['ring', -5.5, chi * 5], ['pinky', -2.5, chi * 2]];
  else if (style === 'CAMERA_CLAW') { const k = phone.L / 163; spec = [['index', -11.5, chi * 24, yCeil - 3.5], ['middle', -9.5, chi * 16, -6.5 * k], ['ring', -7, chi * 10, -34 * k], ['pinky', -4.5, chi * 6, -58.5 * k]]; }
  else if (style === 'SIDE_GRIP') spec = [['pinky', -12, 0, bottom + 13, 'shelf']];
  else spec = [['index', -5.5, chi * 14], ['middle', -8, chi * 9], ['ring', -6, chi * 5], ['pinky', -12, 0, bottom + 13, 'shelf']];

  const attempt = shrink => {
    const out = []; const issues = [];
    spec.forEach(([f, x0, th, yFixed, role], i) => {
      const env = gripEnvelope(F[f], types[i], role, shrink ? 0 : Infinity);
      const base = { finger: f, theta: r2(th), role: role || 'dorsal', ...F[f], env };
      const xBase = chi * x0;
      const prev = out[out.length - 1];
      let yStart;
      if (role === 'shelf') yStart = yFixed;
      else if (!prev) yStart = Math.min(yFixed ?? (style === 'PINKY_SHELF' ? Math.min(18.5, yCeil) : yCeil), yCeil + 6);
      else yStart = yFixed != null ? Math.min(yFixed, prev.y - 2 * LOCK.BOSS_R - LOCK.GAP_BOSS) : prev.y - (0.5 * (F[prev.finger].w + F[f].w) + NATURAL_GAP[style]);
      // escalonamento ao longo do dedo quando dois anéis ficam lado a lado
      const xs = env.kind === 'ring' && prev && prev.env.kind === 'ring' ? [0, 5.6, -5.6] : [0];
      let best = null;
      for (const dx of xs) {
        const xc = xBase + dx * Math.cos(th * Math.PI / 180);
        for (let y = yStart, n = 0; n < 400; y -= 0.25, n++) {
          const s = { ...base, x: xc, y };
          const clearCam = camDist(phone, s) >= 1.0;
          const clearPrev = out.every(o => gripDistance(o, s) >= LOCK.GAP_GRIP && Math.hypot(o.x - s.x, o.y - s.y) >= 2 * LOCK.BOSS_R + LOCK.GAP_BOSS);
          if (clearCam && clearPrev) { if (!best || y > best.y) best = s; break; }
          if (role === 'shelf' && n > 0) break; // a prateleira não sobe nem desce: o resto é que se ajusta
        }
      }
      if (!best) best = { ...base, x: xBase, y: yStart };
      out.push(best);
    });
    // a prateleira pode ter ficado por baixo de um encaixe que desceu: verificar e sinalizar
    out.forEach((s, i) => {
      if (!edgeOk(phone, s)) issues.push({ kind: 'fora', finger: s.finger });
      if (camDist(phone, s) < 1.0) issues.push({ kind: 'camara', finger: s.finger });
      out.slice(i + 1).forEach(o => { if (gripDistance(s, o) < LOCK.GAP_GRIP - 0.05) issues.push({ kind: 'colisao', a: s.finger, b: o.finger }); });
    });
    const dors = out.filter(s => s.role !== 'shelf');
    if (dors.length && Math.min(...dors.map(s => s.y)) < bottom + 10) issues.push({ kind: 'nao_cabe' });
    return { out, issues };
  };
  let res = attempt(false);
  if (res.issues.length) { const r2_ = attempt(true); if (r2_.issues.length <= res.issues.length) res = r2_; }
  const socks = res.out.map(s => ({ ...s, x: r2(s.x), y: r2(s.y), Wp: s.env.Wp }));
  socks.issues = res.issues;
  return socks;
}

/* ---------- 5c. Vincos laterais (estilo "Pela lateral") ----------
 * Os dedos (indicador, médio, anelar) envolvem a aresta oposta ao polegar. Em vista traseira, com a mão direita,
 * essa aresta é a de x > 0 (é o lado esquerdo visto de frente). Cada vinco tem a largura do dedo + 2 mm,
 * profundidade 0,8 mm, e nunca passa por cima de um corte (botão, porta) com menos de 2,5 mm de folga.
 */
export const GROOVE = { DEPTH: 0.8, EXTRA: 0.8, PAD: 2.5, GAP: 1.5 };
export function sideGrooves(hand, phone, on = true) {
  if (!on) return null;
  const side = hand.hand === 'LEFT' ? -1 : 1;                 // sinal de x da aresta dos dedos (vista traseira)
  const sideName = side > 0 ? 'right' : 'left';
  const cuts = cutsOf(phone).filter(n => n.side === sideName);
  const fs = ['index', 'middle', 'ring'].map(f => ({ finger: f, w: hand.fingers[f].w + 2.0 }));
  const span = fs.reduce((a, f) => a + f.w, 0) + GROOVE.GAP * (fs.length - 1);
  const yTop0 = -0.06 * phone.L + span / 2;                    // o médio fica ligeiramente abaixo do centro
  const yMin = -phone.L / 2 + phone.r + 6, yMax = phone.L / 2 - phone.r - 6;
  const place = yTop => { const out = []; let y = yTop; fs.forEach(f => { out.push({ ...f, y: r2(y - f.w / 2) }); y -= f.w + GROOVE.GAP; }); return out; };
  const clash = g => cuts.some(n => Math.abs(g.y - n.c) < g.w / 2 + n.w / 2 + GROOVE.PAD) || g.y + g.w / 2 > yMax || g.y - g.w / 2 < yMin;
  let best = null;
  for (let d = 0; d <= 60 && !best; d += 0.5) for (const sgn of [-1, 1]) {   // procura a posição livre mais perto da natural
    const set = place(yTop0 + sgn * d); if (!set.some(clash)) { best = set; break; }
  }
  const grooves = best || place(yTop0).filter(g => !clash(g));
  return { side, sideName, grooves, dropped: best ? [] : fs.filter(f => !grooves.some(g => g.finger === f.finger)).map(f => f.finger) };
}

/* ---------- 6. Modelo de impacto (sólidos celulares, Gibson & Ashby) ----------
 * O pico de desaceleração vem do balanço de energia de um absorvedor ideal de patamar:
 *   η·m·g·h = m·a·s  ⇒  G = a/g = η·h / s,  com s = t_canto·ε_D (curso útil de esmagamento).
 */
export function impact({ phone, h = 1.2, gripMat = 'FDM_PETG_CF', caseVolCm3 = null, gripVolCm3 = null, cornerVolMm3 = null }) {
  const g = 9.80665, cm = MATERIALS.FDM_TPU_95A, gm = MATERIALS[gripMat];
  h = clamp(h, 0.5, 2.0);
  const tn = (h - 0.5) / 1.5;
  const mRef = phone.mass / 1000 + 0.048;
  let rho = (0.165 + (0.275 - 0.165) * Math.pow(tn, 0.85)) * Math.sqrt(mRef / 0.275);
  rho = clamp(rho, 0.10, 0.38);
  const Estar = cm.E * rho * rho;
  const spl = 0.30 * cm.sy * Math.pow(rho, 1.5);
  const epsD = Math.max(0.25, 1 - 1.40 * rho);
  const Wv = 0.85 * spl * epsD; // mJ/mm³
  const dStrut = Math.max(cm.minStrut, 0.670 * 4.5 * Math.sqrt(rho));
  const tSide = 2.4;
  const tCorner = clamp((3.15 + 2.30 * Math.pow(tn, 0.90)) * Math.pow(mRef / 0.275, 0.55), 3.10, 5.50);
  const vCase = caseVolCm3 ?? 46.5 * (phone.L * phone.W) / (163 * 77.6);
  const vGrip = gripVolCm3 ?? 16.35;
  const mCase = vCase * cm.rho, mGrip = vGrip * gm.rho;
  const mImpact = (phone.mass + Math.min(65, mCase)) / 1000;
  const v = Math.sqrt(2 * g * h);
  const Ep = mImpact * g * h, Ereq = 0.85 * Ep;
  const stroke = tCorner * epsD; // mm
  const G = 0.85 * h / (stroke / 1000);
  const strokeBare = 0.4; // mm — alumínio/vidro contra betão, ordem de grandeza
  const Gbare = 0.85 * h / (strokeBare / 1000);
  const Ecap = cornerVolMm3 ? Wv * cornerVolMm3 / 1000 : null; // J
  // custo de produção (material + máquina + pós-processamento)
  const tCase = vCase / cm.build, tGrip = vGrip / gm.build;
  const cCase = (mCase * cm.cg + tCase * cm.rate + cm.post) * 1.25;
  const cGrip = (mGrip * gm.cg + tGrip * gm.rate + gm.post) * 1.25;
  return {
    h, v: r2(v), Ep: r2(Ep), Ereq: r2(Ereq), rho: r2(rho, 3), porosity: r2((1 - rho) * 100, 1), Estar: r2(Estar), spl: r2(spl, 3), epsD: r2(epsD, 3), Wv: r2(Wv, 4),
    dStrut: r2(dStrut), tSide, tCorner: r2(tCorner), stroke: r2(stroke), G: Math.round(G), Gbare: Math.round(Gbare), reduction: Math.round((1 - G / Gbare) * 100),
    Ecap: Ecap == null ? null : r2(Ecap, 2), capShare: Ecap == null ? null : Math.round(100 * Ecap / Ereq),
    mCase: r2(mCase, 1), mGrip: r2(mGrip, 1), mTotal: r2(phone.mass + mCase + mGrip, 1), vCase: r2(vCase), vGrip: r2(vGrip),
    printH: r2(tCase + tGrip, 1), priceCase: r2(cCase), priceGrip: r2(cGrip), price: r2(cCase + cGrip),
    clearance: gm.c, flankShift: r2(gm.c / Math.sin(Math.PI / 3), 3), hexF: gm.hexF, hexT: gm.hexT, hexSF: r2(gm.hexF / 5.88, 1)
  };
}

/* ---------- 7. Perfil de espessura da parede junto aos cantos ---------- */
export function cornerPsi(d, D = 22, gamma = 1.6) { // d: distância (mm) ao centro do arco do canto, ao longo do perímetro
  const xi = Math.abs(d) / D;
  return xi >= 1 ? 0 : Math.pow(0.5 * (1 + Math.cos(Math.PI * xi)), gamma);
}

