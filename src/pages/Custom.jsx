import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase, BASE } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { PHONES } from '../lib/engine.js';
import { Icon, useToast, useReveal } from '../components/ui.jsx';

const STEPS = [
  ['01', 'Escreves', 'Contas-nos o que torna difícil segurar ou usar o telemóvel. Não precisas de relatórios médicos.', 'mail'],
  ['02', 'Falamos', 'Uma pessoa da DÍGITO responde em até 3 dias úteis, por email, telefone, videochamada ou ao vivo na NOVA FCT, em Caparica.', 'forum'],
  ['03', 'Medimos', 'Medimos a tua mão contigo. Se for preciso, imprimimos uma peça de teste antes da versão final.', 'straighten'],
  ['04', 'Fazemos', 'Antes de fabricar, mandamos-te um orçamento. Só pagas depois de o aceitares.', 'precision_manufacturing'],
];
const IDEAS = [
  ['Pegas maiores ou mais macias', 'Para quem tem dor nas articulações ou dificuldade em fechar a mão.'],
  ['Anéis com outra abertura', 'Para dedos com deformação, inchaço ou que mudam de tamanho ao longo do dia.'],
  ['Apoios para menos dedos', 'Para mãos com amputações ou dedos que não se movem.'],
  ['Outra forma de segurar', 'Pegas para segurar com a palma, com o pulso ou com o telemóvel apoiado.'],
];
const DIFF = [['tremor', 'Tremor'], ['dor', 'Dor ou rigidez'], ['forca', 'Pouca força'], ['dedos', 'Dedos ausentes ou que não mexem'], ['uma_mao', 'Uso só uma mão'], ['outra', 'Outra situação']];
const WHO = [['proprio', 'Para mim'], ['familiar', 'Para um familiar ou amigo'], ['terapeuta', 'Sou terapeuta ou profissional de saúde'], ['outro', 'Outro']];
const CONTACT = [['email', 'Email'], ['telefone', 'Telefone'], ['video', 'Videochamada'], ['presencial', 'Ao vivo na NOVA FCT']];

export default function Custom() {
  useReveal();
  const { user, profile } = useAuth(); const toast = useToast(); const loc = useLocation();
  const q = new URLSearchParams(loc.search);
  const [f, setF] = useState({ name: '', email: '', phone: '', requester: 'proprio', phone_model: q.get('telemovel') || '', difficulties: [], description: '', contact_pref: 'email', health_consent: false, privacy: false });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [sent, setSent] = useState(false);
  useEffect(() => { if (user) setF(x => ({ ...x, email: x.email || user.email || '', name: x.name || profile?.display_name || '' })); }, [user, profile]);
  useEffect(() => { if (loc.hash) setTimeout(() => document.querySelector(loc.hash)?.scrollIntoView(), 60); }, [loc.hash]);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  const toggle = v => setF(x => ({ ...x, difficulties: x.difficulties.includes(v) ? x.difficulties.filter(d => d !== v) : [...x.difficulties, v] }));
  const needsConsent = f.difficulties.length > 0;

  const send = async e => {
    e.preventDefault(); setErr('');
    if (f.name.trim().length < 2) return setErr('Diz-nos como te podemos tratar.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return setErr('Indica um email válido para te podermos responder.');
    if ((f.contact_pref === 'telefone' || f.contact_pref === 'video') && f.phone.trim().length < 6) return setErr('Para te ligarmos, indica um número de telefone.');
    if (f.description.trim().length < 20) return setErr('Conta-nos um pouco mais (pelo menos 20 caracteres). Não há respostas erradas.');
    if (needsConsent && !f.health_consent) return setErr('Assinalaste uma situação de saúde. Para a guardarmos, precisamos da tua autorização, ou podes desmarcá-la.');
    if (!f.privacy) return setErr('Confirma que leste a informação sobre privacidade.');
    setBusy(true);
    const { error } = await supabase.from('custom_requests').insert({
      user_id: user?.id ?? null, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() || null, requester: f.requester,
      phone_model: f.phone_model || null, difficulties: f.difficulties, description: f.description.trim(), contact_pref: f.contact_pref, health_consent: needsConsent ? f.health_consent : false,
    });
    setBusy(false);
    if (error) return setErr('Não foi possível enviar. Tenta outra vez dentro de momentos.');
    setSent(true); toast('Pedido enviado.');
    setTimeout(() => document.querySelector('#pedido')?.scrollIntoView({ block: 'start' }), 50);
  };

  return (
    <div className="custom">
      <section className="wrap custom-hero">
        <div className="custom-hero-copy">
          <span className="why-kicker">Feito contigo</span>
          <h1>Quando o padrão não chega, fazemos contigo.</h1>
          <p className="lead">Se a configuração do site não serve a tua mão, ou se precisas de algo que ainda não existe, escreve-nos. Uma pessoa da DÍGITO conversa contigo e desenha a peça a partir da tua situação.</p>
          <div className="row" style={{ gap: 12 }}>
            <a className="key key-dark key-lg" href="#pedido">Fazer um pedido <Icon n="arrow_downward" size={20} /></a>
            <Link className="key key-alu key-lg" to="/configurar">Experimentar o configurador</Link>
          </div>
        </div>
        <figure className="custom-hero-art"><img src={`${BASE}/ilustracoes/contigo.webp`} alt="Quatro etapas: escreves, falamos, medimos, fazemos." width="1800" height="1350" /></figure>
      </section>

      <section className="wrap custom-steps">
        {STEPS.map(([n, t, d, ic]) => (
          <div key={n} className="cstep reveal"><span className="cstep-n">{n}</span><Icon n={ic} /><h3>{t}</h3><p>{d}</p></div>
        ))}
      </section>

      <section className="band">
        <div className="wrap">
          <div className="band-head reveal"><h2>Pedidos que podemos estudar</h2><p>Alguns exemplos. Se o teu caso não está aqui, escreve-nos na mesma.</p></div>
          <div className="ideas">
            {IDEAS.map(([t, d]) => <div key={t} className="idea reveal"><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="wrap custom-form-wrap" id="pedido">
        <div className="custom-form-side">
          <h2>Conta-nos o que precisas</h2>
          <p>Lemos cada pedido. Se não conseguirmos ajudar, dizemos-to com franqueza e, sempre que possível, indicamos quem possa.</p>
          <div className="legal-note small"><Icon n="info" /><p>A DÍGITO faz acessórios de conforto e não dispositivos médicos. Não substituímos a avaliação de um médico ou terapeuta ocupacional, mas temos todo o gosto em trabalhar com o teu.</p></div>
        </div>
        {sent ? (
          <div className="legal-note ok custom-sent"><Icon n="check_circle" fill /><div><p><b>Recebemos o teu pedido, {f.name.split(' ')[0]}.</b></p><p>Respondemos em até 3 dias úteis{f.contact_pref === 'email' ? ` para ${f.email}` : f.contact_pref === 'telefone' ? ' por telefone' : f.contact_pref === 'video' ? ' para combinar a videochamada' : ' para combinar um encontro na NOVA FCT'}. Entretanto, podes <Link to="/configurar">experimentar o configurador</Link> para teres uma ideia do que é possível.</p></div></div>
        ) : (
          <form className="contact-form custom-form" onSubmit={send} noValidate>
            <fieldset className="field"><legend className="lbl">Para quem é a capa?</legend>
              <div className="pills">{WHO.map(([v, l]) => <label key={v} className={`pill ${f.requester === v ? 'on' : ''}`}><input type="radio" name="who" value={v} checked={f.requester === v} onChange={set('requester')} />{l}</label>)}</div>
            </fieldset>
            <div className="grid2">
              <div className="field"><label htmlFor="r-name">Nome</label><input id="r-name" className="input" autoComplete="name" value={f.name} onChange={set('name')} maxLength={120} /></div>
              <div className="field"><label htmlFor="r-email">Email</label><input id="r-email" className="input" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></div>
            </div>
            <div className="grid2">
              <div className="field"><label htmlFor="r-phonemodel">Telemóvel</label>
                <select id="r-phonemodel" className="input" value={f.phone_model} onChange={set('phone_model')}>
                  <option value="">Ainda não sei / outro</option>
                  {Object.values(PHONES).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select></div>
              <div className="field"><label htmlFor="r-phone">Número de telefone <span className="hint">(opcional)</span></label><input id="r-phone" className="input" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} maxLength={40} /></div>
            </div>
            <fieldset className="field"><legend className="lbl">Há alguma situação que devamos conhecer? <span className="hint">(opcional)</span></legend>
              <div className="pills">{DIFF.map(([v, l]) => <button type="button" key={v} className={`pill ${f.difficulties.includes(v) ? 'on' : ''}`} aria-pressed={f.difficulties.includes(v)} onClick={() => toggle(v)}>{f.difficulties.includes(v) && <Icon n="check" size={16} />}{l}</button>)}</div>
            </fieldset>
            <div className="field"><label htmlFor="r-desc">O que é difícil hoje, e o que gostavas que fosse diferente?</label>
              <textarea id="r-desc" className="input" rows={6} maxLength={4000} value={f.description} onChange={set('description')} placeholder="Por exemplo: deixo cair o telemóvel quando escrevo com o polegar, porque não consigo apertar com força suficiente." /></div>
            <fieldset className="field"><legend className="lbl">Como preferes que falemos?</legend>
              <div className="pills">{CONTACT.map(([v, l]) => <label key={v} className={`pill ${f.contact_pref === v ? 'on' : ''}`}><input type="radio" name="contact" value={v} checked={f.contact_pref === v} onChange={set('contact_pref')} />{l}</label>)}</div>
            </fieldset>
            {needsConsent && <label className="check consent"><input type="checkbox" checked={f.health_consent} onChange={e => setF(x => ({ ...x, health_consent: e.target.checked }))} /><span>Autorizo a DÍGITO a guardar a informação de saúde que partilhei, apenas para responder a este pedido. Posso retirar esta autorização a qualquer momento.</span></label>}
            <label className="check"><input type="checkbox" checked={f.privacy} onChange={e => setF(x => ({ ...x, privacy: e.target.checked }))} /><span>Li como a DÍGITO trata estes dados na <Link to="/privacidade#pedidos" target="_blank">Privacidade</Link>.</span></label>
            {err && <p className="err" role="alert">{err}</p>}
            <div className="row"><button className="key key-dark key-lg" disabled={busy}>{busy ? 'A enviar…' : 'Enviar pedido'}</button><span className="hint">Sem compromisso. Nada é fabricado nem cobrado sem a tua aprovação.</span></div>
          </form>
        )}
      </section>
    </div>
  );
}
