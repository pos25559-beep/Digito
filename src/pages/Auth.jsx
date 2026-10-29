import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, siteURL } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { Plate, Mark, useToast } from '../components/ui.jsx';
const ERR = {
  'Invalid login credentials': 'Email ou palavra-passe errados.',
  'Email not confirmed': 'Ainda não confirmaste o email. Abre o link que te enviámos.',
  'User already registered': 'Já existe uma conta com este email. Entra ou recupera a palavra-passe.',
};
const tr = m => ERR[m] || (m?.includes('rate limit') ? 'Muitas tentativas seguidas. Espera um minuto e tenta outra vez.' : m?.includes('Password should') ? 'A palavra-passe precisa de pelo menos 8 caracteres.' : m || 'Algo correu mal. Tenta outra vez.');
export default function Auth({ mode: initial = 'entrar' }) {
  const [mode, setMode] = useState(initial); const [sp] = useSearchParams(); const nav = useNavigate(); const toast = useToast();
  const { user, recovery, setRecovery } = useAuth();
  const [f, setF] = useState({ email: '', password: '', name: '', username: '' }); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState({ t: '', err: false });
  const back = sp.get('voltar') || '/conta';
  useEffect(() => { if (recovery) setMode('nova'); }, [recovery]);
  useEffect(() => { if (user && mode !== 'nova' && !recovery) nav(back, { replace: true }); }, [user]); // eslint-disable-line
  const up = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const submit = async e => {
    e.preventDefault(); setBusy(true); setMsg({ t: '' });
    try {
      if (mode === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password }); if (error) throw error;
        toast('Bem-vindo de volta.');
      } else if (mode === 'criar') {
        if (f.password.length < 8) throw new Error('Password should be at least 8');
        if (f.username && !/^[a-z0-9_]{3,24}$/.test(f.username)) throw new Error('O nome de utilizador usa 3–24 letras minúsculas, números ou _.');
        const { data, error } = await supabase.auth.signUp({ email: f.email.trim(), password: f.password, options: { emailRedirectTo: siteURL() + '/conta', data: { display_name: f.name.trim(), username: f.username.trim() } } });
        if (error) throw error;
        if (!data.session) setMsg({ t: `Enviámos um link de confirmação para ${f.email}. Abre-o para ativar a conta.` });
      } else if (mode === 'recuperar') {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: siteURL() + '/entrar' }); if (error) throw error;
        setMsg({ t: 'Se existir uma conta com este email, recebes um link para escolher uma nova palavra-passe.' });
      } else if (mode === 'nova') {
        if (f.password.length < 8) throw new Error('Password should be at least 8');
        const { error } = await supabase.auth.updateUser({ password: f.password }); if (error) throw error;
        setRecovery(false); toast('Palavra-passe atualizada.'); nav('/conta');
      }
    } catch (err) { setMsg({ t: tr(err.message), err: true }); }
    setBusy(false);
  };
  const title = { entrar: 'Entrar', criar: 'Criar conta', recuperar: 'Recuperar acesso', nova: 'Nova palavra-passe' }[mode];
  return (
    <div className="auth-wrap wrap">
      <Plate screws className="auth-card" as="form" onSubmit={submit} noValidate>
        <span className="row"><Mark size={34} /><span className="engrave">Conta DÍGITO</span></span>
        <h1>{title}</h1>
        {(mode === 'entrar' || mode === 'criar') && <div className="keyrow" role="group"><button type="button" className="key key-alu" aria-pressed={mode === 'entrar'} onClick={() => setMode('entrar')}>Entrar</button><button type="button" className="key key-alu" aria-pressed={mode === 'criar'} onClick={() => setMode('criar')}>Criar conta</button></div>}
        {mode === 'criar' && <>
          <div className="field"><label htmlFor="a-n">Nome</label><input id="a-n" className="input" autoComplete="name" value={f.name} onChange={up('name')} required /></div>
          <div className="field"><label htmlFor="a-u">Nome de utilizador</label><input id="a-u" className="input" autoComplete="username" placeholder="ex.: ana_silva" value={f.username} onChange={e => setF(s => ({ ...s, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} /></div>
        </>}
        {mode !== 'nova' && <div className="field"><label htmlFor="a-e">Email</label><input id="a-e" className="input" type="email" autoComplete="email" value={f.email} onChange={up('email')} required /></div>}
        {mode !== 'recuperar' && <div className="field"><label htmlFor="a-p">Palavra-passe</label><input id="a-p" className="input" type="password" autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'} value={f.password} onChange={up('password')} required minLength={8} />{mode !== 'entrar' && <span className="hint">Pelo menos 8 caracteres.</span>}</div>}
        {msg.t && <p className={msg.err ? 'err' : 'note ok'} role="status">{msg.t}</p>}
        <button className="key key-dark key-lg" disabled={busy}>{busy ? 'Um momento…' : title}</button>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {mode === 'entrar' && <button type="button" className="key key-alu key-sm" onClick={() => setMode('recuperar')}>Esqueci-me da palavra-passe</button>}
          {mode === 'recuperar' && <button type="button" className="key key-alu key-sm" onClick={() => setMode('entrar')}>Voltar a entrar</button>}
          <Link to="/" className="hint">Voltar ao início</Link>
        </div>
      </Plate>
    </div>
  );
}
