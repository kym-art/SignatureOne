import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly UPLOAD_DIR = join(process.cwd(), 'uploads', 'product-images');
  private readonly MAX_BYTES = 1024 * 1024; // 1 Mo max
  private readonly BASE_URL = '/uploads/product-images';

  constructor() {
    // Crée le dossier au démarrage si absent
    mkdir(this.UPLOAD_DIR, { recursive: true }).catch(() => {});
  }

  /**
   * Sauvegarde une image produit sur le disque local.
   * Retourne l'URL relative courte — jamais un blob base64.
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

    // Nom de fichier unique + sûr
    const ext = extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.png';
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const destPath = join(this.UPLOAD_DIR, safeName);

    try {
      await writeFile(destPath, file);
    } catch (err) {
      throw new BadRequestException(`Écriture fichier impossible : ${(err as Error).message}`);
    }

    this.logger.log(`Image sauvegardée : ${safeName} (${Math.round(file.length / 1024)} Ko)`);

    return {
      url: `${this.BASE_URL}/${safeName}`,
      filename: safeName,
      size: file.length,
    };
  }
}

