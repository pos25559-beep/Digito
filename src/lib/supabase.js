import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const siteURL = () => window.location.origin + BASE;
// imagens: caminhos relativos ("/products/x.webp") vêm do repositório; URLs absolutos vêm do Storage
export const img = src => (!src ? '' : /^https?:/.test(src) ? src : BASE + src);
export const CATEGORY_PT = { capa: 'Capas', pega: 'Pegas', kit: 'Kits', acessorio: 'Acessórios' };
export const STATUS_PT = { pendente: 'Pendente', paga: 'Paga', em_impressao: 'Em impressão', enviada: 'Enviada', entregue: 'Entregue', cancelada: 'Cancelada' };
