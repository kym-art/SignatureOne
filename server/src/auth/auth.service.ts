import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { JwtService, JwtUserPayload } from '../common/auth/jwt.service';
import { config } from '../config/configuration';
import { formatPhoneNumber, vendorUserToProfile } from './auth.utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Vérifie les identifiants via Supabase Auth, puis résout le rôle dans la
   * table `User`. Retourne un JWT signé par le backend.
   *
   * Comportement :
   *  - USE_MOCK_DATA=true (dév uniquement) → vérification mock locale.
   *  - sinon → Supabase Auth (échoue explicitement si non configuré).
   */
  async login(
    telephone: string,
    motDePasse: string
  ): Promise<{ token: string; user: JwtUserPayload }> {
    const phone = formatPhoneNumber(telephone);

    if (config.useMockData) {
      return this.loginMock(phone, motDePasse);
    }

    if (!this.supabase.configured) {
      throw new InternalServerErrorException(
        'Authentification non disponible : Supabase n’est pas configuré côté serveur.'
      );
    }

    // Échange des credentials via Supabase Auth (anonyme → bonne pratique serveur)
    const email = `${phone.replace('+', '')}@signature-one.local`;
    const { data, error } = await this.supabase.anonClient.auth.signInWithPassword({
      email,
      password: motDePasse,
    });
    if (error || !data.user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // Rôle réel lu depuis la source de vérité (User), jamais depuis le client.
    const { data: profile, error: profileErr } = await this.supabase.admin
      .from('User')
      .select('id, role, nom, telephone, actif')
      .eq('telephone', phone)
      .maybeSingle();
    if (profileErr) {
      throw new InternalServerErrorException(`Lecture profil impossible : ${profileErr.message}`);
    }
    if (!profile || !profile.actif) {
      throw new UnauthorizedException('Compte inexistant ou désactivé');
    }

    const payload: JwtUserPayload = {
      sub: profile.id,
      telephone: profile.telephone,
      role: profile.role,
      nom: profile.nom,
    };
    const token = this.jwt.sign(payload);
    this.logger.log(`✅ Login OK ${phone} → ${profile.role}`);
    return { token, user: payload };
  }

  /** Variante mock locale pour les devs qui ne veulent pas de Supabase. */
  private loginMock(phone: string, pwd: string): { token: string; user: JwtUserPayload } {
    for (const u of vendorUserToProfile()) {
      if (u.telephone === phone && u.actif) {
        // Mot de passe mock plaintext (dév uniquement).
        if (u.motDePasseHash !== pwd) {
          throw new UnauthorizedException('Mot de passe incorrect (mock)');
        }
        const payload: JwtUserPayload = {
          sub: u.id,
          telephone: u.telephone,
          role: u.role,
          nom: u.nom,
        };
        return { token: this.jwt.sign(payload), user: payload };
      }
    }
    throw new UnauthorizedException('Identifiants incorrects (mock)');
  }
}
