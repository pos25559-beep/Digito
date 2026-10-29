import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import { Mark, Icon } from './ui.jsx';
export default function Nav() {
  const { user, profile } = useAuth(); const { count } = useCart(); const [open, setOpen] = useState(false); const [sc, setSc] = useState(false);
  useEffect(() => { const f = () => setSc(window.scrollY > 4); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  const initial = (profile?.display_name || profile?.username || '?').slice(0, 1).toUpperCase();
  return (
    <header className={`nav ${sc ? 'scrolled' : ''}`}>
      <div className="wrap nav-in">
        <Link to="/" className="brand" aria-label="DÍGITO, início"><Mark /><span className="brand-word">DÍGITO</span></Link>
        <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Principal" onClick={() => setOpen(false)}>
          <NavLink to="/" end>Visão geral</NavLink>
          <NavLink to="/loja">Loja</NavLink>
          <NavLink to="/configurar">Configurar</NavLink>
          <NavLink to="/vender">Vender</NavLink>
        </nav>
        <div className="nav-act">
          <Link to="/carrinho" className="key key-ghost key-icon cart-btn" aria-label={`Carrinho, ${count} artigos`} style={{ color: 'var(--ink-2)' }}>
            <Icon n="shopping_bag" />{count > 0 && <span className="badge">{count}</span>}
          </Link>
          {user
            ? <Link to="/conta" aria-label="A minha conta">{profile?.avatar_url ? <img className="avatar" src={profile.avatar_url} alt="" /> : <span className="avatar">{initial}</span>}</Link>
            : <Link to="/entrar" className="key key-line key-sm hide-sm">Entrar</Link>}
          <Link to="/configurar" className="key key-dark key-sm hide-sm">Configurar a capa</Link>
          <button className="key key-ghost key-icon burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(o => !o)} style={{ color: 'var(--ink-2)' }}><Icon n={open ? 'close' : 'menu'} /></button>
        </div>
      </div>
    </header>
  );
}
