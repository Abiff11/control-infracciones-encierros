import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

import { ImportacionInfraccionesEstado } from '../entities/importacion-infracciones.entity';

export class ImportacionInfraccionesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  anio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idRegion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idDelegacion?: number;

  @IsOptional()
  @IsEnum(ImportacionInfraccionesEstado)
  @IsString()
  estado?: ImportacionInfraccionesEstado;
}
