import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class RegistrarRetencionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idInfraccion!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEncierro!: number;

  @IsString()
  @IsNotEmpty()
  recibidoPor!: string;

  @IsOptional()
  @IsDateString()
  fechaIngreso?: string;

  @IsOptional()
  @IsString()
  folioResguardo?: string | null;

  @IsOptional()
  @IsString()
  observacionesIngreso?: string | null;

  @IsOptional()
  @IsString()
  estadoIngreso?: string | null;
}
