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
// Coordonnées officielles Signature One & équipe technique
// Utilisées partout dans l'UI (Footer, bannière, reçus...)
// ---------------------------------------------------------------------------
export const STORE_CONTACT = {
  companyName: 'Signature One',
  companyPhone: '+228 92 53 07 00',
  companyPhoneUrl: 'tel:+22892530700',
  companyCity: 'Lomé, Togo',
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