/**
 * Signature One — Synchronisation globale (Étape A : polling robuste).
 *
 * Problème résolu : chaque onglet/navigateur gardait son ORDERS_CACHE en
 * mémoire, notifié uniquement en local. Une prise en charge vendeur
 * (POST /orders/:id/claim) n'était donc jamais vue par l'admin sur une
 * autre machine, sauf F5 manuel ou polling 20s jamais démarré après login.
 *
 * Ce module centralise :
 *  - le polling rapide des commandes staff (5s) + focus/visibility refetch ;
 *  - le polling lent des autres domaines (30s) : produits, tables,
 *    dépenses, SMS logs, avis (staff), statut boutique ;
 *  - un bypass anti-tempête : jamais 2 cycles en vol en même temps, tick
 *    sauté si le précédent n'est pas fini, erreurs silencieuses.
 *
 * Étape B (Realtime) : `realtime.ts` appelle `poke()` pour déclencher un
 * cycle immédiat dès qu'un événement Postgres arrive (<1s au lieu de 5s).
 * Le polling reste le filet de sécurité (Realtime peut décrocher).
 */

import { getApiToken } from './api';
import { hydrateOrdersFromBackend, hydrateSmsLogsFromBackend } from './orders';
import { refreshProductsFromBackend } from './products';
import { refreshTablesFromBackend } from './tables';
import { refreshExpensesFromBackend } from './expenses';
import { hydrateReviewsFromBackend } from './reviews';
import { refreshStoreStatus } from './store-settings';

/** Commandes staff : 5s — la prise en charge vendeur → admin doit être vite visible. */
export const FAST_SYNC_MS = 5000;
/** Autres domaines : 30s — catalogue, tables, dépenses, SMS, avis, boutique. */
export const SLOW_SYNC_MS = 30000;

let fastTimer: ReturnType<typeof setInterval> | undefined;
let slowTimer: ReturnType<typeof setInterval> | undefined;
let started = false;
let cycleInFlight = false;
/** Dernier cycle lent exécuté (évite un refresh massif juste après le start). */
let lastSlowRun = 0;

/** Un cycle rapide : commandes (staff JWT uniquement — hydrate est no-op sinon). */
async function fastCycle(): Promise<void> {
  if (cycleInFlight) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  cycleInFlight = true;
  try {
    await hydrateOrdersFromBackend();
  } finally {
    cycleInFlight = false;
  }
}

/** Un cycle lent : tout le reste. */
async function slowCycle(): Promise<void> {
  if (typeof document !== 'undefined' && document.hidden) return;
  try {
    lastSlowRun = Date.now();
    await Promise.allSettled([
      getApiToken() ? hydrateOrdersFromBackend() : Promise.resolve(),
      refreshProductsFromBackend(),
      refreshTablesFromBackend(),
      getApiToken() ? refreshExpensesFromBackend() : Promise.resolve(),
      getApiToken() ? hydrateSmsLogsFromBackend() : Promise.resolve(),
      hydrateReviewsFromBackend(Boolean(getApiToken())),
      refreshStoreStatus(),
    ]);
  } catch {
    // Silencieux : chaque hydrate log déjà son propre warning.
  }
}

/**
 * Déclenche un cycle rapide immédiat (appelé par Realtime ou après une
 * mutation locale). No-op si un cycle est déjà en vol.
 */
export function poke(): void {
  void fastCycle();
}

/** Hydrate tout immédiatement (login, retour focus). */
export async function syncNow(): Promise<void> {
  await fastCycle();
  // Évite le double refresh massif si le cycle lent vient de tourner.
  if (Date.now() - lastSlowRun > SLOW_SYNC_MS / 2) {
    await slowCycle();
  }
}

/** Démarre le polling global. Idempotent (start x N = 1 seul timer). */
export function startGlobalSync(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  // Premier cycle immédiat : l'admin qui se connecte voit l'état frais.
  void syncNow();
  fastTimer = setInterval(() => void fastCycle(), FAST_SYNC_MS);
  slowTimer = setInterval(() => void slowCycle(), SLOW_SYNC_MS);
}

/** Arrête le polling global (logout). Idempotent. */
export function stopGlobalSync(): void {
  started = false;
  if (fastTimer) clearInterval(fastTimer);
  if (slowTimer) clearInterval(slowTimer);
  fastTimer = undefined;
  slowTimer = undefined;
}

/** Le polling tourne-t-il actuellement ? (utile aux tests / debug). */
export function isGlobalSyncRunning(): boolean {
  return started;
}
