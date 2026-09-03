import React, { useState } from 'react';
import {
  History,
  Search,
  Download,
  Calendar,
  UserCheck,
  ShieldCheck,
  CreditCard,
  Printer
} from 'lucide-react';
import { Order } from '../../types';
import { getStatusDetails, getPaymentStatusDetails, getReceptionModeDetails } from '../../lib/orders';
import { exportOrdersToCsv } from '../../lib/exportCsv';
import { ReceiptModal } from '../receipt/ReceiptModal';

interface AdminHistoryViewProps {
  orders: Order[];
}

export const AdminHistoryView: React.FC<AdminHistoryViewProps> = ({ orders }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const filtered = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      o.numero.toLowerCase().includes(q) ||
      o.clientNom.toLowerCase().includes(q) ||
      o.clientTel.includes(q) ||
      (o.vendeur?.nom && o.vendeur.nom.toLowerCase().includes(q))
    );
  });

  return (
    <div id="admin-history-view" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-[#C9A24B] font-semibold mb-1">
            <History className="w-3.5 h-3.5" />
            <span>Traçabilité Globale & Audit</span>
          </div>
          <h2 className="font-serif text-xl font-bold text-[#1F3D2E]">
            Historique Complet des Transactions
          </h2>
          <p className="text-xs text-[#53685C]">
            Journal d'audit détaillé de toutes les ventes, encaissements, modes de livraison et vendeurs responsables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportOrdersToCsv(filtered, 'audit_historique_signature_one')}
            className="bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#C9A24B]" />
            <span>Exporter Audit CSV</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-3xl border border-[#E5DDD0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-[#53685C]">
          Total des enregistrements : <strong>{filtered.length}</strong> transactions
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-[#53685C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher numéro, client, vendeur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF3E8] border border-[#E5DDD0] rounded-xl text-[#1F3D2E] outline-hidden"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5DDD0] rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF3E8] text-[#1F3D2E] font-semibold border-b border-[#E5DDD0]">
              <tr>
                <th className="p-3">Numéro</th>
                <th className="p-3">Date / Heure</th>
                <th className="p-3">Client</th>
                <th className="p-3">Service</th>
                <th className="p-3">Détail Articles</th>
                <th className="p-3">Montant</th>
                <th className="p-3">Règlement</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Vendeur Traitant</th>
                <th className="p-3 text-right">Reçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE9DF]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-xs text-[#53685C]">
                    Aucune transaction trouvée.
                  </td>
                </tr>
              ) : (
                filtered.map((ord) => {
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
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3 font-medium text-[#1F3D2E]">
                        <div>{ord.clientNom}</div>
                        <div className="text-[10px] text-[#53685C] font-mono">{ord.clientTel}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="bg-[#FAF3E8] text-[#1F3D2E] px-2 py-0.5 rounded border border-[#E5DDD0] text-[10px] font-semibold">
                          {reception.label} {ord.tableId ? `(#${ord.tableId})` : ''}
                        </span>
                      </td>
                      <td className="p-3 text-[#53685C] max-w-[200px] truncate">
                        {ord.items.map((i) => `${i.quantite}x ${i.product?.nom || 'Article'}`).join(', ')}
                      </td>
                      <td className="p-3 font-serif font-bold text-[#1F3D2E] whitespace-nowrap">
                        {ord.total.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${payment.badgeClass}`}>
                          {ord.modePaiement} ({payment.label})
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {ord.vendeur?.nom ? (
                          <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                            👤 {ord.vendeur.nom}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[10px] italic">Non assigné</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setReceiptOrder(ord)}
                          className="p-1.5 text-[#53685C] hover:text-[#1F3D2E] hover:bg-[#FAF3E8] rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#C9A24B]" />
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
