import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import { Spinner } from './components/ui.jsx';
import Home from './pages/Home.jsx';
const Shop = lazy(() => import('./pages/Shop.jsx'));
const Listing = lazy(() => import('./pages/Listing.jsx'));
const Configure = lazy(() => import('./pages/Configure.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess.jsx'));
const Auth = lazy(() => import('./pages/Auth.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Seller = lazy(() => import('./pages/Seller.jsx'));
const PublicProfile = lazy(() => import('./pages/PublicProfile.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const TITLES = { '/': 'DÍGITO — capas e pegas à medida dos teus dedos', '/loja': 'Loja · DÍGITO', '/configurar': 'Configurar · DÍGITO', '/carrinho': 'Carrinho · DÍGITO', '/entrar': 'Entrar · DÍGITO', '/vender': 'Vender · DÍGITO' };
export default function App() {
  const loc = useLocation();
  useEffect(() => { if (!loc.hash) window.scrollTo(0, 0); document.title = TITLES[loc.pathname] || 'DÍGITO'; }, [loc.pathname]); // eslint-disable-line
  const bare = loc.pathname.startsWith('/configurar');
  return (
    <>
      <Nav />
      <main id="main">
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/loja" element={<Shop />} />
            <Route path="/loja/:slug" element={<Listing />} />
            <Route path="/configurar" element={<Configure />} />
            <Route path="/carrinho" element={<Cart />} />
            <Route path="/encomenda/sucesso" element={<OrderSuccess />} />
            <Route path="/entrar" element={<Auth mode="entrar" />} />
            <Route path="/criar-conta" element={<Auth mode="criar" />} />
            <Route path="/conta" element={<Account />} />
            <Route path="/conta/:tab" element={<Account />} />
            <Route path="/vender" element={<Seller />} />
            <Route path="/vender/:tab" element={<Seller />} />
            <Route path="/u/:username" element={<PublicProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!bare && <Footer />}
    </>
  );
}
