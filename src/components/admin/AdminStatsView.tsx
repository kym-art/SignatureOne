import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Award,
  Calendar,
  CreditCard,
  Store,
  DollarSign,
  PackageCheck
} from 'lucide-react';
import { Order, Product } from '../../types';
import { getAllProducts } from '../../lib/products';
import { getTotalExpenses } from '../../lib/expenses';

interface AdminStatsViewProps {
  orders: Order[];
}

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({ orders }) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const products = getAllProducts();

  const now = new Date();

  // Filter orders by selected period
  const filteredOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    if (period === 'today') {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    if (period === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= oneWeekAgo;
    }
    if (period === 'month') {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    }
    return true;
  });

  // Calculate totals
  const totalRevenue = filteredOrders
    .filter((o) => o.statutPaiement === 'PAYE')
    .reduce((sum, o) => sum + o.total, 0);

  const totalOrdersCount = filteredOrders.length;
  const completedOrdersCount = filteredOrders.filter((o) => o.statut === 'TERMINEE').length;
  const totalExpenses = getTotalExpenses(period);
  const netEstimatedProfit = totalRevenue - totalExpenses;

  // 1. Top Selling Products
  const productSalesMap: Record<string, { product: Product | undefined; quantity: number; revenue: number }> = {};
  filteredOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        const prod = products.find((p) => p.id === item.productId) || item.product;
        productSalesMap[item.productId] = {
          product: prod,
          quantity: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.productId].quantity += item.quantite;
      productSalesMap[item.productId].revenue += item.quantite * item.prixUnitaire;
    });
  });

  const topProducts = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity);
  const maxQty = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.quantity), 1) : 1;

  // 2. Breakdown by Payment Mode
  const paymentModeCounts: Record<string, { count: number; total: number }> = {
    FLOOZ: { count: 0, total: 0 },
    TMONEY: { count: 0, total: 0 },
    SUR_PLACE: { count: 0, total: 0 },
    LIVRAISON: { count: 0, total: 0 },
  };
  filteredOrders.forEach((o) => {
    if (paymentModeCounts[o.modePaiement]) {
      paymentModeCounts[o.modePaiement].count += 1;
      paymentModeCounts[o.modePaiement].total += o.total;
    }
  });

  // 3. Breakdown by Order Reception Type
  const receptionTypeCounts: Record<string, { count: number; total: number }> = {
    SUR_PLACE: { count: 0, total: 0 },
    RETRAIT: { count: 0, total: 0 },
    LIVRAISON: { count: 0, total: 0 },
  };
  filteredOrders.forEach((o) => {
    if (receptionTypeCounts[o.typeCommande]) {
      receptionTypeCounts[o.typeCommande].count += 1;
      receptionTypeCounts[o.typeCommande].total += o.total;
    }
  });

  return (
    <div id="admin-stats-view" className="space-y-6">
      
      {/* Header & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-[#C9A24B] font-semibold mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Statistiques & Analyse des Ventes</span>
          </div>
          <h2 className="font-serif text-xl font-bold text-[#1F3D2E]">
            Tableau de Bord Analytique
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-[#FAF3E8] p-1 rounded-2xl border border-[#E5DDD0] text-xs">
          {(
            [
              { id: 'today', label: "Aujourd'hui" },
              { id: 'week', label: '7 jours' },
              { id: 'month', label: 'Ce mois' },
              { id: 'all', label: 'Global' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                period === p.id
                  ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
                  : 'text-[#53685C] hover:text-[#1F3D2E]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E5DDD0] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-[#53685C] block">Chiffre d'Affaires Encaissé</span>
          <span className="font-serif font-bold text-xl text-[#1F3D2E]">
            {totalRevenue.toLocaleString('fr-FR')} <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
          </span>
        </div>

        <div className="bg-white border border-[#E5DDD0] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-[#53685C] block">Total Dépenses</span>
          <span className="font-serif font-bold text-xl text-rose-700">
            {totalExpenses.toLocaleString('fr-FR')} <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
          </span>
        </div>

        <div className="bg-white border border-[#E5DDD0] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-[#53685C] block">Bénéfice Net Estimé</span>
          <span
            className={`font-serif font-bold text-xl ${
              netEstimatedProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'
            }`}
          >
            {netEstimatedProfit.toLocaleString('fr-FR')}{' '}
            <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
          </span>
        </div>

        <div className="bg-white border border-[#E5DDD0] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-[#53685C] block">Commandes Finalisées</span>
          <span className="font-serif font-bold text-xl text-[#1F3D2E]">
            {completedOrdersCount} <span className="text-xs font-normal text-[#53685C]">/ {totalOrdersCount}</span>
          </span>
        </div>
      </div>

      {/* Top Products Visual Ranking */}
      <div className="bg-white border border-[#E5DDD0] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#C9A24B]" />
          <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
            Produits les Plus Vendus (Classement par Volume)
          </h3>
        </div>

        {topProducts.length === 0 ? (
          <p className="text-xs text-[#53685C]">Aucune vente enregistrée sur cette période.</p>
        ) : (
          <div className="space-y-3 pt-2">
            {topProducts.map((item, idx) => {
              const pct = Math.round((item.quantity / maxQty) * 100);
              return (
                <div key={item.product?.id || idx} className="space-y-1 text-xs">
                  <div className="flex justify-between items-baseline font-medium">
                    <span className="text-[#1F3D2E]">
                      <strong>#{idx + 1}</strong> {item.product?.nom || 'Produit'} ({item.product?.format})
                    </span>
                    <span className="font-mono text-[#53685C]">
                      <strong className="text-[#1F3D2E] font-bold">{item.quantity} unités</strong> •{' '}
                      {item.revenue.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  <div className="h-3 bg-[#FAF3E8] rounded-full overflow-hidden border border-[#E5DDD0]">
                    <div
                      className="h-full bg-[#1F3D2E] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Distribution Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Payment Modes Breakdown */}
        <div className="bg-white border border-[#E5DDD0] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#C9A24B]" />
            <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
              Répartition par Mode de Paiement
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { key: 'TMONEY', label: 'TMoney (Togocom)', count: paymentModeCounts.TMONEY.count, total: paymentModeCounts.TMONEY.total, color: 'bg-emerald-600' },
              { key: 'FLOOZ', label: 'Flooz (Moov Money)', count: paymentModeCounts.FLOOZ.count, total: paymentModeCounts.FLOOZ.total, color: 'bg-blue-600' },
              { key: 'SUR_PLACE', label: 'Paiement Sur Place / Espèces', count: paymentModeCounts.SUR_PLACE.count, total: paymentModeCounts.SUR_PLACE.total, color: 'bg-[#C9A24B]' },
              { key: 'LIVRAISON', label: 'Paiement à la Livraison', count: paymentModeCounts.LIVRAISON.count, total: paymentModeCounts.LIVRAISON.total, color: 'bg-[#1F3D2E]' },
            ].map((pm) => (
              <div key={pm.key} className="p-3 bg-[#FAF3E8]/60 rounded-2xl border border-[#EFE9DF] text-xs flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${pm.color}`} />
                  <span className="font-bold text-[#1F3D2E]">{pm.label}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#1F3D2E] block">{pm.count} commande(s)</span>
                  <span className="text-[10px] text-[#53685C]">{pm.total.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Types Breakdown */}
        <div className="bg-white border border-[#E5DDD0] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#C9A24B]" />
            <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
              Répartition par Type de Commande
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { key: 'SUR_PLACE', label: 'Sur place (Salon)', count: receptionTypeCounts.SUR_PLACE.count, total: receptionTypeCounts.SUR_PLACE.total, color: 'bg-[#C9A24B]' },
              { key: 'RETRAIT', label: 'Retrait en boutique / Comptoir', count: receptionTypeCounts.RETRAIT.count, total: receptionTypeCounts.RETRAIT.total, color: 'bg-[#1F3D2E]' },
              { key: 'LIVRAISON', label: 'Livraison à domicile', count: receptionTypeCounts.LIVRAISON.count, total: receptionTypeCounts.LIVRAISON.total, color: 'bg-emerald-700' },
            ].map((tp) => (
              <div key={tp.key} className="p-3 bg-[#FAF3E8]/60 rounded-2xl border border-[#EFE9DF] text-xs flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${tp.color}`} />
                  <span className="font-bold text-[#1F3D2E]">{tp.label}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#1F3D2E] block">{tp.count} commande(s)</span>
                  <span className="text-[10px] text-[#53685C]">{tp.total.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
