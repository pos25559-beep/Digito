import { useEffect, useRef, useState } from 'react';
import { Icon, reducedMotion } from './ui.jsx';
import { lockPlan, LK } from '../lib/lock.js';

const pts = xy => xy.map(([x, y]) => `${x.toFixed(2)},${(-y).toFixed(2)}`).join(' ');
/* ---------- animação interativa: planta do encaixe gerada a partir da mesma geometria do configurador ---------- */
export const PHASES = [
  [0, 8.5, 'Encaixar', 'A pega entra direita, numa só orientação. As patilhas descem pelos espaços entre as abas.'],
  [8.5, 58.5, 'Rodar 60°', 'A frente chanfrada de cada patilha empurra o dente do seu braço para fora.'],
  [58.5, 60.01, 'Clique', 'A patilha passa, o braço volta e o dente fica atrás dela. A patilha fica debaixo da aba.'],
];
export default function LockAnim() {
  const [rot, setRot] = useState(60); const [play, setPlay] = useState(false);
  const raf = useRef(0); const t0 = useRef(0); const box = useRef();
  useEffect(() => {
    if (reducedMotion()) return;
    const io = new IntersectionObserver(([e]) => setPlay(e.isIntersecting), { threshold: 0.4 });
    if (box.current) io.observe(box.current); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!play) return;
    const T = 7000; t0.current = performance.now() - (rot / 60) * 3500 - 1000;
    const tick = now => {
      const t = (now - t0.current) % T;
      setRot(t < 1000 ? 0 : t < 4500 ? 60 * Math.min(1, (t - 1000) / 3500) : 60);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf.current);
  }, [play]); // eslint-disable-line
  const P = lockPlan(rot);
  const ph = rot >= 60 ? [60, 60, 'Bloqueado', 'Rodar para trás, empurrar ou puxar: nada solta a pega. Só a chave, por dentro da capa.'] : PHASES.find(([a, b]) => rot >= a && rot < b) || PHASES[0];
  const engaged = rot >= 60;
  return (
    <figure className="lockanim" ref={box}>
      <svg viewBox="-10.6 -10.6 21.2 21.2" role="img" aria-label={`Planta do DÍGITO Lock v3 vista de fora, com a pega rodada ${Math.round(rot)} graus. ${ph[2]}: ${ph[3]}`}>
        <path d={`M${pts(P.outline)}Z M${pts(P.ringIn.slice().reverse())}Z`} className="la-ins" fillRule="evenodd" />
        {P.solids.map((s, i) => <polygon key={'s' + i} points={pts(s)} className="la-ins" />)}
        {P.stops.map((s, i) => <polygon key={'t' + i} points={pts(s)} className="la-ins" />)}
        {P.arms.map(a => <polygon key={'a' + a.E} points={pts(a.xy)} className={`la-arm ${a.defl > 0.05 ? 'on' : ''}`} />)}
        <circle r={LK.r_core} className="la-plug" />
        {P.lugs.map((l, i) => <polygon key={'l' + i} points={pts(l)} className="la-plug" />)}
        {P.tabs.map((s, i) => <polygon key={'b' + i} points={pts(s)} className="la-tab" />)}
        {P.keyTabs.map((s, i) => <polygon key={'k' + i} points={pts(s)} className="la-tab key" />)}
        {engaged && P.arms.map(a => { const t = (a.E + LK.turn - LK.half - LK.tooth_clr - 4) * Math.PI / 180, r = 6.3; return <circle key={'d' + a.E} cx={r * Math.cos(t)} cy={-r * Math.sin(t)} r="0.55" className="la-dot" />; })}
      </svg>
      <figcaption>
        <div className="la-step"><span className="la-n">{Math.round(rot)}°</span><div><b>{ph[2]}</b><p>{ph[3]}</p></div></div>
        <div className="la-ctl">
          <button type="button" className="key key-line key-sm key-icon" onClick={() => setPlay(p => !p)} aria-label={play ? 'Pausar animação' : 'Reproduzir animação'}><Icon n={play ? 'pause' : 'play_arrow'} size={20} /></button>
          <input type="range" min="0" max="60" step="0.5" value={rot} onChange={e => { setPlay(false); setRot(+e.target.value); }} aria-label="Rotação da pega, em graus" />
        </div>
        <div className="la-leg"><span><i className="sw-ins" />Insert na capa (PETG)</span><span><i className="sw-arm" />Braço com dente</span><span><i className="sw-plug" />Pega</span><span><i className="sw-tab" />Abas, por cima</span></div>
      </figcaption>
    </figure>
  );
}

