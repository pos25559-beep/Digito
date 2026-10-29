import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase, STATUS_PT } from '../lib/supabase.js';
import { useCart } from '../lib/cart.jsx';
import { eur } from '../lib/pricing.js';
import { Plate, Led, LCD } from '../components/ui.jsx';
export default function OrderSuccess() {
  const [sp] = useSearchParams(); const id = sp.get('order'); const cart = useCart(); const [o, setO] = useState(null);
  useEffect(() => { if (id) cart.clear(); }, [id]); // eslint-disable-line
  useEffect(() => {
    if (!id) return; let n = 0, t;
    const poll = async () => { if (n === 0 || n % 2 === 0) await supabase.functions.invoke('confirm-order', { body: { order_id: id } }).catch(() => {}); const { data } = await supabase.from('orders').select('*, items:order_items(*)').eq('id', id).maybeSingle(); setO(data); if (data && data.status === 'pendente' && n++ < 10) t = setTimeout(poll, 2000); };
    poll(); return () => clearTimeout(t);
  }, [id]);
  if (!id) return (
    <div className="auth-wrap wrap">
      <Plate pad className="auth-card" style={{ width: 'min(100%, 560px)' }}>
        <h1>Não encontrámos esta encomenda</h1>
        <p>Esta página abre depois de um pagamento. Se pagaste há pouco, a encomenda aparece na tua conta.</p>
        <div className="row"><Link className="key key-dark" to="/conta/encomendas">Ver encomendas</Link><Link className="key key-alu" to="/loja">Ir à loja</Link></div>
      </Plate>
    </div>
  );
  return (
    <div className="auth-wrap wrap">
      <Plate screws pad className="auth-card" style={{ width: 'min(100%, 560px)' }}>
        <span className="statusline"><Led on color={o?.status === 'paga' ? 'green' : ''} /> {o ? STATUS_PT[o.status] : 'a confirmar'}</span>
        <h1>{o?.status === 'paga' ? 'Pagamento recebido.' : 'A confirmar o pagamento…'}</h1>
        <p>{o?.status === 'paga' ? 'A tua encomenda entra na fila de impressão. Acompanhas o estado na tua conta.' : 'A Stripe está a confirmar. Esta página atualiza sozinha.'}</p>
        {o && <><div className="list">{o.items?.map(i => <div key={i.id} className="sumline"><span>{i.quantity} × {i.title}</span><span className="price">{eur(i.unit_price_cents * i.quantity)}</span></div>)}</div>
          <div className="sumline total"><span>Total</span><span className="price big">{eur(o.total_cents)}</span></div></>}
        <div className="row"><Link className="key key-dark" to="/conta/encomendas">Ver encomendas</Link><Link className="key key-alu" to="/loja">Continuar a ver</Link></div>
      </Plate>
    </div>
  );
}
