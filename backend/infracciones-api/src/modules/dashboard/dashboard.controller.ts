import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { READ_ROLES } from '../auth/constants/roles.constants';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import type {
  DashboardAnaliticaResumenResponse,
  DashboardDistribucionesResponse,
  DashboardIngresosPorClaveResponse,
  DashboardIngresosTendenciaResponse,
  DashboardInfraccionesTendenciaResponse,
} from './dashboard-analytics.types';
import { DashboardDistributionsService } from './dashboard-distributions.service';
import {
  DashboardService,
  type DashboardResumenResponse,
} from './dashboard.service';
import {
  DashboardAnalyticsQueryDto,
  DashboardTrendQueryDto,
} from './dto/dashboard-analytics-query.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@ApiTags('dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Roles(...READ_ROLES)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dashboardDistributionsService: DashboardDistributionsService,
  ) {}

  @Get('resumen')
  @ApiOperation({ summary: 'Obtener resumen agregado del dashboard operativo' })
  getResumen(
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardResumenResponse> {
    return this.dashboardService.getResumen(query);
  }

  @Get('analitica/resumen')
  @ApiOperation({
    summary: 'Obtener indicadores analiticos de expedientes e ingresos',
  })
  getAnaliticaResumen(
    @Query() query: DashboardAnalyticsQueryDto,
  ): Promise<DashboardAnaliticaResumenResponse> {
    return this.dashboardService.getAnaliticaResumen(query);
  }

  @Get('analitica/infracciones/tendencia')
  @ApiOperation({
    summary: 'Obtener tendencia de infracciones y variantes por periodo',
  })
  getTendenciaInfracciones(
    @Query() query: DashboardTrendQueryDto,
  ): Promise<DashboardInfraccionesTendenciaResponse> {
    return this.dashboardService.getTendenciaInfracciones(query);
  }

  @Get('analitica/ingresos/tendencia')
  @ApiOperation({
    summary: 'Obtener tendencia de ingresos por dia, mes o anio',
  })
  getTendenciaIngresos(
    @Query() query: DashboardTrendQueryDto,
  ): Promise<DashboardIngresosTendenciaResponse> {
    return this.dashboardService.getTendenciaIngresos(query);
  }

  @Get('analitica/ingresos/por-clave')
  @ApiOperation({
    summary: 'Obtener monto recaudado agrupado por clave de concepto',
  })
  getIngresosPorClave(
    @Query() query: DashboardAnalyticsQueryDto,
  ): Promise<DashboardIngresosPorClaveResponse> {
    return this.dashboardService.getIngresosPorClave(query);
  }

  @Get('analitica/distribuciones')
  @ApiOperation({
    summary:
      'Obtener distribuciones por territorio, motivo, tipo, encierro y estado operativo',
  })
  getDistribuciones(
    @Query() query: DashboardAnalyticsQueryDto,
  ): Promise<DashboardDistribucionesResponse> {
    return this.dashboardDistributionsService.getDistribuciones(query);
  }
}
