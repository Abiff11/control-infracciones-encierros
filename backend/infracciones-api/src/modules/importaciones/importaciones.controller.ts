import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';

import { IMPORT_ROLES } from '../auth/constants/roles.constants';
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
  type UploadedImportFile,
  type ImportacionDetalleResponse,
  type ImportacionPreviewResponse,
} from './importaciones.service';
import { ImportacionesReportesService } from './importaciones-reportes.service';

const MAX_EXCEL_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const EXCEL_EXTENSIONS = new Set(['.xls', '.xlsx']);
const EXCEL_MIME_TYPES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const IMPORT_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

function getSafeFileExtension(filename: string): string {
  const normalized = filename.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');

  if (dotIndex < 0) {
    return '';
  }

  return normalized.slice(dotIndex);
}

function hasExcelSignature(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false;
  }

  const isZipBasedXlsx = buffer[0] === 0x50 && buffer[1] === 0x4b;
  const isLegacyXls =
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0;

  return isZipBasedXlsx || isLegacyXls;
}

function validateExcelUpload(file: UploadedImportFile): void {
  if (!file) {
    throw new BadRequestException('Debes adjuntar el archivo Excel.');
  }

  if (file.size > MAX_EXCEL_FILE_SIZE_BYTES) {
    throw new BadRequestException('El archivo Excel no debe exceder 10 MB.');
  }

  if (file.originalname.includes('/') || file.originalname.includes('\\')) {
    throw new BadRequestException('El nombre del archivo no es valido.');
  }

  const extension = getSafeFileExtension(file.originalname);

  if (!EXCEL_EXTENSIONS.has(extension)) {
    throw new BadRequestException('Solo se permiten archivos .xls o .xlsx.');
  }

  if (file.mimetype && !EXCEL_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException(
      'El tipo MIME del archivo no corresponde a Excel.',
    );
  }

  if (!hasExcelSignature(file.buffer)) {
    throw new BadRequestException(
      'La firma real del archivo no corresponde a Excel.',
    );
  }
}

@ApiTags('importaciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Roles(...IMPORT_ROLES)
@Controller('importaciones/infracciones')
export class ImportacionesController {
  constructor(
    private readonly importacionesService: ImportacionesService,
    private readonly reportesService: ImportacionesReportesService,
    private readonly configService: ConfigService,
  ) {}

  @Post('preview')
  @Throttle(IMPORT_THROTTLE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_EXCEL_FILE_SIZE_BYTES },
    }),
  )
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
    @UploadedFile() file: UploadedImportFile,
    @Body() dto: PreviewInfraccionesExcelDto,
  ): Promise<ImportacionPreviewResponse> {
    this.assertExcelImportEnabled();
    validateExcelUpload(file);
    return this.importacionesService.preview(file, dto);
  }

  @Post('confirmar')
  @Throttle(IMPORT_THROTTLE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_EXCEL_FILE_SIZE_BYTES },
    }),
  )
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
    @UploadedFile() file: UploadedImportFile,
    @Body() dto: ConfirmarInfraccionesExcelDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ): Promise<ImportacionDetalleResponse> {
    this.assertExcelImportEnabled();
    validateExcelUpload(file);
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

  private assertExcelImportEnabled(): void {
    const enabled =
      this.configService.get<string>('ENABLE_EXCEL_IMPORT', 'false') === 'true';

    if (!enabled) {
      throw new ForbiddenException(
        'La importacion masiva esta deshabilitada por configuracion.',
      );
    }
  }
}
