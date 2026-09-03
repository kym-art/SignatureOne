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
  // Le mock n'est JAMAIS actif par défaut (dev comme prod) : il requiert un
  // flag explicite VITE_USE_MOCK_DATA=true. Tout repli silencieux est interdit
  // (voir audit sécurité) — une config manquante doit provoquer une erreur
  // explicite, pas des données fictives.
  return readEnv('VITE_USE_MOCK_DATA') === 'true';
})();