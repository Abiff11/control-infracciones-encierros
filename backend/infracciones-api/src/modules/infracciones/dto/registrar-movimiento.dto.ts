import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class RegistrarMovimientoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idInfraccion!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEstatusInfraccion!: number;

  @IsString()
  @IsNotEmpty()
  accion!: string;

  @IsOptional()
  @IsString()
  observaciones?: string | null;

  @IsOptional()
  @IsDateString()
  fechaMovimiento?: string;
}
