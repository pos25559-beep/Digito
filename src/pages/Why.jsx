import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon, useReveal } from '../components/ui.jsx';
import { SOURCES, srcNum } from '../lib/why.js';

/** citação numerada que liga à lista de fontes */
const C = ({ id }) => { const n = srcNum(id); return <sup className="cite"><a href={`#fonte-${n}`} aria-label={`Fonte ${n}`}>{n}</a></sup>; };

const AREAS = [
  ['tese', 'A tese', 'lightbulb'],
  ['biomedicina', 'Biomedicina', 'accessibility_new'],
  ['ergonomia', 'Ergonomia', 'back_hand'],
  ['informatica', 'Informática', 'memory'],
  ['engenharia', 'Engenharia', 'precision_manufacturing'],
  ['sustentabilidade', 'Sustentabilidade', 'eco'],
  ['caminho', 'O caminho', 'route'],
  ['fontes', 'Fontes', 'menu_book'],
];

function Weak({ children }) {
  return <aside className="weak"><div className="weak-h"><Icon n="balance" size={20} />Onde o argumento é fraco</div>{children}</aside>;
}
function Stat({ big, children, src }) {
  return <div className="wstat"><b>{big}</b><span>{children}{src && <C id={src} />}</span></div>;
}
function Sec({ id, tag, icon, color, title, children }) {
  return (
    <section id={id} className="why-sec">
      <header className="why-sec-h">
        <span className={`why-tag ${color}`}><Icon n={icon} size={18} />{tag}</span>
        <h2>{title}</h2>
      </header>
      <div className="why-sec-b">{children}</div>
    </section>
  );
}

export default function Why() {
  useReveal();
  const loc = useLocation();
  useEffect(() => { if (loc.hash) setTimeout(() => document.querySelector(loc.hash)?.scrollIntoView(), 50); }, [loc.hash]);
  return (
    <div className="why">
      <div className="wrap why-hero">
        <span className="engrave">Visão e investigação</span>
        <h1>Porque existe a <span className="hl">DÍGITO</span></h1>
        <p className="lead">Uma capa de telemóvel não precisava de ser impressa em 3D. Esta página explica para quem a personalização faz diferença real, o que a ciência já mostrou e onde o nosso argumento ainda é fraco.</p>
        <nav className="why-chips" aria-label="Áreas">
          {AREAS.map(([id, t, ic]) => <a key={id} href={`#${id}`} className="chip-link"><Icon n={ic} />{t}</a>)}
        </nav>
      </div>

      <div className="wrap why-body">
        <Sec id="tese" tag="A tese" icon="lightbulb" color="c-blue" title="Personalizar onde importa, imprimir onde compensa">
          <p className="big">Os telemóveis são desenhados para uma mão média que quase ninguém tem. Para a maioria isso é um incómodo. Para quem tem tremor, artrose ou pouca força de preensão, pode decidir se consegue ou não usar o telemóvel sozinho.</p>
          <p>O fabrico aditivo só faz sentido quando cada peça tem de ser diferente. A DÍGITO tem uma parte comum a todos os donos do mesmo telemóvel (o corpo da capa) e uma parte pessoal (a posição dos encaixes e as pegas, uma por dedo). É a parte pessoal que justifica imprimir. O encaixe hexagonal, igual em todas as capas, liga as duas.</p>
          <div className="thesis-grid">
            <div><Icon n="straighten" /><h3>Medir</h3><p>Uma fotografia e um cartão como régua dão a largura de cada dedo à décima de milímetro.</p></div>
            <div><Icon n="deployed_code" /><h3>Gerar</h3><p>Um modelo paramétrico transforma as medidas em geometria. Não há desenho manual por cliente.</p></div>
            <div><Icon n="layers" /><h3>Imprimir</h3><p>Cada peça sai sem molde, por isso a primeira unidade custa quase o mesmo a produzir que a milésima.</p></div>
          </div>
        </Sec>

        <Sec id="biomedicina" tag="Biomedicina e reabilitação" icon="accessibility_new" color="c-red" title="Tecnologia de apoio que as pessoas não abandonam">
          <div className="wstats">
            <Stat big="2,5 mil milhões" src="who">de pessoas precisam de pelo menos um produto de apoio. Serão 3,5 mil milhões em 2050. O acesso vai de 3% nos países mais pobres a 90% nos mais ricos.</Stat>
            <Stat big="29,3%" src="phillips">dos produtos de apoio estudados foram completamente abandonados. Não ouvir o utilizador na escolha foi um dos quatro preditores.</Stat>
            <Stat big="4,6%" src="louis">das pessoas com 65 anos ou mais têm tremor essencial (0,9% da população em geral). É a perturbação do movimento mais comum em adultos.</Stat>
          </div>
          <p>Somam-se mais de 8,5 milhões de pessoas com doença de Parkinson, cuja prevalência duplicou em 25 anos<C id="whopd" />, e 528 milhões com osteoartrose, em que a mão é a terceira articulação mais afetada<C id="whooa" />. Tremor, rigidez e dor nas articulações dos dedos tornam difícil segurar um objeto liso e largo com uma mão e tocar no ecrã com a outra.</p>
          <p>A impressão 3D já é o meio natural da tecnologia de apoio feita fora da indústria. Uma análise ao Thingiverse mostrou que muitos destes designs são feitos pelos próprios utilizadores ou por familiares, quase sempre para impressão 3D<C id="buehler" />. O programa Makers Making Change já entregou mais de 30 000 dispositivos com uma biblioteca aberta de mais de 200 designs<C id="mmc" />. Há também cabos de escova de dentes moldados à preensão de cada doente e impressos em 3D, por cerca de 31 €<C id="colvenkar" />.</p>
          <div className="fit">
            <h3>Onde a DÍGITO encaixa</h3>
            <ul>
              <li><b>O anel</b> prende o telemóvel a um dedo. Se a mão treme ou perde força, o telemóvel não cai.</li>
              <li><b>A prateleira</b> põe o mindinho a suportar o peso por baixo, o que alivia o polegar e o pulso.</li>
              <li><b>A sela</b> dá a cada dedo um apoio do seu tamanho, em vez de obrigar a apertar uma superfície lisa.</li>
            </ul>
            <p>Um estudo com terapeutas ocupacionais concluiu que eles se veem como quem prescreve e não como quem desenha. Os autores propõem ferramentas clínicas com uma biblioteca de designs-base que se ajustam a cada pessoa<C id="hofmann" />. É o que um configurador paramétrico faz.</p>
          </div>
          <Weak>
            <p><b>Não temos evidência clínica.</b> Nenhum estudo mostra ainda que pegas à medida melhoram o uso do telemóvel por pessoas com tremor ou artrose. O passo seguinte é um teste com terapeutas ocupacionais, a medir a taxa de quedas, a precisão de toque e a dor.</p>
            <p><b>Imprimir não é automaticamente mais barato.</b> Num estudo de 2025, uma ortótese de pulso impressa custou em média 46,54 € contra 30,28 € em termoplástico. Exigiu 45 minutos do terapeuta mais cerca de 11 horas de impressão, contra 14 minutos<C id="ortho" />. A vantagem tem de vir de outro lado: o ficheiro fica guardado e a peça pode ser reimpressa igual.</p>
            <p><b>Regulação.</b> Se a DÍGITO prometesse compensar uma deficiência, passaria a vender dispositivos médicos. Peças feitas industrialmente a partir de medidas do doente não contam como "feitas por medida" no sentido do Regulamento europeu: são "adaptadas ao doente" e têm outras obrigações<C id="mdcg" />. Por isso, hoje vendemos um acessório de conforto sem alegações clínicas.</p>
          </Weak>
        </Sec>

        <Sec id="ergonomia" tag="Ergonomia e biomecânica" icon="back_hand" color="c-green" title="O polegar faz o trabalho de duas mãos">
          <div className="wstats">
            <Stat big="49%" src="hoober">das 780 pessoas observadas a tocar no ecrã usavam uma só mão. 36% apoiavam o telemóvel numa mão e tocavam com a outra, e 15% usavam as duas.</Stat>
            <Stat big="8–90%" src="zirek">é o intervalo de prevalência de queixas musculoesqueléticas em utilizadores de telemóvel, numa revisão sistemática de 18 estudos.</Stat>
          </div>
          <p>Com uma mão, os outros quatro dedos seguram e o polegar alcança e toca. Investigadores mostraram que a área do ecrã que o polegar alcança pode ser modelada<C id="bergstrom" />. A nossa hipótese: quando o telemóvel é largo para a mão, os dedos de trás apertam mais para o equilibrar enquanto o polegar se estica. Pegas na posição exata de cada dedo dão apoio sem obrigar a apertar.</p>
          <p>A tendinite e a síndrome de De Quervain, que afetam o polegar e o pulso, estão entre as patologias mais associadas ao uso do telemóvel<C id="zirek" />.</p>
          <Weak>
            <p>A mesma revisão diz que a evidência é limitada: os estudos são transversais e não provam causa<C id="zirek" />. Também não sabemos se as pegas reduzem a dor. Podemos dizer que melhoram a firmeza da pega, mas não que previnem lesões.</p>
          </Weak>
        </Sec>

        <Sec id="informatica" tag="Informática e interação" icon="memory" color="c-violet" title="O encaixe como porta de expansão">
          <p className="big">Cada encaixe hexagonal da capa é uma ligação mecânica normalizada. Hoje recebe pegas. Amanhã pode receber botões.</p>
          <div className="paths">
            <div className="path">
              <span className="path-n">1</span>
              <h3>Botões sem eletrónica</h3>
              <p>O projeto Acoustruments ligou o altifalante ao microfone do telemóvel com tubos de plástico impressos. Botões, deslizadores e botões rotativos alteram o som e o telemóvel interpreta-o, com 99% de precisão<C id="acou" /><C id="acou2" />. Os autores fizeram até uma capa que sabe se está pousada numa mesa ou na mão.</p>
              <p>Na Universidade de Washington, botões, botões rotativos e deslizadores impressos com filamento condutor comunicam por Wi-Fi refletido, sem bateria<C id="wifi" />.</p>
            </div>
            <div className="path">
              <span className="path-n">2</span>
              <h3>Sensores impressos na própria peça</h3>
              <p>O Capricate imprime sensores capacitivos dentro de objetos, numa só passagem, numa impressora multimaterial comum<C id="capricate" />. Uma pega pode saber que está a ser tocada, ou por que dedo.</p>
            </div>
            <div className="path">
              <span className="path-n">3</span>
              <h3>Um interruptor de acessibilidade</h3>
              <p>O Android e o iPhone já aceitam interruptores externos por Bluetooth para controlar o telemóvel sem tocar no ecrã (Switch Access e Switch Control)<C id="android" /><C id="apple" />. Um módulo DÍGITO com um botão e um chip Bluetooth, no sítio exato do dedo, usa este suporte sem precisar de uma app.</p>
              <p>A Microsoft já combina eletrónica com peças impressas: os Adaptive Accessories têm topos de botão e outras peças que se imprimem para adaptar o equipamento a cada pessoa<C id="msft" />.</p>
            </div>
          </div>
          <p>A norma Qi2, baseada no MagSafe da Apple, trouxe o alinhamento magnético ao Android<C id="qi2" />. É um padrão de fixação que futuros módulos podem respeitar sem bloquear o carregamento sem fios.</p>
          <Weak>
            <p>Os telemóveis modulares já falharam. A Google cancelou o Project Ara em 2016. Segundo a Motorola, a Google pensou no que a tecnologia conseguia fazer e não no que as pessoas queriam<C id="ara" />. A lição para a DÍGITO: não começar por uma "plataforma de módulos", mas por um botão que resolve um problema concreto, como disparar a câmara ou ativar o Switch Access, e só crescer se esse botão for usado.</p>
          </Weak>
        </Sec>

        <Sec id="engenharia" tag="Engenharia e materiais" icon="precision_manufacturing" color="c-blue" title="Porque fabrico aditivo, e só onde é preciso">
          <p>Num molde de injeção, o custo do molde divide-se pelas peças. Com uma peça diferente por cliente, cada molde serviria uma única peça. O fabrico aditivo não tem molde: o custo por peça é quase o mesmo da primeira à última. Num estudo clássico com peças metálicas, a fusão a laser compensou face à fundição injetada até 42 unidades<C id="atzeni" />. As pegas DÍGITO são, por definição, lotes de uma unidade.</p>
          <p>O material também conta. Treliças de TPU impressas absorvem a energia de impactos sem se destruírem, por isso aguentam impactos repetidos<C id="bieler" />. É esta ideia que está nos alvéolos da capa e no reforço dos cantos.</p>
          <Weak>
            <p>Hoje a posição dos encaixes muda de cliente para cliente, por isso a capa inteira é impressa. Mas o corpo da capa é igual para todos os donos do mesmo telemóvel, e a partir de alguns milhares de unidades injetá-lo seria mais barato e rápido. O modelo maduro da DÍGITO é provavelmente híbrido: corpo injetado com uma grelha ou um carril de encaixes, e só as pegas impressas à medida.</p>
          </Weak>
        </Sec>

        <Sec id="sustentabilidade" tag="Economia e sustentabilidade" icon="eco" color="c-green" title="Produzir a pedido não é automaticamente sustentável">
          <p>Uma revisão sobre o impacto ambiental do fabrico aditivo concluiu que a energia gasta por quilograma é 10 a 100 vezes superior à dos processos convencionais. Só compensa em lotes muito pequenos ou quando o redesenho traz vantagens durante o uso, como peças mais leves ou reparáveis<C id="kellens" />.</p>
          <p>A DÍGITO apoia-se precisamente nestas exceções. Cada pega é um lote de uma unidade. Não se fabrica nada que fique em stock sem ser vendido. E, como a capa é modular, quando a mão ou a preferência mudam troca-se uma pega de poucos gramas e não a capa inteira.</p>
          <Weak>
            <p>Ainda não medimos a pegada de uma capa DÍGITO. Uma análise de ciclo de vida simples, com energia de impressão, material e envio, é necessária antes de qualquer alegação "verde".</p>
          </Weak>
        </Sec>

        <Sec id="caminho" tag="O caminho" icon="route" color="c-violet" title="Três horizontes">
          <div className="horizons">
            <div className="hz"><span className="hz-when">Hoje</span><h3>Conforto para todos</h3><p>Capa e pegas à medida, vendidas como acessório de ergonomia. Valida a medição por fotografia, o gerador e a produção a pedido.</p></div>
            <div className="hz"><span className="hz-when">Próximo</span><h3>Estudo com terapeutas</h3><p>Testar com terapeutas ocupacionais e pessoas com tremor ou artrose. Medir quedas, precisão e dor. Decidir com base nos dados se faz sentido seguir o caminho regulatório.</p></div>
            <div className="hz"><span className="hz-when">Depois</span><h3>Módulos interativos</h3><p>Um primeiro módulo: um interruptor Bluetooth no encaixe, compatível com Switch Access e Switch Control. Só depois sensores impressos.</p></div>
          </div>
          <div className="row" style={{ marginTop: 32, gap: 12 }}>
            <Link className="key key-dark key-lg" to="/configurar">Configurar a minha capa <Icon n="arrow_forward" size={20} /></Link>
            <Link className="key key-alu key-lg" to="/ajuda?assunto=outro">Sou terapeuta e quero colaborar</Link>
          </div>
        </Sec>

        <section id="fontes" className="why-sources">
          <h2>Fontes</h2>
          <p className="hint">Consultadas a 29 de outubro de 2026. Os números citados vêm diretamente destas fontes.</p>
          <ol>
            {SOURCES.map((s, i) => <li key={s.id} id={`fonte-${i + 1}`}>{s.cite} <a href={s.url} target="_blank" rel="noreferrer">Abrir<Icon n="open_in_new" size={14} /></a></li>)}
          </ol>
        </section>
      </div>
    </div>
  );
}
