/**
 * Signature One — Admin SMS Logs & Payment Reconciliation
 *
 * Lists all incoming Mobile Money SMS (matched and unmatched) for supervision
 * and provides a manual fallback to validate a payment when the automatic
 * matching failed or was ambiguous.
 *
 * This component is client-side only and reads/writes the SMS logs plus
 * orders from the shared local store (see lib/orders.ts).
 */
import React, { useState } from 'react';
import {
  Inbox,
  MessageSquare,
  CheckCircle2,
  Info,
  RotateCcw,
  Phone,
  Wallet,
} from 'lucide-react';
import {
  getAllSmsLogs,
  getAllOrders,
  confirmPayment,
  reconcilePaymentFromSms,
} from '../../lib/orders';
import { SmsLog, Order } from '../../types';

const STATUS_LABEL: Record<SmsLog['status'], { label: string; badge: string }> = {
  PENDING: { label: 'En attente', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
  MATCHED: { label: 'Apparié', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  UNMATCHED: { label: 'Non apparié', badge: 'bg-rose-100 text-rose-900 border-rose-300' },
  ERROR: { label: 'Erreur', badge: 'bg-stone-100 text-stone-900 border-stone-300' },
};

export const AdminSmsLogsManagement: React.FC = () => {
  const [logs, setLogs] = useState<SmsLog[]>(getAllSmsLogs());
  const [orders] = useState<Order[]>(getAllOrders());
  const [message, setMessage] = useState<string | null>(null);

  const refresh = () => setLogs(getAllSmsLogs());

  const handleManualValidate = async (log: SmsLog) => {
    const amount = log.parsedAmount ?? 0;
    const candidates = orders.filter(
      (o) => o.total === amount && o.statutPaiement === 'EN_ATTENTE'
    );

    if (candidates.length !== 1) {
      setMessage(
        candidates.length === 0
          ? `⚠️ Aucune commande en attente de ${amount} FCFA trouvée.`
          : `⚠️ ${candidates.length} commandes correspondent à ${amount} FCFA — sélectionnez la commande directement dans "Commandes".`
      );
      return;
    }

    const res = await confirmPayment(candidates[0].id);
    setMessage(
      res.success
        ? `✅ Paiement validé pour la commande ${candidates[0].numero}.`
        : `❌ ${res.error}`
    );
    refresh();
  };

  const handleForceReconcile = (log: SmsLog) => {
    const amount = log.parsedAmount ?? 0;
    const outcome = reconcilePaymentFromSms(log.id || '', amount);
    if (outcome === 'matched') setMessage('✅ Paiement apparié et confirmé automatiquement.');
    else if (outcome === 'ambiguous') setMessage('⚠️ Ambiguïté détectée — validation manuelle requise.');
    else setMessage('❌ Aucun match (montant sans commande en attente).');
    refresh();
  };
return (
    <div className="bg-white rounded-3xl p-6 border border-[#E5DDD0] shadow-xs">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-serif font-bold text-lg text-[#1F3D2E] flex items-center gap-2">
            <Inbox className="w-5 h-5 text-[#C9A24B]" /> SMS reçus (Mobile Money)
          </h2>
          <p className="text-xs text-[#53685C] mt-1">
            Rapprochement automatique des paiements Flooz / TMoney. Validation manuelle en secours.
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-xs font-bold text-[#1F3D2E] bg-[#FAF3E8] border border-[#E5DDD0] px-3 py-1.5 rounded-xl hover:bg-[#EFE9DF] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>

      {message && (
        <div className="mb-4 text-xs font-semibold bg-[#FAF3E8] border border-[#C9A24B]/40 text-[#1F3D2E] rounded-xl px-3 py-2">
          {message}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-12 text-[#53685C]">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#C9A24B]/50" />
          <p className="text-sm">Aucun SMS reçu pour le moment.</p>
          <p className="text-xs mt-1">Les notifications de transfert Mobile Money apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const status = STATUS_LABEL[log.status] || STATUS_LABEL.ERROR;
            return (
              <div
                key={log.id}
                className="border border-[#E5DDD0] rounded-2xl p-4 text-xs space-y-2"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${status.badge}`}>
                      {status.label}
                    </span>
                    {log.matchedOrderId && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
                        Commande liée
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#53685C]">
                    {new Date(log.receivedAt as string).toLocaleString('fr-FR')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[#53685C]">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="font-mono">{log.sender}</span>
                  {log.parsedAmount != null && (
                    <span className="flex items-center gap-1 font-bold text-[#1F3D2E] ml-auto">
                      <Wallet className="w-3.5 h-3.5 text-[#C9A24B]" />
                      {log.parsedAmount.toLocaleString('fr-FR')} FCFA
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#53685C] bg-[#F8F5EF] rounded-lg p-2 border border-[#EFE9DF] whitespace-pre-wrap break-words">
                  {log.message}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleManualValidate(log)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-[#FAF3E8] bg-[#1F3D2E] hover:bg-[#2A4D3B] px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valider paiement reçu
                  </button>
                  {log.status === 'PENDING' && (
                    <button
                      onClick={() => handleForceReconcile(log)}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-[#1F3D2E] bg-[#FAF3E8] border border-[#E5DDD0] px-3 py-1.5 rounded-lg hover:bg-[#EFE9DF] transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" /> Relancer l'appariement
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};