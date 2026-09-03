import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CartProvider } from './lib/CartContext.tsx';
import { registerServiceWorker } from './lib/register-service-worker.ts';

// Register PWA service worker for static asset caching
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </StrictMode>,
);

