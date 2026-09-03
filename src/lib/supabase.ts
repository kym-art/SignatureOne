import { createClient } from '@supabase/supabase-js';

// Read env variables safely in both Vite/React and Node/Next environments.
// Priorité aux variables préfixées `kym_` (intégration plateforme), puis aux
// variables génériques historiques. Côté navigateur, seules les variables
// NEXT_PUBLIC_kym_* sont disponibles (exposées via envPrefix de Vite).
const metaEnv: Record<string, string | undefined> =
  (typeof import.meta !== 'undefined' && ((import.meta as any).env as any)) || {};

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_kym_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.kym_SUPABASE_URL) ||
  metaEnv.NEXT_PUBLIC_kym_SUPABASE_URL ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  metaEnv.VITE_SUPABASE_URL ||
  'https://placeholder-project.supabase.co';

const supabaseAnonKey =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_kym_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_kym_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.kym_SUPABASE_ANON_KEY) ||
  metaEnv.NEXT_PUBLIC_kym_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const isSupabaseConfigured = 
  !supabaseUrl.includes('placeholder-project') && 
  !supabaseAnonKey.includes('placeholder');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
