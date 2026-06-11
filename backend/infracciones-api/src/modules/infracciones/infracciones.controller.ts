import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { WRITE_ROLES } from '../auth/constants/roles.constants';
import { CreateInfraccionCompletaDto } from './dto/create-infraccion-completa.dto';
import { FindInfraccionesQueryDto } from './dto/find-infracciones-query.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { InfraccionesService } from './infracciones.service';

@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Controller('infracciones')
export class InfraccionesController {
  constructor(private readonly infraccionesService: InfraccionesService) {}

  @Get()
  findAll(@Query() query: FindInfraccionesQueryDto) {
    return this.infraccionesService.findAll(query);
  }

  @Get('resumen/estatus')
  getResumenPorEstatus() {
    return this.infraccionesService.getResumenPorEstatus();
  }

  @Get(':idInfraccion/flujo')
  findFlujo(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.infraccionesService.findFlujoByInfraccion(idInfraccion);
  }

  @Get(':idInfraccion/movimientos')
  findMovimientos(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.infraccionesService.findMovimientosByInfraccion(idInfraccion);
  }

  @Get(':idInfraccion/motivos')
  findMotivos(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.infraccionesService.findMotivosByInfraccion(idInfraccion);
  }

  @Get(':idInfraccion')
  findById(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.infraccionesService.findByIdOrFail(idInfraccion);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  crearInfraccionCompleta(
    @Body() createInfraccionCompletaDto: CreateInfraccionCompletaDto,
  ) {
    return this.infraccionesService.crearInfraccionCompleta(
      createInfraccionCompletaDto,
    );
  }

  @Roles(...WRITE_ROLES)
  @Post('movimientos')
  registrarMovimiento(@Body() registrarMovimientoDto: RegistrarMovimientoDto) {
    return this.infraccionesService.registrarMovimiento(registrarMovimientoDto);
  }
}
