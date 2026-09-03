import React from 'react';
import { Printer, X, CheckCircle, Sparkles, Store, Coffee, Truck } from 'lucide-react';
import { Order } from '../../types';
import { getPaymentStatusDetails, getReceptionModeDetails } from '../../lib/orders';

interface VendeurReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VendeurReceiptModal: React.FC<VendeurReceiptModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  const receptionInfo = getReceptionModeDetails(order.typeCommande);
  const paymentInfo = getPaymentStatusDetails(order.statutPaiement);

  const handlePrint = () => {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) {
      alert('Veuillez autoriser les fenêtres pop-up pour imprimer le ticket.');
      return;
    }

    const itemsHtml = order.items
      .map(
        (i) => `
        <div class="row">
          <span>${i.quantite}x ${i.product?.nom || 'Article'}</span>
          <span>${(i.quantite * i.prixUnitaire).toLocaleString('fr-FR')} F</span>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Ticket ${order.numero} - Signature One</title>
        <style>
          @page { size: 80mm auto; margin: 5mm; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            color: #000;
            font-size: 11px;
            line-height: 1.3;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header { margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 6px; }
          .title { font-size: 14px; font-weight: bold; text-transform: uppercase; }
          .sub { font-size: 9px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .total { font-size: 13px; font-weight: bold; }
          .footer { margin-top: 10px; font-size: 9px; text-align: center; border-top: 1px dashed #000; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header center">
          <div class="title">SIGNATURE ONE</div>
          <div class="sub">Dèguè • Yaourt • Boissons Bio</div>
          <div class="sub">Lomé, Togo • Tél: +228 90 00 00 00</div>
          <div class="divider"></div>
          <div class="bold">REÇU DE CAISSE #${order.numero}</div>
          <div class="sub">${new Date(order.createdAt).toLocaleString('fr-FR')}</div>
        </div>

        <div class="row">
          <span>Client:</span>
          <span class="bold">${order.clientNom}</span>
        </div>
        <div class="row">
          <span>Service:</span>
          <span>${receptionInfo.label} ${order.tableId ? `(#${order.tableId})` : ''}</span>
        </div>
        ${order.vendeur?.nom ? `<div class="row"><span>Vendeur:</span><span>${order.vendeur.nom}</span></div>` : ''}

        <div class="divider"></div>

        ${itemsHtml}

        <div class="divider"></div>

        <div class="row total">
          <span>TOTAL:</span>
          <span>${order.total.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div class="row">
          <span>Règlement:</span>
          <span>${order.modePaiement} (${paymentInfo.label})</span>
        </div>

        <div class="footer">
          <div>Merci de votre visite et bonne dégustation !</div>
          <div>Signature One — L'Artisanat Togolais d'Exception</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white border border-[#E5DDD0] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 relative text-[#1F3D2E]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-[#FAF3E8] hover:bg-stone-200 text-[#53685C] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 border-b border-[#E5DDD0] pb-4">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#C9A24B] bg-[#FAF3E8] px-2.5 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            <span>Ticket de Caisse Vendeur</span>
          </div>
          <h3 className="font-serif font-bold text-xl text-[#1F3D2E]">Signature One</h3>
          <p className="text-[11px] text-[#53685C]">
            Commande <strong className="font-mono text-[#1F3D2E]">{order.numero}</strong> • {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Details Card */}
        <div className="bg-[#FAF3E8]/60 p-4 rounded-2xl border border-[#EFE9DF] space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#53685C]">Client :</span>
            <span className="font-bold text-[#1F3D2E]">{order.clientNom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#53685C]">Service :</span>
            <span className="font-medium text-[#1F3D2E]">{receptionInfo.label} {order.tableId ? `(#${order.tableId})` : ''}</span>
          </div>
          {order.vendeur?.nom && (
            <div className="flex justify-between">
              <span className="text-[#53685C]">Vendeur :</span>
              <span className="font-medium text-[#1F3D2E]">{order.vendeur.nom}</span>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto pr-1 divide-y divide-[#EFE9DF]">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center pt-1.5">
              <div>
                <span className="font-bold text-[#1F3D2E]">{item.quantite}x</span>{' '}
                <span className="text-[#53685C]">{item.product?.nom || 'Article'}</span>
              </div>
              <span className="font-mono font-bold text-[#1F3D2E]">
                {(item.quantite * item.prixUnitaire).toLocaleString('fr-FR')} F
              </span>
            </div>
          ))}
        </div>

        {/* Total & Payment */}
        <div className="pt-3 border-t-2 border-dashed border-[#E5DDD0] space-y-1 text-xs">
          <div className="flex justify-between items-baseline text-sm font-bold text-[#1F3D2E]">
            <span>Net à Payer</span>
            <span className="font-serif text-lg text-[#1F3D2E]">
              {order.total.toLocaleString('fr-FR')} <span className="text-xs text-[#C9A24B]">FCFA</span>
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-[#53685C]">
            <span>Mode de règlement :</span>
            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {order.modePaiement} ({paymentInfo.label})
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-4 bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#C9A24B]" />
            <span>Imprimer Reçu</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-white hover:bg-stone-100 border border-[#E5DDD0] text-[#1F3D2E] font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
