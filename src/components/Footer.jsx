import { Link } from 'react-router-dom';
import { Mark } from './ui.jsx';
export default function Footer() {
  return (
    <footer className="foot graphite">
      <div className="wrap">
        <div className="foot-grid">
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <span className="brand" style={{ color: '#F1EEE7' }}><Mark /><span className="brand-word">DÍGITO</span></span>
            <p style={{ maxWidth: '34ch' }}>Capas e pegas impressas em 3D a partir das medidas dos teus dedos. Feitas em Lisboa, uma de cada vez.</p>
          </div>
          <div><h4>Loja</h4><Link to="/loja">Todos os produtos</Link><Link to="/loja?cat=kit">Kits</Link><Link to="/loja?cat=pega">Pegas</Link><Link to="/configurar">Configurar à medida</Link></div>
          <div><h4>Comunidade</h4><Link to="/vender">Vender designs</Link><Link to="/conta">A minha conta</Link><Link to="/conta/encomendas">Encomendas</Link></div>
          <div><h4>Projeto</h4><span style={{ display: 'block', padding: '3px 0' }}>Fabrico Aditivo · FCT NOVA</span><span style={{ display: 'block', padding: '3px 0' }}>Pedro Silva, 2026</span></div>
        </div>
        <div className="foot-base"><span>© 2026 DÍGITO</span><span className="mono">TPU 95A · PETG-CF · PA12 · Ti6Al4V</span></div>
      </div>
    </footer>
  );
}
