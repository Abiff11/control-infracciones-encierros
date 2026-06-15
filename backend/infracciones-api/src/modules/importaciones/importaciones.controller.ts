import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { WRITE_ROLES } from '../auth/constants/roles.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { LoginResponseUsuarioDto } from '../auth/dto/login-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { ConfirmarInfraccionesExcelDto } from './dto/confirmar-infracciones-excel.dto';
import { ImportacionInfraccionesQueryDto } from './dto/importacion-infracciones-query.dto';
import { PreviewInfraccionesExcelDto } from './dto/preview-infracciones-excel.dto';
import {
  ImportacionesService,
  type ImportacionDetalleResponse,
  type ImportacionPreviewResponse,
} from './importaciones.service';
import { ImportacionesReportesService } from './importaciones-reportes.service';

@ApiTags('importaciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Roles(...WRITE_ROLES)
@Controller('importaciones/infracciones')
export class ImportacionesController {
  constructor(
    private readonly importacionesService: ImportacionesService,
    private readonly reportesService: ImportacionesReportesService,
  ) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'anio', 'idRegion'],
      properties: {
        file: { type: 'string', format: 'binary' },
        anio: { type: 'integer', example: 2025 },
        idRegion: { type: 'integer', example: 1 },
        idDelegacionDefault: { type: 'integer', example: 1 },
        crearCatalogosFaltantes: { type: 'boolean', example: true },
        crearDelegacionesFaltantes: { type: 'boolean', example: true },
      },
    },
  })
  @ApiOperation({ summary: 'Previsualizar importacion de infracciones anual' })
  preview(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: PreviewInfraccionesExcelDto,
  ): Promise<ImportacionPreviewResponse> {
    return this.importacionesService.preview(file, dto);
  }

  @Post('confirmar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'anio', 'idRegion', 'modoDuplicados'],
      properties: {
        file: { type: 'string', format: 'binary' },
        anio: { type: 'integer', example: 2025 },
        idRegion: { type: 'integer', example: 1 },
        idDelegacionDefault: { type: 'integer', example: 1 },
        modoDuplicados: { type: 'string', enum: ['OMITIR', 'ERROR'] },
        crearCatalogosFaltantes: { type: 'boolean', example: true },
        crearDelegacionesFaltantes: { type: 'boolean', example: true },
        observaciones: { type: 'string', example: 'Importacion anual 2025' },
      },
    },
  })
  @ApiOperation({ summary: 'Confirmar importacion de infracciones anual' })
  confirmar(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ConfirmarInfraccionesExcelDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ): Promise<ImportacionDetalleResponse> {
    return this.importacionesService.confirmar(
      file,
      dto,
      currentUser.idUsuario,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar importaciones de infracciones' })
  findAll(@Query() query: ImportacionInfraccionesQueryDto) {
    return this.importacionesService.findAll(query);
  }

  @Get(':idImportacionInfracciones/resumen')
  @ApiOperation({ summary: 'Obtener resumen agrupado de la importacion' })
  getResumen(
    @Param('idImportacionInfracciones', ParseIntPipe)
    idImportacionInfracciones: number,
  ) {
    return this.reportesService.getResumenErrores(idImportacionInfracciones);
  }

  @Get(':idImportacionInfracciones/lista-errores')
  @ApiOperation({
    summary: 'Obtener listado paginado de incidencias de importacion',
  })
  getListaErrores(
    @Param('idImportacionInfracciones', ParseIntPipe)
    idImportacionInfracciones: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportesService.getErroresJson(idImportacionInfracciones, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':idImportacionInfracciones')
  @ApiOperation({ summary: 'Obtener detalle de una importacion' })
  findById(
    @Param('idImportacionInfracciones', ParseIntPipe)
    idImportacionInfracciones: number,
  ): Promise<ImportacionDetalleResponse> {
    return this.importacionesService.findByIdOrFail(idImportacionInfracciones);
  }
}
