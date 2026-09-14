/**
 * Client HTTP vers le backend NestJS (source de vérité pour les actions
 * admin/vendeur). Le JWT retourné par POST /api/auth/login est attaché à
 * chaque requête ; il n'y a AUCUNE écriture directe Supabase depuis le
 * navigateur pour les actions privilégiées (voir audit sécurité).
 */

const configuredApiBase: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || '';

/**
 * Base URL de l'API.
 * - Si VITE_API_URL est défini au build (Vercel), on l'utilise.
 * - Sinon, dans le navigateur on utilise '/api' (same-origin via les
 *   rewrites Vercel) au lieu de 'http://localhost:4000/api' qui est
 *   injoignable en production et cassait le login admin.
 * - En Node/SSR on garde le fallback localhost pour le dev local.
 */
export const API_BASE: string =
  configuredApiBase ||
  (typeof window !== 'undefined' ? '/api' : 'http://localhost:4000/api');

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Récupère le JWT backend stocké par la session courante. */
export function getApiToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('signature_one_session_v2');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return typeof session?.token === 'string' ? session.token : null;
  } catch {
    return null;
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Appel authentifié vers le backend. Lève une ApiError en cas d'échec —
 * l'appelant décide du message utilisateur (jamais de repli silencieux).
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getApiToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Backend injoignable. Vérifiez que le serveur API est démarré.', 0);
  }

  if (!res.ok) {
    let message = `Erreur serveur (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.message === 'string') message = data.message;
      else if (Array.isArray(data?.message)) message = data.message.join(', ');
    } catch {
      // corps non JSON : garder le message par défaut
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as T;
}