import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { supabase, BASE } from '../lib/supabase.js';
import * as E from '../lib/engine.js';
import * as G from '../lib/geometry.js';
import { makeViewer, makeMats, gripMaterial, meshOf, disposeGroup } from '../lib/viewer.js';
import { fmt } from '../lib/pricing.js';
import { Plate, LCD, Led } from '../components/ui.jsx';
import ListingCard from '../components/ListingCard.jsx';

const V = f => `${BASE}/video/${f}`;

function HeroReadout() {
  const seq = [['Indicador', 19.4], ['Médio', 20.6], ['Anelar', 19.1], ['Mindinho', 16.2]];
  const [i, setI] = useState(0); const [v, setV] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % seq.length), 2600); return () => clearInterval(t); }, []);
  useEffect(() => { let raf, start; const to = seq[i][1], from = v; const step = ts => { start ??= ts; const k = Math.min(1, (ts - start) / 700); setV(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf); }, [i]); // eslint-disable-line
  return (
    <div className="hero-readout" aria-hidden="true">
      <span className="engrave dark">largura na articulação · {seq[i][0]}</span>
      <span className="bezel"><LCD value={fmt(v, 2)} unit="mm" /></span>
    </div>
  );
}

function AutoVideo({ src, poster, label }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.play().catch(() => {}); else el.pause(); }, { threshold: 0.2 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" aria-label={label} />;
}

function Bench() {
  const cv = useRef(); const [w, setW] = useState(19.2); const [style, setStyle] = useState('FULL_4_FINGER'); const view = useRef(); const [d, setD] = useState({});
  useEffect(() => {
    const v = makeViewer(cv.current, { cam: [190, 120, 300], fov: 24, minD: 180, maxD: 700, autoRotate: true, spin: 0.0025, bg: '#D8D3CB', transparent: true, noZoom: true });
    v.ground.position.y = -12;
    const model = new THREE.Group(); model.rotation.x = -Math.PI / 2 + 0.0001; v.root.add(model);
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
    const ph = G.phoneGroup(phone, mats); model.add(...ph.children);
    model.rotation.set(-Math.PI / 2, 0, 0); model.position.y = 0;
    setD({ rs: base.fingers.middle.rs, ring: base.fingers.middle.ring, vol: b.grips.reduce((s, g) => s + g.vol, 0) / 1000, y: socks[1].y });
    v.invalidate();
  }, [w, style]);
  return (
    <section className="bench wrap" aria-labelledby="bench-h">
      <Plate screws className="bench-box">
        <div className="bench-view"><canvas ref={cv} aria-label="Capa DÍGITO em 3D, gerada no teu browser. Arrasta para rodar." /></div>
        <div className="bench-side">
          <span className="engrave">Bancada · gerado em tempo real</span>
          <h2 id="bench-h">Roda o botão. A capa redesenha-se.</h2>
          <p style={{ color: 'var(--ink-2)' }}>Esta capa não é uma imagem. É gerada agora, no teu browser, pelo mesmo algoritmo que produz os ficheiros de impressão. Muda a largura do dedo e vê os encaixes a afastarem-se.</p>
          <div className="field"><label htmlFor="bench-w">Largura do dedo médio</label><input className="knurl" id="bench-w" type="range" min="16" max="24" step="0.1" value={w} onChange={e => setW(+e.target.value)} /></div>
          <div className="keyrow" role="group" aria-label="Forma de segurar">
            {Object.entries(E.STYLES).map(([k, s]) => <button key={k} className="key key-alu" aria-pressed={style === k} onClick={() => setStyle(k)}>{s.name}</button>)}
          </div>
          <div className="readouts">
            <div className="ro"><span className="engrave">dedo</span><LCD value={fmt(w, 1)} unit="mm" /></div>
            <div className="ro"><span className="engrave">raio da sela</span><LCD value={fmt(d.rs || 10, 1)} unit="mm" /></div>
            <div className="ro"><span className="engrave">anel Ø</span><LCD value={fmt(d.ring || 20, 1)} unit="mm" /></div>
            <div className="ro"><span className="engrave">volume pegas</span><LCD value={fmt(d.vol || 5, 2)} unit="cm³" /></div>
          </div>
          <Link to="/configurar" className="key key-dark key-lg">Configurar com as minhas medidas <Led on /></Link>
        </div>
      </Plate>
    </section>
  );
}

const SWATCHES = [
  { name: 'TPU 95A', proc: 'FDM', role: 'capa', bg: 'radial-gradient(circle at 30% 25%, #4a4c50, #1b1c1f 70%)', E: '65 MPa', rho: '1,22 g/cm³', c: '0,25 mm', note: 'Elástico. Absorve a queda nos cantos.' },
  { name: 'PETG-CF', proc: 'FDM', role: 'pegas', bg: 'repeating-linear-gradient(45deg,#2b2d31 0 2px,#33363b 2px 4px)', E: '3,8 GPa', rho: '1,29 g/cm³', c: '0,20 mm', note: 'Rígido e mate. Fibra de carbono curta.' },
  { name: 'PA12', proc: 'SLS', role: 'pegas', bg: 'radial-gradient(circle at 40% 30%, #6a6b6e, #3b3c3f 80%)', E: '1,75 GPa', rho: '1,01 g/cm³', c: '0,15 mm', note: 'Sinterizado, sem suportes nem camadas visíveis.' },
  { name: 'Ti6Al4V', proc: 'SLM', role: 'edição', bg: 'linear-gradient(135deg,#d9dce0,#8e9298 45%,#c5c8cd 60%,#7c8086)', E: '110 GPa', rho: '4,43 g/cm³', c: '0,10 mm', note: 'Titânio grau 5, fundido a laser.' }
];

export default function Home() {
  const [listings, setListings] = useState(null);
  useEffect(() => {
    supabase.from('listings').select('*, seller:profiles(username,display_name)').eq('status', 'ativo').order('sales_count', { ascending: false }).limit(4)
      .then(({ data }) => setListings(data || []));
  }, []);
  return (
    <>
      <section className="hero" aria-label="Apresentação">
        <video className="hero-poster" src={V('hero.mp4')} poster={V('hero.jpg')} autoPlay muted loop playsInline aria-label="Bico de impressora 3D a depositar, camada a camada, uma pega DÍGITO." />
        <HeroReadout />
        <div className="wrap hero-in">
          <span className="engrave dark">Capas e pegas impressas em 3D · Lisboa</span>
          <h1>Cada dedo tem a sua <em>medida.</em></h1>
          <div className="hero-row">
            <p>Medimos os teus dedos com uma fotografia. Geramos uma pega para cada um. Imprimimos a capa e as pegas camada a camada, só para ti.</p>
            <div className="hero-cta">
              <Link to="/configurar" className="key key-brass key-lg">Configurar a minha capa</Link>
              <Link to="/loja" className="key key-dark key-lg">Ver a loja</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="ticker graphite" aria-hidden="true">
        <div className="ticker-in">
          {[0, 1].map(k => <span key={k} style={{ display: 'contents' }}>
            {['Medido com uma foto e um cartão', 'Encaixe hex 10 mm + íman N42', 'Canto até 5,5 mm', 'Folga corrigida por material', 'Série mínima: 1 peça', 'STL gerado no browser'].map(t => <span key={t + k}><Led on />{t}</span>)}
          </span>)}
        </div>
      </div>

      <section className="sec wrap" id="fabrico" aria-labelledby="fab-h">
        <div className="sec-head">
          <h2 id="fab-h">Medido. Gerado. Impresso.</h2>
          <p>Nenhuma DÍGITO sai de um molde. Cada encomenda passa por três máquinas: a câmara do teu telemóvel, o nosso gerador e uma impressora 3D.</p>
        </div>
        <div className="acts">
          <Plate screws className="act">
            <div className="act-media"><span className="tag chiptag"><Led on color="green" /> Medição</span><AutoVideo src={V('measure.mp4')} poster={V('measure.jpg')} label="Mão com os 21 pontos de articulação detetados e réguas de largura em cada dedo." /></div>
            <div className="act-copy"><span className="act-n">01 · Câmara</span><h3>Uma foto. Vinte e um pontos.</h3><p>Pousa a mão numa folha com um cartão ao lado. A visão por computador encontra as 21 articulações e mede a largura de cada dedo, na articulação do meio, à décima de milímetro. Tudo corre no teu telemóvel; a foto não sai de lá.</p></div>
          </Plate>
          <Plate screws className="act">
            <div className="act-media"><span className="tag chiptag"><Led on /> Geração</span><AutoVideo src={V('generate.mp4')} poster={V('generate.jpg')} label="A pega muda de forma à medida que a largura do dedo aumenta." /></div>
            <div className="act-copy"><span className="act-n">02 · Gerador</span><h3>Uma pega por dedo.</h3><p>O berço de cada pega tem o raio do teu dedo. Os encaixes ficam onde os dedos caem quando seguras o telemóvel. A espessura dos cantos depende da altura de queda que escolhes.</p></div>
          </Plate>
          <Plate screws className="act">
            <div className="act-media"><span className="tag chiptag"><Led on color="red" /> 245 °C</span><AutoVideo src={V('print.mp4')} poster={V('print.jpg')} label="Impressão FDM da capa: o bico percorre o contorno de cada camada." /></div>
            <div className="act-copy"><span className="act-n">03 · Impressora</span><h3>Camada a camada, 0,2 mm de cada vez.</h3><p>A capa é impressa em TPU flexível, com alvéolos hexagonais nas costas. As pegas saem em PETG com fibra de carbono, PA12 sinterizado ou titânio. Depois entram nos encaixes e um íman segura-as.</p></div>
          </Plate>
        </div>
      </section>

      <Bench />

      <section className="sec graphite" aria-labelledby="mat-h" style={{ background: undefined }}>
        <div className="wrap">
          <div className="sec-head"><h2 id="mat-h" style={{ color: '#F1EEE7' }}>A gaveta dos materiais.</h2><p style={{ color: '#BDB9B1' }}>Quatro materiais, quatro processos. Cada folga de encaixe é corrigida para o material escolhido.</p></div>
          <div className="drawer">
            {SWATCHES.map(s => (
              <Plate key={s.name} className="swatch">
                <div className="swatch-chip" style={{ background: s.bg }} />
                <div className="row" style={{ justifyContent: 'space-between' }}><h3>{s.name}</h3><span className="engrave">{s.proc} · {s.role}</span></div>
                <p className="hint" style={{ color: 'var(--ink-2)' }}>{s.note}</p>
                <dl><dt>Módulo E</dt><dd>{s.E}</dd><dt>Densidade</dt><dd>{s.rho}</dd><dt>Folga</dt><dd>{s.c}</dd></dl>
              </Plate>
            ))}
          </div>
        </div>
      </section>

      <section className="sec wrap" aria-labelledby="shop-h">
        <div className="sec-head"><h2 id="shop-h">Da loja.</h2><p>Peças oficiais e designs da comunidade. Todos encaixam na mesma capa.</p></div>
        <div className="grid-shop">
          {(listings || []).map(l => <ListingCard key={l.id} l={l} />)}
          {listings && !listings.length && <p className="hint">A loja ainda está vazia.</p>}
        </div>
        <div className="row" style={{ marginTop: 30, justifyContent: 'center' }}><Link className="key key-alu" to="/loja">Ver todos os produtos</Link></div>
      </section>

      <section className="cta-band graphite">
        <div className="wrap">
          <span className="engrave dark">Para quem desenha</span>
          <h2 style={{ color: '#F1EEE7', marginTop: 14 }}>Desenha pegas.<br />Vende-as aqui.</h2>
          <p>Qualquer pega com o nosso encaixe hexagonal serve em todas as capas DÍGITO. Publica o teu design, define o preço e nós imprimimos e enviamos.</p>
          <div className="row"><Link to="/vender" className="key key-brass key-lg">Abrir a minha banca</Link></div>
        </div>
      </section>
    </>
  );
}
