import { Link } from 'react-router-dom';
import { Icon, useReveal, StepVideo } from '../components/ui.jsx';
import LockAnim, { PHASES } from '../components/LockAnim.jsx';
import { PRINT_VIDEO } from '../lib/motion.js';
import { HBars } from '../components/charts.jsx';
import { LK } from '../lib/lock.js';

const GH = 'https://github.com/pos25559-beep/Digito/tree/main/eng';

/* corte à escala (8 px/mm): costas da capa rentes ao encaixe */
function Section() {
  const k = 8, B = 3.2, cx = 200, y = z => 118 - z * k, X = mm => cx + mm * k;
  const zb = B + LK.push, zt = zb + 7.5;
  return (
    <svg viewBox="0 0 400 150" className="la-sec" role="img" aria-label="Corte vertical à escala: o encaixe fica todo dentro dos 3,2 mm das costas da capa. Só a pega sobressai.">
      <rect x="0" y={y(0)} width="400" height="14" className="sec-phone" /><text x="8" y={y(0) + 11} className="sec-t inv">telemóvel</text>
      <rect x="0" y={y(B)} width="400" height={B * k} className="sec-tpu" /><text x="8" y={y(B / 2) + 4} className="sec-t">TPU · 3,2 mm</text>
      <rect x={X(-LK.r_out)} y={y(B)} width={2 * LK.r_out * k} height={B * k} className="sec-ins" />
      <rect x={X(-LK.r_core)} y={y(zb)} width={2 * LK.r_core * k} height={(zb - LK.z_lug0) * k} className="sec-plug" />
      <rect x={X(-LK.r_lug)} y={y(LK.z_lug1)} width={2 * LK.r_lug * k} height={(LK.z_lug1 - LK.z_lug0) * k} className="sec-plug" />
      <rect x={X(-11)} y={y(zt)} width={22 * k} height={7.5 * k} rx="22" className="sec-plug" />
      <text x={X(11) + 10} y={y(zt - 3)} className="sec-t">pega (sela)</text>
      <text x={X(LK.r_out) + 8} y={y(B / 2) + 4} className="sec-t">insert PETG, rente</text>
    </svg>
  );
}

const WHY = [
  ['push_pin', 'Empurrar não solta', 'O dente prende a patilha de lado. Apertar a pega contra a capa, como se faz ao segurar, não muda nada.'],
  ['arrow_upward', 'Puxar aperta', 'Puxar encosta as patilhas às abas. As patilhas aguentam cerca de 190 N, 6 vezes o puxão de projeto.'],
  ['key', 'Só sai com a chave', 'Para soltar é preciso tirar o telemóvel e encostar a chave aos três dentes, por dentro da capa.'],
];
const HOLD = [
  { label: 'Ímanes N42 (encaixe antigo)', value: 6, lo: 4, hi: 8, tone: 'muted', note: 'Estimativa para um íman Ø6×2 mm com folga.' },
  { label: 'Lock v3: rotura das patilhas', value: 190, lo: 190, hi: 205, note: 'Patilhas da pega. É o elo fraco por desenho.' },
  { label: 'Lock v3: rotura das abas', value: 299, note: 'Abas do insert, do lado da capa.' },
];
const FS = [
  { label: 'Abas da capa (puxar)', value: 10.0, note: '299 N contra 30 N.' },
  { label: 'Patilhas (puxar 30 N)', value: 6.3, note: 'Rotura a cerca de 190 N.' },
  { label: 'Rodar sem a chave', value: 3.75, note: '0,90 N·m (3 dentes) contra 0,24 N·m em serviço.' },
  { label: 'Momento em uso', value: 3.0, note: 'Força do dedo a 26 mm do encaixe.' },
  { label: 'Momento de projeto', value: 2.15, note: '0,5 N·m: o caso que dimensiona as patilhas.' },
  { label: 'Abuso: alavanca 1 N·m', value: 1.08, tone: 'warn', note: 'No limite. Se partir, parte a patilha da pega e não a capa.' },
];
const STATUS = [
  [true, 'Desenho e cálculo (v3)', 'Braços a 1,25–1,65 % de deformação, 0,90 N·m de retenção, abas a 299 N.'],
  [true, 'Verificação cinemática em 3D', 'Bloqueia encostado e empurrado, só entra numa orientação (varrida de grau em grau), sai com a chave.'],
  [true, 'Configurador com o v3', 'Os encaixes que vês no configurador e nos ficheiros STL já são os do v3.'],
  [false, 'Modelo e simulação no Fusion 360', 'Tensões no braço mais curto, no dente e nas abas.'],
  [false, 'Provetes impressos', 'Insert numa placa de TPU de 3,2 mm, macho de ensaio e chave de libertação.'],
  [false, 'Ensaios em bancada', 'Binário até rodar, 500 encaixes, 20 N a empurrar com torção, 3 kg durante 1 hora, arrancamento do insert.'],
];
const AREAS = [['como', 'Como encaixa', 'touch_app'], ['porque', 'Porque não cai', 'lock'], ['numeros', 'Números', 'bar_chart'], ['fabrico', 'Fabrico', 'precision_manufacturing'], ['configurador', 'Configurador', 'tune'], ['estado', 'Estado', 'checklist']];

export default function Tech() {
  useReveal();
  return (
    <div className="tech">
      <section className="wrap tech-hero">
        <div className="tech-hero-copy">
          <span className="why-kicker">Tecnologia · DÍGITO Lock v3</span>
          <h1>Uma pega não pode cair do nada</h1>
          <p className="lead">Quem treme ou tem pouca força apoia o peso do telemóvel nas pegas. O encaixe é a peça mais importante da DÍGITO. A terceira versão fica rente às costas da capa: sem pegas, as costas ficam lisas. Com pegas, nada as solta sem a chave.</p>
          <p className="tech-status"><Icon n="science" size={18} />Em validação: geometria verificada em 3D, provetes a imprimir.</p>
        </div>
        <div className="tech-hero-media-wrap"><LockAnim /></div>
      </section>

      <div className="wrap"><nav className="chips-bar" aria-label="Secções">{AREAS.map(([id, t, ic]) => <a key={id} className="chip-link" href={`#${id}`}><Icon n={ic} />{t}</a>)}</nav></div>

      <section className="wrap tech-sec" id="como">
        <div className="band-head reveal"><h2>Encaixar, rodar, clique</h2><p>Uma baioneta de três patilhas com três trincos. Tudo dentro dos 3,2 mm das costas da capa.</p></div>
        <ol className="tech-steps">
          {[...PHASES.map(p => [p[2], p[3]]), ['Para tirar', 'Tira o telemóvel, encosta a chave à base do encaixe, por dentro da capa, e roda a pega 60° para trás.']].map(([t, d], i) => <li key={t} className="reveal"><span className="tech-n">{i + 1}</span><h3>{t}</h3><p>{d}</p></li>)}
        </ol>
        <div className="reveal" style={{ marginTop: 28 }}><Section /></div>
      </section>

      <section className="band" id="porque">
        <div className="wrap">
          <div className="band-head reveal"><h2>Porque não se solta sozinha</h2><p>A versão anterior dependia de uma pequena mola de TPU. A v3 só depende da forma das peças.</p></div>
          <div className="tech-why">{WHY.map(([ic, t, d]) => <div key={t} className="tech-card reveal"><Icon n={ic} /><h3>{t}</h3><p>{d}</p></div>)}</div>
        </div>
      </section>

      <section className="wrap tech-sec" id="numeros">
        <div className="band-head reveal"><h2>Os números</h2><p>Cálculo analítico em PETG (cedência 47 MPa), com o pior caso de cada carga. Falta confirmá-los em simulação e em bancada.</p></div>
        <div className="tech-charts">
          <div className="plate reveal"><HBars title="Força para soltar ou partir" sub="Newtons. A linha marca a carga de projeto: 30 N, cerca de 3 kg pendurados." unit="N" rows={HOLD} refs={[{ value: 30, label: 'Projeto: 30 N' }]} table={['Encaixe', 'N']} /></div>
          <div className="plate reveal"><HBars title="Fator de segurança por caso de carga" sub="Quantas vezes a peça aguenta a carga desse caso. Abaixo de 1 parte; o alvo é 2." unit="×" rows={FS} refs={[{ value: 1, label: 'Rotura', anchor: 'end' }, { value: 2, label: 'Alvo' }]} max={10.5} decimals={1} /></div>
        </div>
        <div className="weak reveal" role="note"><div className="weak-h"><Icon n="balance" size={20} />O que ainda falta provar</div>
          <p>O braço mais curto chega a 1,96 % de deformação quando se solta a pega, um pouco acima do limite de 1,88 % para encaixes repetidos. Aceitamos porque só acontece na desmontagem; o ensaio de 500 ciclos vai dizer se chega.</p>
          <p>A pega só entra com cerca de ±2° de folga, para não poder entrar numa orientação errada. Antes de chegar às pessoas, as abas vão ter chanfros que rodam a pega até à posição certa quando se empurra.</p>
        </div>
      </section>

      <section className="band" id="fabrico">
        <div className="wrap tech-fab">
          <div className="reveal"><StepVideo {...PRINT_VIDEO} /></div>
          <div className="tech-fab-copy reveal">
            <span className="why-kicker">Fabrico</span>
            <h2>Capa e encaixes na mesma impressão</h2>
            <p>Numa impressora de dois bicos, a capa em TPU flexível e os inserts em PETG rígido saem da mesma placa, com a face do telemóvel para baixo. Os braços dos trincos nascem na mesa e fletem no plano das camadas, a direção forte da impressão.</p>
            <dl className="tech-spec">
              <dt>Capa</dt><dd>TPU 95A, flexível</dd>
              <dt>Insert e pega</dt><dd>PETG, rígido</dd>
              <dt>Costas e encaixe</dt><dd className="mono">3,2 mm, rentes</dd>
              <dt>Folga radial</dt><dd className="mono">0,20 mm</dd>
              <dt>Curso a empurrar</dt><dd className="mono">0,15 mm</dd>
              <dt>Engate do dente</dt><dd className="mono">0,70 mm</dd>
            </dl>
            <p className="hint">A animação mostra a impressão da versão anterior; a ordem das camadas é a mesma.</p>
          </div>
        </div>
      </section>

      <section className="wrap tech-sec" id="configurador">
        <div className="band-head reveal"><h2>Medidas reais de cada telemóvel</h2><p>O configurador conhece os botões, portas, microfones e altifalantes de cada modelo, e a forma real de cada pega.</p></div>
        <div className="tech-stats">
          <div className="tstat reveal"><span className="tstat-k">Desenhos oficiais</span><b>9</b><p>Todos os iPhone do catálogo, do 16 ao 18 Pro Max, com as cotas dos desenhos dimensionais da Apple: botões, portas, microfones e câmara.</p></div>
          <div className="tstat reveal"><span className="tstat-k">Modelos</span><b>15</b><p>Apple, Samsung e Google. Nos Samsung e Pixel, ainda estimados, confirmamos os botões no teu telemóvel antes de imprimir.</p></div>
          <div className="tstat reveal"><span className="tstat-k">Pegas sobrepostas</span><b>0</b><p>Cada combinação de mão, telemóvel e pegas é verificada. Os vincos laterais nunca passam por cima de um botão.</p></div>
        </div>
      </section>

      <section className="band" id="estado">
        <div className="wrap">
          <div className="band-head reveal"><h2>Onde estamos</h2><p>Mostramos o que já está provado e o que ainda falta.</p></div>
          <ul className="tech-status-list">
            {STATUS.map(([ok, t, d]) => <li key={t} className={`reveal ${ok ? 'ok' : ''}`}><Icon n={ok ? 'check_circle' : 'radio_button_unchecked'} fill={ok} /><div><b>{t}</b><span>{d}</span></div><em>{ok ? 'Feito' : 'A seguir'}</em></li>)}
          </ul>
          <div className="row reveal" style={{ justifyContent: 'center', gap: 12, marginTop: 40 }}>
            <a className="key key-alu key-lg" href={GH} target="_blank" rel="noreferrer">Ficheiros de engenharia <Icon n="open_in_new" size={18} /></a>
            <Link className="key key-dark key-lg" to="/configurar">Configurar a minha capa</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
