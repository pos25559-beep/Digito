/* Medição da mão por foto: MediaPipe Hands (local, no browser) + cartão ISO/IEC 7810 ID-1 como escala. */
import * as E from './engine.js';
import { BASE } from './supabase.js';
export const CARD_MM = 85.6;
const FIN_IDX = { index: [5, 6, 7, 8], middle: [9, 10, 11, 12], ring: [13, 14, 15, 16], pinky: [17, 18, 19, 20] };
const RATIO = { index: 0.375, middle: 0.355, ring: 0.348, pinky: 0.365 };
let handsP = null;
const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
function getHands() {
  if (handsP) return handsP;
  const base = new URL(BASE + '/mp/', window.location.origin).href;
  handsP = (async () => {
    if (!window.Hands) await loadScript(base + 'hands.js');
    const h = new window.Hands({ locateFile: f => base + f });
    h.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.4, minTrackingConfidence: 0.4, selfieMode: false });
    await h.initialize();
    return h;
  })();
  handsP.catch(() => { handsP = null; });
  return handsP;
}
export async function detectHand(canvas) {
  const h = await Promise.race([getHands(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 30000))]);
  return new Promise((resolve, reject) => {
    h.onResults(r => { const L = r.multiHandLandmarks && r.multiHandLandmarks[0]; resolve(L ? L.map(p => ({ x: p.x * canvas.width, y: p.y * canvas.height })) : null); });
    h.send({ image: canvas }).catch(reject);
  });
}
export async function loadImage(file) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { bmp = await createImageBitmap(file); }
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(bmp, 0, 0, c.width, c.height);
  return { canvas: c, w: c.width, h: c.height, data: cx.getImageData(0, 0, c.width, c.height).data };
}
export function defaultCalipers(w, h) {
  const cal = {}; E.FINGERS.forEach((f, i) => { const x = w * (0.3 + i * 0.1), y = h * 0.4; cal[f] = [{ x: x - w * 0.02, y }, { x: x + w * 0.02, y }]; }); return cal;
}
/** Largura automática: a partir da articulação do meio, caminha na normal ao osso até a cor deixar de ser pele. */
export function autoCalipers(lm, img) {
  const { data: D, w: W, h: H } = img, cal = {};
  const px = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return null; const o = (y * W + x) * 4; return [D[o], D[o + 1], D[o + 2]]; };
  const avg = (x, y, r = 2) => { const s = [0, 0, 0]; let n = 0; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const c = px(x + dx, y + dy); if (c) { s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; n++; } } return n ? s.map(v => v / n) : [0, 0, 0]; };
  const dist = (a, b) => { const la = (a[0] + a[1] + a[2]) / 3, lb = (b[0] + b[1] + b[2]) / 3; const ca = a.map(v => v - la), cb = b.map(v => v - lb); return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]) * 1.6 + Math.abs(la - lb) * 0.6; };
  E.FINGERS.forEach(f => {
    const [m, p, d] = FIN_IDX[f], P = lm[p], A = lm[m], B = lm[d];
    const L = Math.hypot(B.x - A.x, B.y - A.y) || 1, ux = (B.x - A.x) / L, uy = (B.y - A.y) / L, nx = -uy, ny = ux;
    const skin = avg(P.x, P.y, 2), exp = L * RATIO[f];
    const walk = sgn => {
      const bg = avg(P.x + sgn * nx * exp * 1.3, P.y + sgn * ny * exp * 1.3, 2);
      const tau = Math.max(18, 0.5 * dist(skin, bg)); let run = 0;
      for (let t = 2; t < exp * 1.1; t += 0.5) { const c = avg(P.x + sgn * nx * t, P.y + sgn * ny * t, 1); if (dist(c, skin) > tau) { if (++run >= 3) return t - 1.0; } else run = 0; }
      return exp / 2;
    };
    const a = walk(1), b = walk(-1);
    cal[f] = [{ x: P.x + nx * a, y: P.y + ny * a }, { x: P.x - nx * b, y: P.y - ny * b }];
  });
  return cal;
}
export const scaleOf = card => { const d = Math.hypot(card[0].x - card[1].x, card[0].y - card[1].y); return d > 5 ? CARD_MM / d : null; };
export function widthsOf(cal, k) { const o = {}; E.FINGERS.forEach(f => { const [a, b] = cal[f]; o[f] = k ? Math.hypot(a.x - b.x, a.y - b.y) * k : null; }); return o; }
export const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];
