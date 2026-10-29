import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Reconciliação: confirma encomendas "pendente" perguntando diretamente à Stripe pelo estado da sessão.
// Complementa o webhook (se o webhook falhar ou estiver mal configurado, o regresso do cliente confirma o pagamento).
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const KEY = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (!KEY) return json({ error: "payments_not_configured" }, 503);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return json({ error: "not_signed_in" }, 401);
  let body: { order_id?: string } = {};
  try { body = await req.json(); } catch { /* sem corpo: verifica todas as pendentes */ }

  let q = admin.from("orders").select("id,status,stripe_session_id").eq("buyer_id", user.id).eq("status", "pendente").not("stripe_session_id", "is", null);
  if (body.order_id) q = q.eq("id", body.order_id);
  const { data: pending } = await q.limit(10);
  const results: Record<string, string> = {};
  for (const o of pending || []) {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${o.stripe_session_id}`, { headers: { Authorization: `Bearer ${KEY}` } });
    const s = await r.json();
    if (!r.ok) { results[o.id] = "stripe_error"; continue; }
    if (s.status === "complete" && s.payment_status === "paid") {
      const { data: upd } = await admin.from("orders").update({ status: "paga", paid_at: new Date().toISOString() }).eq("id", o.id).eq("status", "pendente").select("id").maybeSingle();
      if (upd) { const { data: items } = await admin.from("order_items").select("listing_id,quantity").eq("order_id", o.id); for (const it of items || []) if (it.listing_id) await admin.rpc("increment_sales", { lid: it.listing_id, n: it.quantity }); }
      results[o.id] = "paga";
    } else if (s.status === "expired") {
      await admin.from("orders").update({ status: "cancelada" }).eq("id", o.id).eq("status", "pendente");
      results[o.id] = "cancelada";
    } else results[o.id] = "pendente";
  }
  return json({ results });
});
