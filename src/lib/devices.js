/* DÍGITO — catálogo de telemóveis (e tablets, em breve).
 *
 * Unidades: mm, g. Coordenadas da capa em VISTA TRASEIRA (x para a direita, y para cima, origem no centro).
 * As funções do telemóvel (botões, portas, microfones, altifalantes) são dadas como no desenho técnico,
 * em VISTA DE FRENTE (ecrã virado para nós):
 *   edge 'L' | 'R' (lados esquerdo/direito vistos de frente): `at` = centro medido a partir do TOPO
 *   edge 'B' | 'T' (fundo/topo):                             `at` = centro medido a partir da ESQUERDA (vista de frente)
 *   len = comprimento da função ao longo da aresta.
 * kind: 'btn' (botão), 'cc' (Controlo da Câmara), 'port' (USB-C), 'spk' (altifalante), 'mic', 'pen' (S Pen), 'sim'
 *
 * src (fonte das cotas de cada telemóvel):
 *   'desenho'  — desenho dimensional oficial do fabricante (Apple Accessory Dimensional Drawings)
 *   'derivado' — mesmas dimensões oficiais de um modelo com desenho; posições herdadas desse desenho
 *   'estimado' — dimensões gerais oficiais; posições das funções estimadas a partir de imagens oficiais
 * A capa só deve ser impressa para modelos 'estimado' depois de confirmar as posições num telemóvel real.
 *
 * Câmara: caixa (camLeft, camTop, camW, camH, camR) em vista traseira, medida a partir do canto superior
 * ESQUERDO da traseira; bump = saliência total acima da traseira (até ao vidro das lentes).
 */
const F = (edge, kind, at, len) => ({ edge, kind, at, len });

// iPhone 17 Pro Max — desenho oficial (Apple, 2025-09-09), folha 1: lados, fundo e câmara
const IP17PM_FEAT = [
  F('L', 'btn', 34.28, 6.90), F('L', 'btn', 48.43, 11.20), F('L', 'btn', 62.63, 11.20),
  F('R', 'btn', 55.53, 17.70), F('R', 'cc', 111.82, 17.10),
  F('B', 'port', 38.99, 12.45), F('B', 'spk', 21.04, 11.26), F('B', 'mic', 47.0, 3.0), F('B', 'spk', 57.69, 9.76)
];
// iPhone 17 Pro — desenho oficial (Apple, 2025-09-09); o desenho do 18 Pro (2026) tem as mesmas cotas
const IP17P_FEAT = [
  F('L', 'btn', 34.28, 6.90), F('L', 'btn', 48.43, 11.20), F('L', 'btn', 62.63, 11.20),
  F('R', 'btn', 55.53, 17.70), F('R', 'cc', 98.40, 17.10),
  F('B', 'port', 35.92, 12.45), F('B', 'spk', 19.9, 9.0), F('B', 'mic', 42.8, 3.0), F('B', 'spk', 52.6, 8.0)
];
// iPhone 16/16 Pro/17/Air — botões da esquerda (desenhos oficiais Apple): Ação, volume +, volume −
const SIDE_BASE = [F('L', 'btn', 34.08, 6.90), F('L', 'btn', 48.23, 11.20), F('L', 'btn', 62.43, 11.20)];

export const PHONES = {
  // ---------------- Apple ----------------
  IPHONE_18_PRO_MAX: { name: 'iPhone 18 Pro Max', brand: 'Apple', year: 2026, src: 'desenho',
    L: 163.43, W: 77.98, T: 8.75, mass: 249, r: 12.0, bump: 4.43, plateau: 2.55, camLeft: 1.6, camTop: 1.6, camW: 74.8, camH: 42.4, camR: 12.0,
    features: IP17PM_FEAT },
  IPHONE_18_PRO: { name: 'iPhone 18 Pro', brand: 'Apple', year: 2026, src: 'desenho',
    L: 150.01, W: 71.85, T: 8.75, mass: 211, r: 11.0, bump: 4.43, plateau: 2.55, camLeft: 1.6, camTop: 1.6, camW: 68.7, camH: 39.0, camR: 11.5,
    features: IP17P_FEAT },
  IPHONE_17_PRO_MAX: { name: 'iPhone 17 Pro Max', brand: 'Apple', year: 2025, src: 'desenho',
    L: 163.43, W: 77.98, T: 8.75, mass: 231, r: 12.0, bump: 4.43, plateau: 2.55, camLeft: 1.6, camTop: 1.6, camW: 74.8, camH: 42.4, camR: 12.0,
    features: IP17PM_FEAT },
  IPHONE_17_PRO: { name: 'iPhone 17 Pro', brand: 'Apple', year: 2025, src: 'desenho',
    L: 150.01, W: 71.85, T: 8.75, mass: 204, r: 11.0, bump: 4.43, plateau: 2.55, camLeft: 1.6, camTop: 1.6, camW: 68.7, camH: 39.0, camR: 11.5,
    features: IP17P_FEAT },
  IPHONE_AIR: { name: 'iPhone Air', brand: 'Apple', year: 2025, src: 'desenho',
    L: 156.18, W: 74.70, T: 5.64, mass: 165, r: 11.5, bump: 5.68, plateau: 3.03, camLeft: 1.6, camTop: 1.6, camW: 71.5, camH: 30.0, camR: 9.0,
    features: [...SIDE_BASE, F('R', 'btn', 55.33, 17.80), F('R', 'cc', 104.77, 17.10),
      F('B', 'mic', 25.3, 2.0), F('B', 'port', 37.35, 12.45), F('B', 'spk', 48.5, 3.6)] },
  IPHONE_17: { name: 'iPhone 17', brand: 'Apple', year: 2025, src: 'desenho',
    L: 149.61, W: 71.45, T: 7.95, mass: 177, r: 10.5, bump: 3.45, plateau: 1.78, camLeft: 3.97, camTop: 3.97, camW: 29.6, camH: 39.8, camR: 9.6,
    features: [...SIDE_BASE, F('R', 'btn', 55.32, 17.70), F('R', 'cc', 98.20, 17.10),
      F('B', 'mic', 21.97, 6.5), F('B', 'port', 35.72, 12.45), F('B', 'spk', 51.74, 10.4)] },
  IPHONE_16_PRO_MAX: { name: 'iPhone 16 Pro Max', brand: 'Apple', year: 2024, src: 'desenho',
    L: 163.03, W: 77.58, T: 8.25, mass: 227, r: 11.0, bump: 4.0, camLeft: 4.70, camTop: 4.70, camW: 40.5, camH: 41.8, camR: 9.5,
    features: [...SIDE_BASE, F('R', 'btn', 55.33, 17.70), F('R', 'cc', 111.62, 17.10),
      F('B', 'spk', 24.4, 8.5), F('B', 'port', 38.79, 12.45), F('B', 'mic', 47.5, 3.0), F('B', 'spk', 57.0, 10.0)] },
  IPHONE_16_PRO: { name: 'iPhone 16 Pro', brand: 'Apple', year: 2024, src: 'desenho',
    L: 149.61, W: 71.45, T: 8.25, mass: 199, r: 10.0, bump: 4.0, camLeft: 4.70, camTop: 4.70, camW: 40.5, camH: 41.8, camR: 9.5,
    features: [...SIDE_BASE, F('R', 'btn', 55.33, 17.70), F('R', 'cc', 98.19, 17.10),
      F('B', 'spk', 23.7, 8.0), F('B', 'port', 35.72, 12.45), F('B', 'mic', 44.5, 3.0), F('B', 'spk', 51.9, 8.7)] },
  IPHONE_16: { name: 'iPhone 16', brand: 'Apple', year: 2024, src: 'desenho',
    L: 147.6, W: 71.60, T: 7.81, mass: 170, r: 10.5, bump: 3.48, plateau: 1.85, camLeft: 3.97, camTop: 3.97, camW: 29.6, camH: 39.8, camR: 9.6,
    features: [...SIDE_BASE, F('R', 'btn', 55.33, 17.70), F('R', 'cc', 96.23, 17.10),
      F('B', 'mic', 21.9, 6.5), F('B', 'port', 35.81, 12.45), F('B', 'spk', 51.8, 10.4)] },

  // ---------------- Samsung ----------------
  GALAXY_S26_ULTRA: { name: 'Galaxy S26 Ultra', brand: 'Samsung', year: 2026, src: 'estimado',
    L: 163.6, W: 78.1, T: 7.9, mass: 214, r: 4.5, bump: 2.2, camLeft: 6.5, camTop: 7.0, camW: 24.0, camH: 56.0, camR: 12.0,
    features: [F('R', 'btn', 44.0, 24.0), F('R', 'btn', 64.0, 13.0), F('T', 'mic', 50.0, 3.0),
      F('B', 'pen', 13.0, 9.0), F('B', 'mic', 30.0, 3.0), F('B', 'port', 39.05, 12.0), F('B', 'spk', 60.0, 16.0)] },
  GALAXY_S26: { name: 'Galaxy S26', brand: 'Samsung', year: 2026, src: 'estimado',
    L: 149.6, W: 71.7, T: 7.2, mass: 167, r: 9.0, bump: 1.6, camLeft: 8.5, camTop: 8.5, camW: 12.0, camH: 38.0, camR: 6.0,
    features: [F('R', 'btn', 39.0, 20.0), F('R', 'btn', 57.0, 10.0), F('T', 'mic', 46.0, 3.0),
      F('B', 'mic', 26.0, 3.0), F('B', 'port', 35.85, 12.0), F('B', 'spk', 52.0, 14.0)] },
  GALAXY_A57: { name: 'Galaxy A57', brand: 'Samsung', year: 2026, src: 'estimado',
    L: 161.5, W: 76.8, T: 6.9, mass: 179, r: 8.0, bump: 1.8, camLeft: 8.0, camTop: 8.0, camW: 16.0, camH: 44.0, camR: 8.0,
    features: [F('R', 'btn', 48.0, 22.0), F('R', 'btn', 66.0, 11.0), F('T', 'mic', 48.0, 3.0),
      F('B', 'mic', 27.0, 3.0), F('B', 'port', 38.4, 12.0), F('B', 'spk', 55.0, 14.0)] },
  // ---------------- Google ----------------
  PIXEL_11_PRO_XL: { name: 'Pixel 11 Pro XL', brand: 'Google', year: 2026, src: 'estimado',
    L: 162.7, W: 76.5, T: 8.5, mass: 226, r: 10.2, bump: 3.5, camLeft: 4.0, camTop: 13.0, camW: 68.5, camH: 24.0, camR: 12.0,
    features: [F('R', 'btn', 37.0, 14.0), F('R', 'btn', 61.0, 26.0), F('T', 'mic', 50.0, 3.0),
      F('B', 'mic', 31.0, 3.0), F('B', 'port', 38.25, 12.0), F('B', 'spk', 52.0, 14.0)] },
  PIXEL_11_PRO: { name: 'Pixel 11 Pro', brand: 'Google', year: 2026, src: 'estimado',
    L: 152.7, W: 71.9, T: 8.4, mass: 204, r: 10.0, bump: 3.5, camLeft: 4.0, camTop: 12.5, camW: 63.9, camH: 24.0, camR: 12.0,
    features: [F('R', 'btn', 35.0, 14.0), F('R', 'btn', 57.0, 24.0), F('T', 'mic', 47.0, 3.0),
      F('B', 'mic', 29.0, 3.0), F('B', 'port', 35.95, 12.0), F('B', 'spk', 49.0, 14.0)] },
  PIXEL_11: { name: 'Pixel 11', brand: 'Google', year: 2026, src: 'estimado',
    L: 152.8, W: 72.0, T: 8.6, mass: 197, r: 10.0, bump: 3.0, camLeft: 4.0, camTop: 12.5, camW: 64.0, camH: 23.0, camR: 11.5,
    features: [F('R', 'btn', 35.0, 14.0), F('R', 'btn', 57.0, 24.0), F('T', 'mic', 47.0, 3.0),
      F('B', 'mic', 29.0, 3.0), F('B', 'port', 36.0, 12.0), F('B', 'spk', 49.0, 14.0)] },
  // ---------------- modelos antigos (só para abrir designs guardados) ----------------
  GALAXY_S23_ULTRA: { name: 'Galaxy S23 Ultra', brand: 'Samsung', year: 2023, src: 'estimado', legacy: true,
    L: 163.4, W: 78.1, T: 8.9, mass: 234, r: 3.8, bump: 3.8, camW: 36.0, camH: 54.0, camR: 6.0, camTop: 5.0, camLeft: 5.5,
    features: [F('R', 'btn', 42.0, 24.0), F('R', 'btn', 62.0, 13.0), F('B', 'pen', 13.0, 9.0), F('B', 'port', 39.05, 12.0), F('B', 'spk', 58.0, 16.0)] },
  PIXEL_9_PRO_XL: { name: 'Pixel 9 Pro XL', brand: 'Google', year: 2024, src: 'estimado', legacy: true,
    L: 162.8, W: 76.6, T: 8.5, mass: 221, r: 10.2, bump: 4.1, camW: 67.6, camH: 25.0, camR: 12.0, camTop: 13.0, camLeft: 4.5,
    features: [F('R', 'btn', 37.0, 14.0), F('R', 'btn', 61.0, 26.0), F('B', 'port', 38.3, 12.0), F('B', 'spk', 52.0, 14.0)] },
  PIXEL_9_PRO: { name: 'Pixel 9 Pro', brand: 'Google', year: 2024, src: 'estimado', legacy: true,
    L: 152.8, W: 72.0, T: 8.5, mass: 199, r: 10.0, bump: 4.1, camW: 63.0, camH: 25.0, camR: 12.0, camTop: 13.0, camLeft: 4.5,
    features: [F('R', 'btn', 35.0, 14.0), F('R', 'btn', 57.0, 24.0), F('B', 'port', 36.0, 12.0), F('B', 'spk', 49.0, 14.0)] }
};

export const SRC_PT = {
  desenho: 'Cotas do desenho técnico oficial do fabricante.',
  derivado: 'Medidas oficiais iguais às do modelo anterior; posições dos botões herdadas do desenho técnico desse modelo.',
  estimado: 'Medidas gerais oficiais; posições dos botões e portas estimadas. Confirmamos no teu telemóvel antes de imprimir.'
};
export const KIND_PT = { btn: 'Botão', cc: 'Controlo da Câmara', port: 'USB-C', spk: 'Altifalante', mic: 'Microfone', pen: 'S Pen', sim: 'SIM' };

// folga de cada corte, por tipo (mm a somar ao comprimento)
const CLR = { btn: 3.0, cc: 3.0, port: 3.0, spk: 2.0, mic: 2.5, pen: 3.0, sim: 0 };
/** Converte as funções (vista de frente) em cortes em U na parede (vista traseira).
 *  side: 'left' | 'right' (x<0 | x>0 em vista traseira), 'bottom', 'top'; c = centro ao longo da aresta (mm, origem no centro) */
export function cutsOf(p) {
  if (p.notches) return p.notches;
  const out = [];
  (p.features || []).forEach(f => {
    if (f.kind === 'sim') return;
    const w = f.len + CLR[f.kind];
    if (f.edge === 'L') out.push({ side: 'right', c: p.L / 2 - f.at, w, kind: f.kind });      // esquerdo (frente) = direito (traseira)
    else if (f.edge === 'R') out.push({ side: 'left', c: p.L / 2 - f.at, w, kind: f.kind });
    else if (f.edge === 'B') out.push({ side: 'bottom', c: p.W / 2 - f.at, w, kind: f.kind });
    else if (f.edge === 'T') out.push({ side: 'top', c: p.W / 2 - f.at, w, kind: f.kind });
  });
  // junta cortes que se sobrepõem ou ficam a menos de 3 mm (uma ponte de TPU tão estreita rasga)
  const merged = [];
  ['left', 'right', 'bottom', 'top'].forEach(side => {
    const list = out.filter(n => n.side === side).map(n => ({ ...n, a: n.c - n.w / 2, b: n.c + n.w / 2 })).sort((u, v) => u.a - v.a);
    list.forEach(n => { const last = merged[merged.length - 1]; if (last && last.side === side && n.a - last.b < 3) { last.b = Math.max(last.b, n.b); } else merged.push({ ...n }); });
  });
  return merged.map(n => ({ side: n.side, c: +((n.a + n.b) / 2).toFixed(2), w: +(n.b - n.a).toFixed(2) }));
}

/* ---------- tablets (em breve): só a lista, ainda sem geometria ---------- */
export const TABLETS = [
  { name: 'iPad 11"', brand: 'Apple' }, { name: 'iPad Air 11"', brand: 'Apple' }, { name: 'iPad Air 13"', brand: 'Apple' },
  { name: 'iPad mini', brand: 'Apple' }, { name: 'Galaxy Tab S10 FE', brand: 'Samsung' }, { name: 'Galaxy Tab A9+', brand: 'Samsung' }
];

/* ---------- cores (filamentos em stock) e modelos de capa ---------- */
export const CASE_COLORS = {
  grafite: { name: 'Grafite', hex: '#2b2d31' }, ardosia: { name: 'Ardósia', hex: '#59636e' }, areia: { name: 'Areia', hex: '#d3cab9' },
  salvia: { name: 'Sálvia', hex: '#8ea68b' }, marinho: { name: 'Marinho', hex: '#22364f' }, terracota: { name: 'Terracota', hex: '#b4644a' }
};
export const GRIP_COLORS = {
  preto: { name: 'Preto', hex: '#26282c' }, branco: { name: 'Branco', hex: '#efeee9' }, azul: { name: 'Azul DÍGITO', hex: '#1a73e8' },
  laranja: { name: 'Laranja sinal', hex: '#f0882a' }, amarelo: { name: 'Amarelo', hex: '#f2c230' }, menta: { name: 'Menta', hex: '#9fd6c2' }
};
export const FINISHES = {
  liso: { name: 'Essencial', desc: 'Costas lisas e mate. A mais discreta.' },
  canelado: { name: 'Canelado', desc: 'Nervuras finas ao comprido. Não escorrega e marca a direção.' },
  favo: { name: 'Favo', desc: 'Relevo hexagonal leve, a mesma estrutura que amortece por dentro.' },
  pontos: { name: 'Pontilhado', desc: 'Pequenas cavidades em grelha. Tato suave e firme.' }
};
// contraste (WCAG) entre duas cores hex — usado para recomendar pegas visíveis
function lum(hex) { const c = hex.replace('#', '').match(/../g).map(h => parseInt(h, 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
export function contrast(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
