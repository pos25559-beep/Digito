/**
 * Fotografias reais da Unsplash (licença Unsplash). Servidas a partir do CDN da Unsplash (hotlink), como pedem as regras da API;
 * o download de cada uma foi registado através da API. Estas fotografias ilustram situações; não mostram produtos DÍGITO.
 */
const U = 'https://images.unsplash.com/';
const REF = '?utm_source=digito&utm_medium=referral';

export const PHOTOS = {
  hero: { src: 'photo-1650327381414-d081456da47f', pos: '50% 50%', author: 'Joshua Hoehne', user: 'joshua_hoehne', alt: 'Mãos de uma pessoa mais velha a segurar um telemóvel com as duas mãos.' },
  treme: { src: 'photo-1620856902651-ce18d6d31d42', pos: '50% 35%', author: 'Katie Franklin', user: 'katiefranklin', alt: 'Mão de uma pessoa idosa a segurar um telemóvel com o polegar e a ponta dos dedos.' },
  dor: { src: 'photo-1769029262388-3ebd4e4e37d0', pos: '50% 45%', author: 'Sasun Bughdaryan', user: 'sasun1990', alt: 'Uma pessoa segura o pulso e a mão, como quem sente dor nas articulações.' },
  forca: { src: 'photo-1727959919973-2899fffa16b7', pos: '50% 30%', author: 'Shutter Speed', user: 'shutter_speed_', alt: 'Mãos de uma pessoa idosa a segurar o telemóvel na horizontal com as duas mãos para tirar uma fotografia.' },
  contigo: { src: 'photo-1661250150188-242c8ab80bfc', pos: '50% 50%', author: 'Layla Ait Laaraj', user: 'megounista', alt: 'Uma senhora idosa aprende a usar um tablet com a ajuda de outra pessoa, numa mesa.' },
  impressao: { src: 'photo-1611505908502-5b67e53e3a76', pos: '50% 60%', author: 'Kadir Celep', user: 'kadircelep', alt: 'Impressora 3D FDM a imprimir uma peça plana com padrão em favo, camada a camada.' },
};

export const photoUrl = (p, w, h) => `${U}${p.src}?auto=format&fit=crop&q=72&w=${w}${h ? `&h=${h}` : ''}`;
export const photoSrcSet = (p, ratio) => [480, 800, 1200, 1600].map(w => `${photoUrl(p, w, ratio ? Math.round(w / ratio) : 0)} ${w}w`).join(', ');
export const authorUrl = p => `https://unsplash.com/@${p.user}${REF}`;
export const unsplashUrl = `https://unsplash.com/${REF}`;
