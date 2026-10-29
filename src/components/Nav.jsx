import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import { Mark } from './ui.jsx';
export default function Nav() {
  const { user, profile } = useAuth(); const { count } = useCart(); const [open, setOpen] = useState(false); const loc = useLocation();
  const initial = (profile?.display_name || profile?.username || '?').slice(0, 1).toUpperCase();
  return (
    <header className="nav graphite">
      <div className="wrap nav-in">
        <Link to="/" className="brand" aria-label="DÍGITO, início"><Mark /><span className="brand-word">DÍGITO</span></Link>
        <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Principal" onClick={() => setOpen(false)}>
          <NavLink to="/loja">Loja</NavLink>
          <NavLink to="/configurar">Configurar</NavLink>
          <NavLink to="/vender">Vender</NavLink>
          <a href={`${import.meta.env.BASE_URL}#fabrico`} onClick={e => { if (loc.pathname === '/') { e.preventDefault(); document.getElementById('fabrico')?.scrollIntoView({ behavior: 'smooth' }); } }}>Fabrico</a>
        </nav>
        <div className="nav-act">
          <Link to="/carrinho" className="key key-dark key-sm cart-btn" aria-label={`Carrinho, ${count} artigos`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /></svg>
            <span className="hide-sm">Carrinho</span>{count > 0 && <span className="badge">{count}</span>}
          </Link>
          {user
            ? <Link to="/conta" aria-label="A minha conta">{profile?.avatar_url ? <img className="avatar" src={profile.avatar_url} alt="" /> : <span className="avatar">{initial}</span>}</Link>
            : <Link to="/entrar" className="key key-brass key-sm">Entrar</Link>}
          <button className="key key-dark key-sm key-icon burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
            <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>
    </header>
  );
}
