import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createHash } from 'node:crypto';
import type { Request } from 'express';

import { InfraccionWriteLock } from '../../common/concurrency/infraccion-write-lock.interceptor';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LoginResponseUsuarioDto } from '../auth/dto/login-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CAPTURE_ROLES,
  READ_ROLES,
  ROLES,
  WRITE_ROLES,
} from '../auth/constants/roles.constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import {
  AdminActualizarExpedienteDto,
  EliminarInfraccionAdminDto,
} from './dto/admin-expediente.dto';
import {
  EliminarOperacionAdminDto,
  EliminarOperacionAdminParamsDto,
} from './dto/eliminar-operacion-admin.dto';
import { CreateInfraccionCompletaDto } from './dto/create-infraccion-completa.dto';
import { FindInfraccionesQueryDto } from './dto/find-infracciones-query.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { InfraccionesAdminOperacionesService } from './infracciones-admin-operaciones.service';
import {
  type AdminAuditContext,
  type AdminExpedienteSnapshot,
  InfraccionesAdminService,
} from './infracciones-admin.service';
import { InfraccionesListService } from './infracciones-list.service';
import { InfraccionesService } from './infracciones.service';
import { redactOperationalSensitiveDataForConsulta } from './infracciones.visibility';

interface VersionedAdminExpedienteSnapshot extends AdminExpedienteSnapshot {
  versionExpediente: string;
}

@ApiTags('infracciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Roles(...READ_ROLES)
@Controller('infracciones')
export class InfraccionesController {
  constructor(
    private readonly infraccionesService: InfraccionesService,
    private readonly infraccionesListService: InfraccionesListService,
    private readonly infraccionesAdminService: InfraccionesAdminService,
    private readonly infraccionesAdminOperacionesService: InfraccionesAdminOperacionesService,
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

  @Roles(ROLES.ADMIN)
  @Get(':idInfraccion/admin')
  @InfraccionWriteLock('params.idInfraccion')
  @ApiOperation({ summary: 'Obtener expediente editable para administracion' })
  async findAdminSnapshot(
    @Param('idInfraccion', ParseIntPipe) idInfraccion: number,
  ): Promise<VersionedAdminExpedienteSnapshot> {
    const snapshot =
      await this.infraccionesAdminService.getEditableSnapshot(idInfraccion);
    return this.withVersion(snapshot);
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

  @Roles(ROLES.ADMIN)
  @Patch(':idInfraccion')
  @InfraccionWriteLock('params.idInfraccion')
  @ApiOperation({ summary: 'Editar expediente completo como administrador' })
  async actualizarExpedienteAdmin(
    @Param('idInfraccion', ParseIntPipe) idInfraccion: number,
    @Body() dto: AdminActualizarExpedienteDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
    @Req() request: Request,
  ): Promise<VersionedAdminExpedienteSnapshot> {
    const current =
      await this.infraccionesAdminService.getEditableSnapshot(idInfraccion);
    this.assertVersion(dto.versionExpediente, current);

    const updated = await this.infraccionesAdminService.actualizarExpediente(
      idInfraccion,
      dto,
      this.buildAuditContext(request, currentUser),
    );
    return this.withVersion(updated);
  }

  @Roles(ROLES.ADMIN)
  @Delete(':idInfraccion/admin/operaciones/:tipo/:idOperacion')
  @InfraccionWriteLock('params.idInfraccion')
  @ApiOperation({
    summary: 'Eliminar una operacion vinculada del expediente como administrador',
  })
  async eliminarOperacionAdmin(
    @Param('idInfraccion', ParseIntPipe) idInfraccion: number,
    @Param() params: EliminarOperacionAdminParamsDto,
    @Body() dto: EliminarOperacionAdminDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
    @Req() request: Request,
  ): Promise<VersionedAdminExpedienteSnapshot> {
    const current =
      await this.infraccionesAdminService.getEditableSnapshot(idInfraccion);
    this.assertVersion(dto.versionExpediente, current);

    await this.infraccionesAdminOperacionesService.eliminarOperacion(
      idInfraccion,
      params.tipo,
      params.idOperacion,
      dto,
      this.buildAuditContext(request, currentUser),
    );

    const updated =
      await this.infraccionesAdminService.getEditableSnapshot(idInfraccion);
    return this.withVersion(updated);
  }

  @Roles(ROLES.ADMIN)
  @Delete(':idInfraccion')
  @InfraccionWriteLock('params.idInfraccion')
  @ApiOperation({ summary: 'Eliminar expediente completo como administrador' })
  async eliminarExpedienteAdmin(
    @Param('idInfraccion', ParseIntPipe) idInfraccion: number,
    @Body() dto: EliminarInfraccionAdminDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
    @Req() request: Request,
  ) {
    const current =
      await this.infraccionesAdminService.getEditableSnapshot(idInfraccion);
    this.assertVersion(dto.versionExpediente, current);

    return this.infraccionesAdminService.eliminarExpediente(
      idInfraccion,
      dto,
      this.buildAuditContext(request, currentUser),
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

  private withVersion(
    snapshot: AdminExpedienteSnapshot,
  ): VersionedAdminExpedienteSnapshot {
    return {
      ...snapshot,
      versionExpediente: this.createVersion(snapshot),
    };
  }

  private assertVersion(
    expectedVersion: string,
    snapshot: AdminExpedienteSnapshot,
  ): void {
    if (this.createVersion(snapshot) !== expectedVersion) {
      throw new ConflictException(
        'El expediente cambio desde que lo cargaste. Recarga los datos antes de continuar.',
      );
    }
  }

  private createVersion(snapshot: AdminExpedienteSnapshot): string {
    return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  }

  private buildAuditContext(
    request: Request,
    currentUser: LoginResponseUsuarioDto,
  ): AdminAuditContext {
    const requestIdHeader = request.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : requestIdHeader;

    return {
      idUsuario: currentUser.idUsuario,
      ip: request.ip,
      requestId: requestId ?? null,
      httpMethod: request.method,
      requestPath: request.originalUrl,
      userAgent: request.get('user-agent') ?? null,
    };
  }
}
