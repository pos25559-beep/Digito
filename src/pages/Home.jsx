import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { supabase, BASE, img } from '../lib/supabase.js';
import * as E from '../lib/engine.js';
import * as G from '../lib/geometry.js';
import { makeViewer, makeMats, gripMaterial, meshOf, disposeGroup } from '../lib/viewer.js';
import { fmt, eur } from '../lib/pricing.js';
import { Icon, Range, useReveal } from '../components/ui.jsx';

const V = f => `${BASE}/video/${f}`;

function AutoVideo({ src, poster, label }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.play().catch(() => {}); else el.pause(); }, { threshold: 0.25 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" aria-label={label} />;
}

/* cartão flutuante do herói: as quatro larguras a "medir-se" */
function MeasureCard() {
  const F = [['Indicador', 19.4], ['Médio', 20.6], ['Anelar', 19.1], ['Mindinho', 16.2]];
  const [k, setK] = useState(0);
  useEffect(() => { const t = setInterval(() => setK(x => (x + 1) % 5), 900); return () => clearInterval(t); }, []);
  return (
    <div className="float-card" aria-hidden="true">
      <div className="fc-row"><span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--ink)' }}><Icon n="straighten" size={20} style={{ color: 'var(--blue)' }} /> A tua mão</span><span className="hint">{k >= 4 ? 'medida' : 'a medir…'}</span></div>
      {F.map(([n, w], i) => (
        <div key={n} style={{ display: 'grid', gap: 4 }}>
          <div className="fc-row"><span>{n}</span><b>{i < k || k === 4 ? fmt(w, 1) + ' mm' : '—'}</b></div>
          <div className="fc-bar"><i style={{ width: i < k || k === 4 ? `${(w / 24) * 100}%` : '0%' }} /></div>
        </div>
      ))}
    </div>
  );
}

function Lab() {
  const cv = useRef(); const view = useRef(); const [w, setW] = useState(19.2); const [style, setStyle] = useState('FULL_4_FINGER'); const [d, setD] = useState({});
  useEffect(() => {
    const v = makeViewer(cv.current, { cam: [200, 150, 290], fov: 24, minD: 200, maxD: 700, autoRotate: true, spin: 0.0025, transparent: true, noZoom: true, shadow: 0.1 });
    v.renderer.toneMappingExposure = 1.05;
    const model = new THREE.Group(); v.root.add(model);
    view.current = { v, model, mats: makeMats(), gm: gripMaterial('FDM_PETG_CF') };
    return () => v.dispose();
  }, []);
  useEffect(() => {
    const { v, model, mats, gm } = view.current; const phone = E.PHONES.IPHONE_16_PRO;
    const base = E.estimateHand({ heightCm: 172 }); const k = w / base.fingers.middle.w;
    E.FINGERS.forEach(f => { base.fingers[f] = E.fingerRecord(base.fingers[f].w * k, base.fingers[f].d * k); });
    const socks = E.sockets(base, phone, style); const imp = E.impact({ phone, h: 1.2 });
    const b = G.build({ phone, socks, types: ['sela', 'sela', 'sela', 'sela'], gripMat: 'FDM_PETG_CF', tSide: imp.tSide, tCorner: imp.tCorner });
    disposeGroup(model);
    b.caseParts.forEach(g => model.add(meshOf(g, mats.case)));
    b.grips.forEach(gr => { const grp = new THREE.Group(); gr.parts.forEach(g => grp.add(meshOf(g, gm))); grp.position.set(gr.sock.x, gr.sock.y, G.consts.BACK + G.consts.BOSS_H); grp.rotation.z = gr.sock.theta * Math.PI / 180; model.add(grp); });
    model.add(...G.phoneGroup(phone, mats).children);
    model.rotation.set(-Math.PI / 2, 0, 0); v.ground.position.y = -10;
    setD({ rs: base.fingers.middle.rs, ring: base.fingers.middle.ring, vol: b.grips.reduce((s, g) => s + g.vol, 0) / 1000, gap: Math.abs(socks[0].y - socks[1].y) });
    v.invalidate();
  }, [w, style]);
  return (
    <div className="lab reveal">
      <div className="lab-view"><canvas ref={cv} aria-label="Capa DÍGITO gerada em tempo real. Arrasta para rodar." /></div>
      <div className="lab-side">
        <span className="story-step"><span className="num"><Icon n="3d_rotation" size={16} /></span> Gerado agora, no teu browser</span>
        <h3>Muda a largura do dedo. Vê a capa a redesenhar-se.</h3>
        <div className="field">
          <div className="row" style={{ justifyContent: 'space-between' }}><label htmlFor="lab-w">Largura do dedo médio</label><span className="mono" style={{ color: 'var(--ink)' }}>{fmt(w, 1)} mm</span></div>
          <Range id="lab-w" min={16} max={24} step={0.1} value={w} onChange={setW} />
        </div>
        <div className="keyrow" role="group" aria-label="Forma de segurar">
          {Object.entries(E.STYLES).map(([k, s]) => <button key={k} className="key" aria-pressed={style === k} onClick={() => setStyle(k)}>{s.name}</button>)}
        </div>
        <div className="readouts">
          <div className="ro"><span>Raio da sela</span><b>{fmt(d.rs || 10, 1)}<small>mm</small></b></div>
          <div className="ro"><span>Anel Ø</span><b>{fmt(d.ring || 20, 1)}<small>mm</small></b></div>
          <div className="ro"><span>Entre encaixes</span><b>{fmt(d.gap || 22, 1)}<small>mm</small></b></div>
          <div className="ro"><span>Volume das pegas</span><b>{fmt(d.vol || 5, 2)}<small>cm³</small></b></div>
        </div>
        <Link to="/configurar" className="key key-dark" style={{ justifySelf: 'start' }}>Configurar com as minhas medidas <Icon n="arrow_forward" size={20} /></Link>
      </div>
    </div>
  );
}

const MATS = [
  { name: 'TPU 95A', proc: 'FDM · capa', dot: 'radial-gradient(circle at 35% 30%, #5a5c61, #1b1c1f 70%)', E: '65 MPa', rho: '1,22 g/cm³', c: '0,25 mm', note: 'Elástico. Absorve a queda nos cantos.' },
  { name: 'PETG-CF', proc: 'FDM · pegas', dot: 'repeating-linear-gradient(45deg,#2b2d31 0 2px,#3a3d42 2px 4px)', E: '3,8 GPa', rho: '1,29 g/cm³', c: '0,20 mm', note: 'Rígido e mate, com fibra de carbono.' },
  { name: 'Tough 2000', proc: 'SLA · pegas', dot: 'radial-gradient(circle at 35% 30%, #6b7484, #2d3440 70%)', E: '2,2 GPa', rho: '1,18 g/cm³', c: '0,08 mm', note: 'Resina tenaz, acabamento liso e tolerância fina.' },
  { name: 'Ti6Al4V', proc: 'SLM · edição', dot: 'linear-gradient(135deg,#e4e6e9,#8e9298 45%,#cfd2d6 60%,#7c8086)', E: '110 GPa', rho: '4,43 g/cm³', c: '0,10 mm', note: 'Titânio grau 5, fundido a laser.' }
];
const COLORS = ['c-red', 'c-blue', 'c-violet', 'c-green'];

export default function Home() {
  const [listings, setListings] = useState([]);
  useEffect(() => {
    supabase.from('listings').select('*, seller:profiles!listings_seller_id_fkey(username,display_name)').eq('status', 'ativo').order('sales_count', { ascending: false }).limit(4)
      .then(({ data }) => setListings(data || []));
  }, []);
  useReveal();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>Uma capa feita <em>à medida</em> dos teus dedos</h1>
          <p>Mede a tua mão com uma fotografia. Geramos uma pega para cada dedo e imprimimos tudo em 3D, só para ti.</p>
          <div className="hero-cta">
            <Link to="/configurar" className="key key-dark key-lg">Configurar a minha capa</Link>
            <Link to="/loja" className="key key-alu key-lg">Ver a loja</Link>
          </div>
        </div>
        <div className="hero-media">
          <video src={V('hero.mp4')} poster={V('hero.jpg')} autoPlay muted loop playsInline aria-label="Impressora 3D a depositar, camada a camada, quatro pegas DÍGITO." />
          <MeasureCard />
        </div>
      </section>

      <div className="wrap">
        <nav className="chips-bar" aria-label="Secções">
          <a className="chip-link" href="#medir"><Icon n="photo_camera" />Medir</a>
          <a className="chip-link" href="#gerar"><Icon n="view_in_ar" />Gerar</a>
          <a className="chip-link" href="#imprimir"><Icon n="precision_manufacturing" />Imprimir</a>
          <a className="chip-link" href="#laboratorio"><Icon n="3d_rotation" />Experimentar</a>
          <Link className="chip-link" to="/loja"><Icon n="storefront" />Loja</Link>
        </nav>
        <div className="explore"><span>Explorar</span><Icon n="arrow_downward" size={20} /></div>

        <section className="story reveal" id="medir">
          <div className="story-media"><span className="tagpill"><Icon n="photo_camera" />Medição</span><AutoVideo src={V('measure.mp4')} poster={V('measure.jpg')} label="Mão com os 21 pontos de articulação e réguas de largura em cada dedo." /></div>
          <div className="story-copy">
            <span className="story-step"><span className="num">1</span>Medir</span>
            <h2>Uma fotografia chega para medir cada dedo</h2>
            <p>Pousa a mão numa folha com um cartão ao lado. A visão por computador encontra as 21 articulações e mede a largura de cada dedo, à décima de milímetro. Tudo corre no teu telemóvel e a foto nunca é enviada.</p>
          </div>
        </section>

        <section className="story flip reveal" id="gerar">
          <div className="story-media"><span className="tagpill"><Icon n="view_in_ar" />Geração</span><AutoVideo src={V('generate.mp4')} poster={V('generate.jpg')} label="A pega muda de forma à medida que a largura do dedo aumenta." /></div>
          <div className="story-copy">
            <span className="story-step"><span className="num">2</span>Gerar</span>
            <h2>Uma pega por dedo, com a forma desse dedo</h2>
            <p>O berço de cada pega tem o raio do teu dedo. Os encaixes ficam onde os dedos caem quando seguras o telemóvel, e os cantos engrossam conforme a altura de queda que escolhes.</p>
            <div className="facts"><div className="fact"><b>4</b><span>pegas diferentes</span></div><div className="fact"><b>0,1 mm</b><span>resolução da medida</span></div></div>
          </div>
        </section>

        <section className="story reveal" id="imprimir">
          <div className="story-media"><span className="tagpill"><Icon n="precision_manufacturing" />Impressão</span><AutoVideo src={V('print.mp4')} poster={V('print.jpg')} label="Impressão FDM da capa, camada a camada." /></div>
          <div className="story-copy">
            <span className="story-step"><span className="num">3</span>Imprimir</span>
            <h2>Camada a camada, só para ti</h2>
            <p>A capa é impressa em TPU flexível com alvéolos nas costas. As pegas saem em PETG com fibra de carbono, resina tenaz ou titânio, e encaixam na capa sem ferramentas.</p>
            <div className="facts"><div className="fact"><b>1</b><span>peça é a série mínima</span></div><div className="fact"><b>0</b><span>moldes</span></div></div>
          </div>
        </section>
      </div>

      <section className="band" id="laboratorio">
        <div className="wrap">
          <div className="band-head reveal"><h2>Experimenta antes de medir</h2><p>Este modelo é gerado pelo mesmo algoritmo que cria os ficheiros de impressão.</p></div>
          <Lab />
        </div>
      </section>

      <section className="wrap" style={{ paddingBlock: 96 }}>
        <div className="band-head reveal"><h2>Mais da DÍGITO</h2><p>Peças oficiais e designs da comunidade. Todas encaixam na mesma capa.</p></div>
        <div className="cards4">
          {listings.map((l, i) => (
            <Link key={l.id} to={`/loja/${l.slug}`} className={`pcard ${COLORS[i % 4]} reveal`}>
              <div className="pc-top"><span className="tagpill"><Icon n="sell" size={16} />{eur(l.price_cents)}</span><Icon n="add" className="pc-plus" /></div>
              {l.images?.[0] ? <img src={img(l.images[0])} alt="" loading="lazy" /> : <span />}
              <p>{l.title}. {l.summary}</p>
            </Link>
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: 40 }}><Link className="key key-alu key-lg" to="/loja">Explorar toda a loja</Link></div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="band-head reveal"><h2>Quatro materiais, quatro processos</h2><p>A folga de cada encaixe é corrigida para o material que escolhes.</p></div>
          <div className="mat-grid">
            {MATS.map(m => (
              <div key={m.name} className="mat reveal">
                <span className="mat-dot" style={{ background: m.dot }} />
                <div><h3>{m.name}</h3><span className="hint">{m.proc}</span></div>
                <p className="hint">{m.note}</p>
                <dl><dt>Módulo E</dt><dd>{m.E}</dd><dt>Densidade</dt><dd>{m.rho}</dd><dt>Folga</dt><dd>{m.c}</dd></dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap cta-final reveal">
        <h2>Desenha pegas. Vende-as aqui.</h2>
        <p>Qualquer pega com o encaixe DÍGITO serve em todas as capas. Publica o teu design e nós imprimimos e enviamos.</p>
        <div className="row" style={{ justifyContent: 'center' }}><Link to="/vender" className="key key-dark key-lg">Abrir a minha banca</Link><Link to="/configurar" className="key key-alu key-lg">Configurar uma capa</Link></div>
      </section>
    </>
  );
}
