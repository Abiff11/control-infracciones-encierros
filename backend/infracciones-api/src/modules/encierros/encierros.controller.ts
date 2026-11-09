import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { InfraccionWriteLock } from '../../common/concurrency/infraccion-write-lock.interceptor';
import {
  READ_ROLES,
  ROLES,
  YARD_ENTRY_ROLES,
  YARD_ROLES,
} from '../auth/constants/roles.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LoginResponseUsuarioDto } from '../auth/dto/login-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { VehiculosEncierroQueryDto } from './dto/vehiculos-query.dto';
import { RegistrarRetencionDto } from './dto/registrar-retencion.dto';
import { RegistrarSalidaDto } from './dto/registrar-salida.dto';
import { RegistrarSalidaAnticipadaDto } from './dto/registrar-salida-anticipada.dto';
import { EncierrosService } from './encierros.service';

@ApiTags('encierros')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Roles(...READ_ROLES)
@Controller('encierros')
export class EncierrosController {
  constructor(private readonly encierrosService: EncierrosService) {}

  @Get('retenciones/:idRetencionVehiculo')
  @ApiOperation({ summary: 'Obtener retención vehicular por id' })
  findRetencionById(
    @Param('idRetencionVehiculo', ParseIntPipe) idRetencionVehiculo: number,
  ) {
    return this.encierrosService.findRetencionByIdOrFail(idRetencionVehiculo);
  }

  @Get('vehiculos/resumen')
  @ApiOperation({
    summary: 'Obtener resumen operativo de vehiculos en encierro',
  })
  getVehiculosResumen(@Query() query: VehiculosEncierroQueryDto) {
    return this.encierrosService.getVehiculosEnEncierroResumen(query);
  }

  @Get('vehiculos')
  @ApiOperation({
    summary: 'Listar vehiculos retenidos con su estado operativo',
  })
  findVehiculosEnEncierro(@Query() query: VehiculosEncierroQueryDto) {
    return this.encierrosService.findVehiculosEnEncierro(query);
  }

  @Roles(ROLES.ADMIN, ROLES.INFRACCIONES)
  @Get('observaciones/pendientes')
  @ApiOperation({ summary: 'Consultar observaciones pendientes para Infracciones' })
  listarObservacionesPendientes(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.encierrosService.listarObservacionesPendientes({ page, limit });
  }

  @Get(':idEncierro')
  @ApiOperation({ summary: 'Obtener encierro por id' })
  findEncierroById(@Param('idEncierro', ParseIntPipe) idEncierro: number) {
    return this.encierrosService.findEncierroByIdOrFail(idEncierro);
  }

  @Roles(...YARD_ENTRY_ROLES)
  @Post('retenciones')
  @InfraccionWriteLock('body.idInfraccion')
  @ApiOperation({ summary: 'Registrar retención vehicular' })
  registrarRetencion(@Body() registrarRetencionDto: RegistrarRetencionDto) {
    return this.encierrosService.registrarRetencion(registrarRetencionDto);
  }


  @Roles(...YARD_ROLES)
  @Post('salidas/anticipadas')
  @InfraccionWriteLock('body.idRetencionVehiculo')
  @ApiOperation({
    summary: 'Registrar salida anticipada con expediente y retencion existentes',
  })
  registrarSalidaAnticipada(
    @Body() dto: RegistrarSalidaAnticipadaDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ) {
    return this.encierrosService.registrarSalidaAnticipada({
      ...dto,
      idUsuarioValidaSalida: currentUser.idUsuario,
    });
  }

  @Roles(...YARD_ROLES)
  @Post('salidas')
  @InfraccionWriteLock('body.idRetencionVehiculo')
  @ApiOperation({ summary: 'Registrar salida vehicular' })
  registrarSalida(
    @Body() registrarSalidaDto: RegistrarSalidaDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ) {
    return this.encierrosService.registrarSalida({
      ...registrarSalidaDto,
      idUsuarioValidaSalida: currentUser.idUsuario,
    });
  }
}
