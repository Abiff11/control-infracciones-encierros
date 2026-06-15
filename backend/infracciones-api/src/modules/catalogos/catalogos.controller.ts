import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { WRITE_ROLES } from '../auth/constants/roles.constants';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { CreateClaseVehiculoDto } from './dto/create-clase-vehiculo.dto';
import { CreateDelegacionDto } from './dto/create-delegacion.dto';
import { CreateEncierroDto } from './dto/create-encierro.dto';
import { CreateEstatusInfraccionDto } from './dto/create-estatus-infraccion.dto';
import { CreateLineaVehiculoDto } from './dto/create-linea-vehiculo.dto';
import { CreateMarcaVehiculoDto } from './dto/create-marca-vehiculo.dto';
import { CreateMotivoDto } from './dto/create-motivo.dto';
import { CreateOperativoDto } from './dto/create-operativo.dto';
import { CreateRegionDto } from './dto/create-region.dto';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { CreateSexoDto } from './dto/create-sexo.dto';
import { CreateTipoProcedimientoDto } from './dto/create-tipo-procedimiento.dto';
import { FindDelegacionesQueryDto } from './dto/find-delegaciones-query.dto';
import { FindLineasVehiculoQueryDto } from './dto/find-lineas-vehiculo-query.dto';
import { CatalogosService } from './catalogos.service';

@ApiTags('catalogos')
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('regiones')
  @ApiOperation({ summary: 'Listar regiones' })
  findRegiones() {
    return this.catalogosService.findRegiones();
  }

  @UseGuards(JwtAuthGuard, RoleAuthGuard)
  @Roles(...WRITE_ROLES)
  @Post('regiones')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear region' })
  createRegion(@Body() dto: CreateRegionDto) {
    return this.catalogosService.createRegion(dto);
  }

  @Get('delegaciones')
  @ApiOperation({ summary: 'Listar delegaciones' })
  findDelegaciones(@Query() query: FindDelegacionesQueryDto) {
    return this.catalogosService.findDelegaciones(query);
  }

  @UseGuards(JwtAuthGuard, RoleAuthGuard)
  @Roles(...WRITE_ROLES)
  @Post('delegaciones')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear delegacion' })
  createDelegacion(@Body() dto: CreateDelegacionDto) {
    return this.catalogosService.createDelegacion(dto);
  }

  @Get('sexos')
  @ApiOperation({ summary: 'Listar sexos' })
  findSexos() {
    return this.catalogosService.findSexos();
  }

  @UseGuards(JwtAuthGuard, RoleAuthGuard)
  @Roles(...WRITE_ROLES)
  @Post('sexos')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear sexo' })
  createSexo(@Body() dto: CreateSexoDto) {
    return this.catalogosService.createSexo(dto);
  }

  @Get('servicios')
  @ApiOperation({ summary: 'Listar servicios' })
  findServicios() {
    return this.catalogosService.findServicios();
  }

  @UseGuards(JwtAuthGuard, RoleAuthGuard)
  @Roles(...WRITE_ROLES)
  @Post('servicios')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear servicio' })
  createServicio(@Body() dto: CreateServicioDto) {
    return this.catalogosService.createServicio(dto);
  }

  @Get('clases-vehiculo')
  @ApiOperation({ summary: 'Listar clases de vehiculo' })
  findClasesVehiculo() {
    return this.catalogosService.findClasesVehiculo();
  }

  @UseGuards(JwtAuthGuard, RoleAuthGuard)
  @Roles(...WRITE_ROLES)
  @Post('clases-vehiculo')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear clase de vehiculo' })
  createClaseVehiculo(@Body() dto: CreateClaseVehiculoDto) {
    return this.catalogosService.createClaseVehiculo(dto);
  }

  @Get('marcas-vehiculo')
  @ApiOperation({ summary: 'Listar marcas de vehiculo' })
  findMarcasVehiculo() {
    return this.catalogosService.findMarcasVehiculo();
  }

  @UseGuards(JwtAuthGuard, RoleAuthGuard)
  @Roles(...WRITE_ROLES)
  @Post('marcas-vehiculo')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear marca de vehiculo' })
  createMarcaVehiculo(@Body() dto: CreateMarcaVehiculoDto) {
    return this.catalogosService.createMarcaVehiculo(dto);
  }

  @Get('lineas-vehiculo')
  @ApiOperation({ summary: 'Listar lineas de vehiculo' })
  findLineasVehiculo(@Query() query: FindLineasVehiculoQueryDto) {
    return this.catalogosService.findLineasVehiculo(query);
  }

  @UseGuards(JwtAuthGuard, RoleAuthGuard)
  @Roles(...WRITE_ROLES)
  @Post('lineas-vehiculo')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear linea de vehiculo' })
  createLineaVehiculo(@Body() dto: CreateLineaVehiculoDto) {
    return this.catalogosService.createLineaVehiculo(dto);
  }

  @Get('tipos-procedimiento')
  @ApiOperation({ summary: 'Listar tipos de procedimiento' })
  findTiposProcedimiento() {
    return this.catalogosService.findTiposProcedimiento();
  }

  @UseGuards(JwtAuthGuard, RoleAuthGuard)
  @Roles(...WRITE_ROLES)
  @Post('tipos-procedimiento')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear tipo de procedimiento' })
  createTipoProcedimiento(@Body() dto: CreateTipoProcedimientoDto) {
    return this.catalogosService.createTipoProcedimiento(dto);
  }

  @Get('operativos')
  @ApiOperation({ summary: 'Listar operativos' })
  findOperativos() {
    return this.catalogosService.findOperativos();
  }

  @UseGuards(JwtAuthGuard, RoleAuthGuard)
  @Roles(...WRITE_ROLES)
  @Post('operativos')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear operativo' })
  createOperativo(@Body() dto: CreateOperativoDto) {
    return this.catalogosService.createOperativo(dto);
  }

  @Get('estatus-infraccion')
  @ApiOperation({ summary: 'Listar estatus de infraccion' })
  findEstatusInfraccion() {
    return this.catalogosService.findEstatusInfraccion();
  }

  @UseGuards(JwtAuthGuard, RoleAuthGuard)
  @Roles(...WRITE_ROLES)
  @Post('estatus-infraccion')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear estatus de infraccion' })
  createEstatusInfraccion(@Body() dto: CreateEstatusInfraccionDto) {
    return this.catalogosService.createEstatusInfraccion(dto);
  }

  @Get('motivos')
  @ApiOperation({ summary: 'Listar motivos' })
  findMotivos() {
    return this.catalogosService.findMotivos();
  }

  @UseGuards(JwtAuthGuard, RoleAuthGuard)
  @Roles(...WRITE_ROLES)
  @Post('motivos')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear motivo' })
  createMotivo(@Body() dto: CreateMotivoDto) {
    return this.catalogosService.createMotivo(dto);
  }

  @Get('encierros')
  @ApiOperation({ summary: 'Listar encierros' })
  findEncierros() {
    return this.catalogosService.findEncierros();
  }

  @UseGuards(JwtAuthGuard, RoleAuthGuard)
  @Roles(...WRITE_ROLES)
  @Post('encierros')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear encierro' })
  createEncierro(@Body() dto: CreateEncierroDto) {
    return this.catalogosService.createEncierro(dto);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Listar roles' })
  findRoles() {
    return this.catalogosService.findRoles();
  }
}
