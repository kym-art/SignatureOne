import { IsString, MaxLength, IsOptional } from 'class-validator';

export class UploadResponseDto {
  url!: string;
  filename!: string;
  size!: number;
}