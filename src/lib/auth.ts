/**
 * Signature One - Authentication & User Accounts Service
 * Source de vérité : BACKEND (NestJS + Supabase Auth).
 * AUCUNE donnée mockée, PAS d'écriture de comptes en localStorage :
 * la session (JWT signé serveur) reste en localStorage uniquement pour
 * persister l'état de connexion entre les chargements de page.
 */

import { User, AuthSession, LoginCredentials, CreateVendorInput, VendorUserRecord } from '../types';
import { apiFetch, ApiError } from './api';

const STORAGE_SESSION_KEY = 'signature_one_session_v2';

// Generate random secure password for vendors (affichée une seule fois à l'admin)
export function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let pwd = '';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `S1-${pwd}`;
}

// Format phone number to uniform standard
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('00')) {
    return `+${cleaned.substring(2)}`;
  }
  if (!cleaned.startsWith('+') && cleaned.length >= 8) {
    return cleaned.startsWith('228') ? `+${cleaned}` : `+228${cleaned}`;
  }
  return cleaned;
}

// Global Auth State Listeners
type AuthListener = (session: AuthSession | null) => void;
const listeners: Set<AuthListener> = new Set();

export function subscribeAuth(callback: AuthListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyAuthChange(): void {
  const currentSession = getActiveSession();
  listeners.forEach((l) => l(currentSession));
}

// Session retrieval
export function getActiveSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getCurrentUser(): User | null {
  const session = getActiveSession();
  return session ? session.user : null;
}

/**
 * Login — TOUJOURS via le BACKEND (JWT signé serveur, rôle lu dans la
 * table User via service_role). Le mot de passe est vérifié par Supabase
 * Auth. Aucune vérification locale, aucun compte localStorage.
 */
export async function loginWithPhone(credentials: LoginCredentials): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  const phoneFormatted = formatPhoneNumber(credentials.telephone.trim());
  const password = credentials.motDePasse.trim();

  if (!phoneFormatted || !password) {
    return { success: false, error: 'Veuillez saisir votre numéro de téléphone et votre mot de passe.' };
  }

  try {
    const res = await apiFetch<{ token: string; user: { sub: string; telephone: string; role: string; nom: string } }>(
      '/auth/login',
      { method: 'POST', body: { telephone: phoneFormatted, motDePasse: password } }
    );
    const session: AuthSession = {
      user: {
        id: res.user.sub,
        nom: res.user.nom,
        telephone: res.user.telephone,
        role: res.user.role as User['role'],
        actif: true,
        createdAt: new Date().toISOString(),
      },
      token: res.token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    notifyAuthChange();
    return { success: true, session };
  } catch (e) {
    const message =
      e instanceof ApiError ? e.message : 'Service d\'authentification injoignable. Vérifiez que le serveur API est démarré.';
    return { success: false, error: message };
  }
}

/**
 * Log out current session
 */
export async function logout(): Promise<void> {
  // La session est un JWT backend stocké localement : la déconnexion est
  // purement locale (pas de session serveur côté Supabase Auth à révoquer).
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  }
  notifyAuthChange();
}

/**
 * Admin: Get list of all vendors — via BACKEND (GET /api/vendors)
 */
export async function getVendorsList(): Promise<VendorUserRecord[]> {
  try {
    return await apiFetch<VendorUserRecord[]>('/vendors');
  } catch (e) {
    console.error('[auth] getVendorsList failed:', e instanceof ApiError ? e.message : e);
    return [];
  }
}

/**
 * Admin: Create a new Vendor account — via BACKEND.
 * Le backend crée l'utilisateur Supabase Auth (hash) + le profil User.
 */
export async function createVendorAccount(
  input: CreateVendorInput
): Promise<{ success: boolean; user?: VendorUserRecord; tempPassword?: string; error?: string }> {
  const phoneFormatted = formatPhoneNumber(input.telephone.trim());
  const nom = input.nom.trim();
  if (!nom || !phoneFormatted) {
    return { success: false, error: 'Le nom et le numéro de téléphone sont obligatoires.' };
  }

  try {
    const created = await apiFetch<VendorUserRecord & { tempPassword?: string }>('/vendors', {
      method: 'POST',
      body: {
        nom,
        telephone: phoneFormatted,
        motDePasse: input.motDePasse?.trim() || generateRandomPassword(),
      },
    });
    return { success: true, user: created, tempPassword: created.tempPassword };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la création du compte vendeur.';
    return { success: false, error: message };
  }
}

/**
 * Admin: Toggle vendor active status — via BACKEND
 */
export async function toggleVendorStatus(
  vendorId: string
): Promise<{ success: boolean; user?: VendorUserRecord; error?: string }> {
  try {
    const updated = await apiFetch<VendorUserRecord>(`/vendors/${vendorId}/toggle`, { method: 'PATCH' });
    const current = getActiveSession();
    if (current && current.user.id === vendorId && !updated.actif) {
      void logout();
    }
    return { success: true, user: updated };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors du changement de statut.';
    return { success: false, error: message };
  }
}

/**
 * Admin: Reset a vendor's password — via BACKEND
 */
export async function resetVendorPassword(
  vendorId: string
): Promise<{ success: boolean; tempPassword?: string; error?: string }> {
  try {
    const res = await apiFetch<{ tempPassword: string }>(`/vendors/${vendorId}/reset-password`, {
      method: 'PATCH',
    });
    return { success: true, tempPassword: res.tempPassword };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Erreur lors de la réinitialisation du mot de passe.';
    return { success: false, error: message };
  }
}
