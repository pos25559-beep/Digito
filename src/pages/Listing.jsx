import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase, img, CATEGORY_PT } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import * as E from '../lib/engine.js';
import { eur } from '../lib/pricing.js';
import { Plate, LCD, Stars, Led, Spinner, Empty, useToast } from '../components/ui.jsx';

export default function Listing() {
  const { slug } = useParams(); const nav = useNavigate(); const toast = useToast();
  const { user } = useAuth(); const cart = useCart();
  const [l, setL] = useState(undefined); const [reviews, setReviews] = useState([]); const [pic, setPic] = useState(0); const [qty, setQty] = useState(1);
  const [fav, setFav] = useState(false); const [canReview, setCanReview] = useState(false);
  const [rv, setRv] = useState({ rating: 5, body: '' }); const [busy, setBusy] = useState(false);
  const load = async () => {
    const { data } = await supabase.from('listings').select('*, seller:profiles!listings_seller_id_fkey(id,username,display_name,avatar_url)').eq('slug', slug).maybeSingle();
    setL(data || null);
    if (data) {
      const { data: r } = await supabase.from('reviews').select('*, author:profiles(username,display_name)').eq('listing_id', data.id).order('created_at', { ascending: false });
      setReviews(r || []);
    }
  };
  useEffect(() => { load(); }, [slug]); // eslint-disable-line
  useEffect(() => {
    if (!user || !l) return;
    supabase.from('favorites').select('listing_id').eq('user_id', user.id).eq('listing_id', l.id).maybeSingle().then(({ data }) => setFav(!!data));
    supabase.from('order_items').select('id, order:orders!inner(status,buyer_id)').eq('listing_id', l.id).eq('order.buyer_id', user.id).in('order.status', ['paga', 'em_impressao', 'enviada', 'entregue']).limit(1)
      .then(({ data }) => setCanReview(!!(data && data.length)));
  }, [user, l]);
  if (l === undefined) return <Spinner />;
  if (l === null) return <div className="wrap"><Empty title="Produto não encontrado" text="Pode ter sido arquivado pelo vendedor."><Link className="key key-alu" to="/loja">Voltar à loja</Link></Empty></div>;
  const add = () => { cart.add({ listing_id: l.id, title: l.title, price_cents: l.price_cents, image: l.images?.[0] || null, seller: l.seller?.username || null }, qty); toast(`${l.title} no carrinho.`); };
  const toggleFav = async () => {
    if (!user) { nav('/entrar?voltar=' + encodeURIComponent('/loja/' + slug)); return; }
    if (fav) await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', l.id); else await supabase.from('favorites').insert({ user_id: user.id, listing_id: l.id });
    setFav(!fav); toast(fav ? 'Removido dos favoritos.' : 'Guardado nos favoritos.');
  };
  const sendReview = async e => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from('reviews').upsert({ listing_id: l.id, author_id: user.id, rating: rv.rating, body: rv.body.trim() || null }, { onConflict: 'listing_id,author_id' });
    setBusy(false);
    if (error) toast('Não foi possível publicar a avaliação.'); else { toast('Avaliação publicada.'); setRv({ rating: 5, body: '' }); load(); }
  };
  const phones = (l.phone_models || []).map(p => E.PHONES[p]?.name).filter(Boolean);
  return (
    <div className="wrap">
      <div className="page-head" style={{ paddingBottom: 18 }}><Link to="/loja" className="engrave" style={{ textDecoration: 'none' }}>← Loja / {CATEGORY_PT[l.category]}</Link></div>
      <div className="pdp">
        <Plate screws className="pdp-gallery">
          <div className="pdp-main">{l.images?.[pic] ? <img src={img(l.images[pic])} alt={l.title} /> : null}</div>
          {l.images?.length > 1 && <div className="thumbs">{l.images.map((s, i) => <button key={s} aria-pressed={i === pic} onClick={() => setPic(i)} aria-label={`Imagem ${i + 1}`}><img src={img(s)} alt="" /></button>)}</div>}
        </Plate>
        <div className="pdp-info">
          <span className="engrave">{l.seller ? <>por <Link to={`/u/${l.seller.username}`}>@{l.seller.username}</Link></> : <span className="official"><Led on /> Oficial DÍGITO</span>}</span>
          <h1>{l.title}</h1>
          {l.rating_count > 0 && <Stars value={Number(l.rating_avg)} count={l.rating_count} />}
          <p style={{ fontSize: 18, color: 'var(--ink-2)' }}>{l.summary}</p>
          <Plate pad style={{ display: 'grid', gap: 16 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="bezel"><LCD value={eur(l.price_cents * qty)} /></span>
              <div className="qty" role="group" aria-label="Quantidade">
                <button className="key key-alu key-sm key-icon" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Menos um">−</button>
                <LCD value={qty} />
                <button className="key key-alu key-sm key-icon" onClick={() => setQty(q => Math.min(20, q + 1))} aria-label="Mais um">+</button>
              </div>
            </div>
            <div className="row">
              <button className="key key-dark key-lg" style={{ flex: 1 }} onClick={add}>Adicionar ao carrinho</button>
              <button className="key key-alu key-lg key-icon" onClick={toggleFav} aria-pressed={fav} aria-label={fav ? 'Remover dos favoritos' : 'Guardar nos favoritos'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={fav ? '#C98418' : 'none'} stroke={fav ? '#C98418' : 'currentColor'} strokeWidth="2" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
              </button>
            </div>
            {['capa', 'kit', 'pega'].includes(l.category) && <p className="hint">Depois da compra pedimos as medidas da tua mão. Se preferires escolher tudo já, <Link to="/configurar">configura à medida</Link>, ou <Link to="/feito-contigo">fala connosco</Link> se precisas de algo diferente.</p>}
          </Plate>
          <div style={{ whiteSpace: 'pre-line', color: 'var(--ink-2)' }}>{l.description}</div>
          <table className="spec-table"><tbody>
            {l.material && <tr><th>Material</th><td>{l.material}</td></tr>}
            {l.process && <tr><th>Processo</th><td>{l.process}</td></tr>}
            <tr><th>Encaixe</th><td className="mono">hex 10 mm · íman Ø6×2</td></tr>
            {phones.length > 0 && <tr><th>Telemóveis</th><td>{phones.join(', ')}</td></tr>}
            <tr><th>Vendidos</th><td className="mono">{l.sales_count}</td></tr>
          </tbody></table>
          <section aria-labelledby="rv-h">
            <h2 id="rv-h" style={{ fontSize: 26, marginBottom: 6 }}>Avaliações</h2>
            {canReview && <form onSubmit={sendReview} className="field" style={{ marginBlock: 12 }}>
              <span className="lbl">A tua avaliação</span>
              <div className="keyrow" role="group" aria-label="Estrelas">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} className="key key-alu" aria-pressed={rv.rating === n} onClick={() => setRv(r => ({ ...r, rating: n }))}>{n}★</button>)}</div>
              <textarea className="input" value={rv.body} onChange={e => setRv(r => ({ ...r, body: e.target.value }))} placeholder="Como se porta na mão?" maxLength={1000} />
              <button className="key key-dark" disabled={busy}>Publicar</button>
            </form>}
            {!reviews.length && <p className="hint">Ainda sem avaliações. Só quem comprou pode avaliar.</p>}
            {reviews.map(r => <div className="review" key={r.id}><div className="row" style={{ justifyContent: 'space-between' }}><b>@{r.author?.username}</b><Stars value={r.rating} /></div>{r.body && <p>{r.body}</p>}<span className="hint">{new Date(r.created_at).toLocaleDateString('pt-PT')}</span></div>)}
          </section>
        </div>
      </div>
    </div>
  );
}
