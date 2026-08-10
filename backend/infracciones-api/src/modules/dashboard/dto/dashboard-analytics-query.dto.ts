import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  DASHBOARD_AGRUPACIONES,
  DASHBOARD_CONDICIONES_EXPEDIENTE,
  type DashboardAgrupacion,
  type DashboardCondicionExpediente,
} from '../dashboard-analytics.types';

export class DashboardAnalyticsQueryDto {
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
  idTipoProcedimiento?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEncierro?: number;

  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(50)
  claveConcepto?: string;

  @IsOptional()
  @IsIn(DASHBOARD_CONDICIONES_EXPEDIENTE)
  condicionExpediente?: DashboardCondicionExpediente;
}

export class DashboardTrendQueryDto extends DashboardAnalyticsQueryDto {
  @IsOptional()
  @IsIn(DASHBOARD_AGRUPACIONES)
  agrupacion?: DashboardAgrupacion;
}
