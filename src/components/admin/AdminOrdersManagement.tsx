import React, { useState } from 'react';
import {
  ShoppingCart,
  Filter,
  Download,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Search,
  Users,
  ChevronDown,
  Printer,
  X
} from 'lucide-react';
import { Order, StatutCommande, StatutPaiement, ModePaiement, TypeCommande } from '../../types';
import {
  getStatusDetails,
  getPaymentStatusDetails,
  getReceptionModeDetails,
  updateOrderStatus,
  unpayOrderPayment,
  confirmPayment,
  reassignOrder
} from '../../lib/orders';
import { getVendorsList } from '../../lib/auth';
import { exportOrdersToCsv } from '../../lib/exportCsv';
import { ReceiptModal } from '../receipt/ReceiptModal';

interface AdminOrdersManagementProps {
  orders: Order[];
}

export const AdminOrdersManagement: React.FC<AdminOrdersManagementProps> = ({ orders }) => {
  // Combined Filter States
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('ALL');
  const [receptionTypeFilter, setReceptionTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reassignment Modal State
  const [reassignModalOrder, setReassignModalOrder] = useState<Order | null>(null);
  const [selectedNewVendorId, setSelectedNewVendorId] = useState<string>('');

  // Receipt Modal State
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const vendorsList = getVendorsList();
  const now = new Date();

  // Apply Combined Multi-Criteria Filtering (Module 8 Requirement 2 & Criterion)
  const filteredOrders = orders.filter((o) => {
    // 1. Period
    const d = new Date(o.createdAt);
    if (periodFilter === 'today') {
      const isToday =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
      if (!isToday) return false;
    } else if (periodFilter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (d < oneWeekAgo) return false;
    } else if (periodFilter === 'month') {
      const isMonth =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth();
      if (!isMonth) return false;
    }

    // 2. Status
    if (statusFilter !== 'ALL' && o.statut !== statusFilter) {
      return false;
    }

    // 3. Vendor
    if (vendorFilter !== 'ALL') {
      if (vendorFilter === 'UNASSIGNED') {
        if (o.vendeurId) return false;
      } else if (o.vendeurId !== vendorFilter) {
        return false;
      }
    }

    // 4. Payment Mode
    if (paymentModeFilter !== 'ALL' && o.modePaiement !== paymentModeFilter) {
      return false;
    }

    // 5. Reception Type
    if (receptionTypeFilter !== 'ALL' && o.typeCommande !== receptionTypeFilter) {
      return false;
    }

    // 6. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = o.numero.toLowerCase().includes(q);
      const matchClient = o.clientNom.toLowerCase().includes(q);
      const matchTel = o.clientTel.includes(q);
      if (!matchNum && !matchClient && !matchTel) return false;
    }

    return true;
  });

  const handleStatusChange = async (orderId: string, newStatus: StatutCommande) => {
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      setFeedback({ type: 'success', message: `Statut de la commande mis à jour : ${newStatus}` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erreur lors de la mise à jour du statut.' });
    }
  };

  const handlePaymentToggle = async (order: Order) => {
    if (order.statutPaiement !== 'PAYE') {
      // Validation de paiement : toujours via le backend (rôle vérifié).
      const res = await confirmPayment(order.id);
      setFeedback(
        res.success
          ? { type: 'success', message: `Paiement validé pour ${order.numero}.` }
          : { type: 'error', message: res.error || 'Erreur lors de la validation du paiement.' }
      );
    } else {
      // Revert vers EN_ATTENTE : persisté via le backend (PATCH /orders/:id/unpay).
      const res = await unpayOrderPayment(order.id);
      setFeedback(
        res.success
          ? { type: 'success', message: `Paiement repassé en attente pour ${order.numero}.` }
          : { type: 'error', message: res.error || 'Erreur lors de l’annulation du paiement.' }
      );
    }
  };

  const handleOpenReassignModal = (order: Order) => {
    setReassignModalOrder(order);
    setSelectedNewVendorId(order.vendeurId || '');
  };

  const handleExecuteReassign = async () => {
    if (!reassignModalOrder) return;

    const res = await reassignOrder(
      reassignModalOrder.id,
      selectedNewVendorId
        ? (() => {
            const v = vendorsList.find((vend) => vend.id === selectedNewVendorId);
            return v ? { id: v.id, nom: v.nom, telephone: v.telephone } : null;
          })()
        : null
    );
    if (res.success) {
      setFeedback({
        type: 'success',
        message: selectedNewVendorId
          ? `Commande ${reassignModalOrder.numero} réassignée.`
          : `Commande ${reassignModalOrder.numero} désassignée.`,
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erreur lors de la réassignation.' });
    }
    setReassignModalOrder(null);
  };

  const handleExportCsv = () => {
    exportOrdersToCsv(filteredOrders, 'commandes_signature_one_admin');
  };

  const resetAllFilters = () => {
    setPeriodFilter('all');
    setStatusFilter('ALL');
    setVendorFilter('ALL');
    setPaymentModeFilter('ALL');
    setReceptionTypeFilter('ALL');
    setSearchQuery('');
  };

  return (
    <div id="admin-orders-management" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-[#C9A24B] font-semibold mb-1">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Supervision & Réassignation</span>
          </div>
          <h2 className="font-serif text-xl font-bold text-[#1F3D2E]">
            Gestion Globale des Commandes
          </h2>
          <p className="text-xs text-[#53685C]">
            Visualisez, filtrez, réassignez et exportez l'ensemble des commandes de tous les vendeurs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#C9A24B]" />
            <span>Exporter CSV ({filteredOrders.length})</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-stone-500 hover:text-stone-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Combined Multi-Filter Controls Bar (Module 8 Spec) */}
      <div className="bg-white border border-[#E5DDD0] rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1F3D2E]">
            <Filter className="w-4 h-4 text-[#C9A24B]" />
            <span>Filtres de recherche combinés</span>
          </div>

          <button
            onClick={resetAllFilters}
            className="text-[11px] text-[#53685C] hover:text-[#1F3D2E] flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Réinitialiser les filtres</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          
          {/* 1. Period */}
          <div>
            <label className="text-[10px] font-bold text-[#53685C] block mb-1">Période</label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#1F3D2E] outline-hidden"
            >
              <option value="all">Toutes périodes</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">Ce mois</option>
            </select>
          </div>

          {/* 2. Status */}
          <div>
            <label className="text-[10px] font-bold text-[#53685C] block mb-1">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#1F3D2E] outline-hidden"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="NOUVELLE">Nouvelle</option>
              <option value="ACCEPTEE">Acceptée</option>
              <option value="EN_PREPARATION">En préparation</option>
              <option value="PRETE">Prête</option>
              <option value="TERMINEE">Terminée</option>
            </select>
          </div>

          {/* 3. Vendor */}
          <div>
            <label className="text-[10px] font-bold text-[#53685C] block mb-1">Vendeur</label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#1F3D2E] outline-hidden"
            >
              <option value="ALL">Tous les vendeurs</option>
              <option value="UNASSIGNED">⚠️ Non assigné</option>
              {vendorsList.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nom}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Payment Mode */}
          <div>
            <label className="text-[10px] font-bold text-[#53685C] block mb-1">Paiement</label>
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#1F3D2E] outline-hidden"
            >
              <option value="ALL">Tous paiements</option>
              <option value="TMONEY">TMoney</option>
              <option value="FLOOZ">Flooz</option>
              <option value="SUR_PLACE">Sur place (Espèces)</option>
              <option value="LIVRAISON">Livraison</option>
            </select>
          </div>

          {/* 5. Reception Type */}
          <div>
            <label className="text-[10px] font-bold text-[#53685C] block mb-1">Service</label>
            <select
              value={receptionTypeFilter}
              onChange={(e) => setReceptionTypeFilter(e.target.value)}
              className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#1F3D2E] outline-hidden"
            >
              <option value="ALL">Tous services</option>
              <option value="SUR_PLACE">Sur place</option>
              <option value="RETRAIT">À emporter</option>
              <option value="LIVRAISON">Livraison</option>
            </select>
          </div>

          {/* 6. Text Search */}
          <div>
            <label className="text-[10px] font-bold text-[#53685C] block mb-1">Recherche</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#53685C] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Numéro, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl text-[#1F3D2E] outline-hidden"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#E5DDD0] rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF3E8] text-[#1F3D2E] font-semibold border-b border-[#E5DDD0]">
              <tr>
                <th className="p-3">Numéro</th>
                <th className="p-3">Date & Heure</th>
                <th className="p-3">Client</th>
                <th className="p-3">Articles</th>
                <th className="p-3">Total</th>
                <th className="p-3">Statut Commande</th>
                <th className="p-3">Paiement</th>
                <th className="p-3">Vendeur Responsable</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE9DF]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-[#53685C]">
                    Aucune commande trouvée avec ces critères de filtrage.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const status = getStatusDetails(ord.statut);
                  const payment = getPaymentStatusDetails(ord.statutPaiement);
                  const reception = getReceptionModeDetails(ord.typeCommande);

                  return (
                    <tr key={ord.id} className="hover:bg-[#FAF3E8]/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#1F3D2E] whitespace-nowrap">
                        {ord.numero}
                      </td>
                      <td className="p-3 text-[#53685C] whitespace-nowrap">
                        {new Date(ord.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3 font-medium text-[#1F3D2E]">
                        <div>{ord.clientNom}</div>
                        <div className="text-[10px] text-[#53685C] font-mono">{ord.clientTel}</div>
                        <span className="text-[9px] bg-[#FAF3E8] text-[#1F3D2E] px-1.5 py-0.5 rounded border border-[#E5DDD0] font-semibold">
                          {reception.label} {ord.tableId ? `(#${ord.tableId})` : ''}
                        </span>
                      </td>
                      <td className="p-3 text-[#53685C] max-w-[180px] truncate">
                        {ord.items.map((i) => `${i.quantite}x ${i.product?.nom || 'Article'}`).join(', ')}
                      </td>
                      <td className="p-3 font-serif font-bold text-[#1F3D2E] whitespace-nowrap">
                        {ord.total.toLocaleString('fr-FR')} F
                      </td>
                      <td className="p-3">
                        <select
                          value={ord.statut}
                          onChange={(e) => handleStatusChange(ord.id, e.target.value as StatutCommande)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-xl border outline-hidden cursor-pointer ${status.badgeClass}`}
                        >
                          <option value="NOUVELLE">Nouvelle</option>
                          <option value="ACCEPTEE">Acceptée</option>
                          <option value="EN_PREPARATION">En préparation</option>
                          <option value="PRETE">Prête</option>
                          <option value="TERMINEE">Terminée</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handlePaymentToggle(ord)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border cursor-pointer hover:opacity-80 transition-opacity ${payment.badgeClass}`}
                          title="Cliquer pour basculer le statut paiement"
                        >
                          {payment.label} ({ord.modePaiement})
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {ord.vendeur?.nom ? (
                            <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                              👤 {ord.vendeur.nom}
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              Non assigné
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenReassignModal(ord)}
                            className="p-1 hover:bg-[#FAF3E8] rounded-md text-[#53685C] hover:text-[#1F3D2E]"
                            title="Réassigner à un autre vendeur"
                          >
                            <Users className="w-3 h-3 text-[#C9A24B]" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setReceiptOrder(ord)}
                          className="p-1.5 text-[#53685C] hover:text-[#1F3D2E] hover:bg-[#FAF3E8] rounded-lg transition-colors inline-flex items-center gap-1"
                          title="Voir le ticket"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#C9A24B]" />
                          <span className="text-[10px]">Reçu</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Reassignment Modal (Module 8 Requirement 2) */}
      {reassignModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5DDD0] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-[#1F3D2E] relative">
            <button
              onClick={() => setReassignModalOrder(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-serif font-bold text-lg text-[#1F3D2E]">
              Réassigner la Commande
            </h3>

            <p className="text-xs text-[#53685C]">
              Commande <strong className="font-mono text-[#1F3D2E]">{reassignModalOrder.numero}</strong> •{' '}
              {reassignModalOrder.clientNom} ({reassignModalOrder.total.toLocaleString('fr-FR')} FCFA)
            </p>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-[#1F3D2E] block">
                Sélectionner le vendeur responsable :
              </label>
              <select
                value={selectedNewVendorId}
                onChange={(e) => setSelectedNewVendorId(e.target.value)}
                className="w-full bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl px-3 py-2 text-xs font-semibold text-[#1F3D2E] outline-hidden focus:ring-2 focus:ring-[#1F3D2E]"
              >
                <option value="">-- Aucun vendeur (Non assigné) --</option>
                {vendorsList.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nom} ({v.telephone}) {v.actif ? '' : '[Inactif]'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleExecuteReassign}
                className="py-2.5 bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Confirmer
              </button>
              <button
                onClick={() => setReassignModalOrder(null)}
                className="py-2.5 bg-white border border-[#E5DDD0] text-[#53685C] font-semibold text-xs rounded-xl hover:bg-stone-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          isOpen={Boolean(receiptOrder)}
          onClose={() => setReceiptOrder(null)}
        />
      )}

    </div>
  );
};
