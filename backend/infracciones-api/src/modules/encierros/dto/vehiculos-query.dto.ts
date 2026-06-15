import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { ESTADOS_OPERATIVOS_VEHICULO } from '../../infracciones/constants/estado-operativo-vehiculo.constants';
import { parseBooleanQuery } from '../../../common/utils/parse-boolean';

export class VehiculosEncierroQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEncierro?: number;

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
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  anio?: number;

  @IsOptional()
  @IsString()
  folioInfraccion?: string;

  @IsOptional()
  @IsString()
  placas?: string;

  @IsOptional()
  @IsString()
  serie?: string;

  @IsOptional()
  @IsString()
  motor?: string;

  @IsOptional()
  @IsString()
  nombreInfractor?: string;

  @IsOptional()
  @IsString()
  licencia?: string;

  @IsOptional()
  @IsIn(ESTADOS_OPERATIVOS_VEHICULO)
  estadoOperativo?: string;

  @IsOptional()
  @IsDateString()
  fechaIngresoDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaIngresoHasta?: string;

  @IsOptional()
  @IsDateString()
  fechaInfraccionDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaInfraccionHasta?: string;

  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  conPago?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  conLiberacion?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  conSalida?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 10;
}
