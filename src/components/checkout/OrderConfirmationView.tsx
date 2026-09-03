import React, { useState } from 'react';
import {
  CheckCircle,
  Copy,
  Check,
  ArrowRight,
  ShoppingBag,
  Clock,
  Phone,
  Store,
  MapPin,
  QrCode,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { Order } from '../../types';
import { getStatusDetails, getPaymentStatusDetails, getReceptionModeDetails, getAllOrders } from '../../lib/orders';

interface OrderConfirmationViewProps {
  order: Order | null;
  onTrackOrder: (numero: string) => void;
  onContinueShopping: () => void;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({
  order: propOrder,
  onTrackOrder,
  onContinueShopping,
}) => {
  const [currentOrder, setCurrentOrder] = useState<Order | null>(() => {
    if (propOrder) return propOrder;
    const all = getAllOrders();
    return all.length > 0 ? all[0] : null;
  });
  const [copied, setCopied] = useState<boolean>(false);

  if (!currentOrder) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4 bg-white p-8 rounded-3xl border border-[#E5DDD0]">
        <ShoppingBag className="w-12 h-12 text-[#C9A24B] mx-auto" />
        <h2 className="font-serif text-xl font-bold text-[#1F3D2E]">Aucune commande active</h2>
        <p className="text-xs text-[#53685C]">Vous n'avez pas encore passé de commande ou votre session a expiré.</p>
        <button
          onClick={onContinueShopping}
          className="px-6 py-3 bg-[#1F3D2E] text-[#FAF3E8] font-bold text-xs rounded-xl"
        >
          Découvrir la boutique
        </button>
      </div>
    );
  }

  const order = currentOrder;
  const statusInfo = getStatusDetails(order.statut);
  const paymentInfo = getPaymentStatusDetails(order.statutPaiement);
  const receptionInfo = getReceptionModeDetails(order.typeCommande);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(order.numero);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div id="order-confirmation-container" className="max-w-3xl mx-auto space-y-8 pb-16">
      
      {/* Top Banner Reassurance */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5DDD0] shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#1F3D2E] text-[#FAF3E8] flex items-center justify-center mx-auto shadow-md">
          <CheckCircle className="w-8 h-8 text-[#C9A24B]" />
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-[#C9A24B] tracking-wider uppercase">
            Commande Enregistrée avec Succès
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F3D2E]">
            Merci pour votre commande, {order.clientNom} !
          </h1>
          <p className="text-xs sm:text-sm text-[#53685C] max-w-md mx-auto">
            Votre commande a été transmise à notre atelier. Vous pouvez la suivre en direct grâce à votre numéro unique.
          </p>
        </div>

        {/* Order Number Badge */}
        <div className="inline-flex items-center gap-3 bg-[#FAF3E8] border border-[#C9A24B]/40 px-5 py-3 rounded-2xl shadow-xs">
          <div>
            <span className="text-[10px] text-[#53685C] uppercase tracking-wider block text-left">
              Numéro de commande
            </span>
            <span className="font-mono font-bold text-xl text-[#1F3D2E] tracking-wider">
              {order.numero}
            </span>
          </div>

          <button
            onClick={handleCopy}
            title="Copier le numéro"
            className="p-2 bg-white rounded-xl border border-[#E5DDD0] text-[#1F3D2E] hover:bg-[#1F3D2E] hover:text-[#FAF3E8] transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Status & Payment Overview */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5DDD0] shadow-xs space-y-4">
          <h2 className="font-serif font-bold text-base text-[#1F3D2E] border-b border-[#EFE9DF] pb-3">
            Statut & Paiement
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] text-[#53685C] block mb-1">Statut de la préparation</span>
              <span className={`inline-block px-3 py-1 rounded-lg border font-semibold ${statusInfo.colorClass}`}>
                {statusInfo.label}
              </span>
              <p className="text-[11px] text-[#53685C] mt-1.5">{statusInfo.desc}</p>
            </div>

            <div className="pt-2 border-t border-[#EFE9DF]">
              <span className="text-[10px] text-[#53685C] block mb-1">Mode & Statut de paiement</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1F3D2E]">
                  {order.modePaiement === 'TMONEY' && 'TMoney (Togocom)'}
                  {order.modePaiement === 'FLOOZ' && 'Flooz (Moov Money)'}
                  {order.modePaiement === 'LIVRAISON' && 'Paiement à la livraison'}
                  {order.modePaiement === 'SUR_PLACE' && 'Paiement sur place'}
                </span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${paymentInfo.badgeClass}`}>
                  {paymentInfo.label}
                </span>
              </div>

              {/* Paiement Mobile Money : validation manuelle par l'administrateur */}
              {(order.modePaiement === 'TMONEY' || order.modePaiement === 'FLOOZ') && order.statutPaiement === 'EN_ATTENTE' && (
                <div className="mt-3 p-3 bg-[#FAF3E8] rounded-xl border border-[#C9A24B]/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1F3D2E]">
                    <Clock className="w-3.5 h-3.5 text-[#C9A24B]" />
                    <span>Paiement Mobile Money en attente de confirmation</span>
                  </div>
                  <p className="text-[10px] text-[#53685C]">
                    Après votre transfert Flooz ou TMoney, notre équipe vérifie la réception du paiement et
                    valide votre commande. Le paiement en ligne automatisé arrivera bientôt.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#EFE9DF]">
              <span className="text-[10px] text-[#53685C] block mb-1">Mode de réception</span>
              <div className="flex items-center gap-1.5 font-semibold text-[#1F3D2E]">
                <span>{receptionInfo.icon}</span>
                <span>{receptionInfo.label}</span>
              </div>
              {order.adresseLivraison && (
                <p className="text-[11px] text-[#53685C] mt-1 bg-[#FAF3E8] p-2 rounded-lg border border-[#E5DDD0]">
                  {order.adresseLivraison}
                </p>
              )}
              {order.tableId && (
                <p className="text-[11px] text-[#1F3D2E] font-bold mt-1 bg-[#FAF3E8] px-2 py-1 rounded-lg inline-block border border-[#E5DDD0]">
                  {order.tableId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Ordered Articles Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5DDD0] shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="font-serif font-bold text-base text-[#1F3D2E] border-b border-[#EFE9DF] pb-3">
              Articles commandés
            </h2>

            <div className="space-y-2.5 pt-2 max-h-52 overflow-y-auto pr-1 text-xs">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold bg-[#FAF3E8] text-[#1F3D2E] px-2 py-0.5 rounded border border-[#E5DDD0]">
                      {item.quantite}x
                    </span>
                    <span className="text-[#1F3D2E] font-medium">
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
            <span className="font-serif font-bold text-sm text-[#1F3D2E]">Total Payé / Dû</span>
            <span className="font-serif font-bold text-xl text-[#1F3D2E]">
              {order.total.toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
            </span>
          </div>
        </div>

      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-2">
        <button
          id="btn-goto-tracking"
          onClick={() => onTrackOrder(order.numero)}
          className="w-full sm:w-auto bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
        >
          <span>Suivre ma commande en direct</span>
          <ArrowRight className="w-4 h-4 text-[#C9A24B]" />
        </button>

        <button
          onClick={onContinueShopping}
          className="w-full sm:w-auto bg-white border border-[#E5DDD0] text-[#1F3D2E] hover:bg-[#FAF3E8] font-semibold text-xs sm:text-sm px-6 py-3.5 rounded-xl transition-colors"
        >
          Retourner à la boutique
        </button>
      </div>

    </div>
  );
};
