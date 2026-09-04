import { Injectable, InternalServerErrorException, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config, isSupabaseServiceConfigured } from '../../config/configuration';

/**
 * Client Supabase CÔTÉ SERVEUR, clé service_role UNIQUEMENT.
 * Ce service est le SEUL point d'accès aux données avec privilèges ; il est
 * jamais exposé au frontend. Toutes les écritures admin/vendeur passent par
 * lui, ce qui contourne RLS (comportement voulu pour le serveur de confiance).
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private adminClient: SupabaseClient | null = null;

  onModuleInit(): void {
    this.init();
  }

  private init(): void {
    if (!isSupabaseServiceConfigured()) {
      this.logger.warn(
        "⚠️ SUPABASE_SERVICE_ROLE_KEY / URL non configurés : le backend démarre " +
        "mais les endpoints données seront en erreur 503. Configurez .env pour un fonctionnement réel."
      );
      this.adminClient = null;
      return;
    }
    this.adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.logger.log('✅ Client Supabase service_role initialisé.');
  }

  /**
   * Anon client, utilisé uniquement pour l'échange de credentials (login).
   * Si la clé anon n'est pas injectée par la plateforme, on replie sur la clé
   * service_role (côté serveur UNIQUEMENT, jamais exposée au navigateur) :
   * elle est acceptée par l'API Auth pour vérifier des identifiants. Sans ce
   * repli, `createClient(url, '')` jetterait une erreur brute → 500 opaque.
   */
  get anonClient(): SupabaseClient {
    if (!config.supabaseUrl) {
      throw new InternalServerErrorException(
        'SUPABASE_URL non configurée côté serveur : authentification impossible.'
      );
    }
    if (!config.supabaseAnonKey) {
      if (!config.supabaseServiceRoleKey) {
        throw new InternalServerErrorException(
          'Aucune clé Supabase (anon ou service_role) configurée côté serveur : authentification impossible.'
        );
      }
      this.logger.warn(
        '⚠️ Clé anon Supabase absente : repli sur service_role pour la vérification login (serveur uniquement).'
      );
    }
    return createClient(config.supabaseUrl, config.supabaseAnonKey || config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /** Client service_role (contourne RLS). Throw 503 si non configuré. */
  get admin(): SupabaseClient {
    if (!this.adminClient) {
      throw new InternalServerErrorException(
        'Supabase service_role non configuré. Configurez SUPABASE_SERVICE_ROLE_KEY dans .env.'
      );
    }
    return this.adminClient;
  }

  get configured(): boolean {
    return this.adminClient !== null;
  }
}
