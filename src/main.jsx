import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './lib/auth.jsx';
import { CartProvider } from './lib/cart.jsx';
import { ToastProvider } from './components/ui.jsx';
import './styles/app.css';
// GitHub Pages: o 404.html devolve a app; recuperamos o caminho pedido
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={base}>
      <AuthProvider><CartProvider><ToastProvider><App /></ToastProvider></CartProvider></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
