import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { UploadsService } from './uploads.service';
import { UploadResponseDto } from './uploads.dto';

/**
 * Endpoint d'upload d'image produit (ADMIN).
 *
 * Utilise multipart/form-data avec multer.memoryStorage() pour éviter
 * la conversion en base64. Retourne une URL publique courte.
 */
@Roles('ADMIN')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('product-image')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File
  ): Promise<UploadResponseDto> {
    if (!file) throw new BadRequestException('Aucun fichier envoyé.');
    const result = await this.uploads.uploadProductImage(
      file.buffer,
      file.originalname,
      file.mimetype
    );
    return { url: result.url, filename: result.filename, size: result.size };
  }
}