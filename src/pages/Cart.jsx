import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, img, siteURL } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import { eur, SHIPPING, FREE_SHIPPING_FROM } from '../lib/pricing.js';
import { Plate, LCD, Led, Empty, Icon, useToast } from '../components/ui.jsx';
import { TERMS_VERSION } from '../lib/legal.js';

export default function Cart() {
  const cart = useCart(); const { user } = useAuth(); const nav = useNavigate(); const toast = useToast(); const [sp] = useSearchParams();
  const [ship, setShip] = useState('pickup'); const [addr, setAddr] = useState({ name: '', line1: '', postal: '', city: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [terms, setTerms] = useState(false); const [ack, setAck] = useState(false);
  const hasCustom = cart.items.some(i => i.design_id);
  useEffect(() => { if (sp.get('cancelado')) toast('Pagamento cancelado. O carrinho continua aqui.'); }, []); // eslint-disable-line
  const shipping = ship === 'ctt' && cart.subtotal < FREE_SHIPPING_FROM ? SHIPPING.ctt.cents : 0;
  const checkout = async () => {
    setErr('');
    if (!user) { nav('/entrar?voltar=/carrinho'); return; }
    if (!terms || (hasCustom && !ack)) { setErr(hasCustom ? 'Para continuar, aceita os Termos e confirma a condição dos produtos à medida.' : 'Para continuar, aceita os Termos de venda.'); return; }
    if (ship === 'ctt' && (!addr.name || !addr.line1 || !/^\d{4}-\d{3}$/.test(addr.postal) || !addr.city)) { setErr('Preenche a morada. O código postal tem o formato 1000-001.'); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { items: cart.items.map(i => i.listing_id ? { listing_id: i.listing_id, quantity: i.quantity } : { design_id: i.design_id, quantity: i.quantity }), shipping: ship, address: ship === 'ctt' ? addr : undefined, origin: siteURL(), terms: TERMS_VERSION, custom_ack: hasCustom ? ack : undefined }
    });
    setBusy(false);
    if (error) {
      let body = null; try { body = await error.context?.json(); } catch { /* */ }
      if (body?.error === 'payments_not_configured') setErr('Os pagamentos estão a ser ligados à nossa conta Stripe. Volta a tentar dentro de pouco tempo.');
      else if (body?.error === 'terms_required' || body?.error === 'custom_ack_required') setErr(body.message + ' Atualiza a página e tenta outra vez.');
      else if (body?.error === 'listing_unavailable') setErr('Um dos produtos deixou de estar à venda. Remove-o e tenta outra vez.');
      else if (body?.error === 'material_unavailable') setErr('Um dos teus designs usa um material que deixámos de fabricar. Abre-o no configurador, guarda-o de novo e volta a tentar.');
      else setErr(body?.message || 'Não foi possível iniciar o pagamento. Tenta outra vez.');
      return;
    }
    window.location.assign(data.url);
  };
  if (!cart.items.length) return <div className="wrap" style={{ paddingBlock: 60 }}><Empty level="h1" title="O carrinho está vazio" text="Escolhe uma peça da loja ou configura um kit à tua medida."><div className="row"><Link className="key key-dark" to="/configurar">Configurar</Link><Link className="key key-alu" to="/loja">Ir à loja</Link></div></Empty></div>;
  return (
    <div className="wrap">
      <div className="page-head"><span className="engrave">{cart.count} {cart.count === 1 ? 'artigo' : 'artigos'}</span><h1>Carrinho</h1></div>
      <div className="cart">
        <Plate pad className="list">
          {cart.items.map(i => { const k = cart.keyOf(i); return (
            <div className="row-item" key={k}>
              {i.image ? <img src={img(i.image)} alt="" /> : <span className="ph" style={{ display: 'grid', placeItems: 'center' }}><Led on /></span>}
              <div style={{ minWidth: 0 }}><h4>{i.title}</h4><span className="hint">{i.design_id ? `À medida · ${i.phone || ''}` : i.seller ? `por @${i.seller}` : 'Oficial DÍGITO'}</span>
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="key key-alu key-sm key-icon" aria-label="Menos um" onClick={() => cart.setQty(k, i.quantity - 1)}>−</button><LCD value={i.quantity} /><button className="key key-alu key-sm key-icon" aria-label="Mais um" onClick={() => cart.setQty(k, i.quantity + 1)}>+</button>
                  <button className="key key-alu key-sm" onClick={() => cart.remove(k)}>Remover</button>
                </div></div>
              <span className="price">{eur(i.price_cents * i.quantity)}</span>
            </div>); })}
        </Plate>
        <Plate screws className="cart-sum">
          <span className="engrave">Resumo</span>
          <div className="field"><span className="lbl">Entrega</span>
            <div className="keyrow">{Object.entries(SHIPPING).map(([k, s]) => <button key={k} className="key key-alu" aria-pressed={ship === k} onClick={() => setShip(k)}>{k === 'pickup' ? 'Levantar na FCT' : 'CTT'}</button>)}</div>
          </div>
          {ship === 'ctt' && <div className="field">
            <input className="input" placeholder="Nome" autoComplete="name" value={addr.name} onChange={e => setAddr(a => ({ ...a, name: e.target.value }))} />
            <input className="input" placeholder="Morada" autoComplete="address-line1" value={addr.line1} onChange={e => setAddr(a => ({ ...a, line1: e.target.value }))} />
            <div className="row"><input className="input" style={{ width: 120 }} placeholder="1000-001" autoComplete="postal-code" value={addr.postal} onChange={e => setAddr(a => ({ ...a, postal: e.target.value }))} /><input className="input" style={{ flex: 1, width: 'auto' }} placeholder="Localidade" autoComplete="address-level2" value={addr.city} onChange={e => setAddr(a => ({ ...a, city: e.target.value }))} /></div>
          </div>}
          <div className="sumline"><span>Subtotal</span><span className="price">{eur(cart.subtotal)}</span></div>
          <div className="sumline"><span>Envio</span><span className="price">{shipping ? eur(shipping) : "grátis"}</span></div>
          {ship === 'ctt' && cart.subtotal < FREE_SHIPPING_FROM && <span className="hint">Envio grátis a partir de {eur(FREE_SHIPPING_FROM)}.</span>}
          <div className="sumline total"><span>Total</span><span className="price big">{eur(cart.subtotal + shipping)}</span></div>
          {hasCustom && <div className="legal-note small"><Icon n="straighten" /><p>Os kits à medida são fabricados para ti e <b>não têm direito de livre resolução</b>. Mantêm a garantia de 3 anos contra defeitos.</p></div>}
          <label className="check"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} /><span>Li e aceito os <Link to="/termos" target="_blank">Termos de venda</Link> e a <Link to="/privacidade" target="_blank">Privacidade</Link>.</span></label>
          {hasCustom && <label className="check"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} /><span>Sei que os produtos à medida não podem ser devolvidos por desistência.</span></label>}
          {err && <p className="err" role="alert">{err}</p>}
          <button className="key key-brass key-lg" onClick={checkout} disabled={busy}>{busy ? 'A abrir o pagamento…' : user ? 'Pagar com cartão' : 'Entrar para pagar'}</button>
          <span className="hint">Pagamento seguro pela Stripe. O total é confirmado no nosso servidor. Dúvidas? <Link to="/ajuda">Fala connosco</Link>.</span>
        </Plate>
      </div>
    </div>
  );
}
