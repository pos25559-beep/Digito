import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import JSZip from 'jszip';
import * as E from '../lib/engine.js';
import * as G from '../lib/geometry.js';
import * as HM from '../lib/handmeasure.js';
import { makeViewer, makeMats, gripMaterial, meshOf, disposeGroup } from '../lib/viewer.js';
import { designPrice, eur, fmt } from '../lib/pricing.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import { Plate, LCD, Led, Icon, Range, useToast, reducedMotion } from '../components/ui.jsx';

const TYPE_PT = { sela: 'Sela', ring: 'Anel', blank: 'Tampa cega' };
const TYPE_ICON = { sela: 'swipe', ring: 'radio_button_unchecked', blank: 'hexagon' };
const STEPS = ['Telemóvel', 'Mão', 'Pega', 'Medir', 'Afinar'];
const KEY = 'digito.cfg.v1';
const DEF = { needs: [], phoneId: 'IPHONE_16_PRO_MAX', hand: 'RIGHT', sex: 'X', height: 172, style: 'PINKY_SHELF', measured: null, overrides: {}, types: ['sela', 'sela', 'sela', 'sela'], gripMat: 'FDM_PETG_CF', dropH: 1.2, step: 0, maxStep: 0 };
const NEEDS = [['tremor', 'A mão treme', 'radio_button_unchecked'], ['dor', 'Os dedos doem', 'swipe'], ['forca', 'Falta força', 'back_hand']];
/** recomendação a partir das situações: estilo de pega e tipo de pega por dedo (indicador, médio, anelar, mindinho) */
function preset(needs) {
  const style = needs.includes('forca') || needs.includes('tremor') || !needs.length ? 'PINKY_SHELF' : 'FULL_4_FINGER';
  const types = ['sela', needs.includes('tremor') ? 'ring' : 'sela', 'sela', 'sela'];
  return { style, types };
}
function presetText(needs) {
  if (!needs.length) return 'Sem nenhuma situação assinalada, recomendamos o mindinho por baixo e selas em todos os dedos: a pega mais confortável para a maioria das mãos.';
  const t = [];
  if (needs.includes('tremor')) t.push('um anel no dedo médio, para o telemóvel não cair se a mão tremer');
  if (needs.includes('forca')) t.push('o mindinho por baixo, a sustentar o peso');
  if (needs.includes('dor') && !needs.includes('forca') && !needs.includes('tremor')) t.push('os quatro dedos atrás, cada um apoiado na sua sela, para não teres de apertar');
  else if (needs.includes('dor')) t.push('selas com o raio de cada dedo, para apoiar sem apertar');
  return 'Recomendamos ' + t.join('; ') + '.';
}
const loadCfg = () => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEF; } };

function handModel(S) {
  const base = S.measured ? JSON.parse(JSON.stringify(S.measured)) : E.estimateHand({ heightCm: S.height, sex: S.sex, hand: S.hand });
  base.hand = S.hand;
  E.FINGERS.forEach(f => {
    const o = S.overrides[f];
    if (o) base.fingers[f] = { ...E.fingerRecord(o, base.fingers[f].d), src: 'manual' };
    else if (!base.fingers[f].src) base.fingers[f].src = S.measured ? 'photo' : 'estimate';
  });
  return base;
}

/* ---------------- passo 3: diagramas a partir dos encaixes reais ---------------- */
function StyleDiagram({ hand, phoneId, style }) {
  const p = E.PHONES[phoneId], socks = E.sockets(hand, p, style), s = 0.42, W = p.W * s, H = p.L * s, cb = E.camBox(p), chi = hand.hand === 'LEFT' ? -1 : 1;
  return (
    <svg width="92" height="110" viewBox={`${-W / 2 - 22} ${-H / 2 - 6} ${W + 44} ${H + 12}`} aria-hidden="true">
      <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={p.r * s} fill="#3C4043" stroke="#202124" strokeWidth="1.2" />
      <rect x={cb.xmin * s} y={-cb.ymax * s} width={p.camW * s} height={p.camH * s} rx={p.camR * s} fill="#202124" />
      {socks.map(k => { const fw = k.w * s * 0.95; return <g key={k.finger} transform={`translate(${k.x * s + chi * 14} ${-k.y * s}) rotate(${-k.theta})`}><rect x={-23 - chi * 6} y={-fw / 2} width="46" height={fw} rx={fw / 2} fill="#F2C6A8" opacity=".95" /></g>; })}
      {socks.map(k => <circle key={'c' + k.finger} cx={k.x * s} cy={-k.y * s} r="3.6" fill="#1A73E8" stroke="#fff" strokeWidth="1.2" />)}
    </svg>
  );
}

/* ---------------- passo 4: medição por foto ---------------- */
function Measure({ S, onApply }) {
  const [img, setImg] = useState(null); const [lm, setLm] = useState(null);
  const [card, setCard] = useState(null); const [cal, setCal] = useState(null);
  const [status, setStatus] = useState({ t: '', s: '' }); const [over, setOver] = useState(false);
  const cv = useRef(); const box = useRef(); const drag = useRef(null); const handles = useRef([]); const scaleRef = useRef(1);
  const load = async file => {
    setStatus({ t: 'A abrir a foto…', s: 'run' });
    let im; try { im = await HM.loadImage(file); } catch { setStatus({ t: 'Não consegui abrir este ficheiro. Experimenta JPG ou PNG.', s: 'bad' }); return; }
    setImg(im); setLm(null);
    setCard([{ x: im.w * 0.58, y: im.h * 0.86 }, { x: im.w * 0.86, y: im.h * 0.86 }]);
    setCal(HM.defaultCalipers(im.w, im.h));
    setStatus({ t: 'A procurar a mão. O modelo corre no teu dispositivo; a foto não é enviada.', s: 'run' });
    try {
      const L = await HM.detectHand(im.canvas);
      if (!L) { setStatus({ t: 'Não encontrei uma mão. Coloca as réguas à mão ou tira outra foto com os dedos afastados.', s: 'bad' }); return; }
      setLm(L); setCal(HM.autoCalipers(L, im)); setStatus({ t: 'Mão encontrada. Confirma o cartão e as réguas.', s: 'ok' });
    } catch (e) { console.warn(e); setStatus({ t: 'A deteção automática não está disponível neste browser. Coloca as réguas à mão.', s: 'bad' }); }
  };
  const k = card ? HM.scaleOf(card) : null;
  const widths = cal ? HM.widthsOf(cal, k) : {};
  const hm = lm && k ? E.handFromLandmarks(lm.map(p => ({ x: p.x * k, y: p.y * k })), widths, S.hand) : null;
  const bad = v => v != null && (v < 11 || v > 28);
  const warn = hm && (hm.palm < 65 || hm.palm > 110) ? `A palma deu ${fmt(hm.palm)} mm, fora do normal (65–110 mm). Confirma que os pontos de latão estão nas pontas do lado comprido do cartão.` : Object.values(widths).some(bad) ? 'Há larguras fora de 11–28 mm. Ajusta as réguas ou o cartão.' : null;

  const draw = useCallback(() => {
    if (!img || !cv.current || !box.current) return;
    const bw = box.current.getBoundingClientRect().width; if (!bw) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), s = bw / img.w, h = img.h * s;
    scaleRef.current = s;
    const c = cv.current; c.width = Math.round(bw * dpr); c.height = Math.round(h * dpr); c.style.height = h + 'px';
    const x = c.getContext('2d'); x.setTransform(dpr * s, 0, 0, dpr * s, 0, 0); x.drawImage(img.canvas, 0, 0);
    const lw = 1 / s;
    if (lm) { x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1.5 * lw; HM.BONES.forEach(([a, b]) => { x.beginPath(); x.moveTo(lm[a].x, lm[a].y); x.lineTo(lm[b].x, lm[b].y); x.stroke(); }); x.fillStyle = '#fff'; lm.forEach(p => { x.beginPath(); x.arc(p.x, p.y, 2.5 * lw, 0, 7); x.fill(); }); }
    handles.current = [];
    const handle = (p, col, key) => { x.beginPath(); x.arc(p.x, p.y, 7.5 * lw, 0, 7); x.fillStyle = col; x.fill(); x.lineWidth = 2 * lw; x.strokeStyle = '#fff'; x.stroke(); handles.current.push({ p, key }); };
    const label = (px, py, t) => { x.font = `${12 * lw}px "B612 Mono", monospace`; const tw = x.measureText(t).width; x.fillStyle = 'rgba(185,193,165,.95)'; x.fillRect(px - tw / 2 - 5 * lw, py - 14 * lw, tw + 10 * lw, 19 * lw); x.fillStyle = '#1E2418'; x.textAlign = 'center'; x.fillText(t, px, py); };
    E.FINGERS.forEach((f, fi) => { const [a, b] = cal[f]; x.strokeStyle = '#fff'; x.lineWidth = 2 * lw; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); handle(a, '#2a2c30', f + '0'); handle(b, '#2a2c30', f + '1'); const mm = k ? Math.hypot(a.x - b.x, a.y - b.y) * k : null; label((a.x + b.x) / 2, Math.min(a.y, b.y) - (13 + (fi % 2) * 22) * lw, mm ? fmt(mm) + ' mm' : E.FINGER_PT[f]); });
    const [p, q] = card; x.strokeStyle = '#E9A23B'; x.lineWidth = 3 * lw; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(q.x, q.y); x.stroke(); handle(p, '#E9A23B', 'c0'); handle(q, '#E9A23B', 'c1'); label((p.x + q.x) / 2, (p.y + q.y) / 2 - 13 * lw, 'cartão 85,6 mm');
  }, [img, lm, card, cal, k]);
  useEffect(() => { draw(); }, [draw]);
  useEffect(() => { if (!box.current) return; const ro = new ResizeObserver(draw); ro.observe(box.current); return () => ro.disconnect(); }, [draw, img]);
  const pt = e => { const r = cv.current.getBoundingClientRect(); return { x: (e.clientX - r.left) / scaleRef.current, y: (e.clientY - r.top) / scaleRef.current }; };
  const down = e => { const p = pt(e); let best = null, bd = 28 / scaleRef.current; handles.current.forEach(h => { const d = Math.hypot(h.p.x - p.x, h.p.y - p.y); if (d < bd) { bd = d; best = h; } }); if (best) { drag.current = best.key; cv.current.setPointerCapture(e.pointerId); e.preventDefault(); } };
  const move = e => {
    if (!drag.current) return; const p = pt(e); const key = drag.current; const P = { x: Math.max(0, Math.min(img.w, p.x)), y: Math.max(0, Math.min(img.h, p.y)) };
    if (key[0] === 'c' && key.length === 2) setCard(c => key === 'c0' ? [P, c[1]] : [c[0], P]);
    else { const f = key.slice(0, -1), i = +key.slice(-1); setCal(c => ({ ...c, [f]: i === 0 ? [P, c[f][1]] : [c[f][0], P] })); }
  };
  const up = () => { drag.current = null; };
  const apply = () => {
    if (!k) return;
    if (Object.values(widths).some(v => !v || bad(v))) { setStatus({ t: 'Há larguras fora de 11–28 mm. Ajusta as réguas.', s: 'bad' }); return; }
    let hand;
    if (hm) hand = hm;
    else { hand = E.estimateHand({ heightCm: S.height, sex: S.sex, hand: S.hand }); E.FINGERS.forEach(f => { hand.fingers[f] = { ...E.fingerRecord(widths[f], hand.fingers[f].d), src: 'photo' }; }); hand.source = 'photo-manual'; }
    onApply(hand);
  };
  if (!img) return (
    <label className={`drop ${over ? 'over' : ''}`} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) load(f); }}>
      <svg width="260" height="150" viewBox="0 0 300 180" aria-hidden="true"><rect x="10" y="10" width="280" height="160" rx="6" fill="#F4F2EE" stroke="#A9A49A" /><path d="M96 162c-12-22-15-44-12-60l-17-41c-3-7 7-11 10-4l17 34-5-56c-1-8 10-9 11-1l7 51 3-60c0-8 11-8 11 0l1 61 9-53c1-8 12-6 11 2l-7 60 15-31c4-7 13-3 10 4l-19 51c-3 19-10 31-22 42z" fill="#d8b9a2" /><rect x="196" y="104" width="78" height="49" rx="4" fill="#2a2c30" /><path d="M196 160h78" stroke="#E9A23B" strokeWidth="2.5" /></svg>
      <b>Escolher ou tirar foto</b>
      <span className="hint">Mão aberta, dedos afastados, sobre uma folha branca. Um cartão bancário ou de cidadão ao lado, na mesma folha. Foto tirada de cima, a uns 30 cm.</span>
      <input type="file" accept="image/*" capture="environment" className="sr" onChange={e => { const f = e.target.files[0]; if (f) load(f); e.target.value = ''; }} />
    </label>
  );
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="statusline"><Led on={!!status.s} color={status.s === 'ok' ? 'green' : status.s === 'bad' ? 'red' : ''} /><span>{status.t}</span></div>
      <div className="measure" ref={box}><canvas ref={cv} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Foto da mão com réguas ajustáveis" /></div>
      <p className={`note ${warn ? 'warn' : ''}`}>{warn || 'Arrasta os pontos de latão para as pontas do lado comprido do cartão (85,6 mm). Depois ajusta as réguas de cada dedo às margens do dedo, na articulação do meio.'}</p>
      <table className="dat"><thead><tr><th>Dedo</th><th>Largura</th><th>Comprimento</th></tr></thead><tbody>
        {E.FINGERS.map(f => <tr key={f}><td>{E.FINGER_PT[f]}</td><td className="n" style={bad(widths[f]) ? { color: 'var(--bad)' } : null}>{widths[f] ? fmt(widths[f]) + ' mm' : '—'}</td><td className="n">{hm?.lengths?.[f] ? fmt(hm.lengths[f]) + ' mm' : '—'}</td></tr>)}
        <tr><td>Palma</td><td className="n" colSpan="2">{hm ? fmt(hm.palm) + ' mm' : '— (precisa da deteção automática)'}</td></tr>
      </tbody></table>
      <div className="row"><button className="key key-dark" onClick={apply}>Usar estas medidas</button><button className="key key-alu" onClick={() => { setImg(null); setLm(null); }}>Outra foto</button></div>
    </div>
  );
}

/* ---------------- estúdio (página) ---------------- */
// posições de câmara por passo (mm, coordenadas do modelo: z = para fora das costas)
const CAM = [
  { p: [330, 110, 380], t: [0, 0, 0] },   // telemóvel: 3/4
  { p: [50, 20, 560], t: [0, -8, 0] },    // mão: costas de frente, etiquetas legíveis
  { p: [-150, 40, 520], t: [0, -10, 0] },  // pega: costas, ligeiramente de lado
  { p: [-340, 170, 330], t: [0, 0, 0] },  // medir: vista lateral
  { p: [300, 160, 420], t: [0, 0, 0] }    // afinar: herói
];
const PHONE_ART = p => { const s = 0.5, w = p.W * s, h = p.L * s, cb = E.camBox(p); return (
  <svg width="56" height="88" viewBox={`${-w / 2 - 3} ${-h / 2 - 3} ${w + 6} ${h + 6}`} aria-hidden="true">
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={p.r * s} fill="#3C4043" />
    <rect x={cb.xmin * s} y={-cb.ymax * s} width={p.camW * s} height={p.camH * s} rx={p.camR * s} fill="#202124" stroke="#5F6368" strokeWidth=".6" />
  </svg>); };

export default function Configure() {
  const [S, setS] = useState(loadCfg);
  const set = patch => setS(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  const { user, profile, refreshProfile } = useAuth(); const cart = useCart(); const nav = useNavigate(); const toast = useToast();
  const [view, setView] = useState({ phone: true, explode: false, front: false }); const [hl, setHl] = useState(-1);
  const [name, setName] = useState('A minha DÍGITO'); const [saving, setSaving] = useState(false);
  const [welcome, setWelcome] = useState(() => !S.started);
  const cv = useRef(); const V = useRef(null); const built = useRef(null); const tagRefs = useRef([]); const scrollRef = useRef();
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ } }, [S]);
  useEffect(() => { if (profile?.hand && !S.measured && !Object.keys(S.overrides).length) { set({ measured: profile.hand }); toast('Usámos as medidas guardadas no teu perfil.'); } }, [profile?.hand]); // eslint-disable-line

  const hand = useMemo(() => handModel(S), [S]);
  const phone = E.PHONES[S.phoneId] || E.PHONES.IPHONE_16_PRO_MAX;
  const socks = useMemo(() => E.sockets(hand, phone, S.style), [hand, phone, S.style]);
  const grips = socks.map((k, i) => ({ finger: k.finger, type: S.types[i], w: k.w, x: k.x, y: k.y, theta: k.theta, role: k.role }));
  const price = designPrice(grips, S.gripMat);
  const [phys, setPhys] = useState(null);

  // ---------- viewer + câmara cinematográfica + etiquetas projetadas ----------
  useEffect(() => {
    const v = makeViewer(cv.current, { cam: CAM[0].p, fov: 24, minD: 150, maxD: 900, transparent: true, shadow: 0.12 });
    v.renderer.toneMappingExposure = 1.05;
    const model = new THREE.Group(); v.root.add(model);
    const pieces = { case: new THREE.Group(), grips: new THREE.Group(), phone: new THREE.Group() };
    model.add(pieces.case, pieces.grips, pieces.phone);
    const st = { v, model, pieces, mats: makeMats(), ex: 0, fr: 0, target: { ex: 0, fr: 0 }, tween: null, socks: [] };
    V.current = st;
    const tmp = new THREE.Vector3();
    v.animate(t => {
      st.ex += (st.target.ex - st.ex) * 0.12; st.fr += (st.target.fr - st.fr) * 0.1;
      st.pieces.grips.children.forEach(g => { g.position.z = g.userData.z0 + st.ex * 18; });
      st.pieces.phone.position.z = -st.ex * 22; st.model.rotation.y = st.fr * Math.PI;
      if (st.tween) {
        const k = Math.min(1, (t - st.tween.t0) / st.tween.d), e = 1 - Math.pow(1 - k, 4);
        v.camera.position.lerpVectors(st.tween.p0, st.tween.p1, e); v.controls.target.lerpVectors(st.tween.q0, st.tween.q1, e);
        if (k >= 1) st.tween = null;
      }
      // etiquetas: posição no ecrã do topo de cada pega
      const r = cv.current?.getBoundingClientRect();
      st.pieces.grips.children.forEach((g, i) => {
        const el = tagRefs.current[i]; if (!el || !r) return;
        tmp.set(0, 0, 11); g.localToWorld(tmp); tmp.project(v.camera);
        const behind = st.fr > 0.5;
        el.style.left = ((tmp.x + 1) / 2 * r.width) + 'px'; el.style.top = ((1 - tmp.y) / 2 * r.height - 6) + 'px';
        el.classList.toggle('hide', behind || st.hideTags);
      });
      return true;
    });
    return () => v.dispose();
  }, []);
  const flyTo = useCallback(i => {
    const st = V.current; if (!st) return; const c = CAM[i] || CAM[4];
    st.tween = { t0: performance.now(), d: reducedMotion() ? 1 : 1100, p0: st.v.camera.position.clone(), p1: new THREE.Vector3(...c.p), q0: st.v.controls.target.clone(), q1: new THREE.Vector3(...c.t) };
  }, []);
  useEffect(() => { flyTo(S.step); if (V.current) V.current.hideTags = S.step === 0; scrollRef.current?.scrollTo({ top: 0 }); }, [S.step, flyTo]);

  // ---------- reconstrução ----------
  useEffect(() => {
    const tm = setTimeout(() => {
      const st = V.current; if (!st) return;
      const pre = E.impact({ phone, h: S.dropH, gripMat: S.gripMat });
      const b = G.build({ phone, socks, types: S.types, gripMat: S.gripMat, tSide: pre.tSide, tCorner: pre.tCorner });
      built.current = b;
      setPhys(E.impact({ phone, h: S.dropH, gripMat: S.gripMat, caseVolCm3: b.caseVol / 1000, gripVolCm3: b.grips.reduce((s, g) => s + g.vol, 0) / 1000, cornerVolMm3: b.cornerVol }));
      const { pieces, mats, v } = st;
      disposeGroup(pieces.case); disposeGroup(pieces.grips); disposeGroup(pieces.phone);
      b.caseParts.forEach(g => pieces.case.add(meshOf(g, mats.case)));
      const gm = gripMaterial(S.gripMat);
      b.grips.forEach(gr => {
        const grp = new THREE.Group(); const mat = gm.clone(); grp.userData.mat = mat;
        gr.parts.forEach(g => grp.add(meshOf(g, mat)));
        grp.position.set(gr.sock.x, gr.sock.y, G.consts.BACK + G.consts.BOSS_H); grp.userData.z0 = grp.position.z; grp.rotation.z = gr.sock.theta * Math.PI / 180;
        pieces.grips.add(grp);
      });
      const ph = G.phoneGroup(phone, mats); ph.children.forEach(c => { c.castShadow = true; }); pieces.phone.add(...ph.children);
      pieces.phone.visible = view.phone;
      v.ground.position.y = -phone.L / 2 - 30; v.invalidate();
    }, 40);
    return () => clearTimeout(tm);
  }, [socks, S.types, S.gripMat, S.dropH, phone]); // eslint-disable-line
  useEffect(() => { const st = V.current; if (!st) return; st.pieces.phone.visible = view.phone; st.target = { ex: view.explode ? 1 : 0, fr: view.front ? 1 : 0 }; st.v.invalidate(); }, [view]);
  useEffect(() => { const st = V.current; if (!st) return; st.pieces.grips.children.forEach((g, k) => g.userData.mat?.emissive?.set(k === hl ? '#0b3a8a' : '#000000')); st.v.invalidate(); }, [hl, phys]);
  // explodir brevemente ao entrar no passo final (mostra o encaixe)
  useEffect(() => { if (S.step !== 4 || welcome || reducedMotion()) return; setView(v => ({ ...v, explode: true })); const t = setTimeout(() => setView(v => ({ ...v, explode: false })), 1600); return () => clearTimeout(t); }, [S.step, welcome]);

  const go = i => set(s => ({ step: Math.max(0, Math.min(4, i)), maxStep: Math.max(s.maxStep, i) }));
  const applyMeasure = async h => {
    set({ measured: h, overrides: {} }); go(4); toast('Medidas da foto aplicadas às quatro pegas.');
    if (user) { await supabase.from('profiles').update({ hand: h }).eq('id', user.id); refreshProfile(); }
  };
  const setW = (finger, w) => set(s => ({ overrides: { ...s.overrides, [finger]: Math.round(E.clamp(w, 12.5, 26) * 10) / 10 } }));

  const summary = () => [
    `DÍGITO — ${name}`, `Telemóvel: ${phone.name}`, `Mão: ${S.hand === 'LEFT' ? 'esquerda' : 'direita'} · Pega: ${E.STYLES[S.style].name}`,
    `Medidas: ${S.measured ? 'foto calibrada com cartão ISO/IEC 7810 ID-1' : `estimativa por altura (${S.height} cm)`} · palma ${fmt(hand.palm)} mm`,
    ...grips.map((g, i) => `  ${i + 1}. ${E.FINGER_PT[g.finger].padEnd(9)} ${fmt(g.w)} mm · ${TYPE_PT[g.type]} · x ${fmt(g.x)} y ${fmt(g.y)} θ ${fmt(g.theta, 0)}°`),
    `Pegas: ${E.MATERIALS[S.gripMat].name} (${E.MATERIALS[S.gripMat].proc}) · capa TPU 95A · queda de projeto ${fmt(S.dropH)} m`, `Preço: ${eur(price)}`
  ].join('\n');
  const downloadSTL = async () => {
    const b = built.current; if (!b) return;
    const zip = new JSZip(), slug = phone.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    zip.file(`capa_${slug}_TPU95A.stl`, G.toSTL(b.caseParts));
    b.grips.forEach((g, i) => zip.file(`pega_${i + 1}_${g.sock.finger}_${S.types[i]}.stl`, G.toSTL(g.parts, new THREE.Matrix4().makeTranslation(0, 0, G.consts.PLUG_H))));
    zip.file('LEIA-ME.txt', summary() + '\n\nImpressão sugerida\nCapa: TPU 95A, camada 0,2 mm, 3 perímetros, placa traseira para baixo, sem suportes.\nPegas: camada 0,12 mm, de lado; 100 % de enchimento no macho.\nUnidades: mm.\n');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `digito_${slug}.zip`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Ficheiros STL descarregados.');
  };
  const saveAndCart = async () => {
    if (!user) { toast('Entra na tua conta para guardar o design.'); nav('/entrar?voltar=/configurar'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('designs').insert({ user_id: user.id, name: name.trim().slice(0, 60) || 'A minha DÍGITO', phone_model: S.phoneId, grip_style: S.style, hand, grips, grip_material: S.gripMat, drop_height: S.dropH, price_cents: price }).select().single();
    setSaving(false);
    if (error) { toast('Não foi possível guardar o design. Tenta outra vez.'); return; }
    cart.add({ design_id: data.id, title: `Kit à medida — ${data.name}`, price_cents: price, image: null, phone: phone.name });
    toast('Design guardado e adicionado ao carrinho.'); nav('/carrinho');
  };

  const done = i => i < S.maxStep && i !== S.step;
  const srcTxt = s => ({ photo: 'foto', manual: 'manual', estimate: 'estimativa', ratio: 'rácio' }[s] || 'estimativa');
  const mt = E.MATERIALS[S.gripMat];
  return (
    <div className="studio">
      <div className="st-stage">
        <canvas ref={cv} aria-label="Pré-visualização 3D da tua capa. Arrasta para rodar, scroll para aproximar." />
        <div className="st-tags" aria-hidden="true">
          {socks.map((k, i) => <span key={k.finger} ref={el => { tagRefs.current[i] = el; }} className={`st-tag ${hl === i ? 'hl' : ''}`}>{E.FINGER_PT[k.finger]} <b>{fmt(k.w, 1)} mm</b></span>)}
        </div>
        <span className="st-hint"><Icon n="3d_rotation" />Arrasta para rodar</span>
        <div className="st-view" role="group" aria-label="Vista">
          <button aria-pressed={view.phone} onClick={() => setView(v => ({ ...v, phone: !v.phone }))}><Icon n="smartphone" />Telemóvel</button>
          <button aria-pressed={view.explode} onClick={() => setView(v => ({ ...v, explode: !v.explode }))}><Icon n="layers" />Explodir</button>
          <button aria-pressed={view.front} onClick={() => setView(v => ({ ...v, front: !v.front }))}><Icon n="restart_alt" />Virar</button>
        </div>
      </div>

      <nav className="st-rail" aria-label="Passos">
        {STEPS.map((t, i) => <button key={t} aria-current={S.step === i ? 'step' : undefined} className={done(i) ? 'done' : ''} onClick={() => go(i)}><span className="dotn">{done(i) ? 'check' : i + 1}</span>{t}</button>)}
      </nav>

      <aside className="st-panel" aria-label="Configuração">
        <div className="st-scroll" ref={scrollRef}>
          <div className="st-anim" key={S.step} style={{ display: 'grid', gap: 24 }}>
            {S.step === 0 && <>
              <div className="st-head"><span className="eyebrow">Passo 1 de 5</span><h2>Que telemóvel tens?</h2><p>A capa é desenhada à volta das medidas exatas do teu modelo.</p></div>
              <div className="pick">{Object.entries(E.PHONES).map(([id, p]) => (
                <button key={id} className="pk" aria-pressed={S.phoneId === id} onClick={() => set({ phoneId: id })}>
                  <span className="art">{PHONE_ART(p)}</span><b>{p.name}</b><small className="mono">{fmt(p.L)} × {fmt(p.W)} mm</small>
                </button>))}</div>
              <p className="note">Os cortes dos botões e da porta USB-C são aproximados. Confirma-os no teu telemóvel antes de imprimir.</p>
            </>}

            {S.step === 1 && <>
              <div className="st-head"><span className="eyebrow">Passo 2 de 5</span><h2>Fala-nos da tua mão</h2><p>Fazemos já uma estimativa. No passo 4 medes com uma foto.</p></div>
              <div className="field"><span className="lbl">Mão com que seguras</span><div className="seg">{[['RIGHT', 'Direita'], ['LEFT', 'Esquerda']].map(([k, t]) => <button key={k} aria-pressed={S.hand === k} onClick={() => set({ hand: k })}>{t}</button>)}</div></div>
              <div className="field"><span className="lbl">Proporção da mão</span><div className="seg">{[['F', 'Feminina'], ['M', 'Masculina'], ['X', 'Média']].map(([k, t]) => <button key={k} aria-pressed={S.sex === k} onClick={() => set({ sex: k })}>{t}</button>)}</div></div>
              <div className="field"><label htmlFor="h">Altura</label><div className="bignum"><b>{S.height}</b><span>cm</span></div><Range id="h" min={140} max={215} value={S.height} onChange={v => set({ height: v })} /></div>
              {S.measured && <p className="note ok">Estás a usar as medidas da tua foto. <button className="key key-ghost key-sm" onClick={() => set({ measured: null, overrides: {} })}>Voltar à estimativa</button></p>}
              <div className="fingers">{E.FINGERS.map(f => <div key={f} className="fg"><span>{E.FINGER_PT[f]}</span><b>{fmt(hand.fingers[f].w, 1)}</b><span>mm</span></div>)}</div>
              <span className="hint">Palma {fmt(hand.palm)} mm · {S.measured ? 'medida na foto' : 'estimativa pela altura'}</span>
            </>}

            {S.step === 2 && <>
              <div className="st-head"><span className="eyebrow">Passo 3 de 5</span><h2>Como seguras o telemóvel?</h2><p>Partimos do que é difícil para ti. Os desenhos usam as tuas medidas e os pontos azuis são os encaixes.</p></div>
              <div className="field"><span className="lbl">O que é difícil para ti?</span>
                <div className="pills">{NEEDS.map(([v, t, ic]) => { const on = S.needs.includes(v); return <button type="button" key={v} className={`pill ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => set(s => ({ needs: on ? s.needs.filter(x => x !== v) : [...s.needs, v] }))}><Icon n={on ? 'check' : ic} size={18} />{t}</button>; })}</div>
              </div>
              <div className="reco"><Icon n="lightbulb" /><div><p>{presetText(S.needs)}</p>{(() => { const p = preset(S.needs); const same = p.style === S.style && p.types.every((t, i) => t === S.types[i]); return same ? <span className="hint">Recomendação aplicada.</span> : <button type="button" className="key key-line key-sm" onClick={() => set(p)}>Aplicar recomendação</button>; })()}</div></div>
              <div className="pick pick-1">{Object.entries(E.STYLES).filter(([id]) => id !== 'CAMERA_CLAW' || S.style === 'CAMERA_CLAW').map(([id, st]) => (
                <button key={id} className="pk wide" aria-pressed={S.style === id} onClick={() => set({ style: id })}>
                  <span className="art"><StyleDiagram hand={hand} phoneId={S.phoneId} style={id} /></span>
                  <span style={{ display: 'grid', gap: 4 }}><b>{st.name}</b><small>{st.desc}</small></span>
                </button>))}</div>
              {S.style !== 'CAMERA_CLAW' && <details className="more"><summary>Outras formas de segurar</summary>
                <button className="pk wide" aria-pressed={false} onClick={() => set({ style: 'CAMERA_CLAW' })}>
                  <span className="art"><StyleDiagram hand={hand} phoneId={S.phoneId} style="CAMERA_CLAW" /></span>
                  <span style={{ display: 'grid', gap: 4 }}><b>{E.STYLES.CAMERA_CLAW.name}</b><small>{E.STYLES.CAMERA_CLAW.desc}</small></span>
                </button></details>}
            </>}

            {S.step === 3 && <>
              <div className="st-head"><span className="eyebrow">Passo 4 de 5 · opcional</span><h2>Mede a mão com uma foto</h2><p>Mão aberta sobre uma folha branca, um cartão ao lado. Demora menos de um minuto.</p></div>
              <Measure S={S} onApply={applyMeasure} />
            </>}

            {S.step === 4 && <>
              <div className="st-head"><span className="eyebrow">Passo 5 de 5</span><h2>Afina cada pega</h2><p>Toca ou passa por cima de um dedo para o ver destacado no modelo.</p></div>
              <div style={{ display: 'grid', gap: 10 }}>
                {socks.map((k, i) => { const f = hand.fingers[k.finger]; return (
                  <div key={k.finger} className={`gripcard ${hl === i ? 'hl' : ''}`} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(-1)} onFocus={() => setHl(i)} onClick={() => setHl(i)}>
                    <div className="gripcard-head">
                      <span><b>{E.FINGER_PT[k.finger]}</b> <span className={`srcpill ${f.src === 'photo' ? 'photo' : ''}`}>{srcTxt(f.src)}</span></span>
                      <span className="stepper" role="group" aria-label={`Largura do ${E.FINGER_PT[k.finger]}`}>
                        <button onClick={() => setW(k.finger, f.w - 0.1)} aria-label="Menos 0,1 mm"><Icon n="remove" size={20} /></button>
                        <span>{fmt(f.w, 1)} mm</span>
                        <button onClick={() => setW(k.finger, f.w + 0.1)} aria-label="Mais 0,1 mm"><Icon n="add" size={20} /></button>
                      </span>
                    </div>
                    <div className="typeicons" role="group" aria-label={`Tipo de pega do ${E.FINGER_PT[k.finger]}`}>
                      {Object.entries(TYPE_PT).map(([v, t]) => <button key={v} aria-pressed={S.types[i] === v} onClick={() => set(s => { const tt = s.types.slice(); tt[i] = v; return { types: tt }; })}><Icon n={TYPE_ICON[v]} size={22} />{k.role === 'shelf' && v === 'sela' ? 'Apoio' : t}</button>)}
                    </div>
                  </div>); })}
              </div>
              <div className="field"><span className="lbl">Material das pegas</span>
                <div className="swatches">{E.GRIP_MATERIALS.map(id => { const m = E.MATERIALS[id]; return (
                  <button key={id} className="sw" aria-pressed={S.gripMat === id} onClick={() => set({ gripMat: id })}>
                    <i style={{ background: m.metal ? 'linear-gradient(135deg,#e4e6e9,#8e9298 45%,#cfd2d6 60%,#7c8086)' : id === 'SLA_TOUGH' ? 'radial-gradient(circle at 35% 30%, #6b7484, #2d3440 70%)' : id === 'SLS_PA12' ? 'radial-gradient(circle at 40% 30%, #75767a, #3b3c3f 80%)' : 'repeating-linear-gradient(45deg,#2b2d31 0 2px,#3a3d42 2px 4px)' }} />
                    <b>{m.name}</b><small>{m.proc}</small></button>); })}</div>
                <span className="hint">{mt.note} Folga do encaixe {fmt(mt.c, 2)} mm.</span>
              </div>
              <div className="field">
                <div className="row" style={{ justifyContent: 'space-between' }}><label htmlFor="dh">Altura de queda de projeto</label><span className="mono" style={{ color: 'var(--ink)' }}>{fmt(S.dropH)} m</span></div>
                <Range id="dh" min={0.5} max={2} step={0.1} value={S.dropH} onChange={v => set({ dropH: v })} />
                {phys && <div className="statgrid">
                  <div className="stat"><span>Canto</span><b>{fmt(phys.tCorner, 1)} mm</b></div>
                  <div className="stat"><span>Energia</span><b>{fmt(phys.Ereq, 2)} J</b></div>
                  <div className="stat"><span>Pico no canto</span><b>−{phys.reduction} %</b></div>
                </div>}
                {phys && <span className="hint">Modelo analítico: {phys.G.toLocaleString('pt-PT')} g com capa contra {phys.Gbare.toLocaleString('pt-PT')} g sem capa. A validar com ensaio de queda.</span>}
              </div>
              <div className="field"><label htmlFor="nm">Nome do design</label><input id="nm" className="input" value={name} maxLength={60} onChange={e => setName(e.target.value)} /></div>
              <div className="row"><button className="key key-line key-sm" onClick={downloadSTL}><Icon n="download" size={20} />Descarregar STL</button>{!user && <span className="hint">Para comprar, <Link to="/entrar?voltar=/configurar">entra na tua conta</Link>.</span>}</div>
              <Link className="custom-cta" to={`/feito-contigo?telemovel=${encodeURIComponent(phone.name)}#pedido`}><Icon n="forum" /><span><b>Não é bem isto?</b>Fala connosco e fazemos uma capa contigo.</span><Icon n="arrow_forward" size={20} /></Link>
            </>}
          </div>
        </div>
        <div className="st-foot">
          <div className="st-price"><span>{phone.name}</span><b>{eur(price)}</b></div>
          <span className="spacer" />
          {S.step > 0 && <button className="key key-ghost key-icon" onClick={() => go(S.step - 1)} aria-label="Passo anterior"><Icon n="arrow_back" /></button>}
          {S.step < 4
            ? <button className="key key-dark" onClick={() => go(S.step + 1)}>{S.step === 3 && !S.measured ? 'Saltar' : 'Continuar'}<Icon n="arrow_forward" size={20} /></button>
            : <button className="key key-dark" onClick={saveAndCart} disabled={saving}><Icon n="shopping_bag" size={20} />{saving ? 'A guardar…' : <>Adicionar<span className="wide-only"> ao carrinho</span></>}</button>}
        </div>
      </aside>

      {welcome && (
        <div className="welcome">
          <div className="welcome-card">
            <span style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--blue-t)', display: 'grid', placeItems: 'center', color: 'var(--blue)' }}><Icon n="front_hand" size={36} /></span>
            <h1>Vamos criar a tua DÍGITO</h1>
            <p>Cinco passos, cerca de três minutos. A capa à tua volta muda a cada escolha que fazes.</p>
            <fieldset className="need-pick">
              <legend>O que é difícil para ti? <span className="hint">Podes escolher mais do que uma, ou nenhuma.</span></legend>
              <div className="pills">{NEEDS.map(([v, t, ic]) => { const on = S.needs.includes(v); return <button type="button" key={v} className={`pill big ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => set(s => ({ needs: on ? s.needs.filter(x => x !== v) : [...s.needs, v] }))}><Icon n={on ? 'check' : ic} size={20} />{t}</button>; })}</div>
            </fieldset>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="key key-dark key-lg" onClick={() => { setWelcome(false); set(s => ({ started: true, step: 0, ...preset(s.needs) })); }}>Começar</button>
              {S.maxStep > 0 && <button className="key key-alu key-lg" onClick={() => { setWelcome(false); set({ started: true }); }}>Continuar onde fiquei</button>}
            </div>
            <p className="hint">Precisas de algo que o configurador não faz? <Link to="/feito-contigo">Faz um pedido especial</Link>.</p>
          </div>
        </div>
      )}
    </div>
  );
}
