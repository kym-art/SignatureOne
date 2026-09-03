import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { config, isSupabaseServiceConfigured } from '../config/configuration';

// Comptes mock locaux — utilisés UNIQUEMENT quand USE_MOCK_DATA=true (dév).
// En production ils sont inaccessibles : le login se fait par Supabase Auth.
interface MockVendor {
  id: string;
  role: 'ADMIN' | 'VENDEUR';
  nom: string;
  telephone: string;
  actif: boolean;
  motDePasseHash: string; // plaintext volontaire — mock dev uniquement
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('00')) return `+${cleaned.substring(2)}`;
  if (!cleaned.startsWith('+') && cleaned.length >= 8) {
    return cleaned.startsWith('228') ? `+${cleaned}` : `+228${cleaned}`;
  }
  return cleaned;
}

export function mockVendors(): MockVendor[] {
  return [
    {
      id: 'usr_admin_01',
      role: 'ADMIN',
      nom: 'Directeur Signature One',
      telephone: '+22890000000',
      actif: true,
      motDePasseHash: 'Admin@Signature1',
    },
    {
      id: 'usr_vendeur_01',
      role: 'VENDEUR',
      nom: 'Koffi Vendeur Comptoir 1',
      telephone: '+22891000000',
      actif: true,
      motDePasseHash: 'Vendeur@123',
    },
  ];
}

// Retourne un profil utilisable par AuthService (mock).
export function vendorUserToProfile(): MockVendor[] {
  return mockVendors();
}
