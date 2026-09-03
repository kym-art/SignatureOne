/**
 * Signature One — Client Supabase CÔTÉ SERVEUR uniquement.
 *
 * POURQUOI service_role (et pas anon) :
 * Supabase active la Row Level Security (RLS) par défaut, qui bloque les accès
 * faits avec la clé anon tant qu'aucune policy ne les autorise. Ce module n'est
 * utilisé QUE par du code serveur de confiance (le webhook SMS Node et ses
 * fonctions de rapprochement), qui doit pouvoir lire/écrire les tables
 * (Order, SmsLog...) sans dépendre de policies RLS. service_role contourne RLS
 * par design — c'est le comportement attendu d'un accès serveur.
 *
 * ⚠️ NE PAS importer ce module depuis du code navigateur : il expose une clé
 * privilégiée. Ne pas le remplacer par le client anon (`./supabase`) dans le
 * webhook, sinon les accès seront bloqués par RLS.
 */

import { createClient } from '@supabase/supabase-js';
import { Order, SmsLog, SmsStatus } from '../types';

function readEnvServer(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

function isPlaceholder(value: string): boolean {
  return !value || value.includes('placeholder-project') || value.includes('placeholder');
}

const supabaseUrl =
  readEnvServer('SUPABASE_URL') ||
  readEnvServer('kym_SUPABASE_URL') ||
  readEnvServer('NEXT_PUBLIC_kym_SUPABASE_URL') ||
  readEnvServer('NEXT_PUBLIC_SUPABASE_URL') ||
  readEnvServer('VITE_SUPABASE_URL') ||
  '';

const supabaseServiceRoleKey =
  readEnvServer('SUPABASE_SERVICE_ROLE_KEY') ||
  readEnvServer('kym_SUPABASE_SERVICE_ROLE_KEY') ||
  readEnvServer('kym_SUPABASE_SECRET_KEY') ||
  '';

/**
 * Vrai uniquement si URL + service_role sont présents et non-placeholder.
 * Le webhook retombe sur le mode mock/dev (avec avertissement console) sinon,
 * plutôt que d'utiliser silencieusement la clé anon.
 */
export const isSupabaseServiceConfigured =
  !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseServiceRoleKey);

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ============================================================================
// Fonctions serveur de rapprochement SMS — utilisent la clé service_role.
// ============================================================================

/**
 * Fetch orders directly from Supabase (durable source of truth).
 * Safe to call in Node (webhook). Returns [] + console warning when Supabase
 * service_role n'est pas configuré (jamais de crash, jamais de clé anon).
 */
export async function fetchOrdersServerSide(): Promise<Order[]> {
  if (!isSupabaseServiceConfigured) {
    console.warn('[supabase-server] SUPABASE_SERVICE_ROLE_KEY non configuré : lecture serveur indisponible. Retour [].');
    return [];
  }
  try {
    const { data, error } = await supabaseServer
      .from('Order')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) {
      console.error('[supabase-server] Erreur lecture Order:', error.message);
      return [];
    }
    return (data || []) as Order[];
  } catch (err) {
    console.error('[supabase-server] fetchOrdersServerSide error:', err);
    return [];
  }
}

/**
 * Persist an SMS log directly into Supabase (durable, server-side).
 */
export async function saveSmsLogServerSide(log: Omit<SmsLog, 'id'>): Promise<string | null> {
  if (!isSupabaseServiceConfigured) {
    console.warn('[supabase-server] SUPABASE_SERVICE_ROLE_KEY non configuré : SMS log serveur ignoré.');
    return null;
  }
  try {
    const { data, error } = await supabaseServer
      .from('SmsLog')
      .insert([
        {
          sender: log.sender,
          message: log.message,
          receivedAt: log.receivedAt instanceof Date ? log.receivedAt.toISOString() : log.receivedAt,
          parsedAmount: log.parsedAmount ?? null,
          parsedSender: log.parsedSender ?? null,
          parsedBalance: log.parsedBalance ?? null,
          previousBalance: log.previousBalance ?? null,
          matchedOrderId: log.matchedOrderId ?? null,
          status: log.status,
        },
      ])
      .select('id')
      .single();
    if (error) {
      console.error('[supabase-server] Erreur insertion SmsLog:', error.message);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.error('[supabase-server] saveSmsLogServerSide error:', err);
    return null;
  }
}

/**
 * Update an order's matched-payment metadata in Supabase (server-side).
 */
export async function settleOrderPaymentServerSide(
  orderId: string,
  matched: { raw_text: string; sender: string; received_at: string; matched_amount: number }
): Promise<boolean> {
  if (!isSupabaseServiceConfigured) return false;
  try {
    const { error } = await supabaseServer
      .from('Order')
      .update({
        statutPaiement: 'PAYE',
        statut: 'ACCEPTEE',
        payment_matched_sms: matched,
        datePaiement: new Date().toISOString(),
      })
      .eq('id', orderId);
    if (error) {
      console.error('[supabase-server] Erreur settle payment:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[supabase-server] settleOrderPaymentServerSide error:', err);
    return false;
  }
}

/**
 * Mark an SMS log as matched/unmatched in Supabase (server-side).
 */
export async function updateSmsLogStatusServerSide(
  smsLogId: string,
  status: SmsStatus,
  matchedOrderId?: string
): Promise<void> {
  if (!isSupabaseServiceConfigured || !smsLogId) return;
  try {
    await supabaseServer
      .from('SmsLog')
      .update({ status, matchedOrderId: matchedOrderId ?? null })
      .eq('id', smsLogId);
  } catch (err) {
    console.error('[supabase-server] updateSmsLogStatusServerSide error:', err);
  }
}