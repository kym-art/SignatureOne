import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  ShoppingCart,
  Clock,
  CheckCircle,
  Smartphone,
  Banknote,
  ArrowLeft,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  QrCode,
  Volume2,
  VolumeX,
  BellRing,
  HandMetal,
  Printer,
  History,
  PlusCircle,
  ChefHat,
  PackageCheck,
  Sparkles,
  Search,
  X
} from 'lucide-react';
import { getCurrentUser } from '../../lib/auth';
import {
  getAllOrders,
  subscribeOrders,
  claimOrder,
  updateOrderStatusByVendor,
  confirmPayment,
  getStatusDetails,
  getPaymentStatusDetails,
  getReceptionModeDetails
} from '../../lib/orders';
import { playOrderNotificationSound } from '../../lib/sound';
import { notify, requestNotificationPermission } from '../../lib/notify';
import { Order, StatutCommande, StatutPaiement } from '../../types';
import { VendeurDirectSaleView } from './VendeurDirectSaleView';
import { ReceiptModal } from '../receipt/ReceiptModal';

interface VendeurViewProps {
  onBack: () => void;
}

export const VendeurView: React.FC<VendeurViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'direct_sale' | 'history'>('dashboard');
  const [orders, setOrders] = useState<Order[]>(getAllOrders());
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [newOrderToast, setNewOrderToast] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  const currentUser = getCurrentUser();
  const knownOrderIdsRef = useRef<Set<string>>(new Set(getAllOrders().map((o) => o.id)));

  // Listen to order changes & real-time notifications
  useEffect(() => {
    setOrders(getAllOrders());

    // Demande silencieuse de la permission de notifications (facultative).
    requestNotificationPermission();

    const unsub = subscribeOrders((updatedOrders) => {
      setOrders(updatedOrders);

      // Check for genuinely new orders that weren't in known set
      const newOrders = updatedOrders.filter((o) => !knownOrderIdsRef.current.has(o.id));
      if (newOrders.length > 0) {
        const latest = newOrders[0];
        newOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));

        // Show Toast & Play Sound
        if (latest.statut === 'NOUVELLE') {
          setNewOrderToast(latest);
          notify('Nouvelle commande reçue', `Commande ${latest.numero} — ${latest.clientNom} (${latest.total.toLocaleString('fr-FR')} FCFA)`);
          if (soundEnabled) {
            playOrderNotificationSound();
          }
        }
      }
    });

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Order>;
      if (customEvent.detail) {
        setNewOrderToast(customEvent.detail);
        notify(
          'Nouvelle commande reçue',
          `Commande ${customEvent.detail.numero} — ${customEvent.detail.clientNom} (${customEvent.detail.total.toLocaleString('fr-FR')} FCFA)`
        );
        if (soundEnabled) {
          playOrderNotificationSound();
        }
      }
    };

    window.addEventListener('signature_one:new_order', handleCustomEvent);

    return () => {
      unsub();
      window.removeEventListener('signature_one:new_order', handleCustomEvent);
    };
  }, [soundEnabled]);

  // Handle Order Claiming (Prendre en charge)
  const handleClaimOrder = async (orderId: string) => {
    setErrorMessage(null);
    if (!currentUser) {
      setErrorMessage('Veuillez vous connecter pour prendre en charge une commande.');
      return;
    }

    const res = await claimOrder(orderId, {
      id: currentUser.id,
      nom: currentUser.nom,
      telephone: currentUser.telephone,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Impossible de prendre en charge cette commande.');
    } else {
      if (newOrderToast?.id === orderId) {
        setNewOrderToast(null);
      }
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (orderId: string, nextStatus: StatutCommande) => {
    setErrorMessage(null);
    if (!currentUser) return;

    const res = await updateOrderStatusByVendor(
      orderId,
      nextStatus,
      currentUser.id,
      currentUser.role === 'ADMIN'
    );

    if (!res.success) {
      setErrorMessage(res.error || 'Action non autorisée.');
    }
  };

  // Handle Payment Confirmation
  const handleConfirmPayment = (orderId: string) => {
    void confirmPayment(orderId).then((res) => {
      if (!res.success) setErrorMessage(res.error || 'Impossible de valider le paiement.');
    });
  };

  // Filtered Orders for the live dashboard
  const liveFilteredOrders = orders.filter((o) => {
    if (selectedStatusFilter === 'ALL') return true;
    return o.statut === selectedStatusFilter;
  });

  // Calculate daily stats for this vendor
  const vendorOrders = orders.filter(
    (o) => o.vendeurId === currentUser?.id || (!o.vendeurId && o.statut === 'TERMINEE')
  );

  const vendorTotalToday = vendorOrders
    .filter((o) => o.statutPaiement === 'PAYE')
    .reduce((sum, o) => sum + o.total, 0);

  const vendorOrdersCount = vendorOrders.length;

  // Segmenting orders for the live dashboard
  const unassignedOrders = orders.filter((o) => o.statut === 'NOUVELLE' && !o.vendeurId);
  const inPrepOrders = orders.filter(
    (o) => o.statut === 'ACCEPTEE' || o.statut === 'EN_PREPARATION'
  );
  const readyOrders = orders.filter((o) => o.statut === 'PRETE');

  // History list for current vendor
  const historyOrders = orders
    .filter((o) => {
      // Must be processed by current vendor
      const matchesVendor = o.vendeurId === currentUser?.id;
      if (!matchesVendor) return false;

      if (!historySearchQuery) return true;
      const q = historySearchQuery.toLowerCase();
      return (
        o.numero.toLowerCase().includes(q) ||
        o.clientNom.toLowerCase().includes(q) ||
        o.clientTel.includes(q)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div id="vendeur-view-container" className="space-y-6 pb-16">
      
      {/* Real-time Order Alert Toast (Module 7 Requirement 2) */}
      {newOrderToast && (
        <div className="bg-[#1F3D2E] text-[#FAF3E8] border border-[#C9A24B] rounded-3xl p-5 shadow-2xl animate-in slide-in-from-top-4 space-y-3 relative">
          <button
            onClick={() => setNewOrderToast(null)}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#FAF3E8]"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold text-[#C9A24B]">
            <BellRing className="w-4 h-4 animate-bounce text-[#C9A24B]" />
            <span className="uppercase tracking-wide">Nouvelle Commande Reçue !</span>
            <span className="bg-[#FAF3E8] text-[#1F3D2E] font-mono text-[10px] px-2 py-0.5 rounded font-bold">
              {newOrderToast.numero}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-bold text-sm text-white">{newOrderToast.clientNom}</p>
              <p className="text-stone-300 font-mono">{newOrderToast.clientTel}</p>
              <p className="text-[11px] text-[#C9A24B] mt-1">
                Type : {getReceptionModeDetails(newOrderToast.typeCommande).label}{' '}
                {newOrderToast.tableId ? `(#${newOrderToast.tableId})` : ''}
              </p>
            </div>

            <div className="bg-white/10 p-3 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] text-stone-300 block">Articles :</span>
              <p className="font-medium text-white line-clamp-2">
                {newOrderToast.items.map((i) => `${i.quantite}x ${i.product?.nom || 'Prod'}`).join(', ')}
              </p>
              <div className="pt-1 flex items-baseline justify-between border-t border-white/10">
                <span className="text-[10px] text-stone-300">Total :</span>
                <span className="font-serif font-bold text-white text-sm">
                  {newOrderToast.total.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => handleClaimOrder(newOrderToast.id)}
              className="bg-[#C9A24B] hover:bg-[#B8913B] text-[#1F3D2E] font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <HandMetal className="w-3.5 h-3.5" />
              <span>Prendre en charge immédiatement</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-3 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 font-bold p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Vendeur Profile & KPI Header */}
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
              Espace Vendeur
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1F3D2E]">Espace Vendeur & Service Comptoir</h1>
          <p className="text-xs text-[#53685C]">
            Connecté : <strong>{currentUser?.nom || 'Vendeur Signature One'}</strong> ({currentUser?.telephone || '+228 90 00 00 00'})
          </p>
        </div>

        {/* Top KPIs + Sound Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#FAF3E8] border border-[#E5DDD0] px-4 py-2 rounded-2xl text-xs">
            <span className="text-[#53685C] block text-[10px]">Mes Ventes du Jour</span>
            <span className="font-serif font-bold text-[#1F3D2E] text-base">
              {vendorTotalToday.toLocaleString('fr-FR')} FCFA
            </span>
            <span className="text-[10px] text-[#C9A24B] block font-medium">
              ({vendorOrdersCount} commandes traitées)
            </span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-2xl border transition-colors flex items-center gap-1.5 text-xs font-semibold ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-stone-100 text-stone-600 border-stone-200'
            }`}
            title="Activer ou couper les notifications sonores de nouvelles commandes"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
            <span>{soundEnabled ? 'Son ON' : 'Son OFF'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 bg-[#FAF3E8] p-1.5 rounded-2xl border border-[#E5DDD0] text-xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'dashboard'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Commandes en direct ({liveFilteredOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('direct_sale')}
          className={`px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'direct_sale'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Nouvelle Vente Directe (Comptoir)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          <History className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Mon Historique & Reçus ({historyOrders.length})</span>
        </button>
      </div>

      {/* TAB 1: LIVE DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Quick Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E5DDD0]">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#C9A24B]" />
              <span className="text-xs font-bold text-[#1F3D2E]">Filtrer par état :</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {['ALL', 'NOUVELLE', 'ACCEPTEE', 'EN_PREPARATION', 'PRETE', 'TERMINEE'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatusFilter(st)}
                  className={`px-3 py-1 rounded-xl font-medium transition-colors whitespace-nowrap ${
                    selectedStatusFilter === st
                      ? 'bg-[#1F3D2E] text-[#FAF3E8]'
                      : 'bg-[#FAF3E8] text-[#53685C] border border-[#E5DDD0] hover:bg-stone-200'
                  }`}
                >
                  {st === 'ALL' ? 'Toutes' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Cards Grid */}
          <div className="grid grid-cols-1 gap-3.5">
            {liveFilteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-[#E5DDD0] text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-serif font-bold text-[#1F3D2E]">Aucune commande active</h4>
                <p className="text-[#53685C] text-xs">
                  Toutes les commandes ont été traitées ou aucun résultat ne correspond au filtre sélectionné.
                </p>
              </div>
            ) : (
              liveFilteredOrders.map((order) => {
                const statusDetails = getStatusDetails(order.statut);
                const paymentDetails = getPaymentStatusDetails(order.statutPaiement);
                const receptionDetails = getReceptionModeDetails(order.typeCommande);
                const isClaimedByMe = order.vendeurId === currentUser?.id;
                const isClaimedByOther = Boolean(order.vendeurId && order.vendeurId !== currentUser?.id);
                const isUnclaimed = !order.vendeurId;

                return (
                  <div
                    key={order.id}
                    className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
                      isClaimedByMe
                        ? 'border-[#1F3D2E] ring-1 ring-[#1F3D2E]/20'
                        : isUnclaimed
                        ? 'border-amber-300 bg-amber-50/15'
                        : 'border-[#E5DDD0]'
                    }`}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#1F3D2E] bg-[#FAF3E8] px-2 py-0.5 rounded border border-[#E5DDD0]">
                          {order.numero}
                        </span>

                        <span className="text-[10px] bg-[#FAF3E8] text-[#1F3D2E] px-2 py-0.5 rounded font-semibold border border-[#E5DDD0] flex items-center gap-1">
                          <span>{receptionDetails.icon}</span>
                          <span>{receptionDetails.label}</span>
                          {order.tableId && <strong className="font-mono">#{order.tableId}</strong>}
                        </span>

                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${statusDetails.badgeClass}`}>
                          {statusDetails.label}
                        </span>

                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${paymentDetails.badgeClass}`}>
                          {paymentDetails.label} ({order.modePaiement})
                        </span>

                        {/* Vendor attribution badge */}
                        {order.vendeur?.nom ? (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                              isClaimedByMe
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                                : 'bg-stone-100 text-stone-700 border-stone-300'
                            }`}
                          >
                            👤 {isClaimedByMe ? 'Pris par vous' : `Pris par ${order.vendeur.nom}`}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            ⚠️ Non assigné
                          </span>
                        )}
                      </div>

                      <div className="text-xs">
                        <span className="font-bold text-[#1F3D2E]">{order.clientNom}</span>
                        <span className="text-[#53685C] ml-2 font-mono">{order.clientTel}</span>
                        {order.adresseLivraison && (
                          <p className="text-[11px] text-[#53685C] mt-0.5">
                            📍 {order.adresseLivraison}
                          </p>
                        )}
                      </div>

                      {/* Items Summary */}
                      <div className="text-xs text-[#53685C] bg-[#FAF3E8]/60 p-2.5 rounded-xl border border-[#EFE9DF]">
                        {order.items.map((i) => `${i.quantite}x ${i.product?.nom || 'Article'}`).join(' • ')}
                      </div>
                    </div>

                    {/* Actions & Price */}
                    <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                      <div className="text-left lg:text-right">
                        <span className="text-[10px] text-[#53685C] block">Montant Total</span>
                        <span className="font-serif font-bold text-[#1F3D2E] text-base">
                          {order.total.toLocaleString('fr-FR')}{' '}
                          <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
                        </span>
                      </div>

                      {/* Status Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        
                        {/* 1. Claim Order Button (Module 7 Requirement 3) */}
                        {isUnclaimed && order.statut !== 'TERMINEE' && (
                          <button
                            onClick={() => handleClaimOrder(order.id)}
                            className="bg-[#C9A24B] hover:bg-[#B8913B] text-[#1F3D2E] text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <HandMetal className="w-3.5 h-3.5" />
                            <span>Prendre en charge</span>
                          </button>
                        )}

                        {/* 2. Status Advance Controls */}
                        {order.statut === 'ACCEPTEE' && (isClaimedByMe || currentUser?.role === 'ADMIN') && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'EN_PREPARATION')}
                            className="bg-[#C9A24B] hover:bg-[#B8913B] text-[#1F3D2E] text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>Mettre en cuisine</span>
                          </button>
                        )}

                        {order.statut === 'EN_PREPARATION' && (isClaimedByMe || currentUser?.role === 'ADMIN') && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'PRETE')}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Marquer Prête !</span>
                          </button>
                        )}

                        {order.statut === 'PRETE' && (isClaimedByMe || currentUser?.role === 'ADMIN') && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'TERMINEE')}
                            className="bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-[#C9A24B]" />
                            <span>Terminer / Servie</span>
                          </button>
                        )}

                        {/* 3. Confirm Payment Button if unpaid */}
                        {order.statutPaiement !== 'PAYE' && (
                          <button
                            onClick={() => handleConfirmPayment(order.id)}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-xs font-bold px-2.5 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            title="Confirmer l'encaissement sur place ou à la livraison"
                          >
                            <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Encaisser</span>
                          </button>
                        )}

                        {/* 4. Print Receipt */}
                        <button
                          onClick={() => setReceiptOrder(order)}
                          className="bg-[#FAF3E8] hover:bg-stone-200 text-[#1F3D2E] border border-[#E5DDD0] text-xs font-medium p-2 rounded-xl transition-colors cursor-pointer"
                          title="Aperçu et impression du ticket"
                        >
                          <Printer className="w-4 h-4 text-[#53685C]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DIRECT SALE POS */}
      {activeTab === 'direct_sale' && (
        <VendeurDirectSaleView
          onSaleCompleted={(newOrder) => {
            setReceiptOrder(newOrder);
          }}
        />
      )}

      {/* TAB 3: VENDOR HISTORY & RECEIPTS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[#E5DDD0] shadow-xs">
            <div>
              <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
                Historique de mes Commandes & Ventes Traitées
              </h3>
              <p className="text-xs text-[#53685C]">
                Total personnel : <strong>{historyOrders.length}</strong> commandes traitées • Total :{' '}
                <strong>{vendorTotalToday.toLocaleString('fr-FR')} FCFA</strong>
              </p>
            </div>

            {/* Search filter */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-[#53685C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher numéro, client..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl text-[#1F3D2E] outline-hidden"
              />
            </div>
          </div>

          <div className="bg-white border border-[#E5DDD0] rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAF3E8] text-[#1F3D2E] font-semibold border-b border-[#E5DDD0]">
                  <tr>
                    <th className="p-3">Numéro</th>
                    <th className="p-3">Date & Heure</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Articles</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3">Paiement</th>
                    <th className="p-3 text-right">Reçu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE9DF]">
                  {historyOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-xs text-[#53685C]">
                        Aucune commande trouvée dans votre historique.
                      </td>
                    </tr>
                  ) : (
                    historyOrders.map((ord) => {
                      const status = getStatusDetails(ord.statut);
                      const payment = getPaymentStatusDetails(ord.statutPaiement);
                      const reception = getReceptionModeDetails(ord.typeCommande);

                      return (
                        <tr key={ord.id} className="hover:bg-[#FAF3E8]/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-[#1F3D2E]">{ord.numero}</td>
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
                          </td>
                          <td className="p-3">
                            <span className="bg-[#FAF3E8] text-[#1F3D2E] px-2 py-0.5 rounded border border-[#E5DDD0] text-[10px] font-semibold">
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
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${status.badgeClass}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${payment.badgeClass}`}>
                              {payment.label}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setReceiptOrder(ord)}
                              className="bg-[#FAF3E8] hover:bg-[#1F3D2E] hover:text-[#FAF3E8] text-[#1F3D2E] border border-[#E5DDD0] text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3 text-[#C9A24B]" />
                              <span>Ticket</span>
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
        </div>
      )}

      {/* Reusable Receipt Modal */}
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
