import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

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

  @Get('delegaciones')
  @ApiOperation({ summary: 'Listar delegaciones' })
  findDelegaciones(@Query() query: FindDelegacionesQueryDto) {
    return this.catalogosService.findDelegaciones(query);
  }

  @Get('sexos')
  @ApiOperation({ summary: 'Listar sexos' })
  findSexos() {
    return this.catalogosService.findSexos();
  }

  @Get('servicios')
  @ApiOperation({ summary: 'Listar servicios' })
  findServicios() {
    return this.catalogosService.findServicios();
  }

  @Get('clases-vehiculo')
  @ApiOperation({ summary: 'Listar clases de vehículo' })
  findClasesVehiculo() {
    return this.catalogosService.findClasesVehiculo();
  }

  @Get('marcas-vehiculo')
  @ApiOperation({ summary: 'Listar marcas de vehículo' })
  findMarcasVehiculo() {
    return this.catalogosService.findMarcasVehiculo();
  }

  @Get('lineas-vehiculo')
  @ApiOperation({ summary: 'Listar líneas de vehículo' })
  findLineasVehiculo(@Query() query: FindLineasVehiculoQueryDto) {
    return this.catalogosService.findLineasVehiculo(query);
  }

  @Get('tipos-procedimiento')
  @ApiOperation({ summary: 'Listar tipos de procedimiento' })
  findTiposProcedimiento() {
    return this.catalogosService.findTiposProcedimiento();
  }

  @Get('operativos')
  @ApiOperation({ summary: 'Listar operativos' })
  findOperativos() {
    return this.catalogosService.findOperativos();
  }

  @Get('estatus-infraccion')
  @ApiOperation({ summary: 'Listar estatus de infracción' })
  findEstatusInfraccion() {
    return this.catalogosService.findEstatusInfraccion();
  }

  @Get('motivos')
  @ApiOperation({ summary: 'Listar motivos' })
  findMotivos() {
    return this.catalogosService.findMotivos();
  }

  @Get('encierros')
  @ApiOperation({ summary: 'Listar encierros' })
  findEncierros() {
    return this.catalogosService.findEncierros();
  }

  @Get('roles')
  @ApiOperation({ summary: 'Listar roles' })
  findRoles() {
    return this.catalogosService.findRoles();
  }
}
