import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/auth/decorators/public.decorator';
import { config, isSupabaseServiceConfigured } from '../config/configuration';

/**
 * Liveness publique (SANS JWT) : permet de vérifier que le backend serverless
 * répond, SANS confondre avec le mur SSO Vercel.
 *
 * - Si Vercel Deployment Protection est active → le navigateur reçoit du HTML
 *   « Log in to Vercel » (pas ce JSON) → cause = protection Vercel, pas le code.
 * - Si ce JSON répond → l'API est joignable ; un 401 sur /auth/login vient
 *   alors VRAIMENT du backend (identifiants / seed admin / Supabase).
 */
@Public()
@Controller('__liveness')
export class HealthController {
  @Get()
  check() {
    return {
      ok: true,
      service: 'signature-one-backend',
      time: new Date().toISOString(),
      supabaseConfigured: isSupabaseServiceConfigured(),
      jwtConfigured: !!config.jwtSecret,
    };
  }
}
