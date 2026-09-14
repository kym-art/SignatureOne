import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { subscribeStoreStatus, getStoreStatusCached, isOpenNow } from '../../lib/store-settings';
import { STORE_CONTACT } from '../../lib/config';

/**
 * Bannière d'état de la boutique (Ouverte / Fermée).
 * Affichée en haut de page : si fermée, montre le message informatif
 * (horaires réguliers OU fermeture exceptionnelle de l'admin).
 */
export const StoreStatusBanner: React.FC = () => {
  const [status, setStatus] = useState(getStoreStatusCached());

  useEffect(() => {
    return subscribeStoreStatus((s) => setStatus(s));
  }, []);

  if (!status) return null;

  const openNow = isOpenNow(status);

  if (openNow) {
    return (
      <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 flex items-center gap-1.5 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <Clock className="w-3 h-3" />
        <span>Boutique ouverte — {status.openHour} à {status.closeHour}</span>
      </div>
    );
  }

  const message = status.closedMessage || `Nous sommes fermés. Réouverture à ${status.openHour}.`;
  return (
    <div className="text-[10px] font-semibold text-red-800 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5 flex items-center gap-1.5 shadow-xs">
      <AlertCircle className="w-3 h-3 text-red-600" />
      <span>Boutique fermée — {message}</span>
    </div>
  );
};

/** Panneau informatif plein largeur (utilisé côté boutique/checkout quand fermé). */
export const StoreClosedNotice: React.FC<{ compact?: boolean }> = () => {
  const [status, setStatus] = useState(getStoreStatusCached());

  useEffect(() => {
    return subscribeStoreStatus((s) => setStatus(s));
  }, []);

  if (!status) return null;
  if (isOpenNow(status)) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
      <div className="space-y-1.5">
        <p className="font-bold text-red-900">
          {status.closedEnabled ? 'Fermeture exceptionnelle' : 'Boutique actuellement fermée'}
        </p>
        <p className="text-red-800 leading-relaxed">
          {status.closedMessage || `Nos horaires d'ouverture sont de ${status.openHour} à ${status.closeHour}.`}
        </p>
        <p className="text-red-800">
          Pour toute commande ou information :{' '}
          <a href={STORE_CONTACT.companyPhoneUrl} className="font-bold underline">
            {STORE_CONTACT.companyPhone}
          </a>
        </p>
      </div>
    </div>
  );
};