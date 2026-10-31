/* DÍGITO Lock v3 — cotas e polígonos em planta (lógica pura, sem three.js). Ver eng/lock3_geom.py e ADR-003. */
const BACK = 3.2;
/* DÍGITO Lock v3 (ver eng/lock3_geom.py e ADR-003): cotas do insert e do macho, z = 0 na face do telemóvel */
export const LK = { r_core: 5.0, r_bore: 5.2, r_lug: 6.6, r_ch: 6.8, r_arm_o: 7.8, r_ring_i: 8.6, r_out: 9.2, r_tooth: 5.9,
  key_out: 0.7, key_w: 2.0, keys: [57.5, 177.5, 297.5], lugs: [0, 115, 240], turn: 60, half: 20, stop: 5, tooth_deg: 10, tooth_clr: 1.5, ramp: 5,
  z_lug0: 0.30, z_lug1: 1.70, arm_h: 1.55, push: 0.15, keyTabs: [[138.5, 155], [201, 218]] };

/* ---------- DÍGITO Lock v3: polígonos em planta (coordenadas locais do encaixe, graus) ---------- */
export const D2R = Math.PI / 180;
export function arcPts(r, a1, a2, n) { const out = []; const k = Math.max(2, n || Math.ceil(Math.abs(a2 - a1) / 3)); for (let i = 0; i <= k; i++) { const a = (a1 + (a2 - a1) * i / k) * D2R; out.push([r * Math.cos(a), r * Math.sin(a)]); } return out; }
export function sectorXY(r1, r2, a1, a2) { return [...arcPts(r2, a1, a2), ...arcPts(r1, a2, a1)]; }
// contorno exterior do insert (círculo r_out com 3 chavetas)
export function insertOutlineXY(grow = 0) {
  const out = [], n = 180, hk = (LK.key_w / 2) / LK.r_out / D2R;
  for (let i = 0; i < n; i++) {
    const a = i / n * 360; const onKey = LK.keys.some(k => Math.abs(((a - k + 540) % 360) - 180) < hk);
    const r = (onKey ? LK.r_out + LK.key_out : LK.r_out) + grow; out.push([r * Math.cos(a * D2R), r * Math.sin(a * D2R)]);
  }
  return out;
}
export function solidSectors() { return LK.lugs.map(E => [E + LK.turn - LK.half, E + LK.turn + LK.half + 1.5 + LK.stop]); }
export function armXY(E, root) {
  const tHi = E + LK.turn - LK.half - LK.tooth_clr, tLo = tHi - LK.tooth_deg;
  const outer = arcPts(LK.r_arm_o, root, tHi);
  const inner = [];
  const k = Math.ceil((tHi - root) / 2);
  for (let i = 0; i <= k; i++) {
    const a = tHi - (tHi - root) * i / k;
    let r = LK.r_ch;
    if (a >= tLo) { const t = Math.min(1, (a - tLo) / LK.ramp); r = LK.r_ch * (1 - t) + LK.r_tooth * t; }
    inner.push([r * Math.cos(a * D2R), r * Math.sin(a * D2R)]);
  }
  return [...outer, ...inner];
}

/* ---------- planta do DÍGITO Lock v3 para diagramas (SVG): mm, graus, frame do encaixe ----------
 * rot: rotação do macho desde a entrada (0) até bloqueado (60). Devolve polígonos já com a deflexão dos braços. */
export function lockPlan(rot = LK.turn) {
  const sol = solidSectors();
  const ends = Object.fromEntries(LK.lugs.map((E, i) => [E, sol[i][1]]));
  const order = [...LK.lugs].sort((p, q) => p - q);
  const arms = order.map((E, i) => {
    const prev = order[(i - 1 + order.length) % order.length]; const root = prev < E ? ends[prev] : ends[prev] - 360;
    const tHi = E + LK.turn - LK.half - LK.tooth_clr, tLo = tHi - LK.tooth_deg;
    // a patilha (E + rot ± 20) cobre o dente? -> o braço afasta-se até o dente sair do raio da patilha
    const lead = E + rot + LK.half, trail = E + rot - LK.half;
    let k = 0; if (lead > tLo && trail < tHi) k = Math.min(1, (lead - tLo) / LK.ramp, (tHi + 2 - trail) / 2);
    const defl = Math.max(0, k) * (LK.r_ch - LK.r_tooth + 0.1);
    const span = tHi - root;
    const xy = armXY(E, root).map(([x, y]) => { const a = Math.atan2(y, x) / D2R; let t = ((a - root) % 360 + 360) % 360 / span; t = Math.max(0, Math.min(1, t)); const r = Math.hypot(x, y) + defl * t * t; return [r * Math.cos(a * D2R), r * Math.sin(a * D2R)]; });
    return { E, xy, defl };
  });
  return {
    outline: insertOutlineXY(), ringIn: arcPts(LK.r_ring_i, 0, 360, 120),
    solids: sol.map(([a0, a1]) => sectorXY(LK.r_ch, LK.r_ring_i, a0, a1)), stops: sol.map(([, a1]) => sectorXY(LK.r_lug - 0.6, LK.r_ch, a1 - LK.stop, a1)),
    tabs: sol.map(([a0, a1]) => sectorXY(LK.r_bore, LK.r_ring_i, a0, a1)), keyTabs: LK.keyTabs.map(([a, b]) => sectorXY(LK.r_bore, LK.r_lug, a - 0.5, b + 0.5)),
    arms, core: arcPts(LK.r_core, 0, 360, 90),
    lugs: LK.lugs.map(E => { const a = E + rot, a0 = a - LK.half, a1 = a + LK.half; return [...arcPts(LK.r_core - 0.6, a0, a1), [(LK.r_lug - 0.6) * Math.cos(a1 * D2R), (LK.r_lug - 0.6) * Math.sin(a1 * D2R)], ...arcPts(LK.r_lug, a1 - 5, a0)]; }),
    LK
  };
}
