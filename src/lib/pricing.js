// Tabela de preços dos kits configurados. É a mesma de supabase/functions/create-checkout/pricing.ts:
// o servidor recalcula sempre o total, por isso alterar estes valores no browser não muda o que se paga.
export const CASE_CENTS = 2400;
export const GRIP_CENTS = { sela: 450, ring: 1200, blank: 150, shelf: 450 };
export const MATERIAL_FACTOR = { FDM_PETG_CF: 1.0, SLS_PA12: 1.3, SLA_TOUGH: 1.4 };
export const SHIPPING = { pickup: { label: 'Levantamento na FCT NOVA', cents: 0 }, ctt: { label: 'Envio CTT (Portugal)', cents: 390 } };
export const FREE_SHIPPING_FROM = 5000;
export function designPrice(grips, material) {
  let total = CASE_CENTS;
  for (const g of grips) {
    total += Math.round((GRIP_CENTS[g.type] ?? 450) * (MATERIAL_FACTOR[material] ?? 1));
  }
  return total;
}
export const eur = cents => (cents / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
export const fmt = (v, d = 1) => Number(v).toLocaleString('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d });
