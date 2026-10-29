import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Verificação da assinatura Stripe (esquema v1: HMAC-SHA256 de `${t}.${payload}`), tolerância de 5 min.
async function verify(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"]; const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`)));
  const hex = Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => s.length === hex.length && s.split("").every((c, i) => c === hex[i]));
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return new Response("webhook not configured", { status: 503 });
  const payload = await req.text();
  if (!(await verify(payload, req.headers.get("stripe-signature") || "", secret))) return new Response("bad signature", { status: 400 });
  const event = JSON.parse(payload);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const s = event.data?.object;
  const orderId = s?.metadata?.order_id || s?.client_reference_id;
  if (!orderId) return new Response("ignored", { status: 200 });

  if (event.type === "checkout.session.completed" && s.payment_status === "paid") {
    const { data: o } = await admin.from("orders").update({ status: "paga", paid_at: new Date().toISOString(), shipping: s.shipping_details ? { ...(s.shipping_details) } : undefined })
      .eq("id", orderId).eq("status", "pendente").select("id").maybeSingle();
    if (o) {
      const { data: items } = await admin.from("order_items").select("listing_id,quantity").eq("order_id", orderId);
      for (const it of items || []) if (it.listing_id) await admin.rpc("increment_sales", { lid: it.listing_id, n: it.quantity });
    }
  } else if (event.type === "checkout.session.expired") {
    await admin.from("orders").update({ status: "cancelada" }).eq("id", orderId).eq("status", "pendente");
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
