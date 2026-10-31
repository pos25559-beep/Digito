import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { Icon, useToast } from '../components/ui.jsx';
import { TERMS_DATE_PT } from '../lib/legal.js';

const DOCS = [
  { to: '/termos', label: 'Termos de venda' },
  { to: '/privacidade', label: 'Privacidade' },
  { to: '/ajuda', label: 'Ajuda e contacto' },
];

function Shell({ eyebrow, title, intro, children, toc }) {
  const loc = useLocation();
  useEffect(() => { if (loc.hash) document.querySelector(loc.hash)?.scrollIntoView(); }, [loc.hash]);
  return (
    <div className="wrap legal">
      <div className="page-head"><span className="engrave">{eyebrow}</span><h1>{title}</h1>{intro && <p>{intro}</p>}</div>
      <div className="legal-grid">
        <nav className="legal-nav" aria-label="Documentos">
          {DOCS.map(d => <NavLink key={d.to} to={d.to}>{d.label}</NavLink>)}
          {toc && <div className="legal-toc">{toc.map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}</div>}
        </nav>
        <article className="legal-body">{children}</article>
      </div>
    </div>
  );
}

const S = ({ id, t, children }) => <section id={id}><h2>{t}</h2>{children}</section>;

export function Terms() {
  const toc = [['quem', 'Quem vende'], ['produtos', 'Produtos e preços'], ['especial', 'Pedidos especiais'], ['encomenda', 'Encomenda e pagamento'], ['producao', 'Produção e entrega'], ['resolucao', 'Livre resolução'], ['garantia', 'Garantia'], ['comunidade', 'Designs da comunidade'], ['litigios', 'Reclamações e litígios']];
  return (
    <Shell eyebrow={`Em vigor desde ${TERMS_DATE_PT}`} title="Termos de venda" intro="O que acontece quando compras na DÍGITO, em linguagem simples. Ao pagar uma encomenda aceitas estes termos." toc={toc}>
      <S id="quem" t="Quem vende">
        <p>A DÍGITO é um projeto de Pedro Silva, desenvolvido no âmbito da unidade curricular de Fabrico Aditivo da NOVA FCT (Campus de Caparica, 2829-516 Caparica). Todas as vendas feitas neste site, incluindo as de designs da comunidade, são cobradas e entregues pela DÍGITO, que é a tua contraparte no contrato.</p>
        <p>Para qualquer assunto usa a página <Link to="/ajuda">Ajuda e contacto</Link>.</p>
      </S>
      <S id="produtos" t="Produtos e preços">
        <p>Vendemos dois tipos de produto:</p>
        <ul>
          <li><b>Produtos de catálogo</b>: as peças da loja, iguais para todos os clientes.</li>
          <li><b>Produtos à medida</b>: os kits criados no configurador, gerados a partir das medidas da tua mão e do telemóvel que escolhes. Cada um é único.</li>
        </ul>
        <p>Os preços estão em euros e incluem todos os impostos aplicáveis. O custo de envio aparece no carrinho antes de pagares. O preço que conta é o que é confirmado no nosso servidor no momento do pagamento.</p>
        <p>As peças são impressas em 3D. Pequenas linhas de camada, variações de cor entre lotes e tolerâncias de ±0,2 mm são próprias do processo e não são defeitos.</p>
      </S>
      <S id="especial" t="Pedidos especiais (feito contigo)">
        <p>Quando pedes uma peça fora do configurador, estudamos o teu caso e enviamos um orçamento com preço, prazo e descrição da peça. Nada é fabricado nem cobrado antes de aceitares. Se for preciso, imprimimos primeiro uma peça de teste, e o orçamento diz se essa peça tem custo.</p>
        <p>Peças de pedidos especiais são produtos à medida, por isso não têm direito de livre resolução, mas mantêm a garantia legal. São acessórios de conforto e não dispositivos médicos.</p>
      </S>
      <S id="encomenda" t="Encomenda e pagamento">
        <p>Para encomendar precisas de uma conta. O pagamento é feito na página segura da Stripe (cartão, MB WAY e outros métodos que a Stripe apresente). Não vemos nem guardamos os dados do teu cartão.</p>
        <p>O contrato fica celebrado quando o pagamento é confirmado. Recebes a confirmação no ecrã e o estado da encomenda fica em <Link to="/conta/encomendas">A minha conta › Encomendas</Link>.</p>
      </S>
      <S id="producao" t="Produção e entrega">
        <p>Cada encomenda é impressa depois de paga. O prazo estimado é de até 10 dias úteis para produtos à medida e de até 5 dias úteis para produtos de catálogo, mais o tempo de envio. Se um prazo não puder ser cumprido, avisamos-te e podes cancelar com reembolso total.</p>
        <p>Podes levantar a encomenda na NOVA FCT sem custos ou recebê-la por CTT em Portugal. O envio é grátis a partir de 50 €.</p>
      </S>
      <S id="resolucao" t="Direito de livre resolução">
        <p><b>Produtos de catálogo</b>: tens 14 dias a contar da receção para desistir da compra, sem indicar motivo. Avisa-nos pela página de <Link to="/ajuda">contacto</Link> e devolve a peça sem uso nos 14 dias seguintes. Reembolsamos o valor pago, incluindo o envio normal, até 14 dias depois de recebermos a peça, pelo mesmo meio de pagamento. O custo de devolução é teu.</p>
        <div className="legal-note"><Icon n="straighten" /><p><b>Produtos à medida não têm direito de livre resolução.</b> São fabricados segundo as tuas medidas e especificações, pelo que a lei exclui este direito (artigo 17.º, n.º 1, alínea c) do Decreto-Lei n.º 24/2014). Pedimos-te que o confirmes antes de pagar. Isto não afeta a garantia descrita abaixo.</p></div>
      </S>
      <S id="garantia" t="Garantia">
        <p>Todos os produtos, incluindo os feitos à medida, têm a garantia legal de conformidade de 3 anos (Decreto-Lei n.º 84/2021). Se uma peça chegar partida, com defeito de impressão ou diferente do que encomendaste, voltamos a imprimi-la ou reembolsamos-te.</p>
        <p>A garantia não cobre o desgaste normal nem danos causados por uso indevido. Uma pega que não fica confortável porque as medidas introduzidas estavam erradas também não é um defeito, mas fala connosco: ajustar uma pega custa muito menos do que imprimir uma capa nova.</p>
      </S>
      <S id="comunidade" t="Designs da comunidade">
        <p>Quem publica na Banca DÍGITO garante que o design é seu ou que tem direito a vendê-lo, e que encaixa no padrão DÍGITO. Podemos retirar anúncios que violem direitos de terceiros ou estes termos. Para o comprador, as regras de entrega, resolução e garantia são as mesmas de qualquer outra compra.</p>
      </S>
      <S id="litigios" t="Reclamações e litígios">
        <p>Se algo correr mal, fala connosco primeiro. Respondemos em até 3 dias úteis. Podes também usar o <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noreferrer">Livro de Reclamações Eletrónico</a>.</p>
        <p>Em caso de litígio podes recorrer ao <a href="https://www.cniacc.pt" target="_blank" rel="noreferrer">CNIACC</a> (Centro Nacional de Informação e Arbitragem de Conflitos de Consumo) ou à entidade de resolução alternativa de litígios da tua área de residência. Lista completa no <a href="https://www.consumidor.gov.pt" target="_blank" rel="noreferrer">Portal do Consumidor</a>. Aplica-se a lei portuguesa.</p>
      </S>
    </Shell>
  );
}

export function Privacy() {
  const toc = [['responsavel', 'Responsável'], ['dados', 'Que dados usamos'], ['pedidos', 'Pedidos especiais'], ['foto', 'A fotografia da mão'], ['quem', 'Com quem partilhamos'], ['prazos', 'Quanto tempo guardamos'], ['direitos', 'Os teus direitos'], ['local', 'Armazenamento no browser']];
  return (
    <Shell eyebrow={`Atualizada a ${TERMS_DATE_PT}`} title="Privacidade" intro="Usamos o mínimo de dados para fazer a tua capa e entregá-la. Não vendemos dados e não usamos publicidade." toc={toc}>
      <S id="responsavel" t="Responsável pelo tratamento">
        <p>Pedro Silva, responsável pelo projeto DÍGITO (NOVA FCT, Campus de Caparica, 2829-516 Caparica). Para qualquer pedido sobre os teus dados usa a página de <Link to="/ajuda?assunto=dados">contacto</Link> e escolhe "Os meus dados".</p>
      </S>
      <S id="dados" t="Que dados usamos e porquê">
        <table className="legal-table">
          <thead><tr><th>Dados</th><th>Para quê</th><th>Fundamento</th></tr></thead>
          <tbody>
            <tr><td>Email e palavra-passe (cifrada)</td><td>Criar e proteger a tua conta</td><td>Contrato</td></tr>
            <tr><td>Nome público, fotografia de perfil, biografia</td><td>Perfil e anúncios na loja, se os preencheres</td><td>Contrato</td></tr>
            <tr><td>Larguras dos dedos, altura, mão dominante, telemóvel</td><td>Gerar a geometria da capa e das pegas</td><td>Contrato</td></tr>
            <tr><td>Encomendas, morada de envio, estado do pagamento</td><td>Produzir, entregar e faturar</td><td>Contrato e obrigação legal</td></tr>
            <tr><td>Mensagens enviadas pelo contacto</td><td>Responder-te</td><td>Interesse legítimo</td></tr>
            <tr><td>Pedidos especiais: nome, contactos, descrição e, se quiseres, situações de saúde</td><td>Estudar e responder ao pedido, desenhar e fabricar a peça</td><td>Diligências pré-contratuais; consentimento explícito para dados de saúde</td></tr>
          </tbody>
        </table>
        <p>As medidas da mão servem apenas para dimensionar peças. Não as usamos para identificar pessoas nem as combinamos com outros dados.</p>
      </S>
      <S id="pedidos" t="Pedidos especiais e dados de saúde">
        <p>No pedido especial podes indicar, se quiseres, situações como tremor, dor ou pouca força. São dados de saúde, por isso só os guardamos com a tua autorização explícita (artigo 9.º, n.º 2, alínea a) do RGPD). Usamo-los apenas para responder ao teu pedido e desenhar a tua peça. Não os partilhamos com ninguém, não os usamos para marketing e não te pedimos diagnósticos nem relatórios médicos.</p>
        <p>Podes retirar a autorização a qualquer momento através do <Link to="/ajuda?assunto=dados">contacto</Link>. Nesse caso apagamos essa informação. Os pedidos que não resultem em encomenda são apagados 2 anos depois do último contacto.</p>
      </S>
      <S id="foto" t="A fotografia da mão">
        <p>A medição por fotografia corre inteiramente no teu dispositivo. A imagem nunca é enviada para os nossos servidores. Só guardamos os números que resultam dela, e apenas se guardares o design.</p>
      </S>
      <S id="quem" t="Com quem partilhamos">
        <ul>
          <li><b>Supabase</b>: base de dados, contas e ficheiros, alojados na União Europeia (Irlanda).</li>
          <li><b>Stripe</b>: processamento de pagamentos. A Stripe recebe o teu email e os dados de pagamento diretamente; nós nunca vemos o número do cartão.</li>
          <li><b>GitHub Pages</b>: alojamento das páginas do site. Recebe dados técnicos de acesso, como o endereço IP.</li>
          <li><b>Google Fonts</b>: tipos de letra. O teu browser contacta os servidores da Google para os descarregar.</li>
          <li><b>CTT</b>: nome e morada, só se escolheres envio por correio.</li>
        </ul>
        <p>Alguns destes serviços podem tratar dados fora do Espaço Económico Europeu, com as garantias previstas no RGPD (cláusulas contratuais-tipo ou decisão de adequação).</p>
      </S>
      <S id="prazos" t="Quanto tempo guardamos">
        <p>Os dados da conta, as medidas e os designs ficam enquanto a conta existir. Os dados de encomendas e faturação são guardados durante 10 anos, como exige a lei fiscal. As mensagens de contacto são apagadas 2 anos depois de resolvidas.</p>
      </S>
      <S id="direitos" t="Os teus direitos">
        <p>Podes pedir acesso, retificação, apagamento, limitação ou portabilidade dos teus dados, e opor-te ao seu tratamento. Respondemos no prazo de um mês. Também podes apresentar reclamação à <a href="https://www.cnpd.pt" target="_blank" rel="noreferrer">Comissão Nacional de Proteção de Dados</a>.</p>
      </S>
      <S id="local" t="Armazenamento no browser">
        <p>Não usamos cookies de publicidade nem de análise. Guardamos no teu browser apenas o necessário para o site funcionar: a sessão iniciada, o carrinho e o progresso do configurador. Podes apagá-los a qualquer momento nas definições do browser.</p>
      </S>
    </Shell>
  );
}

const TOPICS = [['encomenda', 'Uma encomenda'], ['devolucao', 'Devolução ou garantia'], ['dados', 'Os meus dados'], ['vender', 'Vender na DÍGITO'], ['outro', 'Outro assunto']];
const FAQ = [
  ['Como sei que as medidas estão certas?', 'No passo "Medir" do configurador tiras uma fotografia da mão com um cartão bancário ou de cidadão ao lado. O cartão tem 85,6 mm e serve de régua. Podes depois afinar cada dedo à décima de milímetro.'],
  ['Posso devolver um kit à medida?', 'Não por desistência, porque é fabricado para ti. Se tiver defeito ou não corresponder ao que encomendaste, voltamos a imprimir ou reembolsamos. Se o conforto não for o esperado, fala connosco: ajustar uma pega é rápido.'],
  ['Quanto tempo demora?', 'Até 10 dias úteis para produtos à medida e até 5 para produtos de catálogo, mais o envio. Vês o estado em A minha conta › Encomendas.'],
  ['As pegas servem noutra capa?', 'Sim. O encaixe DÍGITO Lock é igual em todas as capas DÍGITO, por isso podes trocar de pegas sem trocar de capa.'],
];

export function Help() {
  const { user } = useAuth(); const toast = useToast(); const loc = useLocation();
  const q = new URLSearchParams(loc.search);
  const [f, setF] = useState({ email: '', topic: TOPICS.some(t => t[0] === q.get('assunto')) ? q.get('assunto') : 'encomenda', order_ref: '', message: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [sent, setSent] = useState(false);
  useEffect(() => { if (user?.email) setF(x => ({ ...x, email: x.email || user.email })); }, [user]);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  const send = async e => {
    e.preventDefault(); setErr('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return setErr('Indica um email válido para te podermos responder.');
    if (f.message.trim().length < 10) return setErr('Escreve um pouco mais sobre o assunto (mínimo 10 caracteres).');
    setBusy(true);
    const { error } = await supabase.from('contact_messages').insert({ email: f.email.trim(), topic: f.topic, order_ref: f.order_ref.trim() || null, message: f.message.trim(), user_id: user?.id ?? null });
    setBusy(false);
    if (error) return setErr('Não foi possível enviar. Tenta outra vez dentro de momentos.');
    setSent(true); toast('Mensagem enviada.');
  };
  return (
    <Shell eyebrow="Respondemos em até 3 dias úteis" title="Ajuda e contacto" intro="As perguntas mais comuns estão aqui. Se não encontrares resposta, escreve-nos.">
      <section><h2>Perguntas frequentes</h2>
        <div className="faq">{FAQ.map(([qq, a]) => <details key={qq}><summary>{qq}<Icon n="add" /></summary><p>{a}</p></details>)}</div>
      </section>
      <section id="contacto"><h2>Escrever-nos</h2>
        {sent ? (
          <div className="legal-note ok"><Icon n="check_circle" fill /><p><b>Recebemos a tua mensagem.</b> Respondemos para {f.email} em até 3 dias úteis.</p></div>
        ) : (
          <form className="contact-form" onSubmit={send} noValidate>
            <div className="field"><label htmlFor="c-email">Email para resposta</label><input id="c-email" className="input" type="email" autoComplete="email" value={f.email} onChange={set('email')} required /></div>
            <div className="field"><label htmlFor="c-topic">Assunto</label><select id="c-topic" className="input" value={f.topic} onChange={set('topic')}>{TOPICS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            {(f.topic === 'encomenda' || f.topic === 'devolucao') && <div className="field"><label htmlFor="c-ref">Número da encomenda <span className="hint">(opcional)</span></label><input id="c-ref" className="input" maxLength={64} value={f.order_ref} onChange={set('order_ref')} placeholder="Está em A minha conta › Encomendas" /></div>}
            <div className="field"><label htmlFor="c-msg">Mensagem</label><textarea id="c-msg" className="input" rows={6} maxLength={4000} value={f.message} onChange={set('message')} required /></div>
            {err && <p className="err" role="alert">{err}</p>}
            <div className="row"><button className="key key-dark" disabled={busy}>{busy ? 'A enviar…' : 'Enviar mensagem'}</button><span className="hint">Ao enviar, tratamos estes dados como descrito na <Link to="/privacidade">Privacidade</Link>.</span></div>
          </form>
        )}
      </section>
    </Shell>
  );
}
