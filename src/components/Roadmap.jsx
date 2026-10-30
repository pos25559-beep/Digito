import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { Icon } from './ui.jsx';

const NEXT = [
  ['view_in_ar', 'Mais modelos de capa', 'Outras formas e acabamentos, todos com o mesmo encaixe.'],
  ['back_hand', 'Novas pegas', 'Formas para outras mãos e outras maneiras de segurar.'],
  ['palette', 'Cores', 'Capa e pegas em cores à escolha, entre os filamentos que temos em stock.'],
];
const TOPICS = [['capa', 'Capa'], ['pega', 'Pega'], ['cor', 'Cor'], ['telemovel', 'Telemóvel'], ['outro', 'Outra coisa']];

/** Caixa de sugestões: guarda em public.suggestions (só inserção, ninguém lê pelo site). */
export function SuggestBox({ page = 'home' }) {
  const { user } = useAuth();
  const [f, setF] = useState({ topic: 'pega', message: '', email: '', hp: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [sent, setSent] = useState(false);
  const send = async e => {
    e.preventDefault(); setErr('');
    if (f.hp) return setSent(true); // campo-armadilha para robôs
    if (f.message.trim().length < 5) return setErr('Escreve a tua ideia (pelo menos 5 caracteres).');
    const email = f.email.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr('Esse email não parece válido. Podes deixá-lo vazio.');
    setBusy(true);
    const { error } = await supabase.from('suggestions').insert({ topic: f.topic, message: f.message.trim().slice(0, 1500), email: email || null, page, user_id: user?.id ?? null });
    setBusy(false);
    if (error) return setErr('Não foi possível enviar. Tenta outra vez dentro de momentos.');
    setSent(true);
  };
  if (sent) return (
    <div className="suggest suggest-done" role="status">
      <Icon n="check_circle" fill size={28} />
      <div><b>Obrigado, recebemos a tua ideia.</b><p className="hint">Lemos todas as sugestões. {f.email ? 'Se tivermos uma pergunta, escrevemos-te.' : ''}</p>
        <button type="button" className="key key-line key-sm" onClick={() => { setSent(false); setF(x => ({ ...x, message: '' })); }}>Enviar outra</button></div>
    </div>
  );
  return (
    <form className="suggest" onSubmit={send} noValidate>
      <fieldset className="suggest-topics">
        <legend>A tua ideia é sobre</legend>
        <div className="keyrow">{TOPICS.map(([v, t]) => <button key={v} type="button" className="key key-sm" aria-pressed={f.topic === v} onClick={() => setF(x => ({ ...x, topic: v }))}>{t}</button>)}</div>
      </fieldset>
      <div className="field">
        <label htmlFor={`sg-msg-${page}`}>O que gostavas que a DÍGITO fizesse?</label>
        <textarea className="input" id={`sg-msg-${page}`} rows={4} maxLength={1500} value={f.message} onChange={e => setF(x => ({ ...x, message: e.target.value }))} placeholder="Por exemplo: uma capa para o meu telemóvel, uma pega para segurar com a palma, uma cor…" />
      </div>
      <div className="field">
        <label htmlFor={`sg-mail-${page}`}>Email <span className="hint">(opcional, só para te respondermos)</span></label>
        <input className="input" id={`sg-mail-${page}`} type="email" autoComplete="email" value={f.email} onChange={e => setF(x => ({ ...x, email: e.target.value }))} />
      </div>
      <input className="sr" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.hp} onChange={e => setF(x => ({ ...x, hp: e.target.value }))} name="website" />
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row" style={{ gap: 12, alignItems: 'center' }}>
        <button className="key key-dark" disabled={busy}>{busy ? 'A enviar…' : 'Enviar sugestão'}</button>
        <span className="hint">Não peças nem envies dados de saúde aqui. Para uma peça só tua, usa o <Link to="/feito-contigo">pedido especial</Link>.</span>
      </div>
    </form>
  );
}

/** Secção "Mais modelos a caminho" com a caixa de sugestões. */
export default function Roadmap({ page = "home", id = "em-breve", band = false }) {
  return (
    <section className={`roadmap ${band ? "band" : "roadmap-plain"}`} id={id}>
      <div className="wrap roadmap-in">
        <div className="reveal">
          <span className="why-kicker">Em desenvolvimento</span>
          <h2>Mais modelos a caminho</h2>
          <p>Por agora há uma capa e as pegas em sela. Estamos a desenhar mais, e queremos fazê-lo a partir do que precisas.</p>
          <ul className="roadmap-list">
            {NEXT.map(([ic, t, d]) => <li key={t}><Icon n={ic} /><div><b>{t}</b><span>{d}</span></div></li>)}
          </ul>
        </div>
        <div className="plate reveal"><h3 className="suggest-h">Sugere um modelo</h3><SuggestBox page={page} /></div>
      </div>
    </section>
  );
}
