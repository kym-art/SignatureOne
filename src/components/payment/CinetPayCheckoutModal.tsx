import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ChevronRight
} from 'lucide-react';
import { Order } from '../../types';
import {
  initiateCinetPayPayment,
  simulateCinetPayCheckoutSuccess,
  getCinetPayConfig,
  CinetPayPaymentInit
} from '../../lib/cinetpay';

interface CinetPayCheckoutModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (order: Order) => void;
}

export const CinetPayCheckoutModal: React.FC<CinetPayCheckoutModalProps> = ({
  order,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'TMONEY' | 'FLOOZ'>(
    order.modePaiement === 'FLOOZ' ? 'FLOOZ' : 'TMONEY'
  );
  const [paymentInit, setPaymentInit] = useState<CinetPayPaymentInit | null>(null);
  const [step, setStep] = useState<'SELECT' | 'CONFIRM' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('CONFIRM');
  const [phoneNumber, setPhoneNumber] = useState<string>(order.clientTel);
  const [otpCode, setOtpCode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && order) {
      const res = initiateCinetPayPayment(order, selectedChannel);
      if (res.success && res.paymentInit) {
        setPaymentInit(res.paymentInit);
      }
      setStep('CONFIRM');
      setErrorMessage(null);
    }
  }, [isOpen, order, selectedChannel]);

  if (!isOpen || !order) return null;

  const handleStartPayment = () => {
    // Le paiement réel (API CinetPay + webhook serveur) n'est pas encore
    // implémenté : la simulation est réservée à la sandbox.
    if (!getCinetPayConfig().sandbox) {
      setErrorMessage(
        "Le paiement en ligne n'est pas encore disponible. Veuillez régler votre commande par un autre moyen."
      );
      return;
    }

    if (!phoneNumber.trim()) {
      setErrorMessage('Veuillez renseigner votre numéro de téléphone.');
      return;
    }

    setStep('PROCESSING');
    setErrorMessage(null);

    // Simulate CinetPay Mobile Money prompt with network delay
    setTimeout(() => {
      if (!paymentInit) return;

      const { webhookResult } = simulateCinetPayCheckoutSuccess(paymentInit, selectedChannel);

      if (webhookResult.success) {
        setStep('SUCCESS');
        setTimeout(() => {
          onPaymentSuccess({ ...order, statutPaiement: 'PAYE' });
        }, 1800);
      } else {
        setErrorMessage(webhookResult.message);
        setStep('ERROR');
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-[#E5DDD0] shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-[#1F3D2E] text-[#FAF3E8] p-5 flex items-center justify-between border-b border-[#C9A24B]/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FAF3E8]/15 border border-[#C9A24B]/40 flex items-center justify-center text-[#C9A24B]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base text-[#FAF3E8]">
                  Paiement Sécurisé CinetPay
                </h3>
              </div>
              <p className="text-[11px] text-[#FAF3E8]/80">Passerelle Mobile Money Togo (Flooz / TMoney)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#FAF3E8]/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          
          {/* Order & Amount Recap */}
          <div className="bg-[#FAF3E8] p-4 rounded-2xl border border-[#E5DDD0] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#53685C] block">Commande à régler</span>
              <span className="font-mono font-bold text-sm text-[#1F3D2E]">{order.numero}</span>
              <span className="text-[11px] text-[#53685C] block">{order.clientNom}</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-[#53685C] block">Montant Total</span>
              <span className="font-serif font-bold text-xl text-[#1F3D2E]">
                {order.total.toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
              </span>
            </div>
          </div>

          {/* Payment Method Selector (Flooz vs TMoney) */}
          <div className="space-y-2">
            <label className="font-semibold text-[#1F3D2E] block">
              Sélectionnez votre opérateur Mobile Money :
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedChannel('TMONEY')}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  selectedChannel === 'TMONEY'
                    ? 'border-[#1F3D2E] bg-[#1F3D2E]/5 shadow-xs'
                    : 'border-[#E5DDD0] bg-white hover:border-[#53685C]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                  T
                </div>
                <div>
                  <span className="font-bold text-[#1F3D2E] block">TMoney</span>
                  <span className="text-[10px] text-[#53685C]">Togocom (*145#)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedChannel('FLOOZ')}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  selectedChannel === 'FLOOZ'
                    ? 'border-[#1F3D2E] bg-[#1F3D2E]/5 shadow-xs'
                    : 'border-[#E5DDD0] bg-white hover:border-[#53685C]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                  F
                </div>
                <div>
                  <span className="font-bold text-[#1F3D2E] block">Flooz</span>
                  <span className="text-[10px] text-[#53685C]">Moov Africa (*155#)</span>
                </div>
              </button>
            </div>
          </div>

          {/* Phone Number Input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[#1F3D2E] block">
              Numéro de téléphone {selectedChannel} :
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#53685C]" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+228 90 00 00 00"
                className="w-full pl-10 pr-3 py-2.5 bg-[#FAF3E8]/40 border border-[#E5DDD0] rounded-xl font-mono text-xs font-semibold text-[#1F3D2E] focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
              />
            </div>
          </div>

          {/* Processing State */}
          {step === 'PROCESSING' && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-2 animate-in fade-in">
              <RefreshCw className="w-6 h-6 text-amber-700 animate-spin mx-auto" />
              <p className="font-bold text-amber-900">Demande de paiement envoyée au téléphone...</p>
              <p className="text-[11px] text-amber-800">
                Veuillez valider le débit sur votre mobile ({selectedChannel}) en saisissant votre code secret.
              </p>
            </div>
          )}

          {/* Success State */}
          {step === 'SUCCESS' && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2 animate-in fade-in">
              <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
              <p className="font-serif font-bold text-sm text-emerald-950">Paiement Validé par CinetPay !</p>
              <p className="text-[11px] text-emerald-800">
                Le statut de la commande {order.numero} est passé à <strong>PAYE</strong>.
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-stone-50 p-4 border-t border-[#E5DDD0] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-[#53685C] hover:text-[#1F3D2E] transition-colors"
          >
            Payer plus tard
          </button>

          <button
            type="button"
            disabled={step === 'PROCESSING' || step === 'SUCCESS'}
            onClick={handleStartPayment}
            className="bg-[#1F3D2E] hover:bg-[#2A4D3B] disabled:bg-stone-300 text-[#FAF3E8] font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <span>Payer {order.total.toLocaleString('fr-FR')} FCFA</span>
            <ChevronRight className="w-4 h-4 text-[#C9A24B]" />
          </button>
        </div>

      </div>
    </div>
  );
};
