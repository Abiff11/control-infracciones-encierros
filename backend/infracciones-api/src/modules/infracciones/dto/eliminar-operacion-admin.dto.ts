import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
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

export class EliminarOperacionAdminParamsDto {
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^(PAGO|LIBERACION|SALIDA|RETENCION)$/)
  tipo!: 'PAGO' | 'LIBERACION' | 'SALIDA' | 'RETENCION';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idOperacion!: number;
}
