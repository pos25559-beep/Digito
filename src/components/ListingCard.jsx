import { Link } from 'react-router-dom';
import { img, CATEGORY_PT } from '../lib/supabase.js';
import { eur } from '../lib/pricing.js';
import { Stars, Led } from './ui.jsx';
const NEED_PT = { tremor: 'Tremor', dor: 'Dor', forca: 'Pouca força' };
export default function ListingCard({ l }) {
  return (
    <Link to={`/loja/${l.slug}`} className="card">
      <div className="card-win">{l.images?.[0] && <img src={img(l.images[0])} alt="" loading="lazy" />}</div>
      <div className="card-body">
        <span className="hint">{CATEGORY_PT[l.category]}{l.process ? ` · ${l.process}` : ''}</span>
        <h3>{l.title}</h3>
        {l.summary && <p className="card-sum">{l.summary}</p>}
        {l.needs?.length > 0 && <div className="card-needs">{l.needs.map(n => <span key={n} className={`need-mini n-${n}`}>{NEED_PT[n]}</span>)}</div>}
        <div className="card-meta">
          {l.rating_count > 0 ? <Stars value={Number(l.rating_avg)} count={l.rating_count} /> : <span className="seller-line">{l.seller ? <>por @{l.seller.username}</> : <span className="official"><Led on /> DÍGITO</span>}</span>}
          <span className="price">{eur(l.price_cents)}</span>
        </div>
      </div>
    </Link>
  );
}
