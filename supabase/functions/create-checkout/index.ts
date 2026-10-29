import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { designPrice, SHIPPING, FREE_SHIPPING_FROM } from "./pricing.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Item = { listing_id?: string; design_id?: string; quantity?: number };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  if (!STRIPE_KEY) return json({ error: "payments_not_configured", message: "Os pagamentos ainda não estão ligados a uma conta Stripe." }, 503);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: { user }, error: uerr } = await admin.auth.getUser(token);
  if (uerr || !user) return json({ error: "not_signed_in" }, 401);

  let body: { items?: Item[]; shipping?: string; address?: Record<string, string>; origin?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const items = (body.items || []).slice(0, 30);
  if (!items.length) return json({ error: "empty_cart" }, 400);
  const ship = SHIPPING[body.shipping || "pickup"] ? (body.shipping || "pickup") : "pickup";

  const allowed = (Deno.env.get("SITE_URLS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = body.origin && (allowed.length === 0 || allowed.some((a) => body.origin!.startsWith(a))) ? body.origin : (allowed[0] || "http://localhost:5173");

  // preços sempre lidos da base de dados / recalculados no servidor
  const listingIds = items.filter((i) => i.listing_id).map((i) => i.listing_id!);
  const designIds = items.filter((i) => i.design_id).map((i) => i.design_id!);
  const { data: listings } = listingIds.length ? await admin.from("listings").select("id,title,price_cents,seller_id,status,images").in("id", listingIds) : { data: [] };
  const { data: designs } = designIds.length ? await admin.from("designs").select("*").in("id", designIds).eq("user_id", user.id) : { data: [] };

  const lines: Array<{ title: string; unit: number; qty: number; listing_id?: string; design_id?: string; seller_id?: string | null; config?: unknown }> = [];
  for (const it of items) {
    const qty = Math.max(1, Math.min(20, Math.floor(it.quantity || 1)));
    if (it.listing_id) {
      const l = (listings || []).find((x) => x.id === it.listing_id);
      if (!l || l.status !== "ativo") return json({ error: "listing_unavailable", id: it.listing_id }, 409);
      lines.push({ title: l.title, unit: l.price_cents, qty, listing_id: l.id, seller_id: l.seller_id });
    } else if (it.design_id) {
      const d = (designs || []).find((x) => x.id === it.design_id);
      if (!d) return json({ error: "design_not_found", id: it.design_id }, 404);
      const unit = designPrice(d.grips || [], d.grip_material);
      lines.push({ title: `Kit DÍGITO à medida — ${d.name}`, unit, qty, design_id: d.id, seller_id: null, config: { phone: d.phone_model, style: d.grip_style, grips: d.grips, material: d.grip_material, hand: d.hand } });
    }
  }
  const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const shippingCents = ship === "ctt" && subtotal < FREE_SHIPPING_FROM ? SHIPPING.ctt.cents : 0;

  const { data: order, error: oerr } = await admin.from("orders").insert({
    buyer_id: user.id, total_cents: subtotal + shippingCents, shipping_cents: shippingCents,
    shipping: { method: ship, ...(body.address || {}) },
  }).select().single();
  if (oerr) return json({ error: "order_failed", message: oerr.message }, 500);
  const { error: ierr } = await admin.from("order_items").insert(lines.map((l) => ({
    order_id: order.id, listing_id: l.listing_id ?? null, design_id: l.design_id ?? null, seller_id: l.seller_id ?? null,
    title: l.title, unit_price_cents: l.unit, quantity: l.qty, config: l.config ?? null,
  })));
  if (ierr) return json({ error: "order_items_failed", message: ierr.message }, 500);

  // Stripe Checkout via REST (form-encoded)
  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("success_url", `${origin}/encomenda/sucesso?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`);
  f.set("cancel_url", `${origin}/carrinho?cancelado=1`);
  f.set("client_reference_id", order.id);
  f.set("metadata[order_id]", order.id);
  f.set("payment_intent_data[metadata][order_id]", order.id);
  if (user.email) f.set("customer_email", user.email);
  f.set("locale", "pt");
  f.append("payment_method_types[]", "card");
  lines.forEach((l, i) => {
    f.set(`line_items[${i}][quantity]`, String(l.qty));
    f.set(`line_items[${i}][price_data][currency]`, "eur");
    f.set(`line_items[${i}][price_data][unit_amount]`, String(l.unit));
    f.set(`line_items[${i}][price_data][product_data][name]`, l.title);
  });
  if (shippingCents > 0) {
    const i = lines.length;
    f.set(`line_items[${i}][quantity]`, "1");
    f.set(`line_items[${i}][price_data][currency]`, "eur");
    f.set(`line_items[${i}][price_data][unit_amount]`, String(shippingCents));
    f.set(`line_items[${i}][price_data][product_data][name]`, SHIPPING.ctt.label);
  }
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST", headers: { Authorization: `Bearer ${STRIPE_KEY}`, "Content-Type": "application/x-www-form-urlencoded" }, body: f,
  });
  const session = await r.json();
  if (!r.ok) {
    await admin.from("orders").update({ status: "cancelada" }).eq("id", order.id);
    return json({ error: "stripe_error", message: session?.error?.message || "Stripe recusou o pedido." }, 502);
  }
  await admin.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
  return json({ url: session.url, order_id: order.id });
});
