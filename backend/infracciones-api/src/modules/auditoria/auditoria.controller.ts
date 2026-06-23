import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ROLES } from '../auth/constants/roles.constants';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { AuditoriaService } from './auditoria.service';

@ApiTags('auditoria')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Roles(ROLES.ADMIN)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos de auditoria del sistema' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('accion') accion?: string,
    @Query('entidad') entidad?: string,
    @Query('idUsuario') idUsuario?: string,
  ) {
    return this.auditoriaService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      accion,
      entidad,
      idUsuario: idUsuario ? Number(idUsuario) : undefined,
    });
  }
}
