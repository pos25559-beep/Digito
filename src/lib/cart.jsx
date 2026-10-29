import { createContext, useContext, useEffect, useState } from 'react';
const Ctx = createContext(null);
const KEY = 'digito.cart.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* sem armazenamento */ } }, [items]);
  const keyOf = it => it.listing_id ? 'l:' + it.listing_id : 'd:' + it.design_id;
  const api = {
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: items.reduce((s, i) => s + i.price_cents * i.quantity, 0),
    add(it, q = 1) { setItems(cur => { const k = keyOf(it); const ex = cur.find(c => keyOf(c) === k); return ex ? cur.map(c => keyOf(c) === k ? { ...c, quantity: Math.min(20, c.quantity + q) } : c) : [...cur, { ...it, quantity: q }]; }); },
    setQty(k, q) { setItems(cur => cur.map(c => keyOf(c) === k ? { ...c, quantity: Math.max(1, Math.min(20, q)) } : c)); },
    remove(k) { setItems(cur => cur.filter(c => keyOf(c) !== k)); },
    clear() { setItems([]); },
    keyOf
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export const useCart = () => useContext(Ctx);
