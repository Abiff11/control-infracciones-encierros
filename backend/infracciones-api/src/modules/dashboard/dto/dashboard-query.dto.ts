import { Type } from '@nestjs/class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

import { ESTADOS_OPERATIVOS_VEHICULO } from '../../infracciones/constants/estado-operativo-vehiculo.constants';

export class DashboardQueryDto {
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
  idRegion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idDelegacion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEstatusInfraccion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEncierro?: number;

  @IsOptional()
  @IsIn(ESTADOS_OPERATIVOS_VEHICULO)
  estadoOperativo?: string;
}
