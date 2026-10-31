import { Component } from 'react';

/** Se uma parte da página falhar, mostra uma mensagem no sítio dela em vez de deixar o site em branco. */
export default class Boundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('[DÍGITO] erro numa secção', err, info?.componentStack); }
  componentDidUpdate(prev) { if (this.state.err && prev.resetKey !== this.props.resetKey) this.setState({ err: null }); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="boundary" role="alert">
        <b>{this.props.title || 'Esta parte da página não carregou.'}</b>
        <p>Pedimos desculpa. Recarrega a página; se voltar a acontecer, escreve-nos.</p>
        <button type="button" className="key key-line key-sm" onClick={() => location.reload()}>Recarregar</button>
      </div>
    );
  }
}
