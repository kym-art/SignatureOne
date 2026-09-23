import { IsInt, IsNotEmpty, IsString, IsOptional, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  libelle!: string;

  @IsInt()
  @Min(1)
  montant!: number;

  @IsOptional()
  @IsString()
  dateIso?: string;
}
