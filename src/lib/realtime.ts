/**
 * Signature One — Temps réel inter-appareils (Étape B : Supabase Realtime).
 *
 * Le polling (`sync.ts`, 5s) garantit la convergence, mais 5s c'est encore
 * perçu comme "pas répercuté". Ce module écoute les changements Postgres
 * via le client anon (clé publique, RLS respectée) et déclenche un
 * re-fetch backend immédiat via `poke()` :
 *
 *   vendeur claim → Postgres → Realtime (~300ms) → admin re-fetch → UI <1s
 *
 * Sécurité :
 *  - Seules les tables de la publication `supabase_realtime` émettent
 *    (migration 20260923000000_enable_realtime) : Product, TableQR, Order.
 *  - Le payload anon de `Order` est restreint aux colonnes non sensibles
 *    (GRANT par colonnes) — on s'en sert comme SIGNAL uniquement, jamais
 *    comme donnée affichée : le re-fetch passe par le backend JWT qui
 *    retourne la ligne complète (vendeur, items, totaux...).
 *  - Tables sensibles (SmsLog, Payment, Expense, Review, User) : aucun
 *    événement anon → elles restent en polling staff (30s).
 *
 * Robustesse : si Supabase n'est pas configuré ou si le channel échoue,
 * on reste silencieux — le polling continue de converger.
 */

import { isSupabaseConfigured, supabase } from './supabase';
import { poke } from './sync';

let channel: { unsubscribe: () => void } | null = null;
let started = false;
/** Anti-tempête : un poke toutes les 800ms max même en rafale d'événements. */
let lastPoke = 0;
const POKE_THROTTLE_MS = 800;

function throttledPoke(): void {
  const now = Date.now();
  if (now - lastPoke < POKE_THROTTLE_MS) return;
  lastPoke = now;
  poke();
}

/**
 * Démarre l'écoute Realtime. Idempotent.
 * À appeler une fois au démarrage (token ou pas : les tables écoutées
 * sont lisibles par l'anon) — le re-fetch staff reste gardé par JWT.
 */
export function startRealtimeSync(): void {
  if (started || typeof window === 'undefined') return;
  if (!isSupabaseConfigured) return;
  started = true;

  try {
    channel = supabase
      .channel('signature-one-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Order' },
        () => throttledPoke(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Product' },
        () => throttledPoke(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'TableQR' },
        () => throttledPoke(),
      )
      .subscribe((status) => {
        // CHANNEL_ERROR / TIMED_OUT / CLOSED → le polling prend le relais,
        // on log en debug uniquement pour ne pas spammer la console prod.
        if (status !== 'SUBSCRIBED') {
          console.debug(`[realtime] statut channel: ${status} — polling en relais.`);
        }
      }) as unknown as { unsubscribe: () => void };
  } catch (e) {
    console.debug('[realtime] démarrage impossible — polling en relais :', e);
    channel = null;
  }
}

/** Arrête l'écoute (tests / HMR). Idempotent. */
export function stopRealtimeSync(): void {
  started = false;
  try {
    channel?.unsubscribe();
  } catch {
    // Ignoré : le polling continue.
  }
  channel = null;
}
