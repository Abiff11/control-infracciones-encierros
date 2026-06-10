import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';

import { FindInfraccionesQueryDto } from './dto/find-infracciones-query.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { InfraccionesService } from './infracciones.service';

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

  @Post('movimientos')
  registrarMovimiento(@Body() registrarMovimientoDto: RegistrarMovimientoDto) {
    return this.infraccionesService.registrarMovimiento(registrarMovimientoDto);
  }
}
