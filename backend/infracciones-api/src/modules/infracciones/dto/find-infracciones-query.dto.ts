import { Type } from 'class-transformer';
import {
  IsIn,
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ESTADOS_OPERATIVOS_VEHICULO } from '../constants/estado-operativo-vehiculo.constants';

export class FindInfraccionesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  folioInfraccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rfc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  claveOficial?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEstatusInfraccion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idDelegacion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idRegion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTipoProcedimiento?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  idInfracciones?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idMotivo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEncierro?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  placas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  serie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  motor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombreInfractor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  licencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  clavePolicia?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  anio?: number;

  @IsOptional()
  @IsIn(ESTADOS_OPERATIVOS_VEHICULO)
  estadoOperativo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  sortBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  sortOrder?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}
