/**
 * Signature One — Paramètres magasin (horaires, fermeture exceptionnelle).
 * Source de vérité : GET/PATCH /api/store/settings (backend).
 */

import { apiFetch, ApiError } from './api';
import { DEFAULT_STORE_HOURS } from './config';

export interface StoreStatus {
  isOpen: boolean;
  openHour: string;
  closeHour: string;
  closedEnabled: boolean;
  closedMessage: string | null;
  closedUntil: string | null;
  reason?: string | null;
}

export interface UpdateStoreSettingsInput {
  openHour?: string;
  closeHour?: string;
  closedEnabled?: boolean;
  closedMessage?: string | null;
  closedUntil?: string | null;
}

// Cache mémoire partagé pour que toutes les vues utilisent le même état.
let storeStatusCache: StoreStatus | null = null;
type StoreStatusListener = (status: StoreStatus | null) => void;
const storeStatusListeners: Set<StoreStatusListener> = new Set();

export function subscribeStoreStatus(listener: StoreStatusListener): () => void {
  storeStatusListeners.add(listener);
  listener(storeStatusCache);
  return () => {
    storeStatusListeners.delete(listener);
  };
}

function notifyStoreStatus(): void {
  storeStatusListeners.forEach((l) => l(storeStatusCache));
}

/** getter synchrone pour l'UI (retourne le cache, ou null si pas encore chargé). */
export function getStoreStatusCached(): StoreStatus | null {
  return storeStatusCache;
}

/**
 * Charge l'état ouvert/fermé + horaires depuis le backend.
 * Silencieux si impossible (le défaut reste 09h–22h, boutique ouverte).
 */
export async function refreshStoreStatus(): Promise<void> {
  try {
    const status = await apiFetch<StoreStatus>('/store/settings');
    storeStatusCache = status;
  } catch (e) {
    console.warn('[store-settings] refreshStoreStatus:', e instanceof ApiError ? e.message : e);
    storeStatusCache = {
      isOpen: true,
      openHour: DEFAULT_STORE_HOURS.openHour,
      closeHour: DEFAULT_STORE_HOURS.closeHour,
      closedEnabled: false,
      closedMessage: null,
      closedUntil: null,
    };
  }
  notifyStoreStatus();
}

/** Met à jour les settings (ADMIN) — PATCH /api/store/settings */
export async function updateStoreSettings(
  input: UpdateStoreSettingsInput
): Promise<{ success: boolean; status?: StoreStatus; error?: string }> {
  try {
    const updated = await apiFetch<StoreStatus>('/store/settings', {
      method: 'PATCH',
      body: input,
    });
    storeStatusCache = updated;
    notifyStoreStatus();
    return { success: true, status: updated };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la mise à jour des paramètres.';
    return { success: false, error: message };
  }
}

/** Détermine si la boutique est ouverte à une heure donnée (utilitaire). */
export function isWithinHours(openHour: string, closeHour: string, at: Date = new Date()): boolean {
  const today = at.toISOString().slice(0, 10);
  const open = new Date(`${today}T${openHour}:00`);
  const close = new Date(`${today}T${closeHour}:00`);
  return at >= open && at < close;
}

/**
 * Décision finale d'ouverture, cohérente avec le backend (computeStatus) :
 *  - horaires réguliers : ouvert entre openHour et closeHour ;
 *  - fermeture exceptionnelle activée :
 *      • sans date de fin  → fermé jusqu'à réouverture manuelle par l'admin ;
 *      • avec date de fin  → fermé jusqu'à cette date/heure.
 * Statut pas encore chargé → true (ne bloque pas l'UI ; la garde backend protège).
 */
export function isOpenNow(status: StoreStatus | null): boolean {
  if (!status) return true;
  if (!isWithinHours(status.openHour, status.closeHour)) return false;
  if (status.closedEnabled) {
    if (!status.closedUntil) return false;
    if (new Date() < new Date(status.closedUntil)) return false;
  }
  return true;
}