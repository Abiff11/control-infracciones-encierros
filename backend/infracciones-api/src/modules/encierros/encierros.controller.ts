import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RegistrarRetencionDto } from './dto/registrar-retencion.dto';
import { RegistrarSalidaDto } from './dto/registrar-salida.dto';
import { EncierrosService } from './encierros.service';

@UseGuards(JwtAuthGuard)
@Controller('encierros')
export class EncierrosController {
  constructor(private readonly encierrosService: EncierrosService) {}

  @Get('retenciones/:idRetencionVehiculo')
  findRetencionById(
    @Param('idRetencionVehiculo', ParseIntPipe) idRetencionVehiculo: number,
  ) {
    return this.encierrosService.findRetencionByIdOrFail(idRetencionVehiculo);
  }

  @Get(':idEncierro')
  findEncierroById(@Param('idEncierro', ParseIntPipe) idEncierro: number) {
    return this.encierrosService.findEncierroByIdOrFail(idEncierro);
  }

  @Post('retenciones')
  registrarRetencion(@Body() registrarRetencionDto: RegistrarRetencionDto) {
    return this.encierrosService.registrarRetencion(registrarRetencionDto);
  }

  @Post('salidas')
  registrarSalida(@Body() registrarSalidaDto: RegistrarSalidaDto) {
    return this.encierrosService.registrarSalida(registrarSalidaDto);
  }
}
