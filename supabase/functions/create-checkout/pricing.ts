// Tabela de preços dos kits configurados — a MESMA tabela está em src/lib/pricing.js.
// O servidor recalcula sempre o preço; o valor enviado pelo browser é ignorado.
export const CASE_CENTS = 2400;
export const GRIP_CENTS: Record<string, number> = { sela: 450, ring: 1200, blank: 150, shelf: 450 };
export const MATERIAL_FACTOR: Record<string, number> = { FDM_PETG_CF: 1.0, SLS_PA12: 1.3, SLA_TOUGH: 1.4 };
export const TITANIUM_GRIP_CENTS = 6900;
export const SHIPPING: Record<string, { label: string; cents: number }> = {
  pickup: { label: "Levantamento na FCT NOVA", cents: 0 },
  ctt: { label: "Envio CTT (Portugal)", cents: 390 },
};
export const FREE_SHIPPING_FROM = 5000;

export function designPrice(grips: Array<{ type: string }>, material: string): number {
  let total = CASE_CENTS;
  for (const g of grips) {
    if (material === "SLM_TI64" && g.type !== "blank") total += TITANIUM_GRIP_CENTS;
    else total += Math.round((GRIP_CENTS[g.type] ?? 450) * (MATERIAL_FACTOR[material] ?? 1));
  }
  return total;
}

export const TERMS_VERSION = "2026-10-29";
