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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LoginResponseUsuarioDto } from '../auth/dto/login-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { WRITE_ROLES } from '../auth/constants/roles.constants';
import { CreateInfraccionCompletaDto } from './dto/create-infraccion-completa.dto';
import { FindInfraccionesQueryDto } from './dto/find-infracciones-query.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { InfraccionesService } from './infracciones.service';

@ApiTags('infracciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Controller('infracciones')
export class InfraccionesController {
  constructor(private readonly infraccionesService: InfraccionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar infracciones con filtros y paginación' })
  findAll(@Query() query: FindInfraccionesQueryDto) {
    return this.infraccionesService.findAll(query);
  }

  @Get('resumen/estatus')
  @ApiOperation({ summary: 'Obtener resumen de infracciones por estatus' })
  getResumenPorEstatus() {
    return this.infraccionesService.getResumenPorEstatus();
  }

  @Get(':idInfraccion/flujo')
  @ApiOperation({ summary: 'Obtener flujo operativo de una infracción' })
  findFlujo(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.infraccionesService.findFlujoByInfraccion(idInfraccion);
  }

  @Get(':idInfraccion/movimientos')
  @ApiOperation({ summary: 'Listar movimientos de una infracción' })
  findMovimientos(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.infraccionesService.findMovimientosByInfraccion(idInfraccion);
  }

  @Get(':idInfraccion/motivos')
  @ApiOperation({ summary: 'Listar motivos de una infracción' })
  findMotivos(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.infraccionesService.findMotivosByInfraccion(idInfraccion);
  }

  @Get(':idInfraccion')
  @ApiOperation({ summary: 'Obtener infracción por id' })
  findById(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.infraccionesService.findByIdOrFail(idInfraccion);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  @ApiOperation({ summary: 'Crear captura completa de infracción' })
  crearInfraccionCompleta(
    @Body() createInfraccionCompletaDto: CreateInfraccionCompletaDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ) {
    return this.infraccionesService.crearInfraccionCompleta(
      createInfraccionCompletaDto,
      currentUser.idUsuario,
    );
  }

  @Roles(...WRITE_ROLES)
  @Post('movimientos')
  @ApiOperation({ summary: 'Registrar movimiento de infracción' })
  registrarMovimiento(
    @Body() registrarMovimientoDto: RegistrarMovimientoDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ) {
    return this.infraccionesService.registrarMovimiento({
      ...registrarMovimientoDto,
      idUsuario: currentUser.idUsuario,
    });
  }
}
