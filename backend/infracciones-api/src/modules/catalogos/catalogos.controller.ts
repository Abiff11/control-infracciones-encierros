import { Controller, Get, Query } from '@nestjs/common';

import { FindDelegacionesQueryDto } from './dto/find-delegaciones-query.dto';
import { FindLineasVehiculoQueryDto } from './dto/find-lineas-vehiculo-query.dto';
import { CatalogosService } from './catalogos.service';

@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('regiones')
  findRegiones() {
    return this.catalogosService.findRegiones();
  }

  @Get('delegaciones')
  findDelegaciones(@Query() query: FindDelegacionesQueryDto) {
    return this.catalogosService.findDelegaciones(query);
  }

  @Get('sexos')
  findSexos() {
    return this.catalogosService.findSexos();
  }

  @Get('servicios')
  findServicios() {
    return this.catalogosService.findServicios();
  }

  @Get('clases-vehiculo')
  findClasesVehiculo() {
    return this.catalogosService.findClasesVehiculo();
  }

  @Get('marcas-vehiculo')
  findMarcasVehiculo() {
    return this.catalogosService.findMarcasVehiculo();
  }

  @Get('lineas-vehiculo')
  findLineasVehiculo(@Query() query: FindLineasVehiculoQueryDto) {
    return this.catalogosService.findLineasVehiculo(query);
  }

  @Get('tipos-procedimiento')
  findTiposProcedimiento() {
    return this.catalogosService.findTiposProcedimiento();
  }

  @Get('operativos')
  findOperativos() {
    return this.catalogosService.findOperativos();
  }

  @Get('estatus-infraccion')
  findEstatusInfraccion() {
    return this.catalogosService.findEstatusInfraccion();
  }

  @Get('motivos')
  findMotivos() {
    return this.catalogosService.findMotivos();
  }

  @Get('encierros')
  findEncierros() {
    return this.catalogosService.findEncierros();
  }

  @Get('roles')
  findRoles() {
    return this.catalogosService.findRoles();
  }
}
