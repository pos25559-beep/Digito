# DÍGITO

Capas de telemóvel com uma pega para cada dedo, geradas a partir de uma foto da mão e impressas em 3D.
Loja oficial + marketplace onde qualquer pessoa pode vender pegas compatíveis com o encaixe DÍGITO.

Projeto de Fabrico Aditivo · FCT NOVA · 2026.

## O que está aqui

| Parte | Onde |
|---|---|
| Site e app (React + Vite) | `src/` |
| Gerador paramétrico da capa e das pegas (Three.js, STL) | `src/lib/geometry.js` |
| Medidas, encaixes e modelo de impacto | `src/lib/engine.js` |
| Medição por foto (MediaPipe Hands, corre no browser) | `src/lib/handmeasure.js`, `public/mp/` |
| Base de dados, RLS e Storage (Supabase) | `supabase/migrations/` |
| Pagamentos (Stripe Checkout + webhook) | `supabase/functions/` |
| Vídeos e fotos de produto (render da geometria real) | `render/`, `public/video/`, `public/products/` |

## Correr localmente

```bash
npm install
npm run dev        # http://localhost:5173
```

As chaves públicas do Supabase estão em `.env` (a chave publicável é pública por desenho; a segurança está nas políticas RLS).

## Publicar

Cada `push` para `main` publica o site no GitHub Pages (`.github/workflows/deploy.yml`).
No repositório: **Settings → Pages → Source: GitHub Actions**.

Depois, no Supabase (**Authentication → URL Configuration**):
- *Site URL*: `https://pos25559-beep.github.io/Digito`
- *Redirect URLs*: `https://pos25559-beep.github.io/Digito/**` e `http://localhost:5173/**`

## Ligar os pagamentos (Stripe)

1. Stripe Dashboard (modo de teste) → Developers → API keys → copiar a **Secret key** (`sk_test_…`).
2. Supabase → Edge Functions → **Secrets**: criar `STRIPE_SECRET_KEY` com esse valor e `SITE_URLS` com `https://pos25559-beep.github.io/Digito,http://localhost:5173`.
3. Stripe → Developers → Webhooks → *Add endpoint*:
   `https://utfvcricxfkyiqxaxeci.supabase.co/functions/v1/stripe-webhook`, eventos `checkout.session.completed` e `checkout.session.expired`.
   Copiar o *Signing secret* (`whsec_…`) para o secret `STRIPE_WEBHOOK_SECRET` no Supabase.
4. Testar com o cartão `4242 4242 4242 4242`, qualquer data futura e qualquer CVC.

O preço é sempre recalculado no servidor (`create-checkout`); o browser não consegue alterar o que se paga.

## Modelo de dados

- `profiles` — perfil público (nome de utilizador, bio, fotografia), `is_seller`, medidas da mão (privadas na prática: só o próprio as usa).
- `listings` — anúncios. `seller_id = null` são produtos oficiais DÍGITO.
- `designs` — kits configurados, privados de cada utilizador.
- `orders` / `order_items` — criadas só pela Edge Function; compradores veem as suas, vendedores veem as linhas que venderam.
- `reviews` — só quem comprou e pagou pode avaliar; a média é calculada por trigger.
- `favorites` — privados.

Contadores (`rating_avg`, `sales_count`) estão protegidos por trigger: um vendedor não os consegue alterar.
