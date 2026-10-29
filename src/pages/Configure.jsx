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
import { Plate, LCD, Led, Switch, useToast } from '../components/ui.jsx';

const TYPE_PT = { sela: 'Sela', ring: 'Anel', blank: 'Tampa cega' };
const STEPS = ['Telemóvel', 'Mão', 'Pega', 'Medir', 'Afinar'];
const KEY = 'digito.cfg.v1';
const DEF = { phoneId: 'IPHONE_16_PRO_MAX', hand: 'RIGHT', sex: 'X', height: 172, style: 'PINKY_SHELF', measured: null, overrides: {}, types: ['sela', 'sela', 'sela', 'sela'], gripMat: 'FDM_PETG_CF', dropH: 1.2, step: 0, maxStep: 0 };
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
      <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={p.r * s} fill="#2a2c30" stroke="#121315" strokeWidth="1.5" />
      <rect x={cb.xmin * s} y={-cb.ymax * s} width={p.camW * s} height={p.camH * s} rx={p.camR * s} fill="#0e0f11" />
      {socks.map(k => { const fw = k.w * s * 0.95; return <g key={k.finger} transform={`translate(${k.x * s + chi * 14} ${-k.y * s}) rotate(${-k.theta})`}><rect x={-23 - chi * 6} y={-fw / 2} width="46" height={fw} rx={fw / 2} fill="#d8b9a2" opacity=".92" /></g>; })}
      {socks.map(k => <circle key={'c' + k.finger} cx={k.x * s} cy={-k.y * s} r="3.4" fill="#E9A23B" stroke="#1c1d20" strokeWidth="1" />)}
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
    E.FINGERS.forEach(f => { const [a, b] = cal[f]; x.strokeStyle = '#fff'; x.lineWidth = 2 * lw; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); handle(a, '#2a2c30', f + '0'); handle(b, '#2a2c30', f + '1'); const mm = k ? Math.hypot(a.x - b.x, a.y - b.y) * k : null; label((a.x + b.x) / 2, Math.min(a.y, b.y) - 13 * lw, mm ? fmt(mm) + ' mm' : E.FINGER_PT[f]); });
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

/* ---------------- página ---------------- */
export default function Configure() {
  const [S, setS] = useState(loadCfg);
  const set = patch => setS(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  const { user, profile, refreshProfile } = useAuth(); const cart = useCart(); const nav = useNavigate(); const toast = useToast();
  const [view, setView] = useState({ phone: true, explode: false, front: false }); const [hl, setHl] = useState(-1);
  const [name, setName] = useState('A minha DÍGITO'); const [saving, setSaving] = useState(false);
  const cv = useRef(); const V = useRef(null); const built = useRef(null);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ } }, [S]);
  // medidas guardadas no perfil
  useEffect(() => { if (profile?.hand && !S.measured && !Object.keys(S.overrides).length) { set({ measured: profile.hand }); toast('Usámos as medidas guardadas no teu perfil.'); } }, [profile?.hand]); // eslint-disable-line

  const hand = useMemo(() => handModel(S), [S]);
  const phone = E.PHONES[S.phoneId] || E.PHONES.IPHONE_16_PRO_MAX;
  const socks = useMemo(() => E.sockets(hand, phone, S.style), [hand, phone, S.style]);
  const grips = socks.map((k, i) => ({ finger: k.finger, type: S.types[i], w: k.w, x: k.x, y: k.y, theta: k.theta, role: k.role }));
  const price = designPrice(grips, S.gripMat);
  const [phys, setPhys] = useState(null);

  // viewer
  useEffect(() => {
    const v = makeViewer(cv.current, { cam: [170, 70, 330], fov: 26, minD: 150, maxD: 900, bg: '#D6D1C8', transparent: true });
    const model = new THREE.Group(); v.root.add(model);
    const pieces = { case: new THREE.Group(), grips: new THREE.Group(), phone: new THREE.Group() };
    model.add(pieces.case, pieces.grips, pieces.phone);
    V.current = { v, model, pieces, mats: makeMats(), ex: 0, fr: 0, target: { ex: 0, fr: 0 } };
    v.animate(() => {
      const st = V.current; const { ex, fr } = st.target;
      st.ex += (ex - st.ex) * 0.14; st.fr += (fr - st.fr) * 0.12;
      st.pieces.grips.children.forEach(g => { g.position.z = g.userData.z0 + st.ex * 18; });
      st.pieces.phone.position.z = -st.ex * 22; st.model.rotation.y = st.fr * Math.PI;
      return true;
    });
    return () => v.dispose();
  }, []);
  // reconstrução
  useEffect(() => {
    const t = setTimeout(() => {
      const st = V.current; if (!st) return;
      const pre = E.impact({ phone, h: S.dropH, gripMat: S.gripMat });
      const b = G.build({ phone, socks, types: S.types, gripMat: S.gripMat, tSide: pre.tSide, tCorner: pre.tCorner });
      built.current = b;
      const gripVol = b.grips.reduce((s, g) => s + g.vol, 0) / 1000;
      setPhys(E.impact({ phone, h: S.dropH, gripMat: S.gripMat, caseVolCm3: b.caseVol / 1000, gripVolCm3: gripVol, cornerVolMm3: b.cornerVol }));
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
      v.ground.position.y = -phone.L / 2 - 30; v.invalidate();
    }, 50);
    return () => clearTimeout(t);
  }, [socks, S.types, S.gripMat, S.dropH, phone]); // eslint-disable-line
  useEffect(() => { const st = V.current; if (!st) return; st.pieces.phone.visible = view.phone; st.target = { ex: view.explode ? 1 : 0, fr: view.front ? 1 : 0 }; st.v.invalidate(); }, [view]);
  useEffect(() => { const st = V.current; if (!st) return; st.pieces.grips.children.forEach((g, k) => g.userData.mat?.emissive?.set(k === hl ? '#5a3208' : '#000000')); st.v.invalidate(); }, [hl, phys]);

  const go = i => set(s => ({ step: Math.max(0, Math.min(4, i)), maxStep: Math.max(s.maxStep, i) }));
  const applyMeasure = async h => {
    set({ measured: h, overrides: {} }); go(4); toast('Medidas da foto aplicadas às quatro pegas.');
    if (user) { await supabase.from('profiles').update({ hand: h }).eq('id', user.id); refreshProfile(); }
  };

  const downloadSTL = async () => {
    const b = built.current; if (!b) return;
    const zip = new JSZip(), slug = phone.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    zip.file(`capa_${slug}_TPU95A.stl`, G.toSTL(b.caseParts));
    b.grips.forEach((g, i) => zip.file(`pega_${i + 1}_${g.sock.finger}_${S.types[i]}.stl`, G.toSTL(g.parts, new THREE.Matrix4().makeTranslation(0, 0, G.consts.PLUG_H))));
    zip.file('LEIA-ME.txt', summary() + '\n\nImpressão sugerida\nCapa: TPU 95A, camada 0,2 mm, 3 perímetros, placa traseira para baixo, sem suportes.\nPegas: camada 0,12 mm, de lado; 100 % de enchimento no macho hexagonal.\nÍmanes Ø6×2 N42 colados na sede do macho e no fundo do encaixe, com polaridades opostas.\nUnidades: mm.\n');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `digito_${slug}.zip`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Ficheiros STL descarregados.');
  };
  const summary = () => [
    `DÍGITO — ${name}`, `Telemóvel: ${phone.name}`, `Mão: ${S.hand === 'LEFT' ? 'esquerda' : 'direita'} · Pega: ${E.STYLES[S.style].name}`,
    `Medidas: ${S.measured ? 'foto calibrada com cartão ISO/IEC 7810 ID-1' : `estimativa por altura (${S.height} cm)`} · palma ${fmt(hand.palm)} mm`,
    ...grips.map((g, i) => `  ${i + 1}. ${E.FINGER_PT[g.finger].padEnd(9)} ${fmt(g.w)} mm · ${TYPE_PT[g.type]} · x ${fmt(g.x)} y ${fmt(g.y)} θ ${fmt(g.theta, 0)}°`),
    `Pegas: ${E.MATERIALS[S.gripMat].name} (${E.MATERIALS[S.gripMat].proc}) · capa TPU 95A · queda de projeto ${fmt(S.dropH)} m`, `Preço: ${eur(price)}`
  ].join('\n');
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
  return (
    <div className="cfg">
      <div className="cfg-stage">
        <canvas ref={cv} aria-label="Pré-visualização 3D da capa e das pegas. Arrasta para rodar, scroll para aproximar." />
        <div className="stage-top">
          <div className="keyrow" role="group" aria-label="Vista">
            <button className="key key-alu" aria-pressed={view.phone} onClick={() => setView(v => ({ ...v, phone: !v.phone }))}>Telemóvel</button>
            <button className="key key-alu" aria-pressed={view.explode} onClick={() => setView(v => ({ ...v, explode: !v.explode }))}>Explodir</button>
            <button className="key key-alu" aria-pressed={view.front} onClick={() => setView(v => ({ ...v, front: !v.front }))}>Frente</button>
          </div>
          <span className="bezel"><LCD value={eur(price)} /></span>
        </div>
        <div className="stage-bot">
          <Plate className="coord mono">{socks.map(k => <div key={k.finger}>{E.FINGER_PT[k.finger].padEnd(9, ' ')} x {fmt(k.x)} · y {fmt(k.y)} · θ {fmt(k.theta, 0)}°</div>)}</Plate>
        </div>
      </div>

      <Plate className="cfg-panel">
        <div className="cfg-tabs" role="tablist">
          {STEPS.map((t, i) => <button key={t} role="tab" aria-selected={S.step === i} aria-pressed={S.step === i} className="key key-alu" onClick={() => go(i)}><Led on={S.step === i || done(i)} color={done(i) ? 'green' : ''} /><span className="mono">{i + 1}</span>{t}</button>)}
        </div>

        {S.step === 0 && <section className="cfg-pane">
          <div><span className="engrave">Passo 1 de 5</span><h2>Que telemóvel tens?</h2></div>
          <div className="opts">{Object.entries(E.PHONES).map(([id, p]) => {
            const s = 0.26, w = p.W * s, h = p.L * s, cb = E.camBox(p);
            return <button key={id} className="opt" aria-pressed={S.phoneId === id} onClick={() => set({ phoneId: id })}>
              <svg width="30" height="46" viewBox={`${-w / 2 - 2} ${-h / 2 - 2} ${w + 4} ${h + 4}`} aria-hidden="true"><rect x={-w / 2} y={-h / 2} width={w} height={h} rx={p.r * s} fill="#2a2c30" /><rect x={cb.xmin * s} y={-cb.ymax * s} width={p.camW * s} height={p.camH * s} rx={p.camR * s} fill="#0e0f11" stroke="#555" strokeWidth=".4" /></svg>
              <span><b>{p.name}</b><small>{p.brand}</small></span><span className="mono">{fmt(p.L)} × {fmt(p.W)} mm</span></button>;
          })}</div>
          <p className="note">Os cortes laterais (botões e USB-C) são aproximados. Confirma-os no teu telemóvel antes de imprimir a capa.</p>
        </section>}

        {S.step === 1 && <section className="cfg-pane">
          <div><span className="engrave">Passo 2 de 5</span><h2>Fala-nos da tua mão.</h2><p className="hint">Com isto fazemos uma primeira estimativa. No passo 4 medes com uma foto.</p></div>
          <div className="field"><span className="lbl">Mão com que seguras</span><div className="keyrow">{[['RIGHT', 'Direita'], ['LEFT', 'Esquerda']].map(([k, t]) => <button key={k} className="key key-alu" aria-pressed={S.hand === k} onClick={() => set({ hand: k })}>{t}</button>)}</div></div>
          <div className="field"><span className="lbl">Sexo (ajusta a proporção)</span><div className="keyrow">{[['F', 'Feminino'], ['M', 'Masculino'], ['X', 'Prefiro não dizer']].map(([k, t]) => <button key={k} className="key key-alu" aria-pressed={S.sex === k} onClick={() => set({ sex: k })}>{t}</button>)}</div></div>
          <div className="field"><label htmlFor="h">Altura</label><div className="row"><input id="h" className="knurl" type="range" min="140" max="215" value={S.height} onChange={e => set({ height: +e.target.value })} style={{ flex: 1 }} /><LCD value={S.height} unit="cm" /></div></div>
          {S.measured && <p className="note ok">Estás a usar as medidas da foto. <button className="key key-alu key-sm" onClick={() => set({ measured: null, overrides: {} })}>Voltar à estimativa</button></p>}
          <table className="dat"><thead><tr><th>Dedo</th><th>Largura</th><th>Raio sela</th><th>Anel Ø</th></tr></thead><tbody>
            {E.FINGERS.map(f => <tr key={f}><td>{E.FINGER_PT[f]}</td><td className="n">{fmt(hand.fingers[f].w)} mm</td><td className="n">{fmt(hand.fingers[f].rs)} mm</td><td className="n">{fmt(hand.fingers[f].ring)} mm</td></tr>)}
            <tr><td>Palma</td><td className="n" colSpan="3">{fmt(hand.palm)} mm · <span className={`srcpill ${S.measured ? 'photo' : ''}`}>{S.measured ? 'foto' : 'estimativa'}</span></td></tr>
          </tbody></table>
        </section>}

        {S.step === 2 && <section className="cfg-pane">
          <div><span className="engrave">Passo 3 de 5</span><h2>Como seguras o telemóvel?</h2><p className="hint">Os desenhos usam as tuas medidas. Os pontos de latão são os encaixes.</p></div>
          <div className="opts">{Object.entries(E.STYLES).map(([id, st]) => <button key={id} className="opt style" aria-pressed={S.style === id} onClick={() => set({ style: id })}><StyleDiagram hand={hand} phoneId={S.phoneId} style={id} /><span><b>{st.name}</b><small>{st.desc}</small></span><Led on={S.style === id} /></button>)}</div>
        </section>}

        {S.step === 3 && <section className="cfg-pane">
          <div><span className="engrave">Passo 4 de 5 · opcional</span><h2>Mede a mão com uma foto.</h2></div>
          <Measure S={S} onApply={applyMeasure} />
        </section>}

        {S.step === 4 && <section className="cfg-pane">
          <div><span className="engrave">Passo 5 de 5</span><h2>Afina e encomenda.</h2></div>
          <table className="dat"><thead><tr><th>Dedo</th><th>Largura</th><th>Pega</th><th /></tr></thead><tbody>
            {socks.map((k, i) => { const f = hand.fingers[k.finger]; return (
              <tr key={k.finger} className={hl === i ? 'hl' : ''} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(-1)} onFocus={() => setHl(i)}>
                <td>{E.FINGER_PT[k.finger]}</td>
                <td><input className="input" type="number" min="12.5" max="26" step="0.1" defaultValue={f.w.toFixed(1)} key={f.w} aria-label={`Largura do ${E.FINGER_PT[k.finger]} em mm`} onBlur={e => { const v = E.clamp(+e.target.value || f.w, 12.5, 26); set(s => ({ overrides: { ...s.overrides, [k.finger]: Math.round(v * 10) / 10 } })); }} /></td>
                <td><select className="input" value={S.types[i]} aria-label={`Tipo de pega do ${E.FINGER_PT[k.finger]}`} onChange={e => set(s => { const t = s.types.slice(); t[i] = e.target.value; return { types: t }; })}>{Object.entries(TYPE_PT).map(([v, t]) => <option key={v} value={v}>{k.role === 'shelf' && v === 'sela' ? 'Apoio' : t}</option>)}</select></td>
                <td><span className={`srcpill ${f.src === 'photo' ? 'photo' : ''}`}>{{ photo: 'foto', manual: 'manual', estimate: 'estim.', ratio: 'rácio' }[f.src] || 'estim.'}</span></td>
              </tr>); })}
          </tbody></table>
          <div className="field"><span className="lbl">Material das pegas</span>
            <div className="opts">{E.GRIP_MATERIALS.map(id => { const m = E.MATERIALS[id]; return (
              <button key={id} className="opt" aria-pressed={S.gripMat === id} onClick={() => set({ gripMat: id })}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: m.metal ? 'linear-gradient(135deg,#d9dce0,#7c8086)' : m.color, boxShadow: '0 1px 2px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.3)' }} />
                <span><b>{m.name} <span className="mono" style={{ fontWeight: 400 }}>{m.proc}</span></b><small>{m.note}</small></span><span className="mono">folga {fmt(m.c, 2)}</span></button>); })}</div>
          </div>
          <div className="field"><label htmlFor="dh">Altura de queda de projeto</label><div className="row"><input id="dh" className="knurl" type="range" min="0.5" max="2" step="0.1" value={S.dropH} onChange={e => set({ dropH: +e.target.value })} style={{ flex: 1 }} /><LCD value={fmt(S.dropH)} unit="m" /></div></div>
          {phys && <div className="grid2" style={{ gap: 10 }}>
            <div className="field"><span className="lbl">Canto</span><LCD value={fmt(phys.tCorner, 2)} unit="mm" /></div>
            <div className="field"><span className="lbl">Energia a absorver</span><LCD value={fmt(phys.Ereq, 2)} unit="J" /></div>
            <div className="field" style={{ gridColumn: '1/-1' }}><span className="lbl">Pico de desaceleração no canto · G = η·h / s</span>
              <div className="gauge"><div className="row" style={{ justifyContent: 'space-between' }}><span className="hint">com capa</span><span className="mono">{phys.G.toLocaleString('pt-PT')} g</span></div><div className="gauge-bar"><i style={{ width: `${100 * phys.G / phys.Gbare}%` }} /></div>
                <div className="row" style={{ justifyContent: 'space-between' }}><span className="hint">sem capa</span><span className="mono">{phys.Gbare.toLocaleString('pt-PT')} g</span></div><div className="gauge-bar"><i className="bad" style={{ width: '100%' }} /></div></div>
            </div>
            <p className="note" style={{ gridColumn: '1/-1' }}>Modelo analítico de absorvedor ideal: curso de esmagamento {fmt(phys.stroke, 2)} mm (canto × ε<sub>D</sub>). Indicativo; a validar com ensaio de queda.</p>
          </div>}
          <div className="field"><label htmlFor="nm">Nome do design</label><input id="nm" className="input" value={name} maxLength={60} onChange={e => setName(e.target.value)} /></div>
          <div className="row">
            <button className="key key-brass key-lg" style={{ flex: 1 }} onClick={saveAndCart} disabled={saving}>{saving ? 'A guardar…' : `Adicionar ao carrinho · ${eur(price)}`}</button>
          </div>
          <div className="row"><button className="key key-alu key-sm" onClick={downloadSTL}>Descarregar STL (.zip)</button>{!user && <span className="hint">Para comprar, <Link to="/entrar?voltar=/configurar">entra na tua conta</Link>.</span>}</div>
        </section>}

        <div className="cfg-foot graphite">
          <span className="mono" style={{ fontSize: 12, color: '#BDB9B1' }}>{phone.name}<br />{E.STYLES[S.style].name}</span>
          <div className="row">
            <button className="key key-dark key-sm" disabled={S.step === 0} onClick={() => go(S.step - 1)}>Voltar</button>
            {S.step < 4 && <button className="key key-brass key-sm" onClick={() => go(S.step + 1)}>{S.step === 3 && !S.measured ? 'Saltar' : 'Seguinte'}</button>}
          </div>
        </div>
      </Plate>
    </div>
  );
}
