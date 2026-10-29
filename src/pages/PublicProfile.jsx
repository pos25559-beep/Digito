import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { Plate, Empty, Spinner } from '../components/ui.jsx';
import ListingCard from '../components/ListingCard.jsx';
export default function PublicProfile() {
  const { username } = useParams(); const [p, setP] = useState(undefined); const [rows, setRows] = useState([]);
  useEffect(() => {
    supabase.from('profiles').select('id,username,display_name,bio,avatar_url,location,is_seller,created_at').eq('username', username).maybeSingle().then(async ({ data }) => {
      setP(data || null);
      if (data) { const { data: l } = await supabase.from('listings').select('*').eq('seller_id', data.id).eq('status', 'ativo').order('created_at', { ascending: false }); setRows((l || []).map(x => ({ ...x, seller: { username: data.username } }))); }
    });
  }, [username]);
  if (p === undefined) return <Spinner />;
  if (!p) return <div className="wrap"><Empty level="h1" title="Perfil não encontrado"><Link className="key key-alu" to="/loja">Ir à loja</Link></Empty></div>;
  return (
    <div className="wrap" style={{ paddingBottom: 90 }}>
      <Plate screws pad style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap', marginBlock: 40 }}>
        {p.avatar_url ? <img className="avatar" style={{ width: 96, height: 96 }} src={p.avatar_url} alt="" /> : <span className="avatar" style={{ width: 96, height: 96, fontSize: 36 }}>{(p.display_name || p.username)[0].toUpperCase()}</span>}
        <div style={{ display: 'grid', gap: 6, minWidth: 0, flex: 1 }}><span className="engrave">{p.is_seller ? 'Vendedor' : 'Membro'} desde {new Date(p.created_at).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}{p.location ? ` · ${p.location}` : ''}</span>
          <h1 style={{ fontSize: 40, fontWeight: 800 }}>{p.display_name || p.username}</h1><span className="hint">@{p.username}</span>{p.bio && <p style={{ maxWidth: '60ch' }}>{p.bio}</p>}</div>
      </Plate>
      {rows.length ? <div className="grid-shop">{rows.map(l => <ListingCard key={l.id} l={l} />)}</div> : <Empty title="Sem anúncios publicados" />}
    </div>
  );
}
