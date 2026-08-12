import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { InfraccionWriteLock } from '../../common/concurrency/infraccion-write-lock.interceptor';
import { READ_ROLES, RELEASE_ROLES } from '../auth/constants/roles.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LoginResponseUsuarioDto } from '../auth/dto/login-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { GenerarLiberacionDto } from './dto/generar-liberacion.dto';
import { LiberacionesService } from './liberaciones.service';

@ApiTags('liberaciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Roles(...READ_ROLES)
@Controller('liberaciones')
export class LiberacionesController {
  constructor(private readonly liberacionesService: LiberacionesService) {}

  @Get('infraccion/:idInfraccion')
  @ApiOperation({ summary: 'Listar liberaciones por infracción' })
  findByInfraccion(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.liberacionesService.findByInfraccion(idInfraccion);
  }

  @Get(':idLiberacionVehiculo')
  @ApiOperation({ summary: 'Obtener liberación por id' })
  findById(
    @Param('idLiberacionVehiculo', ParseIntPipe) idLiberacionVehiculo: number,
  ) {
    return this.liberacionesService.findByIdOrFail(idLiberacionVehiculo);
  }

  @Roles(...RELEASE_ROLES)
  @Post()
  @InfraccionWriteLock('body.idInfraccion')
  @ApiOperation({ summary: 'Generar liberación vehicular' })
  generarLiberacion(
    @Body() generarLiberacionDto: GenerarLiberacionDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ) {
    return this.liberacionesService.generarLiberacion({
      ...generarLiberacionDto,
      idUsuarioLibera: currentUser.idUsuario,
    });
  }
}
