import { Link } from 'react-router-dom';
import { Mark } from './ui.jsx';
export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <span className="brand"><Mark /><span className="brand-word">DÍGITO</span></span>
            <p style={{ maxWidth: '34ch' }}>Capas com pegas à medida de cada dedo, pensadas para quem tem tremor, artrose ou pouca força. Impressas em 3D, uma de cada vez.</p>
          </div>
          <div><p className="foot-h">Loja</p><Link to="/loja">Todos os produtos</Link><Link to="/loja?cat=kit">Kits</Link><Link to="/configurar">Configurar à medida</Link><Link to="/feito-contigo">Pedido especial</Link></div>
          <div><p className="foot-h">Comunidade</p><Link to="/vender">Vender designs</Link><Link to="/conta">A minha conta</Link><Link to="/conta/encomendas">Encomendas</Link></div>
          <div><p className="foot-h">Projeto</p><Link to="/porque">Porque existe a DÍGITO</Link><span style={{ display: 'block', padding: '4px 0' }}>Fabrico Aditivo · FCT NOVA</span><span style={{ display: 'block', padding: '4px 0' }}>Pedro Silva, 2026</span></div>
        </div>
        <div className="foot-base"><span>© 2026 DÍGITO</span><span className="foot-legal"><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos de venda</Link><Link to="/ajuda">Ajuda e contacto</Link><a href="https://www.livroreclamacoes.pt" target="_blank" rel="noreferrer">Livro de Reclamações</a></span></div>
      </div>
    </footer>
  );
}
