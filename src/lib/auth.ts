/**
 * Signature One - Authentication & User Accounts Service (Module 2)
 * Manages Admin & Vendeur accounts, session persistence, route authorization, and password resets.
 */

import { User, Role, AuthSession, LoginCredentials, CreateVendorInput, VendorUserRecord } from '../types';
import { isMockDataEnabled } from './config';
import { apiFetch, ApiError } from './api';

const STORAGE_USERS_KEY = 'signature_one_users_v2';
const STORAGE_SESSION_KEY = 'signature_one_session_v2';

// Default seeded accounts for Module 2 initial testing
const INITIAL_USERS: VendorUserRecord[] = [
  {
    id: 'usr_admin_01',
    role: 'ADMIN',
    nom: 'Directeur Signature One',
    telephone: '+22890000000',
    actif: true,
    motDePasseHash: 'Admin@Signature1',
    createdAt: '2026-08-20T10:00:00.000Z',
  },
  {
    id: 'usr_vendeur_01',
    role: 'VENDEUR',
    nom: 'Koffi Vendeur Comptoir 1',
    telephone: '+22891000000',
    actif: true,
    motDePasseHash: 'Vendeur@123',
    createdAt: '2026-08-21T11:30:00.000Z',
  },
  {
    id: 'usr_vendeur_02',
    role: 'VENDEUR',
    nom: 'Afi Vendeuse Boutique 2',
    telephone: '+22892000000',
    actif: true,
    motDePasseHash: 'Vendeur@123',
    createdAt: '2026-08-22T09:15:00.000Z',
  },
  {
    id: 'usr_vendeur_inactive',
    role: 'VENDEUR',
    nom: 'Ancien Vendeur (Désactivé)',
    telephone: '+22893000000',
    actif: false,
    motDePasseHash: 'Vendeur@123',
    createdAt: '2026-08-15T08:00:00.000Z',
  }
];

// Helper to load users from localStorage with initial fallback
function loadUsers(): VendorUserRecord[] {
  if (typeof window === 'undefined') return isMockDataEnabled ? INITIAL_USERS : [];
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      if (isMockDataEnabled) {
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_USERS));
      }
      return isMockDataEnabled ? INITIAL_USERS : [];
    }
    return JSON.parse(raw);
  } catch {
    return isMockDataEnabled ? INITIAL_USERS : [];
  }
}

function saveUsers(users: VendorUserRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    notifyAuthChange();
  } catch (e) {
    console.error('Failed to persist users:', e);
  }
}

// Generate random secure password for vendors
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
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('00')) {
    return `+${cleaned.substring(2)}`;
  }
  if (!cleaned.startsWith('+') && cleaned.length >= 8) {
    // Default Togo country code if missing
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
 * Log in with phone number and password
 */
export async function loginWithPhone(credentials: LoginCredentials): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  const phoneFormatted = formatPhoneNumber(credentials.telephone.trim());
  const password = credentials.motDePasse.trim();

  if (!phoneFormatted || !password) {
    return { success: false, error: 'Veuillez saisir votre numéro de téléphone et votre mot de passe.' };
  }

  // 1. Chemin principal : authentification par le BACKEND (JWT signé serveur,
  //    rôle lu dans la table User via service_role). Aucune vérification côté
  //    client n'est décisionnaire.
  if (!isMockDataEnabled) {
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

  // 2. Mode mock EXPLICITE uniquement (VITE_USE_MOCK_DATA=true) : comptes de
  //    démo locaux. Aucun repli silencieux possible ici.
  const users = loadUsers();
  const foundUser = users.find(
    (u) => u.telephone === phoneFormatted || u.telephone === credentials.telephone.trim()
  );

  if (!foundUser) {
    return {
      success: false,
      error: 'Identifiants incorrects. Aucun compte n\'est associé à ce numéro de téléphone.',
    };
  }

  if (!foundUser.actif) {
    return {
      success: false,
      error: 'Votre compte a été désactivé par l\'administrateur. Veuillez contacter la direction Signature One.',
    };
  }

  if (foundUser.motDePasseHash !== password) {
    return {
      success: false,
      error: 'Mot de passe incorrect. Veuillez vérifier votre saisie ou demander une réinitialisation à l\'administrateur.',
    };
  }

  const session: AuthSession = {
    user: {
      id: foundUser.id,
      nom: foundUser.nom,
      telephone: foundUser.telephone,
      role: foundUser.role,
      actif: foundUser.actif,
      createdAt: foundUser.createdAt,
    },
    token: `s1_sess_${foundUser.id}_${Date.now()}`,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  notifyAuthChange();
  return { success: true, session };
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
 * Admin: Get list of all vendors (role = VENDEUR)
 */
export function getVendorsList(): VendorUserRecord[] {
  const users = loadUsers();
  return users.filter((u) => u.role === 'VENDEUR');
}

/**
 * Admin: Create a new Vendor account
 */
export function createVendorAccount(input: CreateVendorInput): { success: boolean; user?: VendorUserRecord; tempPassword?: string; error?: string } {
  const phoneFormatted = formatPhoneNumber(input.telephone.trim());
  const nom = input.nom.trim();

  if (!nom || !phoneFormatted) {
    return { success: false, error: 'Le nom et le numéro de téléphone sont obligatoires.' };
  }

  const users = loadUsers();
  const existing = users.find((u) => u.telephone === phoneFormatted);
  if (existing) {
    return { success: false, error: `Un compte existe déjà avec le numéro ${phoneFormatted} (${existing.nom}).` };
  }

  const generatedPassword = input.motDePasse?.trim() || generateRandomPassword();

  const newVendor: VendorUserRecord = {
    id: `usr_vendeur_${Date.now()}`,
    role: 'VENDEUR',
    nom,
    telephone: phoneFormatted,
    actif: true,
    motDePasseHash: generatedPassword,
    tempPassword: generatedPassword,
    createdAt: new Date().toISOString(),
  };

  users.push(newVendor);
  saveUsers(users);

  return {
    success: true,
    user: newVendor,
    tempPassword: generatedPassword,
  };
}

/**
 * Admin: Toggle vendor active status (Désactiver / Réactiver)
 */
export function toggleVendorStatus(vendorId: string): { success: boolean; user?: VendorUserRecord; error?: string } {
  const users = loadUsers();
  const index = users.findIndex((u) => u.id === vendorId);

  if (index === -1) {
    return { success: false, error: 'Compte vendeur introuvable.' };
  }

  if (users[index].role === 'ADMIN') {
    return { success: false, error: 'Impossible de désactiver le compte administrateur principal.' };
  }

  users[index].actif = !users[index].actif;
  saveUsers(users);

  // If the toggled user is currently logged in, force session logout
  const current = getActiveSession();
  if (current && current.user.id === vendorId && !users[index].actif) {
    logout();
  }

  return { success: true, user: users[index] };
}

/**
 * Admin: Reset a vendor's password
 * Generates a new temporary password and displays it once to the admin
 */
export function resetVendorPassword(vendorId: string): { success: boolean; tempPassword?: string; error?: string } {
  const users = loadUsers();
  const index = users.findIndex((u) => u.id === vendorId);

  if (index === -1) {
    return { success: false, error: 'Compte vendeur introuvable.' };
  }

  const newPassword = generateRandomPassword();
  users[index].motDePasseHash = newPassword;
  users[index].tempPassword = newPassword;
  saveUsers(users);

  return {
    success: true,
    tempPassword: newPassword,
  };
}
