import process from 'node:process';

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  jwtSecret: string;
  useMockData: boolean;
  adminTelephone: string;
}

const isPlaceholder = (v: string): boolean =>
  !v || v.includes('placeholder-project') || v.includes('placeholder');

export function loadConfig(): AppConfig {
  return {
    // Fallbacks : variables préfixées `kym_` (intégration plateforme), puis
    // variables génériques historiques.
    supabaseUrl:
      process.env.SUPABASE_URL ||
      process.env.kym_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_kym_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      '',
    supabaseAnonKey:
      process.env.NEXT_PUBLIC_kym_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_kym_SUPABASE_ANON_KEY ||
      process.env.kym_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '',
    supabaseServiceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.kym_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.kym_SUPABASE_SECRET_KEY ||
      '',
    jwtSecret: process.env.JWT_SECRET || '',
    useMockData: process.env.USE_MOCK_DATA === 'true',
    adminTelephone: process.env.ADMIN_TELEPHONE || '+22890000000',
  };
}

export const config = loadConfig();

export const isSupabaseServiceConfigured = () =>
  !isPlaceholder(config.supabaseUrl) && !isPlaceholder(config.supabaseServiceRoleKey);
