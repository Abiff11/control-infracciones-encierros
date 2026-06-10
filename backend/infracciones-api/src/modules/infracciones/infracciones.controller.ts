import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';

import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { InfraccionesService } from './infracciones.service';

@Controller('infracciones')
export class InfraccionesController {
  constructor(private readonly infraccionesService: InfraccionesService) {}

  @Get(':idInfraccion')
  findById(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.infraccionesService.findByIdOrFail(idInfraccion);
  }

  @Get(':idInfraccion/motivos')
  findMotivos(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.infraccionesService.findMotivosByInfraccion(idInfraccion);
  }

  @Post('movimientos')
  registrarMovimiento(@Body() registrarMovimientoDto: RegistrarMovimientoDto) {
    return this.infraccionesService.registrarMovimiento(registrarMovimientoDto);
  }
}
