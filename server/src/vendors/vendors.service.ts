import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { formatPhoneNumber } from '../auth/auth.utils';
import { CreateVendorDto, UpdateVendorDto, ResetVendorPasswordDto, VendorResponseDto } from './vendors.dto';

/** Génère un mot de passe temporaire (format S1-xxxx identifiable). */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return `S1-${pwd}`;
}

/** Politique de mot de passe : 8+ chars, 1 maj, 1 min, 1 chiffre. */
const PWD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[^\s]{8,}$/;
const PWD_MSG = 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.';

/**
 * Service de gestion des vendeurs — source de vérité serveur.
 * Comptes créés via Supabase Auth (hash géré par Supabase) + table User.
 * Aucun mot de passe stocké en clair dans l'application.
 */
@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(): Promise<VendorResponseDto[]> {
    const { data, error } = await this.supabase.admin
      .from('User').select('id, role, nom, telephone, actif, createdAt')
      .order('createdAt', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data || []) as VendorResponseDto[];
  }

  async findOne(id: string): Promise<VendorResponseDto> {
    const { data, error } = await this.supabase.admin
      .from('User').select('id, role, nom, telephone, actif, createdAt')
      .eq('id', id).maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Vendeur introuvable');
    return data as VendorResponseDto;
  }

  /**
   * Crée un nouveau vendeur :
   *  1. Utilisateur Supabase Auth (email synthétique, mot de passe hashé par Supabase)
   *  2. Profil User en base (role VENDEUR)
   */
  async create(dto: CreateVendorDto): Promise<VendorResponseDto> {
    const phone = formatPhoneNumber(dto.telephone);
    const nom = dto.nom.trim();
    const password = dto.motDePasse?.trim() || generateTempPassword();

    if (!nom || !phone) {
      throw new BadRequestException('Le nom et le numéro de téléphone sont obligatoires.');
    }
    if (!PWD_RE.test(password)) throw new BadRequestException(PWD_MSG);

    // Unicité du téléphone dans la table User
    const { data: existing, error: checkErr } = await this.supabase.admin
      .from('User').select('id').eq('telephone', phone).maybeSingle();
    if (checkErr) throw new BadRequestException(checkErr.message);
    if (existing) throw new ConflictException(`Un compte existe déjà avec le numéro ${phone}.`);

    // 1. Utilisateur Supabase Auth — client SERVICE_ROLE obligatoire :
    // auth.admin.* (createUser/updateUserById/deleteUser) rejette la clé anon
    // (« This endpoint requires a valid Bearer token » → 500 en production).
    const email = `${phone.replace('+', '')}@signature-one.local`;
    const { data: authUser, error: authErr } = await this.supabase.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nom, role: 'VENDEUR', telephone: phone },
    });
    if (authErr || !authUser?.user) {
      throw new InternalServerErrorException(`Création Auth impossible : ${authErr?.message}`);
    }

    // 2. Profil User (id = id Supabase Auth)
    const { error: profileErr } = await this.supabase.admin.from('User').insert({
      id: authUser.user.id,
      role: 'VENDEUR',
      nom,
      telephone: phone,
      actif: true,
    });
    if (profileErr) {
      // Rollback : supprime l'utilisateur Auth si le profil échoue
      await this.supabase.admin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
      throw new BadRequestException(`Création profil impossible : ${profileErr.message}`);
    }

    this.logger.log(`✅ Vendeur créé ${phone} (id=${authUser.user.id})`);
    return {
      id: authUser.user.id,
      role: 'VENDEUR',
      nom,
      telephone: phone,
      actif: true,
      createdAt: new Date().toISOString(),
      tempPassword: password,
    };
  }

  /** Active/désactive un vendeur (jamais l'admin). */
  async toggleStatus(id: string): Promise<VendorResponseDto> {
    const vendor = await this.findOne(id);
    if (vendor.role === 'ADMIN') {
      throw new BadRequestException('Impossible de désactiver le compte administrateur.');
    }
    const { data, error } = await this.supabase.admin
      .from('User').update({ actif: !vendor.actif }).eq('id', id)
      .select('id, role, nom, telephone, actif, createdAt').single();
    if (error) throw new BadRequestException(error.message);
    return data as VendorResponseDto;
  }

  /** Met à jour un vendeur (nom, téléphone, statut, mot de passe). */
  async update(id: string, dto: UpdateVendorDto): Promise<VendorResponseDto> {
    const vendor = await this.findOne(id);

    const updates: Record<string, unknown> = {};
    if (dto.nom !== undefined) updates.nom = dto.nom.trim();
    if (dto.telephone !== undefined) updates.telephone = formatPhoneNumber(dto.telephone);
    if (dto.actif !== undefined) updates.actif = dto.actif;
    if (dto.role !== undefined) updates.role = dto.role;

    if (dto.motDePasse) {
      if (!PWD_RE.test(dto.motDePasse)) throw new BadRequestException(PWD_MSG);
      const { error: pwdErr } = await this.supabase.admin.auth.admin.updateUserById(
        id, { password: dto.motDePasse }
      );
      if (pwdErr) throw new BadRequestException(`MàJ mot de passe impossible : ${pwdErr.message}`);
    }

    if (Object.keys(updates).length > 0) {
      const { data, error } = await this.supabase.admin
        .from('User').update(updates).eq('id', id)
        .select('id, role, nom, telephone, actif, createdAt').single();
      if (error) throw new BadRequestException(error.message);
      return data as VendorResponseDto;
    }
    return vendor;
  }

  /** Réinitialise le mot de passe d'un vendeur (nouveau temporaire). */
  async resetPassword(id: string, dto?: ResetVendorPasswordDto): Promise<{ tempPassword: string }> {
    await this.findOne(id);
    const password = dto?.motDePasse?.trim() || generateTempPassword();
    if (!PWD_RE.test(password)) throw new BadRequestException(PWD_MSG);

    const { error } = await this.supabase.admin.auth.admin.updateUserById(id, { password });
    if (error) throw new BadRequestException(`Réinitialisation impossible : ${error.message}`);

    this.logger.log(`🔑 Mot de passe réinitialisé vendeur id=${id}`);
    return { tempPassword: password };
  }

  /** Soft-delete : désactive le profil User (le compte Auth est banni côté admin si besoin). */
  async remove(id: string): Promise<{ softDeleted: boolean }> {
    const vendor = await this.findOne(id);
    if (vendor.role === 'ADMIN') {
      throw new BadRequestException('Impossible de supprimer le compte administrateur.');
    }
    await this.supabase.admin.from('User').update({ actif: false }).eq('id', id);
    return { softDeleted: true };
  }
}
