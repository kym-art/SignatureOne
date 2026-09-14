import React, { useState, useEffect } from 'react';
import {
  Clock,
  Check,
  AlertCircle,
  CalendarDays,
  DoorClosed,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  subscribeStoreStatus,
  getStoreStatusCached,
  updateStoreSettings,
  isWithinHours,
} from '../../lib/store-settings';
import { StoreStatus } from '../../lib/store-settings';

/**
 * Administration des horaires d'ouverture et de la fermeture exceptionnelle.
 * Source de vérité : backend (GET/PATCH /api/store/settings).
 */
export const AdminStoreSettings: React.FC = () => {
  const [status, setStatus] = useState<StoreStatus | null>(getStoreStatusCached());
  const [openHour, setOpenHour] = useState('09:00');
  const [closeHour, setCloseHour] = useState('22:00');
  const [closedEnabled, setClosedEnabled] = useState(false);
  const [closedMessage, setClosedMessage] = useState('');
  const [closedUntil, setClosedUntil] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeStoreStatus((s) => {
      setStatus(s);
      if (s) {
        setOpenHour(s.openHour);
        setCloseHour(s.closeHour);
        setClosedEnabled(s.closedEnabled);
        setClosedMessage(s.closedMessage || '');
        setClosedUntil(s.closedUntil ? s.closedUntil.slice(0, 16) : '');
      }
    });
    return unsub;
  }, []);

  const handleOpenChange = (e: React.ChangeEvent<HTMLInputElement>) => setOpenHour(e.target.value);
  const handleCloseChange = (e: React.ChangeEvent<HTMLInputElement>) => setCloseHour(e.target.value);

  const handleSave = async () => {
    setFeedback(null);
    setSaving(true);
    try {
      const untilValue = closedUntil ? new Date(closedUntil).toISOString() : null;
      const payload = {
        openHour,
        closeHour,
        closedEnabled,
        closedMessage: closedMessage.trim() || null,
        closedUntil: untilValue,
      };
      const res = await updateStoreSettings(payload);
      setFeedback(res.success
        ? { type: 'success', message: 'Paramètres enregistrés.' }
        : { type: 'error', message: res.error || 'Erreur.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="admin-store-settings" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5DDD0] shadow-xs">
        <div>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1F3D2E]">Horaires & Fermeture</h2>
          <p className="text-xs text-[#53685C] mt-0.5">
            La boutique indique automatiquement son statut aux clients (bandeau « ouvert / fermé »).
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4 text-[#C9A24B]" />
          <span>{saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}</span>
        </button>
      </div>

      {feedback && (
        <div className={`rounded-2xl p-3.5 text-xs flex items-start gap-2.5 border ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
          {feedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* État actuel */}
      <div className="bg-white rounded-3xl p-5 border border-[#E5DDD0] shadow-xs">
        <h3 className="font-serif font-bold text-base text-[#1F3D2E] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#C9A24B]" /> Statut actuel
        </h3>
        <p className="text-xs text-[#53685C] mt-1">
          {status
            ? (isWithinHours(status.openHour, status.closeHour)
                ? '🟢 Actuellement OUVRÉE'
                : '🔴 Actuellement FERMÉE')
            : 'Chargement...'}
          {' '}de {status?.openHour ?? '09:00'} à {status?.closeHour ?? '22:00'}
        </p>
      </div>

      {/* Horaires */}
      <div className="bg-white rounded-3xl p-5 border border-[#E5DDD0] shadow-xs space-y-4">
        <h3 className="font-serif font-bold text-base text-[#1F3D2E] flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#C9A24B]" /> Horaires d'ouverture
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-[#1F3D2E] mb-1">Ouverture</label>
            <input
              type="time"
              value={openHour}
              onChange={handleOpenChange}
              className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl font-mono text-[#1F3D2E] focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#1F3D2E] mb-1">Fermeture</label>
            <input
              type="time"
              value={closeHour}
              onChange={handleCloseChange}
              className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl font-mono text-[#1F3D2E] focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
            />
          </div>
        </div>
      </div>
      {/* Fermeture exceptionnelle */}
      <div className="bg-white rounded-3xl p-5 border border-red-200 shadow-xs space-y-4">
        <h3 className="font-serif font-bold text-base text-[#1F3D2E] flex items-center gap-2">
          <DoorClosed className="w-4 h-4 text-red-600" /> Fermeture exceptionnelle
        </h3>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={closedEnabled}
            onChange={(e) => setClosedEnabled(e.target.checked)}
            className="rounded text-red-700 focus:ring-red-600"
          />
          <span className="font-semibold text-xs text-[#1F3D2E]">
            Fermer exceptionnellement la boutique (en cas d'imprévu)
          </span>
        </label>

        {closedEnabled && (
          <div className="space-y-3 animate-in fade-in">
            <div>
              <label className="block font-semibold text-[#1F3D2E] mb-1 text-xs">
                Message informatif pour les clients
              </label>
              <textarea
                rows={2}
                value={closedMessage}
                onChange={(e) => setClosedMessage(e.target.value)}
                placeholder="Ex : Imprévu, nous fermons exceptionnellement à 19h00 aujourd'hui. Merci de votre compréhension."
                className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl text-xs text-[#1F3D2E] focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1F3D2E] mb-1 text-xs">
                Jusqu'à quand ? (date + heure optionnelles)
              </label>
              <input
                type="datetime-local"
                value={closedUntil}
                onChange={(e) => setClosedUntil(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl font-mono text-xs text-[#1F3D2E] focus:ring-2 focus:ring-[#1F3D2E] outline-hidden"
              />
              <p className="text-[10px] text-[#53685C] mt-1">
                Laissez vide pour fermer au plus tard jusqu'à l'heure de fermeture régulière.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 text-[10px] text-[#53685C] bg-[#FAF3E8] p-3 rounded-xl border border-[#E5DDD0]">
        <Sparkles className="w-3.5 h-3.5 text-[#C9A24B] shrink-0" />
        <span>
          Les vendeurs et clients voient automatiquement le statut mis à jour (bandeau haut de page,
          boutique, tunnel de commande). La commande en ligne est bloquée quand la boutique est fermée.
        </span>
      </div>
    </div>
  );
};