import { createContext, useCallback, useContext, useRef, useState } from 'react';
export const Screws = () => <><i className="screw tl" /><i className="screw tr" /><i className="screw bl" /><i className="screw br" /></>;
export function Plate({ as: Tag = 'div', screws, pad, className = '', children, ...rest }) {
  return <Tag className={`plate ${pad ? 'pad' : ''} ${className}`} {...rest}>{screws && <Screws />}{children}</Tag>;
}
export function LCD({ value, unit, label, className = '', ...rest }) {
  return <span className={`lcd ${className}`} {...rest}>{label && <small>{label}</small>}<b>{value}</b>{unit && <small>{unit}</small>}</span>;
}
export const Led = ({ on, color = '' }) => <i className={`led ${color} ${on ? 'on' : ''}`} aria-hidden="true" />;
export function Stars({ value = 0, count }) {
  const full = Math.round(value);
  return <span className="stars" aria-label={`${value.toFixed ? value.toFixed(1) : value} de 5`}>{'★'.repeat(full)}{'☆'.repeat(5 - full)}{count != null && <span className="hint" style={{ marginLeft: 6 }}>({count})</span>}</span>;
}
export function Switch({ id, checked, onChange, label }) {
  return <label className="switch" htmlFor={id}><input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span className="track" />{label}</label>;
}
export function Mark({ size = 30 }) {
  // marca: falange estilizada — três segmentos arredondados do dedo, o do meio em latão (a medida)
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#17181a" stroke="#4a4d52" />
      <rect x="11.5" y="4.5" width="9" height="7" rx="3.5" fill="#E9E5DD" />
      <rect x="11" y="12.5" width="10" height="8" rx="4" fill="#E9A23B" />
      <rect x="10.5" y="21.5" width="11" height="6.5" rx="3.2" fill="#E9E5DD" />
      <path d="M6 12.5v8M4.5 12.5h3M4.5 20.5h3" stroke="#E9A23B" strokeWidth="1.2" />
    </svg>
  );
}
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(''); const [on, setOn] = useState(false); const t = useRef();
  const toast = useCallback(m => { setMsg(m); setOn(true); clearTimeout(t.current); t.current = setTimeout(() => setOn(false), 3200); }, []);
  return <ToastCtx.Provider value={toast}>{children}<div className={`toast ${on ? 'on' : ''}`} role="status" aria-live="polite"><Led on />{msg}</div></ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);
export function Empty({ title, text, children }) {
  return <div className="empty"><svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><rect x="8" y="14" width="56" height="44" rx="8" fill="none" stroke="#7C776E" strokeWidth="2" strokeDasharray="5 4" /><circle cx="36" cy="36" r="6" fill="#E9A23B" /></svg><h3 style={{ fontSize: 22 }}>{title}</h3>{text && <p>{text}</p>}{children}</div>;
}
export function Spinner() { return <div className="loading"><span className="statusline"><Led on /> a carregar…</span></div>; }
