import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';
import { JwtService } from './auth/jwt.service';

/**
 * Module Core global : expose le client service_role (SupabaseService) et le
 * service JWT à toute l'application backend. Ces dépendances ne sont jamais
 * exportées vers le frontend.
 */
@Global()
@Module({
  providers: [SupabaseService, JwtService],
  exports: [SupabaseService, JwtService],
})
export class CoreModule {}
