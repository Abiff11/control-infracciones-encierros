import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { ImportacionInfraccionesModoDuplicados } from '../entities/importacion-infracciones.entity';

export class ConfirmarInfraccionesExcelDto {
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  anio!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idRegion!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idDelegacionDefault?: number;

  @IsEnum(ImportacionInfraccionesModoDuplicados)
  @IsString()
  modoDuplicados!: ImportacionInfraccionesModoDuplicados;

  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @Type(() => Boolean)
  @IsBoolean()
  crearCatalogosFaltantes = false;

  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @Type(() => Boolean)
  @IsBoolean()
  crearDelegacionesFaltantes = false;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
