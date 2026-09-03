/**
 * Signature One - Application Root
 * Module 1: Setup & Schéma Prisma
 * Module 2: Authentification & Gestion des Vendeurs
 * Module 3: Gestion du Catalogue & Produits
 * Module 4: Panier, Tunnel de Commande & Suivi en direct (/commande/[numero])
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PWAInstallBanner } from './components/pwa/PWAInstallBanner';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { PublicHomeView } from './components/public/PublicHomeView';
import { BoutiqueView } from './components/boutique/BoutiqueView';
import { TableQRView } from './components/table/TableQRView';
import { VendeurView } from './components/vendeur/VendeurView';
import { AdminView } from './components/admin/AdminView';
import { LoginView } from './components/auth/LoginView';
import { CartDrawer } from './components/cart/CartDrawer';
import { CheckoutView } from './components/checkout/CheckoutView';
import { OrderConfirmationView } from './components/checkout/OrderConfirmationView';
import { OrderTrackingView } from './components/tracking/OrderTrackingView';
import { getCurrentUser, subscribeAuth } from './lib/auth';
import { hydrateOrdersFromSupabase, hydrateOrdersFromBackend } from './lib/orders';
import { User, AuthSession, Order } from './types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('public');
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [redirectReason, setRedirectReason] = useState<string | null>(null);
  const [currentTableId, setCurrentTableId] = useState<number | undefined>(undefined);
  const [lastConfirmedOrder, setLastConfirmedOrder] = useState<Order | null>(null);
  const [trackingNumero, setTrackingNumero] = useState<string>('');

  useEffect(() => {
    const unsubscribe = subscribeAuth((session) => {
      setCurrentUser(session ? session.user : null);
    });
    return unsubscribe;
  }, []);

  // Charge les commandes depuis Supabase au démarrage (source de vérité),
  // quand Supabase est configuré. Silencieux/sans effet sinon.
  useEffect(() => {
    hydrateOrdersFromSupabase();
    hydrateOrdersFromBackend();
  }, []);

  // Discret accès réservé à l'équipe (les boutons Admin / Vendeur / Connexion
  // ne sont volontairement plus affichés aux clients) : accès via hash d'URL
  // (#espace => Espace Vendeur, #admin => Administration, #login => Connexion)
  // et via le petit bouton discret en bas de page (pied de page).
  useEffect(() => {
    const openFromHash = () => {
      const h = window.location.hash;
      if (h === '#admin') {
        handleNavigate('admin');
      } else if (h === '#espace' || h === '#vendeur') {
        handleNavigate('vendeur');
      } else if (h === '#login') {
        handleNavigate('connexion');
      }
    };

    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => {
      window.removeEventListener('hashchange', openFromHash);
    };
  }, []);

  // Safe navigation with route guard (Module 2 & 4 requirements)
  const handleNavigate = (tab: string) => {
    setRedirectReason(null);

    // Guard for (vendeur)
    if (tab === 'vendeur') {
      const user = getCurrentUser();
      if (!user) {
        setRedirectReason("L'accès à l'espace vendeur requiert une authentification avec un compte vendeur ou administrateur.");
        setCurrentTab('connexion');
        return;
      }
      if (!user.actif) {
        setRedirectReason("Votre compte a été désactivé par l'administrateur.");
        setCurrentTab('connexion');
        return;
      }
    }

    // Guard for (admin)
    if (tab === 'admin') {
      const user = getCurrentUser();
      if (!user) {
        setRedirectReason("L'accès à l'administration Signature One est strictement réservé au compte Directeur (ADMIN).");
        setCurrentTab('connexion');
        return;
      }
      if (user.role !== 'ADMIN') {
        setRedirectReason("Accès refusé. Vous êtes connecté avec un compte VENDEUR qui ne dispose pas des privilèges ADMIN.");
        setCurrentTab('connexion');
        return;
      }
    }

    setCurrentTab(tab);
  };

  const handleLoginSuccess = (session: AuthSession) => {
    setRedirectReason(null);
    if (session.user.role === 'ADMIN') {
      setCurrentTab('admin');
    } else {
      setCurrentTab('vendeur');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF3E8] text-[#1F3D2E] font-sans selection:bg-[#C9A24B] selection:text-[#1F3D2E]">
      
      {/* PWA Mobile Installation Prompt Banner */}
      <PWAInstallBanner />

      {/* Global Interactive Cart Drawer */}
      <CartDrawer
        onProceedToCheckout={() => handleNavigate('checkout')}
        onExploreProducts={() => handleNavigate('boutique')}
      />

      {/* Main App Navigation */}
      <Header currentTab={currentTab} onSelectTab={handleNavigate} />

      {/* Main Content Area with Smooth View Transitions */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 pb-12">
        <AnimatePresence mode="wait">
          
          {/* Public Landing View */}
          {currentTab === 'public' && (
            <motion.div
              key="public"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <PublicHomeView onNavigate={handleNavigate} />
            </motion.div>
          )}

          {/* Boutique Catalog */}
          {currentTab === 'boutique' && (
            <motion.div
              key="boutique"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <BoutiqueView
                onBack={() => handleNavigate('public')}
                onNavigate={handleNavigate}
              />
            </motion.div>
          )}

          {/* Table QR Mode */}
          {currentTab === 'table' && (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <TableQRView
                tableNumber={currentTableId || 3}
                onBack={() => handleNavigate('public')}
                onProceedToCheckout={(tbl) => {
                  setCurrentTableId(tbl);
                  handleNavigate('checkout');
                }}
              />
            </motion.div>
          )}

          {/* Checkout Funnel (Module 4) */}
          {currentTab === 'checkout' && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CheckoutView
                initialTableId={currentTableId !== undefined ? `tbl_${currentTableId}` : null}
                onBack={() => handleNavigate('boutique')}
                onOrderSuccess={(order) => {
                  setLastConfirmedOrder(order);
                  setTrackingNumero(order.numero);
                  handleNavigate('confirmation');
                }}
              />
            </motion.div>
          )}

          {/* Order Confirmation Screen (Module 4) */}
          {currentTab === 'confirmation' && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <OrderConfirmationView
                order={lastConfirmedOrder}
                onTrackOrder={(num) => {
                  setTrackingNumero(num);
                  handleNavigate('suivi');
                }}
                onContinueShopping={() => handleNavigate('boutique')}
              />
            </motion.div>
          )}

          {/* Order Live Tracking /commande/[numero] (Module 4) */}
          {currentTab === 'suivi' && (
            <motion.div
              key="suivi"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <OrderTrackingView
                initialNumero={trackingNumero}
                onBack={() => handleNavigate('public')}
                onContinueShopping={() => handleNavigate('boutique')}
              />
            </motion.div>
          )}

          {/* Authentication View */}
          {currentTab === 'connexion' && (
            <motion.div
              key="connexion"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <LoginView
                onLoginSuccess={handleLoginSuccess}
                onCancel={() => handleNavigate('public')}
                redirectReason={redirectReason}
              />
            </motion.div>
          )}

          {/* Vendeur Portal */}
          {currentTab === 'vendeur' && (
            <motion.div
              key="vendeur"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {currentUser && (currentUser.role === 'VENDEUR' || currentUser.role === 'ADMIN') ? (
                <VendeurView onBack={() => handleNavigate('public')} />
              ) : (
                <div className="bg-white p-8 rounded-3xl border border-[#E5DDD0] text-center space-y-4 max-w-md mx-auto shadow-xs">
                  <ShieldAlert className="w-12 h-12 text-[#C9A24B] mx-auto" />
                  <h3 className="font-serif font-bold text-lg text-[#1F3D2E]">Accès restreint</h3>
                  <p className="text-xs text-[#53685C]">Veuillez vous connecter avec vos identifiants vendeur pour continuer.</p>
                  <button
                    onClick={() => handleNavigate('connexion')}
                    className="bg-[#1F3D2E] text-[#FAF3E8] text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-[#2A4D3B] transition-colors"
                  >
                    Se connecter
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Admin Portal */}
          {currentTab === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {currentUser && currentUser.role === 'ADMIN' ? (
                <AdminView onBack={() => handleNavigate('public')} />
              ) : (
                <div className="bg-white p-8 rounded-3xl border border-[#E5DDD0] text-center space-y-4 max-w-md mx-auto shadow-xs">
                  <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
                  <h3 className="font-serif font-bold text-lg text-[#1F3D2E]">Accès Administrateur requis</h3>
                  <p className="text-xs text-[#53685C]">Cette section est strictement réservée au Directeur (ADMIN).</p>
                  <button
                    onClick={() => handleNavigate('connexion')}
                    className="bg-[#1F3D2E] text-[#FAF3E8] text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-[#2A4D3B] transition-colors"
                  >
                    Connexion Administrateur
                  </button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Global App Footer */}
      <Footer onNavigate={(tab) => handleNavigate(tab)} />

    </div>
  );
}
