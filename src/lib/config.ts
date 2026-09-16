/**
 * Signature One — Configuration d'environnement & Feature Flags
 *
 * Contrôle centralisé du comportement de l'application selon l'environnement
 * de build (.env de développement vs .env de production).
 *
 * Les données mockées (produits, commandes, avis, comptes vendeurs, tables)
 * ne doivent être utilisées qu'en développement :
 * - En développement : autorisées pour faciliter la démo & les tests.
 * - En production    : automatiquement désactivées afin de ne jamais mélanger
 *   les données factices avec les données réelles du commerce.
 */

function readEnv(key: string): string | undefined {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch {
    // ignore
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

function getBuildMode(): string | undefined {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE) {
      return (import.meta as any).env.MODE;
    }
  } catch {
    // ignore
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  return undefined;
}

/**
 * Données mockées activées ou non.
 *
 * Surcharge explicite possible via la variable `VITE_USE_MOCK_DATA` (.env) :
 * - `VITE_USE_MOCK_DATA=true`  -> forcées actives
 * - `VITE_USE_MOCK_DATA=false` -> forcées désactivées
 *
 * Par défaut (aucune surcharge) :
 * - `development` -> activées
 * - `production`  -> désactivées (build / .env de production)
 */
export const isMockDataEnabled: boolean = (() => {
  // MOCK DÉSACTIVÉ DÉFINITIVEMENT (décision produit) : aucune donnée mockée,
  // aucun localStorage de données — le backend est l'unique source de vérité.
  // On ignore toute valeur VITE_USE_MOCK_DATA pour éviter tout retour accidentel.
  void readEnv('VITE_USE_MOCK_DATA');
  return false;
})();

// ---------------------------------------------------------------------------
// Comptes Mobile Money officiels de collecte des paiements (Togo)
// ---------------------------------------------------------------------------
/**
 * Numéros réels des deux canaux de paiement Mobile Money du commerce :
 *  - TMONEY : ligne Togocom   → 92530700
 *  - FLOOZ  : ligne Moov Africa → 97080142
 *
 * Surchargeables SANS modification de code via l'environnement Vite (Vercel) :
 *   VITE_TMONEY_PHONE="92530700"
 *   VITE_FLOOZ_PHONE="97080142"
 * (les valeurs ci-dessous sont les repli sûrs si la variable est absente ou
 *  invalide — moins de 8 chiffres).
 */
function normalizeTgDigits(input: string | undefined, fallback: string): string {
  const digits = (input || '').replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(-8) : fallback;
}

/** '92530700' → '+228 92 53 07 00' */
function formatTgPhone(raw: string): string {
  return `+228 ${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 6)} ${raw.slice(6, 8)}`;
}

const TMONEY_RAW = normalizeTgDigits(readEnv('VITE_TMONEY_PHONE'), '92530700');
const FLOOZ_RAW = normalizeTgDigits(readEnv('VITE_FLOOZ_PHONE'), '97080142');

export interface PaymentNumber {
  mode: 'TMONEY' | 'FLOOZ';
  /** Libellé court du canal (ex. « TMoney »). */
  label: string;
  /** Opérateur associé (ex. « Togocom »). */
  operator: string;
  /** Numéro brut à 8 chiffres (copie dans le presse-papier / USSD). */
  raw: string;
  /** Numéro affiché au client : « +228 92 53 07 00 ». */
  display: string;
  /** Lien téléphonique cliquable. */
  tel: string;
}

export const PAYMENT_NUMBERS: Record<'TMONEY' | 'FLOOZ', PaymentNumber> = {
  TMONEY: {
    mode: 'TMONEY',
    label: 'TMoney',
    operator: 'Togocom',
    raw: TMONEY_RAW,
    display: formatTgPhone(TMONEY_RAW),
    tel: `tel:+228${TMONEY_RAW}`,
  },
  FLOOZ: {
    mode: 'FLOOZ',
    label: 'Flooz',
    operator: 'Moov Africa',
    raw: FLOOZ_RAW,
    display: formatTgPhone(FLOOZ_RAW),
    tel: `tel:+228${FLOOZ_RAW}`,
  },
};

/** Numéro Mobile Money à créditer pour un mode de paiement donné. */
export function getPaymentNumber(mode: string): PaymentNumber {
  return mode === 'FLOOZ' ? PAYMENT_NUMBERS.FLOOZ : PAYMENT_NUMBERS.TMONEY;
}

// ---------------------------------------------------------------------------
// Coordonnées officielles Signature One & équipe technique
// Utilisées partout dans l'UI (Footer, bannière, reçus...)
// ---------------------------------------------------------------------------
export const STORE_CONTACT = {
  companyName: 'Signature One',
  /** Ligne principale = compte TMoney (canal de collecte n°1). */
  companyPhone: PAYMENT_NUMBERS.TMONEY.display,
  companyPhoneUrl: PAYMENT_NUMBERS.TMONEY.tel,
  companyCity: 'Lomé, Togo',
  /** Compte de collecte TMoney (Togocom). */
  tmoneyPhone: PAYMENT_NUMBERS.TMONEY.display,
  tmoneyPhoneUrl: PAYMENT_NUMBERS.TMONEY.tel,
  /** Compte de collecte Flooz (Moov Africa). */
  floozPhone: PAYMENT_NUMBERS.FLOOZ.display,
  floozPhoneUrl: PAYMENT_NUMBERS.FLOOZ.tel,
  /** Ligne « contact » imprimée sur les reçus A4 et les tickets de caisse. */
  receiptPhoneLine: `${PAYMENT_NUMBERS.TMONEY.display} (TMoney) • ${PAYMENT_NUMBERS.FLOOZ.display} (Flooz)`,
  developerName: 'KymDevCorp',
  developerPhone: '+228 71 70 41 07',
  developerPhoneUrl: 'tel:+22871704107',
  developerEmail: 'kymdevcorp@gmail.com',
};

/** Horaires d'ouverture par défaut (surchargés par les settings backend). */
export const DEFAULT_STORE_HOURS = {
  openHour: '09:00',
  closeHour: '22:00',
};