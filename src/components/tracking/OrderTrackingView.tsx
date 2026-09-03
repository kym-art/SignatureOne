import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  Store,
  QrCode,
  MapPin,
  Phone,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  FileText,
  Printer,
  Download
} from 'lucide-react';
import { Order, StatutCommande } from '../../types';
import { playOrderReadySound } from '../../lib/sound';
import {
  getOrderByNumero,
  getAllOrders,
  subscribeOrders,
  isMyOrder,
  getStatusDetails,
  getPaymentStatusDetails,
  getReceptionModeDetails
} from '../../lib/orders';
import { getCurrentUser } from '../../lib/auth';
import { ReceiptModal } from '../receipt/ReceiptModal';
import { downloadReceiptPdf } from '../../lib/receipts';
import { notify, requestNotificationPermission } from '../../lib/notify';

interface OrderTrackingViewProps {
  initialNumero?: string;
  onBack: () => void;
  onContinueShopping: () => void;
}

const ORDER_PIPELINE: { key: StatutCommande; label: string; icon: string }[] = [
  { key: 'NOUVELLE', label: 'Reçue', icon: '📝' },
  { key: 'ACCEPTEE', label: 'Acceptée', icon: '👍' },
  { key: 'EN_PREPARATION', label: 'En Préparation', icon: '🥣' },
  { key: 'PRETE', label: 'Prête', icon: '✨' },
  { key: 'TERMINEE', label: 'Livrée / Servie', icon: '🎉' },
];

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  initialNumero = '',
  onBack,
  onContinueShopping,
}) => {
  const [searchNumero, setSearchNumero] = useState<string>(initialNumero);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString('fr-FR'));
  const [notFoundQuery, setNotFoundQuery] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // Un vendeur ou un administrateur voit toutes les commandes ;
  // un simple client ne voit que ses propres commandes.
  const currentUser = getCurrentUser();
  const isStaff = currentUser?.role === 'VENDEUR' || currentUser?.role === 'ADMIN';

  // Évite de re-notifier une même commande déjà passée à "PRETE".
  const notifiedReadyRef = useRef<Set<string>>(new Set());

  // Load initial order or first available order
  useEffect(() => {
    if (initialNumero) {
      const found = getOrderByNumero(initialNumero);
      // Un client ne peut suivre que ses propres commandes.
      if (found && (isStaff || isMyOrder(found.numero))) {
        setCurrentOrder(found);
      } else {
        setNotFoundQuery(initialNumero);
      }
    } else {
      // Un client ne voit que ses propres commandes.
      const all = getAllOrders();
      const visible = isStaff ? all : all.filter((o) => isMyOrder(o.numero));
      if (visible.length > 0) {
        setCurrentOrder(visible[0]);
        setSearchNumero(visible[0].numero);
      }
    }

    const unsub = subscribeOrders(() => {
      if (searchNumero) {
        const found = getOrderByNumero(searchNumero);
        if (found && (isStaff || isMyOrder(found.numero))) setCurrentOrder(found);
      }
    });

    return unsub;
  }, [initialNumero, isStaff]);

  // Notifie le client (et joue le jingle) dès que sa commande passe à "PRETE".
  useEffect(() => {
    requestNotificationPermission();

    // Ne notifier que les NOUVELLES transitions : les commandes déjà "PRETE"
    // à l'affichage ne sont pas re-notifiées.
    (isStaff ? getAllOrders() : getAllOrders().filter((o) => isMyOrder(o.numero)))
      .filter((o) => o.statut === 'PRETE' || o.statut === 'TERMINEE')
      .forEach((o) => notifiedReadyRef.current.add(o.numero));

    const unsub = subscribeOrders((orders) => {
      const visible = isStaff ? orders : orders.filter((o) => isMyOrder(o.numero));
      visible.forEach((o) => {
        if (o.statut === 'PRETE' && !notifiedReadyRef.current.has(o.numero)) {
          notifiedReadyRef.current.add(o.numero);
          notify(`Commande ${o.numero} prête !`, 'Votre commande est prête, vous pouvez venir la récupérer.');
          playOrderReadySound();
        }
      });
    });
    return unsub;
  }, [isStaff]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchNumero.trim()) return;

    setNotFoundQuery(null);
    const found = getOrderByNumero(searchNumero.trim());
    if (found && (isStaff || isMyOrder(found.numero))) {
      setCurrentOrder(found);
    } else {
      setCurrentOrder(null);
      setNotFoundQuery(searchNumero.trim());
    }
    setLastRefreshedAt(new Date().toLocaleTimeString('fr-FR'));
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      if (searchNumero) {
        const found = getOrderByNumero(searchNumero);
        if (found && (isStaff || isMyOrder(found.numero))) setCurrentOrder(found);
      }
      setIsRefreshing(false);
      setLastRefreshedAt(new Date().toLocaleTimeString('fr-FR'));
    }, 400);
  };

  const statusDetails = currentOrder ? getStatusDetails(currentOrder.statut) : null;
  const currentStep = statusDetails ? statusDetails.step : 1;
  const paymentDetails = currentOrder ? getPaymentStatusDetails(currentOrder.statutPaiement) : null;
  const receptionDetails = currentOrder ? getReceptionModeDetails(currentOrder.typeCommande) : null;
  const recentOrders = (isStaff ? getAllOrders() : getAllOrders().filter((o) => isMyOrder(o.numero))).slice(0, 4);

  return (
    <div id="order-tracking-container" className="max-w-4xl mx-auto space-y-6 pb-16">
      
      {/* Top Banner & Search Box */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5DDD0] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <button
                onClick={onBack}
                className="text-[#53685C] hover:text-[#1F3D2E] p-1 -ml-1 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] bg-[#FAF3E8] text-[#1F3D2E] border border-[#C9A24B]/30 font-mono px-2 py-0.5 rounded font-medium">
                Route: /commande/[numero]
              </span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#1F3D2E]">
              Suivi de Commande en Direct
            </h1>
            <p className="text-xs text-[#53685C]">
              Consultez l'avancement de votre commande Signature One en temps réel.
            </p>
          </div>

          {/* Refresh Action */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#53685C]">
              Dernière synchro : <strong className="font-mono text-[#1F3D2E]">{lastRefreshedAt}</strong>
            </span>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="bg-[#FAF3E8] hover:bg-[#1F3D2E] hover:text-[#FAF3E8] text-[#1F3D2E] border border-[#E5DDD0] text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#C9A24B]' : ''}`} />
              <span>Rafraîchir</span>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 pt-2 border-t border-[#EFE9DF]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#53685C]" />
            <input
              type="text"
              placeholder="Saisissez votre numéro (ex: SO-0001, SO-0002)..."
              value={searchNumero}
              onChange={(e) => setSearchNumero(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-[#FAF3E8]/50 border border-[#E5DDD0] rounded-xl font-mono text-xs font-semibold uppercase tracking-wider text-[#1F3D2E] focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs"
          >
            Rechercher
          </button>
        </form>

        {/* Quick Click Recent Orders */}
        {recentOrders.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-1">
            <span className="text-[#53685C] shrink-0 font-medium">Récents :</span>
            {recentOrders.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setSearchNumero(o.numero);
                  setCurrentOrder(o);
                  setNotFoundQuery(null);
                }}
                className={`px-2 py-0.5 rounded-md font-mono transition-colors shrink-0 ${
                  currentOrder?.numero === o.numero
                    ? 'bg-[#1F3D2E] text-[#FAF3E8]'
                    : 'bg-[#FAF3E8] text-[#1F3D2E] border border-[#E5DDD0] hover:bg-[#FAF3E8]'
                }`}
              >
                {o.numero} ({o.clientNom.split(' ')[0]})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* If Order Not Found */}
      {notFoundQuery && !currentOrder && (
        <div className="bg-white rounded-3xl p-8 border border-red-200 text-center space-y-3 shadow-xs">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h3 className="font-serif font-bold text-lg text-[#1F3D2E]">
            Commande « {notFoundQuery} » introuvable
          </h3>
          <p className="text-xs text-[#53685C] max-w-sm mx-auto">
            Veuillez vérifier le numéro inscrit sur votre confirmation ou contacter notre salon au +228 90 00 00 00.
          </p>
          <button
            onClick={onContinueShopping}
            className="bg-[#1F3D2E] text-[#FAF3E8] text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-[#2A4D3B] transition-colors"
          >
            Retourner à la boutique
          </button>
        </div>
      )}

      {/* Main Order Tracking Body */}
      {currentOrder && statusDetails && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Visual Step Timeline */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5DDD0] shadow-xs space-y-6">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE9DF] pb-4">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#C9A24B] tracking-wider block">
                  Statut Actuel
                </span>
                <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#1F3D2E]">
                  {statusDetails.label}
                </h2>
                <p className="text-xs text-[#53685C] mt-1">{statusDetails.desc}</p>
              </div>

              <div className="text-left sm:text-right">
                <span className="font-mono font-bold text-lg text-[#1F3D2E] block">
                  {currentOrder.numero}
                </span>
                <span className="text-[11px] text-[#53685C]">
                  Commandé le {new Date(currentOrder.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Stepper Progression Bar */}
            <div className="py-4">
              <div className="relative">
                {/* Connecting line */}
                <div className="absolute top-5 left-6 right-6 h-1 bg-[#FAF3E8] -z-0 rounded-full">
                  <div
                    className="h-full bg-[#1F3D2E] rounded-full transition-all duration-500"
                    style={{ width: `${((currentStep - 1) / (ORDER_PIPELINE.length - 1)) * 100}%` }}
                  />
                </div>

                {/* Steps */}
                <div className="grid grid-cols-5 relative z-10">
                  {ORDER_PIPELINE.map((step, idx) => {
                    const stepNumber = idx + 1;
                    const isPassed = stepNumber <= currentStep;
                    const isCurrent = stepNumber === currentStep;

                    return (
                      <div key={step.key} className="flex flex-col items-center text-center">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all shadow-xs ${
                            isCurrent
                              ? 'bg-[#1F3D2E] text-[#FAF3E8] ring-4 ring-[#FAF3E8] scale-110'
                              : isPassed
                              ? 'bg-[#1F3D2E] text-[#FAF3E8]'
                              : 'bg-white border-2 border-[#E5DDD0] text-stone-400'
                          }`}
                        >
                          {isPassed && !isCurrent ? (
                            <CheckCircle2 className="w-5 h-5 text-[#C9A24B]" />
                          ) : (
                            <span>{step.icon}</span>
                          )}
                        </div>

                        <span
                          className={`text-[11px] mt-2 font-medium leading-tight max-w-[80px] ${
                            isCurrent
                              ? 'font-bold text-[#1F3D2E]'
                              : isPassed
                              ? 'text-[#1F3D2E]'
                              : 'text-stone-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer & Reception Info */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5DDD0] shadow-xs space-y-4">
              <h3 className="font-serif font-bold text-base text-[#1F3D2E] border-b border-[#EFE9DF] pb-3">
                Détails du destinataire & réception
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#53685C]">Client :</span>
                  <span className="font-bold text-[#1F3D2E]">{currentOrder.clientNom}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#53685C]">Téléphone :</span>
                  <span className="font-mono font-bold text-[#1F3D2E]">{currentOrder.clientTel}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#53685C]">Mode de réception :</span>
                  <span className="font-semibold text-[#1F3D2E] flex items-center gap-1">
                    <span>{receptionDetails?.icon}</span>
                    <span>{receptionDetails?.label}</span>
                  </span>
                </div>

                {currentOrder.adresseLivraison && (
                  <div className="pt-1">
                    <span className="text-[#53685C] block mb-1">Adresse de livraison :</span>
                    <p className="bg-[#FAF3E8] p-2.5 rounded-xl border border-[#E5DDD0] text-[#1F3D2E] text-[11px] leading-relaxed">
                      {currentOrder.adresseLivraison}
                    </p>
                  </div>
                )}

                {currentOrder.tableId && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[#53685C]">Numéro de table :</span>
                    <span className="font-mono font-bold text-[#1F3D2E] bg-[#FAF3E8] px-2.5 py-1 rounded-lg border border-[#E5DDD0]">
                      {currentOrder.tableId}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#EFE9DF] flex items-center justify-between">
                  <span className="text-[#53685C]">Paiement :</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${paymentDetails?.badgeClass}`}>
                    {paymentDetails?.label}
                  </span>
                </div>

                {/* Module 9: Reçu Officiel client si paiement PAYE */}
                {currentOrder.statutPaiement === 'PAYE' && (
                  <div className="mt-3 pt-3 border-t border-[#EFE9DF] bg-[#FAF3E8]/80 p-3 rounded-2xl border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#1F3D2E] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Reçu Officiel Disponible
                      </span>
                      <span className="font-mono text-[10px] text-[#C9A24B] font-bold bg-[#1F3D2E] text-[#FAF3E8] px-2 py-0.5 rounded">
                        {currentOrder.recuNumero || `REC-${currentOrder.numero.replace('SO-', '')}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsReceiptModalOpen(true)}
                        className="py-2 px-3 bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#C9A24B]" />
                        <span>Voir Reçu</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadReceiptPdf(currentOrder)}
                        className="py-2 px-3 bg-white hover:bg-stone-50 border border-[#E5DDD0] text-[#1F3D2E] text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-[#C9A24B]" />
                        <span>Télécharger</span>
                      </button>
                    </div>
                  </div>
                )}

                {(currentOrder.modePaiement === 'TMONEY' || currentOrder.modePaiement === 'FLOOZ') && currentOrder.statutPaiement === 'EN_ATTENTE' && (
                  <div className="mt-2 pt-2 border-t border-[#EFE9DF] space-y-2">
                    <p className="text-[10px] text-[#53685C]">
                      Paiement Mobile Money en attente de confirmation par notre équipe après
                      vérification de votre transfert Flooz / TMoney.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Articles in Order */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5DDD0] shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1F3D2E] border-b border-[#EFE9DF] pb-3">
                  Articles dans la commande
                </h3>

                <div className="space-y-2.5 pt-2 max-h-48 overflow-y-auto pr-1 text-xs">
                  {currentOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-[#FAF3E8] text-[#1F3D2E] px-2 py-0.5 rounded border border-[#E5DDD0]">
                          {item.quantite}x
                        </span>
                        <span className="font-medium text-[#1F3D2E]">
                          {item.product?.nom || `Produit #${item.productId}`}
                        </span>
                      </div>
                      <span className="font-serif font-bold text-[#1F3D2E]">
                        {(item.prixUnitaire * item.quantite).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#EFE9DF] pt-3 flex items-center justify-between">
                <span className="font-bold text-sm text-[#1F3D2E]">Montant Total :</span>
                <span className="font-serif font-bold text-xl text-[#1F3D2E]">
                  {currentOrder.total.toLocaleString('fr-FR')}{' '}
                  <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Need Help Footer */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5DDD0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#53685C] shadow-xs">
        <div className="flex items-center gap-2.5">
          <Phone className="w-4 h-4 text-[#C9A24B]" />
          <span>Une question sur votre commande ? Appelez notre salon au <strong>+228 90 00 00 00</strong></span>
        </div>

        <button
          onClick={onContinueShopping}
          className="text-[#1F3D2E] hover:underline font-semibold"
        >
          Continuer vos achats →
        </button>
      </div>

      {/* Module 9: Receipt Modal */}
      {isReceiptModalOpen && currentOrder && (
        <ReceiptModal
          order={currentOrder}
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
        />
      )}

    </div>
  );
};
