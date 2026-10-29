import { Link } from 'react-router-dom';
import { img, CATEGORY_PT } from '../lib/supabase.js';
import { eur } from '../lib/pricing.js';
import { Plate, Stars, Led } from './ui.jsx';
export default function ListingCard({ l }) {
  return (
    <Plate as={Link} to={`/loja/${l.slug}`} className="card">
      <div className="card-win">{l.images?.[0] && <img src={img(l.images[0])} alt="" loading="lazy" />}</div>
      <div className="card-body">
        <span className="engrave">{CATEGORY_PT[l.category]} · {l.process || '—'}</span>
        <h3>{l.title}</h3>
        <div className="card-meta">
          {l.rating_count > 0 ? <Stars value={Number(l.rating_avg)} count={l.rating_count} /> : <span className="seller-line">{l.seller ? <>por @{l.seller.username}</> : <span className="official"><Led on /> DÍGITO</span>}</span>}
          <span className="lcd"><b style={{ fontSize: '1.15em' }}>{eur(l.price_cents)}</b></span>
        </div>
      </div>
    </Plate>
  );
}
