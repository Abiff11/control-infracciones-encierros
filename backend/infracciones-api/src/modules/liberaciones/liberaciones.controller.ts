import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { GenerarLiberacionDto } from './dto/generar-liberacion.dto';
import { LiberacionesService } from './liberaciones.service';

@Controller('liberaciones')
export class LiberacionesController {
  constructor(private readonly liberacionesService: LiberacionesService) {}

  @Get('infraccion/:idInfraccion')
  findByInfraccion(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.liberacionesService.findByInfraccion(idInfraccion);
  }

  @Get(':idLiberacionVehiculo')
  findById(
    @Param('idLiberacionVehiculo', ParseIntPipe) idLiberacionVehiculo: number,
  ) {
    return this.liberacionesService.findByIdOrFail(idLiberacionVehiculo);
  }

  @Post()
  generarLiberacion(@Body() generarLiberacionDto: GenerarLiberacionDto) {
    return this.liberacionesService.generarLiberacion(generarLiberacionDto);
  }
}
