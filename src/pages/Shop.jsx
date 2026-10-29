import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase, CATEGORY_PT } from '../lib/supabase.js';
import * as E from '../lib/engine.js';
import ListingCard from '../components/ListingCard.jsx';
import { Spinner, Empty } from '../components/ui.jsx';

export default function Shop() {
  const [sp, setSp] = useSearchParams();
  const cat = sp.get('cat') || 'todos', sort = sp.get('ord') || 'populares', phone = sp.get('tel') || '', q = sp.get('q') || '';
  const [rows, setRows] = useState(null); const [err, setErr] = useState('');
  useEffect(() => {
    let query = supabase.from('listings').select('*, seller:profiles!listings_seller_id_fkey(username,display_name)').eq('status', 'ativo');
    if (cat !== 'todos') query = query.eq('category', cat);
    if (phone) query = query.contains('phone_models', [phone]);
    if (q.trim()) query = query.ilike('title', `%${q.trim().replace(/[%_]/g, '')}%`);
    query = sort === 'preco-asc' ? query.order('price_cents') : sort === 'preco-desc' ? query.order('price_cents', { ascending: false }) : sort === 'novos' ? query.order('created_at', { ascending: false }) : query.order('sales_count', { ascending: false }).order('rating_avg', { ascending: false });
    setRows(null);
    query.limit(60).then(({ data, error }) => { if (error) setErr('Não foi possível carregar a loja. Verifica a ligação e tenta outra vez.'); setRows(data || []); });
  }, [cat, sort, phone, q]);
  const set = (k, v) => { const n = new URLSearchParams(sp); if (v && v !== 'todos') n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const [qq, setQq] = useState(q);
  useEffect(() => { const t = setTimeout(() => set('q', qq), 350); return () => clearTimeout(t); }, [qq]); // eslint-disable-line
  const official = useMemo(() => (rows || []).filter(r => !r.seller_id).length, [rows]);
  return (
    <div className="wrap">
      <div className="page-head">
        <span className="engrave">Loja · {rows ? `${rows.length} produtos` : '—'}{rows ? ` · ${official} oficiais, ${rows.length - official} da comunidade` : ''}</span>
        <h1>Loja</h1>
        <p>Capas, pegas e acessórios. Peças oficiais DÍGITO e designs de quem desenha para a mesma capa. Para pegas com as tuas medidas exatas, <Link to="/configurar">usa o configurador</Link>.</p>
      </div>
      <div className="toolbar">
        <div className="keyrow" role="group" aria-label="Categoria">
          {['todos', 'kit', 'capa', 'pega', 'acessorio'].map(c => <button key={c} className="key key-alu" aria-pressed={cat === c} onClick={() => set('cat', c)}>{c === 'todos' ? 'Tudo' : CATEGORY_PT[c]}</button>)}
        </div>
        <div className="row">
          <label className="sr" htmlFor="shop-q">Procurar</label>
          <input id="shop-q" className="input" placeholder="Procurar…" value={qq} onChange={e => setQq(e.target.value)} style={{ width: 180 }} />
          <label className="sr" htmlFor="shop-tel">Telemóvel</label>
          <select id="shop-tel" className="input" value={phone} onChange={e => set('tel', e.target.value)}>
            <option value="">Todos os telemóveis</option>
            {Object.entries(E.PHONES).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
          </select>
          <label className="sr" htmlFor="shop-ord">Ordenar</label>
          <select id="shop-ord" className="input" value={sort} onChange={e => set('ord', e.target.value)}>
            <option value="populares">Mais vendidos</option><option value="novos">Mais recentes</option><option value="preco-asc">Preço: mais baixo</option><option value="preco-desc">Preço: mais alto</option>
          </select>
        </div>
      </div>
      {err && <p className="err">{err}</p>}
      {!rows ? <Spinner /> : rows.length ? <div className="grid-shop" style={{ paddingBottom: 90 }}>{rows.map(l => <ListingCard key={l.id} l={l} />)}</div>
        : <Empty title="Nada com esses filtros" text="Experimenta outra categoria ou outro telemóvel."><button className="key key-alu" onClick={() => setSp({})}>Limpar filtros</button></Empty>}
    </div>
  );
}
