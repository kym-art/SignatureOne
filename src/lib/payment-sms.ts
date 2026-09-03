/**
 * Signature One — Mobile Money Payment SMS Parser (Togo)
 *
 * Parses incoming SMS from Flooz / YAS / Moov Money merchants and matches
 * them against pending orders.
 *
 * Expected SMS format (Togolese Mobile Money providers):
 *   "Montant recu: <amount> de <sender> le <date>, frais <fees>,
 *    nouveau solde <balance>, reference <ref>"
 */

import { Order } from '../types';

// Regex to extract amount / sender / balance from Togolese MM SMS
const SMS_REGEX =
  /Montant\s+recu:\s*(\d+)\s+de\s+([+\d]+)\s+.*?nouveau\s+solde\s*:?\s*(\d+)/i;

export function parseSms(
  message: string
): { amount: number; sender: string; balance: number } | null {
  const match = message.match(SMS_REGEX);
  if (!match) return null;

  return {
    amount: parseInt(match[1], 10),
    sender: match[2],
    balance: parseInt(match[3], 10),
  };
}

/**
 * Find orders that are awaiting payment and match the given amount.
 *
 * In the current MVP, we match solely on exact amount match to avoid false
 * positives. Future versions may also include the sender's phone number
 * in the libellé to further disambiguate.
 */
export function findMatchingOrders(
  orders: Order[],
  amount: number,
  clientTel?: string
): Order[] {
  return orders.filter(
    (o) => o.total === amount && o.statutPaiement === 'EN_ATTENTE'
  );
}