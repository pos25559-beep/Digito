import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import { supabase, img, STATUS_PT } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import * as E from '../lib/engine.js';
import { eur, fmt, designPrice } from '../lib/pricing.js';
import { Plate, LCD, Led, Empty, Spinner, useToast } from '../components/ui.jsx';
import ListingCard from '../components/ListingCard.jsx';

const TABS = [['perfil', 'Perfil'], ['medidas', 'Medidas'], ['designs', 'Designs'], ['encomendas', 'Encomendas'], ['favoritos', 'Favoritos']];
const LED_OF = { pendente: '', paga: 'green', em_impressao: '', enviada: 'green', entregue: 'green', cancelada: 'red' };

function Profile() {
  const { user, profile, refreshProfile } = useAuth(); const toast = useToast();
  const [f, setF] = useState({ display_name: '', username: '', bio: '', location: '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { if (profile) setF({ display_name: profile.display_name || '', username: profile.username || '', bio: profile.bio || '', location: profile.location || '' }); }, [profile]);
  const save = async e => {
    e.preventDefault(); setErr('');
    if (!/^[a-z0-9_]{3,24}$/.test(f.username)) { setErr('O nome de utilizador usa 3–24 letras minúsculas, números ou _.'); return; }
    setBusy(true); const { error } = await supabase.from('profiles').update(f).eq('id', user.id); setBusy(false);
    if (error) setErr(error.code === '23505' ? 'Esse nome de utilizador já está ocupado.' : 'Não foi possível guardar.'); else { toast('Perfil guardado.'); refreshProfile(); }
  };
  const avatar = async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('A imagem tem de ter menos de 2 MB.'); return; }
    const path = `${user.id}/avatar-${Date.now()}.${file.type.split('/')[1] || 'jpg'}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast('Não foi possível carregar a imagem.'); return; }
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id); refreshProfile(); toast('Fotografia atualizada.');
  };
  return (
    <form onSubmit={save} style={{ display: 'grid', gap: 18 }}>
      <h2>Perfil</h2>
      <div className="row"><label className="key key-alu key-sm">Mudar fotografia<input type="file" accept="image/jpeg,image/png,image/webp" className="sr" onChange={avatar} /></label><span className="hint">{user.email}</span></div>
      <div className="grid2">
        <div className="field"><label htmlFor="p-n">Nome</label><input id="p-n" className="input" value={f.display_name} maxLength={60} onChange={e => setF(s => ({ ...s, display_name: e.target.value }))} /></div>
        <div className="field"><label htmlFor="p-u">Nome de utilizador</label><input id="p-u" className="input" value={f.username} onChange={e => setF(s => ({ ...s, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} /></div>
        <div className="field"><label htmlFor="p-l">Localidade</label><input id="p-l" className="input" value={f.location} maxLength={60} onChange={e => setF(s => ({ ...s, location: e.target.value }))} /></div>
        <div className="field"><span className="lbl">Página pública</span><Link to={`/u/${profile?.username}`} className="key key-alu key-sm" style={{ justifySelf: 'start' }}>@{profile?.username}</Link></div>
      </div>
      <div className="field"><label htmlFor="p-b">Sobre ti</label><textarea id="p-b" className="input" value={f.bio} maxLength={400} onChange={e => setF(s => ({ ...s, bio: e.target.value }))} /></div>
      {err && <p className="err">{err}</p>}
      <button className="key key-dark" style={{ justifySelf: 'start' }} disabled={busy}>Guardar perfil</button>
    </form>
  );
}
function Hand() {
  const { user, profile, refreshProfile } = useAuth(); const toast = useToast(); const h = profile?.hand;
  const clear = async () => { await supabase.from('profiles').update({ hand: null }).eq('id', user.id); refreshProfile(); toast('Medidas apagadas.'); };
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <h2>Medidas da mão</h2>
      {!h ? <Empty title="Ainda sem medidas" text="Mede a mão com uma foto no configurador. Guardamos aqui as larguras dos dedos, nunca a foto."><Link className="key key-dark" to="/configurar">Medir agora</Link></Empty> : <>
        <div className="grid2">{E.FINGERS.map(f => <div className="field" key={f}><span className="lbl">{E.FINGER_PT[f]}</span><LCD value={fmt(h.fingers[f].w, 1)} unit="mm" /></div>)}<div className="field"><span className="lbl">Palma</span><LCD value={fmt(h.palm, 1)} unit="mm" /></div></div>
        <p className="note">Estas medidas são privadas e só servem para gerar as tuas pegas. Mão {h.hand === 'LEFT' ? 'esquerda' : 'direita'} · fonte: {h.source === 'estimate' ? 'estimativa' : 'foto'}.</p>
        <div className="row"><Link className="key key-dark" to="/configurar">Usar no configurador</Link><button className="key key-alu" onClick={clear}>Apagar medidas</button></div>
      </>}
    </div>
  );
}
function Designs() {
  const { user } = useAuth(); const cart = useCart(); const toast = useToast(); const [rows, setRows] = useState(null);
  const load = () => supabase.from('designs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setRows(data || []));
  useEffect(() => { load(); }, []); // eslint-disable-line
  const del = async id => { await supabase.from('designs').delete().eq('id', id); toast('Design apagado.'); load(); };
  if (!rows) return <Spinner />;
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <h2>Designs guardados</h2>
      {!rows.length ? <Empty title="Sem designs" text="Os kits que configuras ficam guardados aqui."><Link className="key key-dark" to="/configurar">Configurar</Link></Empty> :
        <div className="list">{rows.map(d => { const p = designPrice(d.grips, d.grip_material); return (
          <div className="row-item" key={d.id}><span className="ph" style={{ display: 'grid', placeItems: 'center' }}><Led on /></span>
            <div style={{ minWidth: 0 }}><h4>{d.name}</h4><span className="hint">{E.PHONES[d.phone_model]?.name} · {E.STYLES[d.grip_style]?.name} · {E.MATERIALS[d.grip_material]?.name} · {d.grips.map(g => fmt(g.w)).join(' / ')} mm</span>
              <div className="row" style={{ marginTop: 8 }}><button className="key key-dark key-sm" onClick={() => { cart.add({ design_id: d.id, title: `Kit à medida — ${d.name}`, price_cents: p, image: null, phone: E.PHONES[d.phone_model]?.name }); toast('No carrinho.'); }}>Adicionar ao carrinho</button><button className="key key-alu key-sm" onClick={() => del(d.id)}>Apagar</button></div></div>
            <span className="mono">{eur(p)}</span></div>); })}</div>}
    </div>
  );
}
function Orders() {
  const { user } = useAuth(); const [rows, setRows] = useState(null);
  useEffect(() => { supabase.from('orders').select('*, items:order_items(*)').eq('buyer_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setRows(data || [])); }, [user.id]);
  if (!rows) return <Spinner />;
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <h2>Encomendas</h2>
      {!rows.length ? <Empty title="Ainda sem encomendas" text="Quando comprares, acompanhas aqui a impressão e o envio."><Link className="key key-dark" to="/loja">Ir à loja</Link></Empty> :
        <div className="list">{rows.map(o => (
          <Plate key={o.id} pad style={{ display: 'grid', gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="status"><Led on color={LED_OF[o.status]} />{STATUS_PT[o.status]}</span><span className="mono hint">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString('pt-PT')}</span></div>
            {o.items.map(i => <div className="sumline" key={i.id}><span>{i.quantity} × {i.title}</span><span className="mono">{eur(i.unit_price_cents * i.quantity)}</span></div>)}
            <div className="sumline total"><span>Total</span><span className="mono">{eur(o.total_cents)}</span></div>
          </Plate>))}</div>}
    </div>
  );
}
function Favorites() {
  const { user } = useAuth(); const [rows, setRows] = useState(null);
  useEffect(() => { supabase.from('favorites').select('listing:listings(*, seller:profiles!listings_seller_id_fkey(username))').eq('user_id', user.id).then(({ data }) => setRows((data || []).map(r => r.listing).filter(Boolean))); }, [user.id]);
  if (!rows) return <Spinner />;
  return <div style={{ display: 'grid', gap: 18 }}><h2>Favoritos</h2>{!rows.length ? <Empty title="Sem favoritos" text="Toca no coração de um produto para o guardar aqui." /> : <div className="grid-shop">{rows.map(l => <ListingCard key={l.id} l={l} />)}</div>}</div>;
}

export default function Account() {
  const { user, profile, ready, signOut } = useAuth(); const { tab = 'perfil' } = useParams(); const nav = useNavigate();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to="/entrar?voltar=/conta" replace />;
  const initial = (profile?.display_name || profile?.username || '?').slice(0, 1).toUpperCase();
  return (
    <div className="wrap acct">
      <Plate screws className="acct-side">
        {profile?.avatar_url ? <img className="avatar" src={profile.avatar_url} alt="" /> : <span className="avatar">{initial}</span>}
        <div><b style={{ fontSize: 18 }}>{profile?.display_name}</b><div className="hint">@{profile?.username}</div></div>
        <nav className="acct-nav">{TABS.map(([k, t]) => <NavLink key={k} to={`/conta/${k}`} className="key key-alu key-sm" aria-pressed={tab === k}>{t}</NavLink>)}
          <Link to="/vender" className="key key-alu key-sm">{profile?.is_seller ? 'A minha banca' : 'Vender designs'}</Link>
          <button className="key key-dark key-sm" onClick={async () => { await signOut(); nav('/'); }}>Sair</button></nav>
      </Plate>
      <Plate className="acct-main">
        {tab === 'perfil' && <Profile />}{tab === 'medidas' && <Hand />}{tab === 'designs' && <Designs />}{tab === 'encomendas' && <Orders />}{tab === 'favoritos' && <Favorites />}
      </Plate>
    </div>
  );
}
