import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class EliminarOperacionAdminDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  versionExpediente!: string;

  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  motivoEliminacion!: string;

  @IsOptional()
  @IsBoolean()
  confirmarDependencias?: boolean;
}
