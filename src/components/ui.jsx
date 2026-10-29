import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
export const Screws = () => null;
export function Plate({ as: Tag = 'div', screws, pad, className = '', children, ...rest }) {
  return <Tag className={`plate ${pad ? 'pad' : ''} ${className}`} {...rest}>{children}</Tag>;
}
export function LCD({ value, unit, label, className = '', ...rest }) {
  return <span className={`lcd ${className}`} {...rest}>{label && <small>{label}</small>}<b>{value}</b>{unit && <small>{unit}</small>}</span>;
}
export const Icon = ({ n, fill, size, style, className = '' }) => <span className={`ms ${className}`} aria-hidden="true" style={{ ...(fill ? { fontVariationSettings: '"FILL" 1' } : null), ...(size ? { fontSize: size } : null), ...style }}>{n}</span>;
export const Led = ({ on, color = '' }) => <i className={`led ${color} ${on ? 'on' : ''}`} aria-hidden="true" />;
export function Stars({ value = 0, count }) {
  const full = Math.round(value);
  return <span className="stars" aria-label={`${Number(value).toFixed(1)} de 5`}>{'★'.repeat(full)}{'☆'.repeat(5 - full)}{count != null && <span className="hint" style={{ marginLeft: 6 }}>({count})</span>}</span>;
}
export function Switch({ id, checked, onChange, label }) {
  return <label className="switch" htmlFor={id}><input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span className="track" />{label}</label>;
}
export function Range({ id, min, max, step = 1, value, onChange, ...rest }) {
  const p = ((value - min) / (max - min)) * 100;
  return <input id={id} className="knurl" type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} style={{ '--p': p + '%' }} {...rest} />;
}
export function Mark({ size = 28 }) {
  // marca: três falanges — a do meio, a medida, em azul
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="10" y="2" width="12" height="8.5" rx="4.25" fill="#202124" />
      <rect x="9" y="11.75" width="14" height="9" rx="4.5" fill="#1A73E8" />
      <rect x="8" y="22" width="16" height="8" rx="4" fill="#202124" />
    </svg>
  );
}
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(''); const [on, setOn] = useState(false); const t = useRef();
  const toast = useCallback(m => { setMsg(m); setOn(true); clearTimeout(t.current); t.current = setTimeout(() => setOn(false), 3200); }, []);
  return <ToastCtx.Provider value={toast}>{children}<div className={`toast ${on ? 'on' : ''}`} role="status" aria-live="polite">{msg}</div></ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);
export function Empty({ title, text, children, level = 'h3' }) {
  const H = level;
  return <div className="empty"><Icon n="deployed_code" size={48} style={{ color: '#80868B' }} /><H className="empty-t">{title}</H>{text && <p>{text}</p>}{children}</div>;
}
export function Spinner() { return <div className="loading"><span className="spin" aria-label="A carregar" /></div>; }
/** revela elementos .reveal quando entram no ecrã */
export function useReveal() {
  useEffect(() => {
    document.documentElement.classList.add('js');
    const els = document.querySelectorAll('.reveal:not(.in)');
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  });
}

/** o utilizador pediu menos movimento no sistema */
export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
