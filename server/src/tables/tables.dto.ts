import { IsInt, Min } from 'class-validator';

/** Payload de création d’une table (admin). */
export class CreateTableDto {
  @IsInt()
  @Min(1)
  numero!: number;
}
