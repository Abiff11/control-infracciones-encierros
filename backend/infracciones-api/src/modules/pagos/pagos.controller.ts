import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { PagosService } from './pagos.service';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get('infraccion/:idInfraccion')
  findByInfraccion(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.pagosService.findByInfraccion(idInfraccion);
  }

  @Get(':idPagoInfraccion')
  findById(@Param('idPagoInfraccion', ParseIntPipe) idPagoInfraccion: number) {
    return this.pagosService.findByIdOrFail(idPagoInfraccion);
  }

  @Post()
  registrarPago(@Body() registrarPagoDto: RegistrarPagoDto) {
    return this.pagosService.registrarPago(registrarPagoDto);
  }
}
