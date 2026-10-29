/* DÍGITO — núcleo de engenharia: telemóveis, materiais, antropometria, encaixes e modelo de impacto. Lógica pura. */
export const r2 = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SIN72 = Math.sin(72 * Math.PI / 180);

/* ---------- 1. Telemóveis suportados (dimensões em mm) ---------- */
// notches: cortes em U do lado do ecrã, em coordenadas de vista traseira (x direita, y cima).
// side: 'bottom' | 'left' | 'right'; c = centro ao longo do lado (mm); w = largura do corte (mm)
export const PHONES = {
  IPHONE_16_PRO_MAX: { name: 'iPhone 16 Pro Max', brand: 'Apple', L: 163.0, W: 77.6, T: 8.25, mass: 227, r: 11.0, bump: 4.0, camW: 39.5, camH: 41.0, camR: 9.5, camTop: 5.5, camLeft: 5.5,
    notches: [{ side: 'bottom', c: 0, w: 34 }, { side: 'left', c: 28, w: 22 }, { side: 'right', c: 40, w: 46 }, { side: 'left', c: -22, w: 22 }] },
  IPHONE_16_PRO: { name: 'iPhone 16 Pro', brand: 'Apple', L: 149.6, W: 71.5, T: 8.25, mass: 199, r: 10.0, bump: 4.0, camW: 37.0, camH: 38.5, camR: 9.0, camTop: 5.2, camLeft: 5.2,
    notches: [{ side: 'bottom', c: 0, w: 32 }, { side: 'left', c: 24, w: 20 }, { side: 'right', c: 34, w: 42 }, { side: 'left', c: -20, w: 20 }] },
  GALAXY_S23_ULTRA: { name: 'Galaxy S23 Ultra', brand: 'Samsung', L: 163.4, W: 78.1, T: 8.9, mass: 234, r: 3.8, bump: 3.8, camW: 36.0, camH: 54.0, camR: 6.0, camTop: 5.0, camLeft: 5.5,
    notches: [{ side: 'bottom', c: 0, w: 40 }, { side: 'left', c: 32, w: 40 }] },
  PIXEL_9_PRO_XL: { name: 'Pixel 9 Pro XL', brand: 'Google', L: 162.8, W: 76.6, T: 8.5, mass: 221, r: 10.2, bump: 4.1, camW: 67.6, camH: 25.0, camR: 12.0, camTop: 13.0, camLeft: 4.5,
    notches: [{ side: 'bottom', c: 0, w: 34 }, { side: 'left', c: 22, w: 46 }] },
  PIXEL_9_PRO: { name: 'Pixel 9 Pro', brand: 'Google', L: 152.8, W: 72.0, T: 8.5, mass: 199, r: 10.0, bump: 4.1, camW: 63.0, camH: 25.0, camR: 12.0, camTop: 13.0, camLeft: 4.5,
    notches: [{ side: 'bottom', c: 0, w: 32 }, { side: 'left', c: 20, w: 42 }] }
};
export function camBox(p) {
  const xmin = -0.5 * p.W + p.camLeft, ymax = 0.5 * p.L - p.camTop;
  return { xmin, xmax: xmin + p.camW, ymin: ymax - p.camH, ymax };
}

/* ---------- 2. Materiais ---------- */
export const MATERIALS = {
  FDM_TPU_95A: { name: 'TPU 95A', proc: 'FDM', E: 65, sy: 18.5, rho: 1.22, c: 0.25, minStrut: 1.2, cg: 0.07, rate: 4.0, build: 18, post: 2.5, color: '#202226', note: 'Elastómero. Capa do protótipo.' },
  FDM_PETG_CF: { name: 'PETG-CF', proc: 'FDM', E: 3800, sy: 58, rho: 1.29, c: 0.20, minStrut: 1.0, cg: 0.08, rate: 4.2, build: 24, post: 3.0, color: '#2a2c30', note: 'Rígido, mate. Pegas do protótipo de laboratório.', hexF: 46.8, hexT: 1.42 },
  SLS_PA12: { name: 'PA12', proc: 'SLS', E: 1750, sy: 48, rho: 1.01, c: 0.15, minStrut: 0.85, cg: 0.14, rate: 14.0, build: 42, post: 7.5, color: '#3a3b3e', note: 'Sem suportes. Série pequena.', hexF: 51.2, hexT: 1.54 },
  SLA_TOUGH: { name: 'Tough 2000', proc: 'SLA', E: 2200, sy: 46, rho: 1.18, c: 0.08, minStrut: 0.8, cg: 0.22, rate: 8.5, build: 28, post: 6.5, color: '#30353f', note: 'Acabamento liso, tolerância fina.', hexF: 51.2, hexT: 1.54 },
  SLM_TI64: { name: 'Ti6Al4V', proc: 'SLM', E: 110000, sy: 880, rho: 4.43, c: 0.10, minStrut: 0.6, cg: 0.52, rate: 62.0, build: 16.5, post: 38.0, color: '#8d9198', note: 'Titânio. Edição premium.', hexF: 58.5, hexT: 1.78, metal: true }
};
export const GRIP_MATERIALS = ['FDM_PETG_CF', 'SLS_PA12', 'SLA_TOUGH', 'SLM_TI64'];

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
  CAMERA_CLAW: { name: 'Modo câmara', desc: 'Pegas em diagonal, afastadas da câmara, para fotografar com uma mão.' }
};
export function sockets(hand, phone, style) {
  const chi = hand.hand === 'LEFT' ? -1 : 1;
  const F = hand.fingers;
  const cb = camBox(phone);
  const yCeil = Math.min(22, cb.ymin - 12.5);
  const bottom = -0.5 * phone.L;
  let spec;
  if (style === 'FULL_4_FINGER') {
    const yi = yCeil, ym = yi - (0.5 * (F.index.w + F.middle.w) + 2.5), yr = ym - (0.5 * (F.middle.w + F.ring.w) + 2.5), yp = yr - (0.5 * (F.ring.w + F.pinky.w) + 2.5);
    spec = [['index', -chi * 5, yi, chi * 12], ['middle', -chi * 7.5, ym, chi * 8], ['ring', -chi * 5.5, yr, chi * 5], ['pinky', -chi * 2.5, yp, chi * 2]];
  } else if (style === 'CAMERA_CLAW') {
    const s = phone.L / 163; // escala ao comprimento do telemóvel
    spec = [['index', -chi * 11.5, yCeil - 3.5, chi * 24], ['middle', -chi * 9.5, -6.5 * s, chi * 16], ['ring', -chi * 7, -34 * s, chi * 10], ['pinky', -chi * 4.5, -58.5 * s, chi * 6]];
  } else {
    const yi = Math.min(18.5, yCeil), ym = yi - (0.5 * (F.index.w + F.middle.w) + 3.2), yr = ym - (0.5 * (F.middle.w + F.ring.w) + 3.2);
    // o mindinho fica na base do dorso, a 13 mm da aresta inferior, como apoio
    spec = [['index', -chi * 5.5, yi, chi * 14], ['middle', -chi * 8, ym, chi * 9], ['ring', -chi * 6, yr, chi * 5], ['pinky', -chi * 12, bottom + 13, 0, 'shelf']];
  }
  return spec.map(([f, x, y, th, role]) => ({ finger: f, x: r2(x), y: r2(y), theta: r2(th), role: role || 'dorsal', ...F[f] }));
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

