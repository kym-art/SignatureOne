import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { SupabaseService } from '../common/supabase/supabase.service';

/** Bucket public Supabase Storage pour les images produits. */
const STORAGE_BUCKET = 'product-images';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly MAX_BYTES = 1024 * 1024; // 1 Mo max
  private readonly BASE_URL = '/uploads/product-images';
  /** Filesystem Vercel = éphémère (seul /tmp est inscriptible). */
  private readonly isServerless =
    process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  /** Mémoïsé par instance : évite un getBucket à chaque upload. */
  private bucketChecked = false;

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Sauvegarde une image produit.
   *
   * 1) PRIORITÉ — Supabase Storage (bucket public) : persistant et compatible
   *    serverless. Sur Vercel, une image écrite sur disque disparaît au
   *    prochain cold start et n'est JAMAIS servie (le chemin relatif
   *    /uploads/... pointait vers un dossier vide) : c'était la cause des
   *    images produits qui « ne changeaient jamais ».
   * 2) REPLI — disque local (dev sans Supabase) : URL relative servie par
   *    useStaticAssets(<cwd>/uploads) dans main.ts / serverless.ts.
   *
   * Retourne une URL ABSOLUE (Supabase) ou relative (dev) — jamais de base64
   * (le base64 dépassait @MaxLength(500) du DTO Product.photoUrl).
   */
  async uploadProductImage(
    file: Buffer,
    filename: string,
    mimetype: string
  ): Promise<{ url: string; filename: string; size: number }> {
    if (!file || file.length === 0) {
      throw new BadRequestException('Aucun fichier fourni.');
    }
    if (file.length > this.MAX_BYTES) {
      throw new BadRequestException(
        `Image trop volumineuse : ${Math.round(file.length / 1024)} Ko (max ${this.MAX_BYTES / 1024} Ko). ` +
        'Compressez l\'image ou choisissez un format WebP.'
      );
    }
    if (!mimetype.startsWith('image/')) {
      throw new BadRequestException('Seules les images sont acceptées.');
    }

    // Nom de fichier unique + sûr (l'extension seule est conservée, assainie)
    const ext = extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.png';
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;

    if (this.supabase.configured) {
      try {
        await this.ensureBucket();
        const bucket = this.supabase.admin.storage.from(STORAGE_BUCKET);
        const { error } = await bucket.upload(safeName, file, {
          contentType: mimetype,
          cacheControl: '31536000',
          upsert: false,
        });
        if (error) throw new Error(error.message);
        const { data } = bucket.getPublicUrl(safeName);
        if (!data?.publicUrl) throw new Error('URL publique indisponible');
        this.logger.log(
          `Image stockée dans Supabase Storage : ${STORAGE_BUCKET}/${safeName} (${Math.round(file.length / 1024)} Ko)`
        );
        return { url: data.publicUrl, filename: safeName, size: file.length };
      } catch (err) {
        this.logger.warn(
          `Upload Supabase Storage impossible (${(err as Error)?.message}) — repli disque.`
        );
      }
    }

    // Repli disque : dev local (persistant) ou serverless dégradé (/tmp éphémère).
    const dir = this.isServerless
      ? join(tmpdir(), 'uploads', 'product-images')
      : join(process.cwd(), 'uploads', 'product-images');
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, safeName), file);
    } catch (err) {
      throw new BadRequestException(`Écriture fichier impossible : ${(err as Error).message}`);
    }
    if (this.isServerless) {
      this.logger.warn(
        '⚠️ Image écrite dans /tmp (éphémère sur Vercel) : le stockage persistant ' +
          'nécessite Supabase Storage. Configurez SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.'
      );
    } else {
      this.logger.log(`Image sauvegardée : ${safeName} (${Math.round(file.length / 1024)} Ko)`);
    }
    return { url: `${this.BASE_URL}/${safeName}`, filename: safeName, size: file.length };
  }

  /** Crée le bucket public s'il est absent (idempotent, mémoïsé par instance). */
  private async ensureBucket(): Promise<void> {
    if (this.bucketChecked) return;
    const storage = this.supabase.admin.storage;
    const { data: existing, error: getErr } = await storage.getBucket(STORAGE_BUCKET);
    if (getErr || !existing) {
      const { error } = await storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: this.MAX_BYTES,
      });
      // 409 « already exists » : une autre instance l'a créé — ce n'est pas une erreur.
      if (error && !/exist|duplicate/i.test(error.message)) {
        throw new Error(`createBucket: ${error.message}`);
      }
    }
    this.bucketChecked = true;
  }
}


