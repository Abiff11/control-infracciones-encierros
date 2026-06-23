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
import {
  CAPTURE_ROLES,
  READ_ROLES,
  WRITE_ROLES,
} from '../auth/constants/roles.constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { CreateInfraccionCompletaDto } from './dto/create-infraccion-completa.dto';
import { FindInfraccionesQueryDto } from './dto/find-infracciones-query.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { InfraccionesListService } from './infracciones-list.service';
import { InfraccionesService } from './infracciones.service';
import { redactOperationalSensitiveDataForConsulta } from './infracciones.visibility';

@ApiTags('infracciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Roles(...READ_ROLES)
@Controller('infracciones')
export class InfraccionesController {
  constructor(
    private readonly infraccionesService: InfraccionesService,
    private readonly infraccionesListService: InfraccionesListService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar infracciones con filtros y paginación' })
  async findAll(
    @Query() query: FindInfraccionesQueryDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ) {
    const response = await this.infraccionesListService.findAll(query);

    if (currentUser.rol?.nombreRol === 'CONSULTA') {
      return redactOperationalSensitiveDataForConsulta(response);
    }

    return response;
  }

  @Get('resumen/estatus')
  @ApiOperation({ summary: 'Obtener resumen de infracciones por estatus' })
  getResumenPorEstatus() {
    return this.infraccionesService.getResumenPorEstatus();
  }

  @Get(':folioInfraccion/flujo')
  @ApiOperation({ summary: 'Obtener flujo operativo de una infracción' })
  async findFlujo(
    @Param('folioInfraccion') folioInfraccion: string,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ) {
    const response =
      await this.infraccionesService.findFlujoByInfraccion(folioInfraccion);

    if (currentUser.rol?.nombreRol === 'CONSULTA') {
      return redactOperationalSensitiveDataForConsulta(response);
    }

    return response;
  }

  @Get(':idInfraccion/detalle')
  @ApiOperation({ summary: 'Obtener detalle completo de una infracción' })
  async findDetalle(
    @Param('idInfraccion', ParseIntPipe) idInfraccion: number,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ) {
    const response =
      await this.infraccionesService.findDetalleCompletoByInfraccion(
        idInfraccion,
      );

    if (currentUser.rol?.nombreRol === 'CONSULTA') {
      return redactOperationalSensitiveDataForConsulta(response);
    }

    return response;
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
  async findById(
    @Param('idInfraccion', ParseIntPipe) idInfraccion: number,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ) {
    const response =
      await this.infraccionesService.findByIdOrFail(idInfraccion);

    if (currentUser.rol?.nombreRol === 'CONSULTA') {
      return redactOperationalSensitiveDataForConsulta(response);
    }

    return response;
  }

  @Roles(...CAPTURE_ROLES)
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
