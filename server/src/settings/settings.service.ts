import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { StoreSettingsDto, StoreStatus } from './settings.dto';

/**
 * Service de gestion des paramètres du magasin (horaires, fermeture).
 *
 * Persiste dans la table `StoreSetting` (clé-valeur JSON).
 * La clé "store_config" contient l'ensemble des paramètres.
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly CONFIG_KEY = 'store_config';

  constructor(private readonly supabase: SupabaseService) {}

  /** Valeurs par défaut si la table est vide. */
  private defaults(): Record<string, unknown> {
    return {
      openHour: '09:00',
      closeHour: '22:00',
      closedEnabled: false,
      closedMessage: null,
      closedUntil: null,
    };
  }

  /** Lit la configuration depuis Supabase + fusion avec defaults. */
  async getRawConfig(): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase.admin
      .from('StoreSetting')
      .select('value')
      .eq('key', this.CONFIG_KEY)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') {
      throw new BadRequestException(`Lecture settings: ${error.message}`);
    }
    const stored = (data?.value as Record<string, unknown>) || {};
    return { ...this.defaults(), ...stored };
  }

  /** Retourne l'état ouvert/fermé + message (public). */
  async getStoreStatus(): Promise<StoreStatus> {
    const config = await this.getRawConfig();
    const result = this.computeStatus(config);
    return result;
  }

  /** Calcule ouvert/fermé à partir d'une config + date courante.
   *  Fermeture exceptionnelle :
   *   - avec closedUntil : fermé jusqu'à cette date/heure ;
   *   - sans closedUntil : fermé jusqu'à réouverture manuelle par l'admin.
   */
  private computeStatus(config: Record<string, unknown>): StoreStatus {
    const openHour = String(config.openHour || '09:00');
    const closeHour = String(config.closeHour || '22:00');
    const closedEnabled = config.closedEnabled === true;
    const closedMessage = (config.closedMessage as string | null) ?? null;
    const closedUntil = (config.closedUntil as string | null) ?? null;

    let isOpen = this.isWithinHours(openHour, closeHour);
    let reason: string | null = null;

    if (!isOpen) {
      reason = `La boutique est fermée. Horaires d'ouverture : ${openHour} à ${closeHour}.`;
    }

    if (closedEnabled) {
      const untilOk = closedUntil ? new Date() < new Date(closedUntil) : true;
      if (untilOk) {
        isOpen = false;
        reason = closedMessage || 'La boutique est exceptionnellement fermée.';
      }
    }

    return {
      isOpen,
      openHour,
      closeHour,
      closedEnabled,
      closedMessage,
      closedUntil,
      reason: isOpen ? null : reason,
    };
  }

  /** Vérifie si l'heure courante est dans [openHour, closeHour]. */
  private isWithinHours(openHour: string, closeHour: string): boolean {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const open = new Date(`${today}T${openHour}:00`);
    const close = new Date(`${today}T${closeHour}:00`);
    return now >= open && now < close;
  }

  /** Met à jour la configuration (ADMIN). */
  async updateSettings(dto: StoreSettingsDto): Promise<StoreStatus> {
    const config: Record<string, unknown> = {};
    if (dto.openHour !== undefined) config.openHour = dto.openHour;
    if (dto.closeHour !== undefined) config.closeHour = dto.closeHour;
    if (dto.closedEnabled !== undefined) config.closedEnabled = dto.closedEnabled;
    if (dto.closedMessage !== undefined) config.closedMessage = dto.closedMessage ?? null;
    if (dto.closedUntil !== undefined) config.closedUntil = dto.closedUntil ?? null;

    const { error } = await this.supabase.admin
      .from('StoreSetting')
      .upsert({ key: this.CONFIG_KEY, value: config })
      .select();
    if (error) throw new BadRequestException(`Sauvegarde settings: ${error.message}`);

    const merged = await this.getRawConfig();
    return this.computeStatus(merged);
  }
}