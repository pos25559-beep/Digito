import { Link } from 'react-router-dom';
import { BASE } from '../lib/supabase.js';
import { Icon, useReveal, AutoVideo } from '../components/ui.jsx';
import { HBars } from '../components/charts.jsx';

const M = f => `${BASE}/motion/${f}`;
const GH = 'https://github.com/pos25559-beep/Digito/tree/main/eng';

const STEPS = [
  ['Alinhar', 'A seta da pega encontra a marca da capa. As três patilhas estão a 0°, 110° e 240°, por isso só há uma posição em que entram.'],
  ['Empurrar', 'As patilhas passam o lábio do insert e um pequeno pilar de TPU, moldado na própria capa, comprime 0,55 mm.'],
  ['Rodar 60°', 'As patilhas deslizam por baixo do lábio até um batente. Não dá para rodar de mais.'],
  ['Soltar: clique', 'O pilar empurra as patilhas para cima, para dentro de entalhes com 0,4 mm de profundidade. Ouve-se e sente-se o clique.'],
];
const WHY = [
  ['arrow_upward', 'Puxar aperta', 'Puxar a pega encosta as patilhas ao lábio com mais força. É o contrário de um íman, que solta quando se puxa.'],
  ['rotate_left', 'Rodar não chega', 'As paredes dos entalhes travam a rotação. Para soltar é preciso empurrar e rodar ao mesmo tempo, um gesto que a mão não faz por acaso.'],
  ['shield', 'Se partir, parte a pega', 'O lábio da capa aguenta cerca de 1,3 vezes mais do que as patilhas da pega. Num esforço extremo parte a peça barata e substituível, e a capa continua a proteger o telemóvel.'],
];
const HOLD = [
  { label: 'Ímanes N42 (encaixe atual)', value: 6, lo: 4, hi: 8, tone: 'muted', note: 'Estimativa para um íman Ø6×2 mm com folga. Solta-se quando a força passa este valor.' },
  { label: 'Lock: rotura da patilha', value: 190, lo: 190, hi: 205, note: 'Patilhas da pega em PETG. É o elo fraco por desenho.' },
  { label: 'Lock: rotura do lábio', value: 261, note: 'Lábio do insert, do lado da capa.' },
];
const FS = [
  { label: 'Puxar 30 N', value: 6.3, note: 'Patilhas da pega; rotura a cerca de 190 N.' },
  { label: 'Lábio da capa', value: 8.7, note: 'O lado da capa tem muito mais margem do que a pega.' },
  { label: 'Momento em uso', value: 3.0, note: 'Força do dedo a 26 mm do encaixe: 0,36 N·m.' },
  { label: 'Rodar sem empurrar', value: 2.2, note: 'Encosto nos entalhes de 0,4 mm; capacidade 0,53 N·m.' },
  { label: 'Momento de projeto', value: 2.15, note: '0,5 N·m: o caso que dimensiona o encaixe.' },
  { label: 'Abuso: alavanca 1 N·m', value: 1.08, tone: 'warn', note: 'No limite. Se partir, parte a patilha da pega e não a capa.' },
];
const STATUS = [
  [true, 'Desenho e cálculo analítico', 'Cotas, cargas e fatores de segurança fechados.'],
  [true, 'Verificação cinemática em 3D', 'Os sólidos reais confirmam que entra, roda, bloqueia e não sai.'],
  [true, 'Modelo paramétrico para o Fusion 360', '27 parâmetros editáveis e três componentes na posição bloqueada.'],
  [false, 'Simulação de esforços no Fusion 360', 'Tração, momento, binário e compressão do pilar.'],
  [false, 'Provete do pilar de TPU', 'Escolher o diâmetro (1,6 a 2,8 mm) que solta com 10 a 18 N.'],
  [false, 'Ensaios em bancada', '3 kg durante 1 hora, 1000 encaixes, 10 quedas de 1,2 m e ensaio até à rotura.'],
];
const AREAS = [['como', 'Como encaixa', 'touch_app'], ['porque', 'Porque não cai', 'lock'], ['numeros', 'Números', 'bar_chart'], ['fabrico', 'Fabrico', 'precision_manufacturing'], ['configurador', 'Configurador', 'tune'], ['estado', 'Estado', 'checklist']];

export default function Tech() {
  useReveal();
  return (
    <div className="tech">
      <section className="wrap tech-hero">
        <div className="tech-hero-copy">
          <span className="why-kicker">Tecnologia · DÍGITO Lock</span>
          <h1>Uma pega não pode cair do nada</h1>
          <p className="lead">Quem treme ou tem pouca força apoia o peso do telemóvel nas pegas. Por isso o encaixe entre a pega e a capa é a peça mais importante da DÍGITO. Trocámos os ímanes por uma baioneta sem peças móveis, que só se solta quando tu queres.</p>
          <p className="tech-status"><Icon n="science" size={18} />Em validação: o desenho está fechado e os protótipos estão a ser ensaiados. Até lá, as capas usam o encaixe com ímanes.</p>
        </div>
        <div className="tech-hero-media"><AutoVideo src={M('lock.mp4')} poster={M('lock.jpg')} label="Animação em corte do DÍGITO Lock: a pega alinha, desce, roda 60 graus e fica presa por três patilhas debaixo do lábio do insert azul." /></div>
      </section>

      <div className="wrap"><nav className="chips-bar" aria-label="Secções">{AREAS.map(([id, t, ic]) => <a key={id} className="chip-link" href={`#${id}`}><Icon n={ic} />{t}</a>)}</nav></div>

      <section className="wrap tech-sec" id="como">
        <div className="band-head reveal"><h2>Empurrar, rodar, clique</h2><p>O mesmo princípio das lâmpadas de baioneta, com as medidas de uma pega para um dedo.</p></div>
        <ol className="tech-steps">
          {STEPS.map(([t, d], i) => <li key={t} className="reveal"><span className="tech-n">{i + 1}</span><h3>{t}</h3><p>{d}</p></li>)}
        </ol>
        <p className="hint reveal" style={{ marginTop: 20 }}>Para tirar: empurrar, rodar 60° no sentido contrário e puxar.</p>
      </section>

      <section className="band" id="porque">
        <div className="wrap">
          <div className="band-head reveal"><h2>Porque não se solta sozinha</h2><p>Nenhuma força do uso normal consegue fazer o gesto que solta a pega.</p></div>
          <div className="tech-why">
            {WHY.map(([ic, t, d]) => <div key={t} className="tech-card reveal"><Icon n={ic} /><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="wrap tech-sec" id="numeros">
        <div className="band-head reveal"><h2>Os números</h2><p>Cálculo analítico em PETG (tensão de cedência 47 MPa), com o pior caso de cada carga. Ainda falta confirmá-los em simulação e em bancada.</p></div>
        <div className="tech-charts">
          <div className="plate reveal"><HBars title="Força para soltar ou partir a pega" sub="Newtons. A linha marca a carga de projeto: 30 N, cerca de 3 kg pendurados." unit="N" rows={HOLD} refs={[{ value: 30, label: 'Projeto: 30 N' }]} table={['Encaixe', 'N']} /></div>
          <div className="plate reveal"><HBars title="Fator de segurança por caso de carga" sub="Quantas vezes a peça aguenta a carga desse caso. Abaixo de 1 parte; o nosso alvo é 2." unit="×" rows={FS} refs={[{ value: 1, label: 'Rotura', anchor: 'end' }, { value: 2, label: 'Alvo' }]} max={9.5} decimals={1} /></div>
        </div>
        <aside className="weak reveal"><div className="weak-h"><Icon n="balance" size={20} />Onde o desenho ainda é fraco</div>
          <p>Se alguém usar o anel como alavanca (1 N·m), a margem é de apenas 1,1. Aceitamos este valor porque, se partir, parte a patilha da pega e não a capa. Se o ensaio mostrar que parte cedo de mais, as patilhas passam de 1,4 para 1,6 mm (há espaço para isso) ou a pega passa a ser impressa em resina tenaz.</p>
          <p>A força para soltar depende da rigidez real do TPU, que varia quase três vezes entre fabricantes (9 a 26 MPa). Por isso o diâmetro do pilar só é escolhido depois de imprimir o provete.</p>
        </aside>
      </section>

      <section className="band" id="fabrico">
        <div className="wrap tech-fab">
          <div className="tech-fab-media reveal"><AutoVideo src={M('print2.mp4')} poster={M('print2.jpg')} label="Impressão com dois bicos: o fundo da capa em TPU cinzento, depois o insert azul em PETG e a capa à volta na mesma camada, e por fim a tampa de TPU." /></div>
          <div className="tech-fab-copy reveal">
            <span className="why-kicker">Fabrico</span>
            <h2>Dois materiais na mesma impressão</h2>
            <p>Com uma impressora de dois bicos, a capa em TPU flexível e o insert em PETG rígido saem da mesma placa, sem pausas nem montagem. O insert fica preso pela forma hexagonal com uma chave, não por cola.</p>
            <dl className="tech-spec">
              <dt>Capa</dt><dd>TPU 95A, flexível</dd>
              <dt>Insert e pega</dt><dd>PETG, rígido</dd>
              <dt>Bico e camada</dt><dd className="mono">0,4 mm · 0,2 mm</dd>
              <dt>Folga radial</dt><dd className="mono">0,20 mm (FDM) · 0,10 mm (resina)</dd>
              <dt>Folga axial</dt><dd className="mono">0,15 mm</dd>
              <dt>Altura do encaixe</dt><dd className="mono">4,95 mm</dd>
            </dl>
            <p className="hint">A ter em conta: impresso no sítio, o lábio do insert fica 1,6 mm em consola sobre o canal das patilhas. Se o ensaio mostrar defeitos nessa zona, o insert passa a ser impresso à parte, com o lábio na mesa, e colocado numa pausa a z = 4,35 mm.</p>
          </div>
        </div>
      </section>

      <section className="wrap tech-sec" id="configurador">
        <div className="band-head reveal"><h2>Pegas que nunca se tocam</h2><p>O configurador passou a conhecer a forma real de cada pega e de cada anel, e não só o centro do encaixe.</p></div>
        <div className="tech-stats">
          <div className="tstat reveal"><span className="tstat-k">Antes</span><b>79,2%</b><p>das 2100 combinações de mão, telemóvel e pegas testadas tinham peças sobrepostas, fora da capa ou em cima da câmara.</p></div>
          <div className="tstat reveal"><span className="tstat-k">Agora</span><b>1,1%</b><p>São mãos muito grandes com anéis em telemóveis pequenos. O configurador avisa, propõe uma correção e não deixa comprar sem ela.</p></div>
          <div className="tstat reveal"><span className="tstat-k">Sem aviso</span><b>0</b><p>Cada combinação é verificada com as malhas 3D geradas. Nenhum problema passa sem ser assinalado.</p></div>
        </div>
      </section>

      <section className="band" id="estado">
        <div className="wrap">
          <div className="band-head reveal"><h2>Onde estamos</h2><p>Mostramos o que já está provado e o que ainda falta. A baioneta só substitui os ímanes quando passar todos os ensaios.</p></div>
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
