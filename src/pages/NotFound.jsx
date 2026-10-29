import { Link } from 'react-router-dom';
import { Plate, LCD } from '../components/ui.jsx';
export default function NotFound() {
  return <div className="auth-wrap wrap"><Plate screws pad className="auth-card" style={{ textAlign: 'center', justifyItems: 'center' }}><span className="bezel"><LCD value="404" unit="mm" /></span><h1>Esta página não tem medida.</h1><p className="hint">O endereço não existe ou mudou de sítio.</p><Link className="key key-dark" to="/">Voltar ao início</Link></Plate></div>;
}
