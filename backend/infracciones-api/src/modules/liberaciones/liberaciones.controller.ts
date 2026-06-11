import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { WRITE_ROLES } from '../auth/constants/roles.constants';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { GenerarLiberacionDto } from './dto/generar-liberacion.dto';
import { LiberacionesService } from './liberaciones.service';

@UseGuards(JwtAuthGuard, RoleAuthGuard)
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

  @Roles(...WRITE_ROLES)
  @Post()
  generarLiberacion(@Body() generarLiberacionDto: GenerarLiberacionDto) {
    return this.liberacionesService.generarLiberacion(generarLiberacionDto);
  }
}
