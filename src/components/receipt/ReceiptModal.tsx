import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  Sparkles,
  CheckCircle2,
  Share2,
  Store,
  Truck,
  Coffee,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { Order } from '../../types';
import { getPaymentStatusDetails, getReceptionModeDetails } from '../../lib/orders';
import { formatReceiptDate, printReceiptA4, downloadReceiptPdf, generateReceiptForOrder } from '../../lib/receipts';

interface ReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, isOpen, onClose }) => {
  const [formatMode, setFormatMode] = useState<'A4' | 'TICKET'>('A4');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  // Make sure receipt attributes are generated if missing
  if (!order.recuNumero) {
    generateReceiptForOrder(order);
  }

  const receptionInfo = getReceptionModeDetails(order.typeCommande);
  const paymentInfo = getPaymentStatusDetails(order.statutPaiement);
  const recuNumero = order.recuNumero || `REC-${order.numero.replace('SO-', '')}`;
  const dateStr = formatReceiptDate(order.datePaiement || order.createdAt);

  const handleShare = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/commande?numero=${order.numero}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reçu ${recuNumero} - Signature One`,
          text: `Reçu de paiement officiel pour la commande ${order.numero} (${order.total.toLocaleString('fr-FR')} FCFA) - Signature One Lomé`,
          url: shareUrl,
        });
      } catch (e) {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-[#FAF3E8] border border-[#E5DDD0] rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl space-y-6 relative text-[#1F3D2E] my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/80 hover:bg-stone-200 text-[#53685C] transition-colors shadow-xs cursor-pointer"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DDD0] pb-4 pr-8">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1F3D2E] text-[#FAF3E8] flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5 text-[#C9A24B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-xl text-[#1F3D2E]">Reçu Officiel</h3>
                <span className="font-mono text-xs font-bold bg-[#1F3D2E] text-[#FAF3E8] px-2.5 py-0.5 rounded-md">
                  {recuNumero}
                </span>
              </div>
              <p className="text-xs text-[#53685C]">
                Commande <strong className="font-mono text-[#1F3D2E]">{order.numero}</strong> • {dateStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <button
              onClick={() => setFormatMode('A4')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                formatMode === 'A4'
                  ? 'bg-[#1F3D2E] text-[#FAF3E8]'
                  : 'bg-white text-[#53685C] border border-[#E5DDD0] hover:bg-stone-50'
              }`}
            >
              Format A4
            </button>
            <button
              onClick={() => setFormatMode('TICKET')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                formatMode === 'TICKET'
                  ? 'bg-[#1F3D2E] text-[#FAF3E8]'
                  : 'bg-white text-[#53685C] border border-[#E5DDD0] hover:bg-stone-50'
              }`}
            >
              Ticket Caisse
            </button>
          </div>
        </div>

        {/* A4 Document Preview Card */}
        {formatMode === 'A4' ? (
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#E5DDD0] shadow-sm space-y-6 max-h-[55vh] overflow-y-auto">
            
            {/* Header of Receipt */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-[#C9A24B] pb-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#1F3D2E] tracking-tight">Signature One</h2>
                <p className="text-xs font-semibold text-[#C9A24B] tracking-wider uppercase">
                  Le goût qui fait la différence
                </p>
                <p className="text-[11px] text-[#53685C] mt-1 leading-relaxed">
                  Lomé, Togo • Tél : +228 90 00 00 00<br />
                  contact@signatureone.tg
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <div className="text-xs uppercase font-bold text-[#53685C] tracking-wide">
                  Justificatif de Paiement
                </div>
                <div className="font-mono text-base font-bold text-[#1F3D2E]">{recuNumero}</div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Règlement Payé</span>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF3E8]/80 p-4 rounded-xl border border-[#EFE9DF] text-xs">
              <div className="space-y-1.5">
                <div className="font-bold text-[#C9A24B] uppercase tracking-wider text-[10px]">
                  Informations Commande
                </div>
                <div className="flex justify-between">
                  <span className="text-[#53685C]">Commande :</span>
                  <span className="font-mono font-bold text-[#1F3D2E]">{order.numero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#53685C]">Date d'émission :</span>
                  <span className="font-medium text-[#1F3D2E]">{dateStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#53685C]">Type de service :</span>
                  <span className="font-medium text-[#1F3D2E]">
                    {receptionInfo.label} {order.tableId ? `(#${order.tableId})` : ''}
                  </span>
                </div>
                {order.adresseLivraison && (
                  <div className="text-[11px] text-[#53685C] pt-1">
                    <strong>Livraison :</strong> {order.adresseLivraison}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-[#E5DDD0] pt-2 sm:pt-0 sm:pl-4">
                <div className="font-bold text-[#C9A24B] uppercase tracking-wider text-[10px]">
                  Client & Règlement
                </div>
                <div className="flex justify-between">
                  <span className="text-[#53685C]">Client :</span>
                  <span className="font-bold text-[#1F3D2E]">{order.clientNom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#53685C]">Téléphone :</span>
                  <span className="font-mono text-[#1F3D2E]">{order.clientTel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#53685C]">Mode de paiement :</span>
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                    {order.modePaiement}
                  </span>
                </div>
                {order.vendeur?.nom && (
                  <div className="flex justify-between">
                    <span className="text-[#53685C]">Vendeur :</span>
                    <span className="font-medium text-[#1F3D2E]">{order.vendeur.nom}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Articles Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#1F3D2E] text-[#FAF3E8] rounded-lg">
                    <th className="py-2 px-3 text-left rounded-l-lg font-semibold">Article</th>
                    <th className="py-2 px-2 text-center font-semibold">Quantité</th>
                    <th className="py-2 px-3 text-right font-semibold">Prix Unit.</th>
                    <th className="py-2 px-3 text-right rounded-r-lg font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE9DF]">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#1F3D2E]">{item.product?.nom || 'Article'}</div>
                        <div className="text-[10px] text-[#53685C]">{item.product?.format}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#1F3D2E]">{item.quantite}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#53685C]">
                        {item.prixUnitaire.toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1F3D2E]">
                        {(item.quantite * item.prixUnitaire).toLocaleString('fr-FR')} FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Box */}
            <div className="flex justify-end pt-2">
              <div className="bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl p-3.5 w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-[#53685C]">
                  <span>Sous-total :</span>
                  <span className="font-mono">{order.total.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-[#53685C]">
                  <span>Taxes / Service :</span>
                  <span>Inclus</span>
                </div>
                <div className="flex justify-between items-baseline font-bold text-sm text-[#1F3D2E] pt-2 border-t border-[#C9A24B]">
                  <span>Total Net Payé :</span>
                  <span className="font-serif text-base text-[#1F3D2E]">
                    {order.total.toLocaleString('fr-FR')} <span className="text-xs text-[#C9A24B]">FCFA</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Thank You Note */}
            <div className="text-center pt-4 border-t border-dashed border-[#E5DDD0] space-y-1">
              <p className="font-serif italic font-bold text-sm text-[#1F3D2E]">
                "Merci d'avoir choisi Signature One — Le goût qui fait la différence."
              </p>
              <p className="text-[10px] text-[#7A8B7F]">
                Reçu officiel certifié. Conservez ce document pour tout échange ou réclamation.
              </p>
            </div>

          </div>
        ) : (
          /* Thermal Ticket Preview */
          <div className="bg-white rounded-2xl p-5 border border-[#E5DDD0] shadow-sm max-w-sm mx-auto space-y-3 font-mono text-xs max-h-[55vh] overflow-y-auto">
            <div className="text-center border-b border-dashed border-[#1F3D2E] pb-3 space-y-0.5">
              <div className="font-bold text-sm uppercase">SIGNATURE ONE</div>
              <div className="text-[10px] text-stone-600">Dèguè • Yaourt • Boissons Bio</div>
              <div className="text-[10px] text-stone-600">Lomé, Togo • Tél: +228 90 00 00 00</div>
              <div className="text-[11px] font-bold mt-1 text-[#C9A24B]">REÇU #{recuNumero}</div>
              <div className="text-[10px] text-stone-500">{dateStr}</div>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Client:</span>
                <span className="font-bold">{order.clientNom}</span>
              </div>
              <div className="flex justify-between">
                <span>Service:</span>
                <span>{receptionInfo.label} {order.tableId ? `(#${order.tableId})` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span>Commande:</span>
                <span className="font-bold">{order.numero}</span>
              </div>
            </div>

            <div className="border-t border-b border-dashed border-[#1F3D2E] py-2 space-y-1">
              {order.items.map((i) => (
                <div key={i.id} className="flex justify-between text-[11px]">
                  <span>{i.quantite}x {i.product?.nom}</span>
                  <span>{(i.quantite * i.prixUnitaire).toLocaleString('fr-FR')} F</span>
                </div>
              ))}
            </div>

            <div className="pt-1 space-y-1">
              <div className="flex justify-between font-bold text-xs">
                <span>TOTAL PAYÉ:</span>
                <span>{order.total.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-[10px] text-stone-600">
                <span>Mode:</span>
                <span>{order.modePaiement} (PAYÉ)</span>
              </div>
            </div>

            <div className="text-center text-[10px] pt-3 border-t border-dashed border-stone-300 text-stone-500">
              Merci d'avoir choisi Signature One !
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={() => printReceiptA4(order)}
            className="py-3 px-4 bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#C9A24B]" />
            <span>Imprimer Reçu A4</span>
          </button>

          <button
            type="button"
            onClick={() => downloadReceiptPdf(order)}
            className="py-3 px-4 bg-white hover:bg-stone-100 border border-[#E5DDD0] text-[#1F3D2E] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#C9A24B]" />
            <span>Télécharger Reçu</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="py-3 px-4 bg-[#FAF3E8] hover:bg-[#EFE9DF] border border-[#E5DDD0] text-[#1F3D2E] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-[#53685C]" />
            <span>{isCopied ? 'Lien Copié !' : 'Partager'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
