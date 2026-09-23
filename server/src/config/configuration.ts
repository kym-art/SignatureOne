import process from 'node:process';

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  jwtSecret: string;
  adminTelephone: string;
  /** Passerelle CinetPay (paiement mobile money Flooz / TMoney). */
  cinetpayApiKey: string;
  cinetpaySiteId: string;
  /** Secret HMAC : sert à authentifier les webhooks entrants. */
  cinetpaySecretKey: string;
  /**
   * Sandbox (défaut true). Dès que `false` (production), la signature HMAC du
   * webhook devient OBLIGATOIRE — fail-closed, un webhook non signé est refusé.
   */
  cinetpaySandbox: boolean;
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
    adminTelephone: process.env.ADMIN_TELEPHONE || '+22890000000',
    cinetpayApiKey: process.env.CINETPAY_API_KEY || '',
    cinetpaySiteId: process.env.CINETPAY_SITE_ID || '',
    cinetpaySecretKey: process.env.CINETPAY_SECRET_KEY || '',
    // Sandbox par défaut : la production l'expose explicitement à 'false'.
    cinetpaySandbox: process.env.CINETPAY_SANDBOX !== 'false',
  };
}

export const config = loadConfig();

export const isSupabaseServiceConfigured = () =>
  !isPlaceholder(config.supabaseUrl) && !isPlaceholder(config.supabaseServiceRoleKey);
