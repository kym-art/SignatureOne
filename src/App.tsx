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
import { hydrateOrdersFromSupabase, hydrateOrdersFromBackend, hydrateSmsLogsFromBackend } from './lib/orders';
import { hydrateReviewsFromBackend } from './lib/reviews';
import { refreshProductsFromBackend } from './lib/products';
import { refreshTablesFromBackend } from './lib/tables';
import { refreshExpensesFromBackend } from './lib/expenses';
import { refreshStoreStatus } from './lib/store-settings';
import { startGlobalSync, stopGlobalSync, syncNow } from './lib/sync';
import { startRealtimeSync, stopRealtimeSync } from './lib/realtime';
import { ErrorBoundary } from './components/common/ErrorBoundary';
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

  // Charge les commandes depuis le backend au démarrage (source de vérité = DB),
  // en cache mémoire (localStorage désactivé). Les staff (JWT) reçoivent la
  // liste complète ; la sync globale (polling 5s/30s + Supabase Realtime)
  // propage ensuite les changements venus d'un autre onglet ou machine
  // (ex. prise en charge vendeur → admin) sans F5.
  useEffect(() => {
    void hydrateOrdersFromSupabase();
    void hydrateOrdersFromBackend();
    void hydrateReviewsFromBackend(); // avis validés (public) depuis le backend
    void refreshProductsFromBackend();
    void refreshTablesFromBackend(); // tables TableQR depuis le backend
    void hydrateSmsLogsFromBackend(); // historique SMS staff depuis le backend
    void refreshExpensesFromBackend(); // dépenses staff depuis le backend
    void refreshStoreStatus();

    // Polling global (5s commandes / 30s reste) + temps réel Postgres.
    // Idempotents : le login/logout ci-dessous ne crée jamais 2 timers.
    startGlobalSync();
    startRealtimeSync();

    // Retour sur l'onglet / la fenêtre → re-sync immédiate (l'admin qui
    // revient voit la prise en charge vendeur sans attendre le tick).
    const onVisible = () => void syncNow();
    const onVisibility = () => {
      if (!document.hidden) void syncNow();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisibility);
      stopRealtimeSync();
      stopGlobalSync();
    };
  }, []);

  // Login/logout → (re)démarre ou stoppe la sync :
  // avant ce fix, le timer n'était créé qu'au mount (sans JWT en navigation
  // publique) et jamais après login → l'admin connecté ne pollait plus.
  useEffect(() => {
    const unsub = subscribeAuth((session) => {
      if (session) {
        startGlobalSync();
        void syncNow();
      } else {
        stopGlobalSync();
      }
    });
    // Si un JWT existe déjà au mount (session persistée), la sync tourne
    // déjà via l'effet ci-dessus — pas besoin de double démarrage.
    return unsub;
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
    // Après login (admin/vendeur) : recharge les commandes RÉELLES depuis le
    // backend (avec items) + (re)démarre la sync globale. L'hydratation au
    // démarrage s'exécute sans JWT et laisse un cache vide — sans ce restart,
    // le polling ne démarrait jamais après un login post-mount.
    startGlobalSync();
    startRealtimeSync();
    void syncNow();
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
                <ErrorBoundary label="vendeur">
                  <VendeurView onBack={() => handleNavigate('public')} />
                </ErrorBoundary>
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
                <ErrorBoundary label="admin">
                  <AdminView onBack={() => handleNavigate('public')} />
                </ErrorBoundary>
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
