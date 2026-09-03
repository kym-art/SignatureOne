import React, { useState, useEffect } from 'react';
import {
  Shield,
  Smartphone,
  CheckCircle,
  Server,
  Activity,
  ArrowLeft,
  Key,
  RefreshCw,
  Users,
  Package,
  ShoppingCart,
  Banknote,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Star,
  History,
  AlertTriangle,
  Sparkles,
  Store,
  ChevronRight,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { AdminVendorsManagement } from './AdminVendorsManagement';
import { AdminProductsManagement } from './AdminProductsManagement';
import { AdminQRCodesManagement } from './AdminQRCodesManagement';
import { AdminOrdersManagement } from './AdminOrdersManagement';
import { AdminExpensesManagement } from './AdminExpensesManagement';
import { AdminStatsView } from './AdminStatsView';
import { AdminReviewsManagement } from './AdminReviewsManagement';
import { AdminHistoryView } from './AdminHistoryView';
import { AdminSmsLogsManagement } from './AdminSmsLogsManagement';
import { getCurrentUser } from '../../lib/auth';
import { getAllOrders, subscribeOrders, getStatusDetails, getPaymentStatusDetails } from '../../lib/orders';
import { getAllProducts } from '../../lib/products';
import { getTotalExpenses, subscribeExpenses } from '../../lib/expenses';
import { getPendingReviews, subscribeReviews } from '../../lib/reviews';
import { Order } from '../../types';

interface AdminViewProps {
  onBack: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState<
    'dashboard' | 'orders' | 'expenses' | 'stats' | 'reviews' | 'products' | 'vendors' | 'qr' | 'history' | 'sms'
  >('dashboard');

  const [orders, setOrders] = useState<Order[]>(getAllOrders());
  const [todayExpenses, setTodayExpenses] = useState<number>(getTotalExpenses('today'));
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(getPendingReviews().length);

  const currentUser = getCurrentUser();
  const products = getAllProducts();

  useEffect(() => {
    setOrders(getAllOrders());
    const unsubOrders = subscribeOrders((updated) => setOrders(updated));
    const unsubExpenses = subscribeExpenses(() => setTodayExpenses(getTotalExpenses('today')));
    const unsubReviews = subscribeReviews(() => setPendingReviewsCount(getPendingReviews().length));

    return () => {
      unsubOrders();
      unsubExpenses();
      unsubReviews();
    };
  }, []);

  const now = new Date();

  // "Aujourd'hui" metrics calculation (Module 8 Requirement 1)
  const todayOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  const todayCA = todayOrders
    .filter((o) => o.statutPaiement === 'PAYE')
    .reduce((sum, o) => sum + o.total, 0);

  const todayOrdersCount = todayOrders.length;
  const todayPendingCount = todayOrders.filter((o) => o.statut !== 'TERMINEE').length;
  const todayCompletedCount = todayOrders.filter((o) => o.statut === 'TERMINEE').length;
  const todayPaidCount = todayOrders.filter((o) => o.statutPaiement === 'PAYE').length;

  const estimatedTodayProfit = todayCA - todayExpenses;

  // Stock alerts (produits en rupture ou stock faible)
  const lowStockProducts = products.filter(
    (p) => p.quantiteRestante !== null && p.quantiteRestante !== undefined && p.quantiteRestante <= 10
  );

  return (
    <div id="admin-view-container" className="space-y-6 pb-16">
      
      {/* Admin Header */}
      <div className="bg-white border border-[#E5DDD0] rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={onBack}
              className="text-[#53685C] hover:text-[#1F3D2E] p-1 -ml-1 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] bg-[#FAF3E8] text-[#1F3D2E] border border-[#C9A24B]/30 font-mono px-2 py-0.5 rounded font-semibold">
              Espace Administrateur
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1F3D2E]">
            Direction Générale Signature One
          </h1>
          <p className="text-xs text-[#53685C]">
            Directeur : <strong>{currentUser?.nom || 'Directeur Général'}</strong> ({currentUser?.telephone || '+228 90 00 00 00'})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#FAF3E8] border border-[#E5DDD0] px-4 py-2 rounded-2xl text-xs">
            <span className="text-[#53685C] block text-[10px]">Bénéfice Estimé du Jour</span>
            <span className={`font-serif font-bold text-base ${estimatedTodayProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
              {estimatedTodayProfit.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>
      </div>

      {/* Main Multi-Section Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-[#FAF3E8] p-1.5 rounded-2xl border border-[#E5DDD0] text-xs">
        <button
          onClick={() => setActiveSection('dashboard')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'dashboard'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Aujourd'hui (Tableau de bord)</span>
        </button>

        <button
          onClick={() => setActiveSection('orders')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'orders'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Commandes ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('expenses')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'expenses'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Dépenses & Charges</span>
        </button>

        <button
          onClick={() => setActiveSection('stats')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'stats'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Statistiques</span>
        </button>

        <button
          onClick={() => setActiveSection('reviews')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'reviews'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <Star className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Avis Clients {pendingReviewsCount > 0 && `(${pendingReviewsCount})`}</span>
        </button>

        <button
          onClick={() => setActiveSection('products')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'products'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <Package className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Produits</span>
        </button>

        <button
          onClick={() => setActiveSection('vendors')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'vendors'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Vendeurs</span>
        </button>

        <button
          onClick={() => setActiveSection('qr')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'qr'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>QR Tables</span>
        </button>

        <button
          onClick={() => setActiveSection('history')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'history'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <History className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Historique & Audit</span>
        </button>

        <button
          onClick={() => setActiveSection('sms')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'sms'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>SMS Paiements</span>
        </button>
      </div>

      {/* SECTION 1: DASHBOARD "AUJOURD'HUI" (Module 8 Requirement 1) */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Main KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            
            <div className="bg-white border border-[#E5DDD0] rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[11px] text-[#53685C] block">Chiffre d'Affaires du Jour</span>
              <span className="font-serif font-bold text-xl text-[#1F3D2E]">
                {todayCA.toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
              </span>
              <span className="text-[10px] text-emerald-800 font-semibold block">
                {todayPaidCount} paiements encaissés
              </span>
            </div>

            <div className="bg-white border border-[#E5DDD0] rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[11px] text-[#53685C] block">Dépenses du Jour</span>
              <span className="font-serif font-bold text-xl text-rose-700">
                {todayExpenses.toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
              </span>
              <span className="text-[10px] text-stone-500 font-medium block">
                Achats & charges directes
              </span>
            </div>

            <div className="bg-white border border-[#E5DDD0] rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[11px] text-[#53685C] block">Bénéfice Net Estimé</span>
              <span
                className={`font-serif font-bold text-xl ${
                  estimatedTodayProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'
                }`}
              >
                {estimatedTodayProfit.toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
              </span>
              <span className="text-[10px] text-[#53685C] block">
                Calculé : CA ({todayCA.toLocaleString('fr-FR')}F) − Dépenses
              </span>
            </div>

            <div className="bg-white border border-[#E5DDD0] rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[11px] text-[#53685C] block">Commandes du Jour</span>
              <span className="font-serif font-bold text-xl text-[#1F3D2E]">
                {todayOrdersCount}
              </span>
              <span className="text-[10px] text-[#53685C] block">
                {todayPendingCount} en attente • {todayCompletedCount} terminées
              </span>
            </div>

          </div>

          {/* Stock Alerts Widget if low stock */}
          {lowStockProducts.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Alerte Stock : {lowStockProducts.length} produit(s) en quantité critique (≤ 10 unités)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="bg-white p-3 rounded-xl border border-amber-200 flex justify-between items-center">
                    <div>
                      <strong className="text-[#1F3D2E] block">{p.nom}</strong>
                      <span className="text-[10px] text-[#53685C]">{p.format}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-1 rounded-lg">
                      {p.quantiteRestante ?? 0} restant(s)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div
              onClick={() => setActiveSection('orders')}
              className="bg-white border border-[#E5DDD0] hover:border-[#1F3D2E] rounded-3xl p-5 shadow-xs transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#FAF3E8] flex items-center justify-center text-[#1F3D2E] group-hover:bg-[#1F3D2E] group-hover:text-[#FAF3E8] transition-colors">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#1F3D2E]" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
                Supervision des Commandes
              </h3>
              <p className="text-xs text-[#53685C]">
                {orders.length} commandes au total. Filtrez par vendeur, statut, et réassignez les commandes.
              </p>
            </div>

            <div
              onClick={() => setActiveSection('expenses')}
              className="bg-white border border-[#E5DDD0] hover:border-[#1F3D2E] rounded-3xl p-5 shadow-xs transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-800 group-hover:bg-rose-800 group-hover:text-white transition-colors">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#1F3D2E]" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
                Dépenses & Fournitures
              </h3>
              <p className="text-xs text-[#53685C]">
                Enregistrez les charges du salon et ajustez la rentabilité en temps réel.
              </p>
            </div>

            <div
              onClick={() => setActiveSection('reviews')}
              className="bg-white border border-[#E5DDD0] hover:border-[#1F3D2E] rounded-3xl p-5 shadow-xs transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-800 group-hover:bg-amber-800 group-hover:text-white transition-colors">
                  <Star className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#1F3D2E]" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
                Modération Avis Clients
              </h3>
              <p className="text-xs text-[#53685C]">
                {pendingReviewsCount} avis en attente. Acceptez ou mettez en avant les témoignages.
              </p>
            </div>

          </div>

          {/* Recent Orders Overview */}
          <div className="bg-white border border-[#E5DDD0] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
                Dernières Commandes Enregistrées
              </h3>
              <button
                onClick={() => setActiveSection('orders')}
                className="text-xs font-bold text-[#1F3D2E] hover:text-[#C9A24B] flex items-center gap-1"
              >
                <span>Voir tout ({orders.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAF3E8] text-[#1F3D2E] font-semibold border-y border-[#E5DDD0]">
                  <tr>
                    <th className="p-3">Numéro</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">Articles</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3">Vendeur</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE9DF]">
                  {orders.slice(0, 5).map((o) => {
                    const status = getStatusDetails(o.statut);
                    return (
                      <tr key={o.id} className="hover:bg-[#FAF3E8]/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-[#1F3D2E]">{o.numero}</td>
                        <td className="p-3 font-medium text-[#1F3D2E]">{o.clientNom}</td>
                        <td className="p-3 text-[11px] text-[#53685C] max-w-[200px] truncate">
                          {o.items.map((i) => `${i.quantite}x ${i.product?.nom || 'Prod'}`).join(', ')}
                        </td>
                        <td className="p-3 font-serif font-bold text-[#1F3D2E]">
                          {o.total.toLocaleString('fr-FR')} F
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${status.badgeClass}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-3 text-[#53685C]">
                          {o.vendeur?.nom ? `👤 ${o.vendeur.nom}` : 'Non assigné'}
                        </td>
                        <td className="p-3 text-[#53685C]">
                          {new Date(o.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SECTION 2: GLOBAL ORDERS MANAGEMENT */}
      {activeSection === 'orders' && (
        <AdminOrdersManagement orders={orders} />
      )}

      {/* SECTION 3: EXPENSES MANAGEMENT */}
      {activeSection === 'expenses' && (
        <AdminExpensesManagement />
      )}

      {/* SECTION 4: ANALYTICS & STATS */}
      {activeSection === 'stats' && (
        <AdminStatsView orders={orders} />
      )}

      {/* SECTION 5: CUSTOMER REVIEWS MODERATION */}
      {activeSection === 'reviews' && (
        <AdminReviewsManagement />
      )}

      {/* SECTION 6: PRODUCTS MANAGEMENT (M3) */}
      {activeSection === 'products' && (
        <AdminProductsManagement />
      )}

      {/* SECTION 7: VENDORS MANAGEMENT (M2) */}
      {activeSection === 'vendors' && (
        <AdminVendorsManagement />
      )}

      {/* SECTION 8: QR CODES MANAGEMENT (M6) */}
      {activeSection === 'qr' && (
        <AdminQRCodesManagement />
      )}

      {/* SECTION 9: COMPLETE AUDIT & HISTORY */}
      {activeSection === 'history' && (
        <AdminHistoryView orders={orders} />
      )}

      {/* SECTION 10: SMS PAYMENTS (Mobile Money reconciliation) */}
      {activeSection === 'sms' && (
        <AdminSmsLogsManagement />
      )}

    </div>
  );
};
