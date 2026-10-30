import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase, img, CATEGORY_PT, STATUS_PT } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import * as E from '../lib/engine.js';
import { eur } from '../lib/pricing.js';
import { Plate, LCD, Led, Empty, Spinner, useToast } from '../components/ui.jsx';

const slugify = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

function Editor({ listing, onDone }) {
  const { user } = useAuth(); const toast = useToast();
  const [f, setF] = useState(() => listing ? { ...listing, price: (listing.price_cents / 100).toFixed(2) } : { title: '', summary: '', description: '', category: 'pega', price: '9.00', material: 'PETG-CF', process: 'FDM', phone_models: Object.keys(E.PHONES), images: [], status: 'ativo' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const up = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const upload = async e => {
    const files = Array.from(e.target.files).slice(0, 4 - f.images.length); if (!files.length) return;
    setBusy(true); const urls = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { toast(`${file.name} tem mais de 5 MB.`); continue; }
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${file.type.split('/')[1] || 'jpg'}`;
      const { error } = await supabase.storage.from('listing-images').upload(path, file, { contentType: file.type });
      if (error) toast('Falhou o envio de ' + file.name); else urls.push(supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl);
    }
    setF(s => ({ ...s, images: [...s.images, ...urls] })); setBusy(false); e.target.value = '';
  };
  const save = async e => {
    e.preventDefault(); setErr('');
    const price = Math.round(parseFloat(String(f.price).replace(',', '.')) * 100);
    if (f.title.trim().length < 3) return setErr('O título precisa de pelo menos 3 caracteres.');
    if (!(price >= 100 && price <= 100000)) return setErr('O preço tem de estar entre 1 € e 1000 €.');
    if (f.status === 'ativo' && !f.images.length) return setErr('Um anúncio ativo precisa de pelo menos uma fotografia.');
    const row = { title: f.title.trim(), summary: f.summary.trim() || null, description: f.description.trim() || null, category: f.category, price_cents: price, material: f.material || null, process: f.process || null, phone_models: f.phone_models, images: f.images, status: f.status };
    setBusy(true);
    const { error } = listing ? await supabase.from('listings').update(row).eq('id', listing.id)
      : await supabase.from('listings').insert({ ...row, seller_id: user.id, slug: `${slugify(f.title) || 'design'}-${Math.random().toString(36).slice(2, 6)}` });
    setBusy(false);
    if (error) setErr('Não foi possível guardar: ' + error.message); else { toast(f.status === 'ativo' && !(listing?.status === 'ativo' && listing.title === f.title.trim() && listing.description === (f.description.trim() || null)) ? 'Enviado para revisão. Avisamos quando estiver publicado.' : listing ? 'Anúncio atualizado.' : 'Anúncio guardado.'); onDone(); }
  };
  return (
    <form onSubmit={save} style={{ display: 'grid', gap: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><h2>{listing ? 'Editar anúncio' : 'Novo anúncio'}</h2><button type="button" className="key key-alu key-sm" onClick={onDone}>Cancelar</button></div>
      <div className="field"><label htmlFor="l-t">Título</label><input id="l-t" className="input" value={f.title} maxLength={80} onChange={up('title')} /></div>
      <div className="field"><label htmlFor="l-s">Resumo (uma frase)</label><input id="l-s" className="input" value={f.summary || ''} maxLength={160} onChange={up('summary')} /></div>
      <div className="field"><label htmlFor="l-d">Descrição</label><textarea id="l-d" className="input" value={f.description || ''} maxLength={4000} onChange={up('description')} /></div>
      <div className="grid2">
        <div className="field"><label htmlFor="l-c">Categoria</label><select id="l-c" className="input" value={f.category} onChange={up('category')}>{Object.entries(CATEGORY_PT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="l-p">Preço (€)</label><input id="l-p" className="input mono" inputMode="decimal" value={f.price} onChange={up('price')} /></div>
        <div className="field"><label htmlFor="l-m">Material</label><input id="l-m" className="input" value={f.material || ''} onChange={up('material')} /></div>
        <div className="field"><label htmlFor="l-pr">Processo</label><select id="l-pr" className="input" value={f.process || ''} onChange={up('process')}>{['FDM', 'SLA', 'SLS', 'MJF', 'SLM'].map(p => <option key={p}>{p}</option>)}</select></div>
      </div>
      <div className="field"><span className="lbl">Telemóveis compatíveis</span><div className="keyrow">{Object.entries(E.PHONES).map(([k, p]) => <button type="button" key={k} className="key key-alu" aria-pressed={f.phone_models.includes(k)} onClick={() => setF(s => ({ ...s, phone_models: s.phone_models.includes(k) ? s.phone_models.filter(x => x !== k) : [...s.phone_models, k] }))}>{p.name}</button>)}</div></div>
      <div className="field"><span className="lbl">Fotografias ({f.images.length}/4)</span>
        <div className="row">{f.images.map(u => <span key={u} style={{ position: 'relative' }}><img src={img(u)} alt="" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 8 }} /><button type="button" className="key key-dark key-sm key-icon" style={{ position: 'absolute', top: -8, right: -8, '--h': '26px' }} aria-label="Remover fotografia" onClick={() => setF(s => ({ ...s, images: s.images.filter(x => x !== u) }))}>×</button></span>)}
          {f.images.length < 4 && <label className="key key-alu key-sm">Adicionar<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr" onChange={upload} /></label>}</div></div>
      <div className="field"><span className="lbl">Estado</span><div className="keyrow">{[['ativo', listing?.status === 'ativo' ? 'Publicado' : 'Enviar para revisão'], ['rascunho', 'Rascunho'], ['arquivado', 'Arquivado']].map(([k, t]) => <button type="button" key={k} className="key key-alu" aria-pressed={f.status === k} onClick={() => setF(s => ({ ...s, status: k }))}>{t}</button>)}</div></div>
      <p className="note">Qualquer pega vendida aqui tem de usar o encaixe DÍGITO: macho hexagonal de 10,0 mm entre faces (menos a folga do material), 2,6 mm de altura, com sede para íman Ø6×2. Estamos a validar um novo encaixe de baioneta, o <Link to="/tecnologia">DÍGITO Lock</Link>. Quando passar os ensaios, publicamos o novo padrão com tempo para adaptares os teus designs.</p>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="key key-dark key-lg" disabled={busy}>{busy ? 'A guardar…' : listing ? 'Guardar alterações' : 'Publicar anúncio'}</button>
    </form>
  );
}

export default function Seller() {
  const { user, profile, ready, refreshProfile } = useAuth(); const nav = useNavigate(); const toast = useToast(); const { tab = 'anuncios' } = useParams();
  const [rows, setRows] = useState(null); const [sales, setSales] = useState(null); const [edit, setEdit] = useState(null);
  const load = () => {
    supabase.from('listings').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setRows(data || []));
    supabase.from('order_items').select('*, order:orders(status,created_at,shipping)').eq('seller_id', user.id).order('id', { ascending: false }).then(({ data }) => setSales((data || []).filter(s => s.order && s.order.status !== 'pendente' && s.order.status !== 'cancelada')));
  };
  useEffect(() => { if (user && profile?.is_seller) load(); }, [user, profile?.is_seller]); // eslint-disable-line
  if (!ready) return <Spinner />;
  if (!user || !profile?.is_seller) return (
    <div className="wrap" style={{ paddingBlock: 60 }}>
      <Plate screws pad style={{ display: 'grid', gap: 18, maxWidth: 760, margin: '0 auto' }}>
        <span className="engrave">Banca DÍGITO · para terapeutas, makers e designers</span>
        <h1 style={{ fontSize: 'clamp(36px,5vw,56px)' }}>Desenhaste uma pega que ajuda alguém? Partilha-a aqui.</h1>
        <p style={{ fontSize: 17, color: 'var(--ink-2)' }}>Publica pegas, tampas ou acessórios que usem o encaixe DÍGITO. Cada desenho é revisto pela equipa antes de ficar visível na loja: confirmamos que encaixa, que é seguro de usar e que a descrição corresponde ao que a peça faz. Tu defines o preço, nós cobramos pela Stripe e acompanhas cada venda no teu painel.</p>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-2)', display: 'grid', gap: 6 }}><li>Revisão de cada desenho antes de ser publicado</li><li>Anúncios com até 4 fotografias</li><li>Página pública com o teu nome de utilizador</li><li>Avaliações só de quem comprou</li></ul>
        {user ? <button className="key key-brass key-lg" style={{ justifySelf: 'start' }} onClick={async () => { const { error } = await supabase.from('profiles').update({ is_seller: true }).eq('id', user.id); if (error) toast('Não foi possível abrir a banca.'); else { await refreshProfile(); toast('Banca aberta. Publica o teu primeiro anúncio.'); } }}>Abrir a minha banca</button>
          : <button className="key key-brass key-lg" style={{ justifySelf: 'start' }} onClick={() => nav('/entrar?voltar=/vender')}>Entrar para começar</button>}
      </Plate>
    </div>
  );
  const revenue = (sales || []).reduce((s, i) => s + i.unit_price_cents * i.quantity, 0);
  const units = (sales || []).reduce((s, i) => s + i.quantity, 0);
  return (
    <div className="wrap" style={{ paddingBottom: 90 }}>
      <div className="page-head"><span className="engrave">Banca de @{profile.username}</span><h1>A minha banca</h1></div>
      <div className="stat-row" style={{ marginBottom: 22 }}>
        <div className="field"><span className="lbl">Anúncios ativos</span><span className="bezel" style={{ display: 'block' }}><LCD value={(rows || []).filter(r => r.status === 'ativo').length} /></span></div>
        <div className="field"><span className="lbl">Unidades vendidas</span><span className="bezel" style={{ display: 'block' }}><LCD value={units} /></span></div>
        <div className="field"><span className="lbl">Receita bruta</span><span className="price big">{eur(revenue)}</span></div>
      </div>
      <div className="row" style={{ marginBottom: 18 }}>
        <div className="keyrow"><Link className="key key-alu" aria-pressed={tab === 'anuncios'} to="/vender/anuncios">Anúncios</Link><Link className="key key-alu" aria-pressed={tab === 'vendas'} to="/vender/vendas">Vendas</Link></div>
        <span className="spacer" />
        <Link className="key key-alu" to={`/u/${profile.username}`}>Ver página pública</Link>
        <button className="key key-dark" onClick={() => setEdit('new')}>Novo anúncio</button>
      </div>
      <Plate pad>
        {edit ? <Editor listing={edit === 'new' ? null : edit} onDone={() => { setEdit(null); load(); }} />
          : tab === 'vendas' ? (!sales ? <Spinner /> : !sales.length ? <Empty title="Ainda sem vendas" text="Quando alguém pagar um artigo teu, aparece aqui." /> :
            <table className="dat"><thead><tr><th>Data</th><th>Artigo</th><th>Qtd.</th><th>Valor</th><th>Estado</th></tr></thead><tbody>
              {sales.map(s => <tr key={s.id}><td className="n">{new Date(s.order.created_at).toLocaleDateString('pt-PT')}</td><td>{s.title}</td><td className="n">{s.quantity}</td><td className="n">{eur(s.unit_price_cents * s.quantity)}</td><td><span className="status"><Led on color="green" />{STATUS_PT[s.order.status]}</span></td></tr>)}
            </tbody></table>)
          : (!rows ? <Spinner /> : !rows.length ? <Empty title="Ainda sem anúncios" text="Publica a tua primeira pega."><button className="key key-dark" onClick={() => setEdit('new')}>Novo anúncio</button></Empty> :
            <div className="list">{rows.map(r => (
              <div className="row-item" key={r.id}>{r.images?.[0] ? <img src={img(r.images[0])} alt="" /> : <span className="ph" />}
                <div style={{ minWidth: 0 }}><h4>{r.title}</h4><span className="status"><Led on={r.status === 'ativo'} color={r.status === 'ativo' ? 'green' : ''} />{({ ativo: 'publicado', rascunho: 'rascunho', em_revisao: 'em revisão', arquivado: 'arquivado' })[r.status] || r.status} · {CATEGORY_PT[r.category]} · {r.sales_count} vendidos</span></div>
                <div className="row"><span className="price">{eur(r.price_cents)}</span><button className="key key-alu key-sm" onClick={() => setEdit(r)}>Editar</button>{r.status === 'ativo' && <Link className="key key-alu key-sm" to={`/loja/${r.slug}`}>Ver</Link>}</div>
              </div>))}</div>)}
      </Plate>
    </div>
  );
}
