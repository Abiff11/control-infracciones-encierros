import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type DeepPartial,
  type FindOptionsWhere,
  type ObjectLiteral,
  Repository,
} from 'typeorm';

import { ClaseVehiculo } from '../catalogos/entities/clase-vehiculo.entity';
import { Delegacion } from '../catalogos/entities/delegacion.entity';
import { EstatusInfraccion } from '../catalogos/entities/estatus-infraccion.entity';
import { LineaVehiculo } from '../catalogos/entities/linea-vehiculo.entity';
import { MarcaVehiculo } from '../catalogos/entities/marca-vehiculo.entity';
import { Operativo } from '../catalogos/entities/operativo.entity';
import { Region } from '../catalogos/entities/region.entity';
import { Servicio } from '../catalogos/entities/servicio.entity';
import { Sexo } from '../catalogos/entities/sexo.entity';
import { TipoProcedimiento } from '../catalogos/entities/tipo-procedimiento.entity';
import { Encierro } from '../encierros/entities/encierro.entity';
import { EncierrosService } from '../encierros/encierros.service';
import { Infraccion } from '../infracciones/entities/infraccion.entity';
import { InfraccionesService } from '../infracciones/infracciones.service';
import { Motivo } from '../motivos/entities/motivo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  ImportacionInfraccionError,
  ImportacionInfraccionErrorTipo,
} from './entities/importacion-infraccion-error.entity';
import {
  ImportacionInfracciones,
  ImportacionInfraccionesEstado,
  ImportacionInfraccionesModoDuplicados,
} from './entities/importacion-infracciones.entity';
import { ConfirmarInfraccionesExcelDto } from './dto/confirmar-infracciones-excel.dto';
import { ImportacionInfraccionesQueryDto } from './dto/importacion-infracciones-query.dto';
import { PreviewInfraccionesExcelDto } from './dto/preview-infracciones-excel.dto';
import {
  mapInfraccionesExcelRows,
  normalizeCatalogText,
  normalizeClaseVehiculoText,
  normalizeServicioText,
  normalizeSexoText,
  type NormalizedInfraccionesExcelRow,
  type RowIssue,
  RowIssueType,
  extractFolioResguardo,
  isVehiculoDetenido,
} from './utils/infracciones-excel-mapper';
import { parseInfraccionesWorkbook } from './utils/excel-infracciones-parser';

interface CatalogResolutionResult<T> {
  value: T | null;
  created: boolean;
  issue?: RowIssue;
}

interface ImportRowResult {
  valid: boolean;
  imported: boolean;
  omitted: boolean;
  issues: Array<RowIssue & { numeroFila: number }>;
}

interface PreviewRowOutput {
  numeroFila: number;
  delegacion: string | null;
  folioInfraccion: string | null;
  fechaInfraccion: string | null;
  horaInfraccion: string;
  sexo: string | null;
  servicio: string | null;
  clase: string | null;
  marca: string | null;
  linea: string | null;
  encierro: string | null;
  operativo: string | null;
  motivos: string[];
  soloInfraccionOVehiculoDetenido: string | null;
  issues: RowIssue[];
}

export interface ImportacionPreviewResponse {
  nombreArchivo: string;
  nombreHoja: string;
  totalFilas: number;
  columnasDetectadas: string[];
  primeras10Filas: PreviewRowOutput[];
  conteos: {
    delegacionesDetectadas: number;
    serviciosDetectados: number;
    clasesDetectadas: number;
    sexosDetectados: number;
    encierrosDetectados: number;
    motivosDetectados: number;
    motivosDesconocidos: number;
  };
  erroresPreliminares: Array<RowIssue & { numeroFila: number }>;
}

export interface ImportacionDetalleResponse {
  importacion: ImportacionInfracciones;
  errores: ImportacionInfraccionError[];
}

const CHUNK_SIZE = 250;
const MOTIVO_INVALIDO_WARNING = 'Motivo no encontrado en catalogo oficial.';

@Injectable()
export class ImportacionesService {
  constructor(
    @InjectRepository(ImportacionInfracciones)
    private readonly importacionesRepository: Repository<ImportacionInfracciones>,
    @InjectRepository(ImportacionInfraccionError)
    private readonly importacionErroresRepository: Repository<ImportacionInfraccionError>,
    @InjectRepository(Region)
    private readonly regionesRepository: Repository<Region>,
    @InjectRepository(Delegacion)
    private readonly delegacionesRepository: Repository<Delegacion>,
    @InjectRepository(Sexo)
    private readonly sexosRepository: Repository<Sexo>,
    @InjectRepository(Servicio)
    private readonly serviciosRepository: Repository<Servicio>,
    @InjectRepository(ClaseVehiculo)
    private readonly clasesVehiculoRepository: Repository<ClaseVehiculo>,
    @InjectRepository(MarcaVehiculo)
    private readonly marcasVehiculoRepository: Repository<MarcaVehiculo>,
    @InjectRepository(LineaVehiculo)
    private readonly lineasVehiculoRepository: Repository<LineaVehiculo>,
    @InjectRepository(TipoProcedimiento)
    private readonly tiposProcedimientoRepository: Repository<TipoProcedimiento>,
    @InjectRepository(Operativo)
    private readonly operativosRepository: Repository<Operativo>,
    @InjectRepository(Encierro)
    private readonly encierrosRepository: Repository<Encierro>,
    @InjectRepository(EstatusInfraccion)
    private readonly estatusInfraccionRepository: Repository<EstatusInfraccion>,
    @InjectRepository(Motivo)
    private readonly motivosRepository: Repository<Motivo>,
    @InjectRepository(Infraccion)
    private readonly infraccionesRepository: Repository<Infraccion>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly infraccionesService: InfraccionesService,
    private readonly encierrosService: EncierrosService,
  ) {}

  async preview(
    file: Express.Multer.File,
    dto: PreviewInfraccionesExcelDto,
  ): Promise<ImportacionPreviewResponse> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar el archivo Excel.');
    }

    const workbook = parseInfraccionesWorkbook(file.buffer, file.originalname);
    const normalizedRows = mapInfraccionesExcelRows(workbook.rows, dto.anio);
    const officialMotivos = await this.getOfficialMotivosByKey();

    const unknownMotivos = new Set<string>();
    const errors: Array<RowIssue & { numeroFila: number }> = [];
    const delegaciones = new Set<string>();
    const servicios = new Set<string>();
    const clases = new Set<string>();
    const sexos = new Set<string>();
    const encierros = new Set<string>();
    const motivos = new Set<string>();

    for (const row of normalizedRows) {
      this.collectPreviewSets(row, {
        delegaciones,
        servicios,
        clases,
        sexos,
        encierros,
        motivos,
      });

      for (const issue of row.issues) {
        errors.push({ ...issue, numeroFila: row.numeroFila });
      }

      for (const motivoKey of row.motivos) {
        if (!officialMotivos.has(motivoKey)) {
          unknownMotivos.add(motivoKey);
          errors.push({
            numeroFila: row.numeroFila,
            tipo: RowIssueType.ERROR,
            campo: 'motivos',
            valor: motivoKey,
            mensaje: MOTIVO_INVALIDO_WARNING,
          });
        }
      }
    }

    return {
      nombreArchivo: workbook.nombreArchivo,
      nombreHoja: workbook.nombreHoja,
      totalFilas: workbook.totalFilas,
      columnasDetectadas: workbook.columnasDetectadas,
      primeras10Filas: normalizedRows
        .slice(0, 10)
        .map((row) => this.buildPreviewRow(row)),
      conteos: {
        delegacionesDetectadas: delegaciones.size,
        serviciosDetectados: servicios.size,
        clasesDetectadas: clases.size,
        sexosDetectados: sexos.size,
        encierrosDetectados: encierros.size,
        motivosDetectados: motivos.size,
        motivosDesconocidos: unknownMotivos.size,
      },
      erroresPreliminares: errors.slice(0, 200),
    };
  }

  async confirmar(
    file: Express.Multer.File,
    dto: ConfirmarInfraccionesExcelDto,
    idUsuario: number,
  ): Promise<ImportacionDetalleResponse> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar el archivo Excel.');
    }

    const workbook = parseInfraccionesWorkbook(file.buffer, file.originalname);
    const normalizedRows = mapInfraccionesExcelRows(workbook.rows, dto.anio);
    const region = await this.findRegionByIdOrFail(dto.idRegion);
    const delegacionDefault = dto.idDelegacionDefault
      ? await this.findDelegacionByIdOrFail(dto.idDelegacionDefault)
      : null;
    const creator = await this.findUsuarioByIdOrFail(idUsuario);
    const officialMotivos = await this.getOfficialMotivosByKey();

    const importacion = await this.importacionesRepository.save(
      this.importacionesRepository.create({
        anio: dto.anio,
        region,
        delegacionDefault,
        nombreArchivo: workbook.nombreArchivo,
        nombreHoja: workbook.nombreHoja,
        totalFilas: workbook.totalFilas,
        filasValidas: 0,
        filasImportadas: 0,
        filasConError: 0,
        filasOmitidas: 0,
        estado: ImportacionInfraccionesEstado.PREVIEW,
        modoDuplicados: dto.modoDuplicados,
        crearCatalogosFaltantes: dto.crearCatalogosFaltantes,
        crearDelegacionesFaltantes: dto.crearDelegacionesFaltantes,
        creadoPorUsuario: creator,
        fechaImportacion: null,
        observaciones: dto.observaciones?.trim() || null,
      }),
    );

    const errorsToPersist: ImportacionInfraccionError[] = [];
    let filasValidas = 0;
    let filasImportadas = 0;
    let filasConError = 0;
    let filasOmitidas = 0;

    try {
      for (const chunk of this.chunkRows(normalizedRows, CHUNK_SIZE)) {
        for (const row of chunk) {
          const result = await this.processRow({
            row,
            dto,
            region,
            delegacionDefault,
            officialMotivos,
            idUsuario,
            importacion,
          });

          filasValidas += result.valid ? 1 : 0;
          filasImportadas += result.imported ? 1 : 0;
          filasConError += result.issues.some(
            (issue) => issue.tipo === RowIssueType.ERROR,
          )
            ? 1
            : 0;
          filasOmitidas += result.omitted ? 1 : 0;

          for (const issue of result.issues) {
            errorsToPersist.push(
              this.importacionErroresRepository.create({
                importacionInfracciones: importacion,
                numeroFila: issue.numeroFila,
                tipo:
                  issue.tipo === RowIssueType.ADVERTENCIA
                    ? ImportacionInfraccionErrorTipo.ADVERTENCIA
                    : ImportacionInfraccionErrorTipo.ERROR,
                campo: issue.campo,
                valor: issue.valor,
                mensaje: issue.mensaje,
                rawRow: row.rawRow,
              }),
            );
          }
        }

        if (errorsToPersist.length > 0) {
          await this.importacionErroresRepository.save(errorsToPersist);
          errorsToPersist.length = 0;
        }
      }

      importacion.filasValidas = filasValidas;
      importacion.filasImportadas = filasImportadas;
      importacion.filasConError = filasConError;
      importacion.filasOmitidas = filasOmitidas;
      importacion.estado =
        filasImportadas === 0 && filasConError > 0
          ? ImportacionInfraccionesEstado.FALLIDA
          : filasConError > 0 || filasOmitidas > 0
            ? ImportacionInfraccionesEstado.IMPORTADA_CON_ERRORES
            : ImportacionInfraccionesEstado.IMPORTADA;
      importacion.fechaImportacion = new Date();

      await this.importacionesRepository.save(importacion);

      return this.findByIdOrFail(importacion.idImportacionInfracciones);
    } catch (error) {
      importacion.estado = ImportacionInfraccionesEstado.FALLIDA;
      importacion.observaciones = this.appendObservation(
        importacion.observaciones,
        error instanceof Error
          ? error.message
          : 'Error desconocido en la importacion',
      );
      importacion.fechaImportacion = new Date();
      await this.importacionesRepository.save(importacion);
      throw error;
    }
  }

  async findAll(
    query: ImportacionInfraccionesQueryDto,
  ): Promise<ImportacionInfracciones[]> {
    return this.importacionesRepository.find({
      where: {
        anio: query.anio,
        estado: query.estado,
        region: query.idRegion ? { idRegion: query.idRegion } : undefined,
        delegacionDefault: query.idDelegacion
          ? { idDelegacion: query.idDelegacion }
          : undefined,
      },
      relations: {
        region: true,
        delegacionDefault: true,
        creadoPorUsuario: true,
      },
      order: {
        fechaCreacion: 'DESC',
      },
    });
  }

  async findByIdOrFail(
    idImportacionInfracciones: number,
  ): Promise<ImportacionDetalleResponse> {
    const importacion = await this.importacionesRepository.findOne({
      where: { idImportacionInfracciones },
      relations: {
        region: true,
        delegacionDefault: true,
        creadoPorUsuario: true,
        errores: true,
      },
    });

    if (!importacion) {
      throw new NotFoundException(
        `Importacion ${idImportacionInfracciones} no encontrada`,
      );
    }

    importacion.errores = [...(importacion.errores ?? [])].sort(
      (left, right) => left.numeroFila - right.numeroFila,
    );

    return {
      importacion,
      errores: importacion.errores,
    };
  }

  private async processRow(params: {
    row: NormalizedInfraccionesExcelRow;
    dto: ConfirmarInfraccionesExcelDto;
    region: Region;
    delegacionDefault: Delegacion | null;
    officialMotivos: Map<string, Motivo>;
    idUsuario: number;
    importacion: ImportacionInfracciones;
  }): Promise<ImportRowResult> {
    const issues: Array<RowIssue & { numeroFila: number }> =
      params.row.issues.map((issue) => ({
        ...issue,
        numeroFila: params.row.numeroFila,
      }));

    if (params.row.issues.some((issue) => issue.tipo === RowIssueType.ERROR)) {
      return {
        valid: false,
        imported: false,
        omitted: false,
        issues,
      };
    }

    if (
      !params.row.fechaInfraccion ||
      !params.row.folioInfraccion ||
      !params.row.nombres ||
      !params.row.apellidoPaterno ||
      !params.row.municipio ||
      !params.row.sexo
    ) {
      issues.push({
        numeroFila: params.row.numeroFila,
        tipo: RowIssueType.ERROR,
        campo: 'requeridos',
        valor: params.row.folioInfraccion ?? params.row.fechaInfraccion,
        mensaje: 'La fila no tiene los campos requeridos para importar.',
      });
      return {
        valid: false,
        imported: false,
        omitted: false,
        issues,
      };
    }

    const existingInfraccion = await this.infraccionesRepository.findOne({
      where: { folioInfraccion: params.row.folioInfraccion },
    });

    if (existingInfraccion) {
      if (
        params.dto.modoDuplicados ===
        ImportacionInfraccionesModoDuplicados.OMITIR
      ) {
        issues.push({
          numeroFila: params.row.numeroFila,
          tipo: RowIssueType.ADVERTENCIA,
          campo: 'folioInfraccion',
          valor: params.row.folioInfraccion,
          mensaje: 'El folio ya existe. La fila se omite.',
        });
        return {
          valid: true,
          imported: false,
          omitted: true,
          issues,
        };
      }

      issues.push({
        numeroFila: params.row.numeroFila,
        tipo: RowIssueType.ERROR,
        campo: 'folioInfraccion',
        valor: params.row.folioInfraccion,
        mensaje: 'El folio ya existe. No se importara la fila.',
      });
      return {
        valid: false,
        imported: false,
        omitted: false,
        issues,
      };
    }

    const resolvedDelegacion = await this.resolveDelegacion(
      params.row.delegacion,
      params.region,
      params.dto.crearDelegacionesFaltantes,
      params.delegacionDefault,
    );
    if (resolvedDelegacion.issue) {
      issues.push({
        ...resolvedDelegacion.issue,
        numeroFila: params.row.numeroFila,
      });
    }

    const resolvedSexo = await this.resolveSimpleCatalog(
      this.sexosRepository,
      normalizeSexoText(params.row.sexo),
      params.dto.crearCatalogosFaltantes,
      'nombreSexo',
      'Sexo',
    );
    if (resolvedSexo.issue) {
      issues.push({ ...resolvedSexo.issue, numeroFila: params.row.numeroFila });
    }

    const resolvedServicio = await this.resolveSimpleCatalog(
      this.serviciosRepository,
      normalizeServicioText(params.row.servicio),
      params.dto.crearCatalogosFaltantes,
      'nombreServicio',
      'Servicio',
    );
    if (resolvedServicio.issue) {
      issues.push({
        ...resolvedServicio.issue,
        numeroFila: params.row.numeroFila,
      });
    }

    const resolvedClase = await this.resolveSimpleCatalog(
      this.clasesVehiculoRepository,
      normalizeClaseVehiculoText(params.row.clase),
      params.dto.crearCatalogosFaltantes,
      'nombreClaseVehiculo',
      'Clase vehiculo',
    );
    if (resolvedClase.issue) {
      issues.push({
        ...resolvedClase.issue,
        numeroFila: params.row.numeroFila,
      });
    }

    const resolvedMarca = await this.resolveSimpleCatalog(
      this.marcasVehiculoRepository,
      normalizeCatalogText(params.row.marca),
      params.dto.crearCatalogosFaltantes,
      'nombreMarcaVehiculo',
      'Marca vehiculo',
    );
    if (resolvedMarca.issue) {
      issues.push({
        ...resolvedMarca.issue,
        numeroFila: params.row.numeroFila,
      });
    }

    const resolvedLinea = await this.resolveLineaVehiculo(
      resolvedMarca.value,
      normalizeCatalogText(params.row.tipo),
      params.dto.crearCatalogosFaltantes,
    );
    if (resolvedLinea.issue) {
      issues.push({
        ...resolvedLinea.issue,
        numeroFila: params.row.numeroFila,
      });
    }

    const resolvedTipoProcedimiento = await this.resolveSimpleCatalog(
      this.tiposProcedimientoRepository,
      'INFRACCION',
      params.dto.crearCatalogosFaltantes,
      'nombreTipoProcedimiento',
      'Tipo procedimiento',
    );
    if (resolvedTipoProcedimiento.issue) {
      issues.push({
        ...resolvedTipoProcedimiento.issue,
        numeroFila: params.row.numeroFila,
      });
    }

    const resolvedEstatus = await this.resolveSimpleCatalog(
      this.estatusInfraccionRepository,
      'CAPTURADA',
      params.dto.crearCatalogosFaltantes,
      'nombreEstatus',
      'Estatus infraccion',
    );
    if (resolvedEstatus.issue) {
      issues.push({
        ...resolvedEstatus.issue,
        numeroFila: params.row.numeroFila,
      });
    }

    const resolvedOperativo = await this.resolveOperativo(
      params.row.operativo,
      params.dto.crearCatalogosFaltantes,
    );
    if (resolvedOperativo.issue) {
      issues.push({
        ...resolvedOperativo.issue,
        numeroFila: params.row.numeroFila,
      });
    }

    const motivosResolvidos = this.resolveMotivos(
      params.row.motivos,
      params.row.numeroFila,
      params.officialMotivos,
    );
    issues.push(...motivosResolvidos.issues);

    if (
      !resolvedSexo.value ||
      !resolvedServicio.value ||
      !resolvedClase.value ||
      !resolvedLinea.value ||
      !resolvedDelegacion.value ||
      !resolvedTipoProcedimiento.value ||
      !resolvedEstatus.value ||
      !resolvedOperativo.value
    ) {
      issues.push({
        numeroFila: params.row.numeroFila,
        tipo: RowIssueType.ERROR,
        campo: 'catalogos',
        valor: null,
        mensaje: 'Faltan catalogos obligatorios para importar la fila.',
      });
      return {
        valid: false,
        imported: false,
        omitted: false,
        issues,
      };
    }

    if (!motivosResolvidos.motivos.length) {
      issues.push({
        numeroFila: params.row.numeroFila,
        tipo: RowIssueType.ERROR,
        campo: 'motivos',
        valor: params.row.motivos.join(', '),
        mensaje: 'La fila no tiene motivos validos.',
      });
      return {
        valid: false,
        imported: false,
        omitted: false,
        issues,
      };
    }

    const infraccionResponse =
      (await this.infraccionesService.crearInfraccionCompleta(
        {
          infractor: {
            idSexo: resolvedSexo.value.idSexo,
            nombre: params.row.nombres ?? '',
            apellidoPaterno: params.row.apellidoPaterno ?? '',
            apellidoMaterno: params.row.apellidoMaterno ?? null,
            licencia: params.row.licencia ?? null,
            curp: null,
          },
          vehiculo: {
            idClaseVehiculo: resolvedClase.value.idClaseVehiculo,
            idLineaVehiculo: resolvedLinea.value.idLineaVehiculo,
            idServicio: resolvedServicio.value.idServicio,
            anioModelo: params.row.modelo ?? null,
            sitioServicioPublico: params.row.sitioServicioPublico ?? null,
            color: params.row.color ?? null,
            placas: params.row.placas ?? null,
            estadoPlacas: params.row.estado ?? null,
            serie: params.row.serie ?? null,
            motor: params.row.motor ?? null,
          },
          lugarInfraccion: {
            municipio: params.row.municipio ?? '',
            colonia: params.row.colonia ?? null,
            calle: params.row.calle ?? null,
            numero: null,
          },
          infraccion: {
            idDelegacion: resolvedDelegacion.value.idDelegacion,
            idTipoProcedimiento:
              resolvedTipoProcedimiento.value.idTipoProcedimiento,
            idEstatusInfraccion: resolvedEstatus.value.idEstatusInfraccion,
            idOperativo: resolvedOperativo.value.idOperativo,
            folioInfraccion: params.row.folioInfraccion,
            fechaInfraccion: params.row.fechaInfraccion,
            horaInfraccion: params.row.hora,
            observaciones: params.row.observaciones ?? null,
            clavePolicia: params.row.clavePolicia ?? null,
            numParteInformativo: params.row.numParteInformativo ?? null,
            motivos: motivosResolvidos.motivos.map((motivo) => motivo.idMotivo),
          },
        },
        params.idUsuario,
      )) as { infraccion: { idInfraccion: number } };

    const shouldCreateRetencion = isVehiculoDetenido(
      params.row.soloInfraccionOVehiculoDetenido,
    );

    if (shouldCreateRetencion) {
      const resolvedEncierro = await this.resolveEncierro(
        params.row.encierro,
        params.dto.crearCatalogosFaltantes,
      );

      if (resolvedEncierro.issue) {
        issues.push({
          ...resolvedEncierro.issue,
          numeroFila: params.row.numeroFila,
        });
      } else if (resolvedEncierro.value) {
        try {
          await this.encierrosService.registrarRetencion({
            idInfraccion: infraccionResponse.infraccion.idInfraccion,
            idEncierro: resolvedEncierro.value.idEncierro,
            recibidoPor: 'IMPORTACION ANUAL',
            fechaIngreso: `${params.row.fechaInfraccion}T${params.row.hora}`,
            folioResguardo: extractFolioResguardo(params.row.observaciones),
            observacionesIngreso: params.row.observaciones ?? null,
            estadoIngreso: 'IMPORTADO',
          });
        } catch (error) {
          issues.push({
            numeroFila: params.row.numeroFila,
            tipo: RowIssueType.ADVERTENCIA,
            campo: 'retencion',
            valor: params.row.encierro,
            mensaje:
              error instanceof Error
                ? error.message
                : 'No se pudo crear la retencion vehicular.',
          });
        }
      }
    }

    return {
      valid: true,
      imported: true,
      omitted: false,
      issues,
    };
  }

  private resolveMotivos(
    motivosClaves: string[],
    numeroFila: number,
    officialMotivos: Map<string, Motivo>,
  ): { motivos: Motivo[]; issues: Array<RowIssue & { numeroFila: number }> } {
    const issues: Array<RowIssue & { numeroFila: number }> = [];
    const motivos: Motivo[] = [];
    const seen = new Set<string>();

    for (const motivoKey of motivosClaves) {
      if (seen.has(motivoKey)) {
        continue;
      }
      seen.add(motivoKey);

      if (!motivoKey) {
        continue;
      }

      const motivo = officialMotivos.get(motivoKey);

      if (!motivo) {
        issues.push({
          numeroFila,
          tipo: RowIssueType.ERROR,
          campo: 'motivos',
          valor: motivoKey,
          mensaje: MOTIVO_INVALIDO_WARNING,
        });
        continue;
      }

      motivos.push(motivo);
    }

    return { motivos, issues };
  }

  private async resolveDelegacion(
    delegacionName: string | null,
    region: Region,
    crearDelegacionesFaltantes: boolean,
    delegacionDefault: Delegacion | null,
  ): Promise<CatalogResolutionResult<Delegacion>> {
    if (!delegacionName && delegacionDefault) {
      return { value: delegacionDefault, created: false };
    }

    const normalizedName = delegacionName
      ? delegacionName.trim().toUpperCase()
      : null;

    if (!normalizedName) {
      return {
        value: null,
        created: false,
        issue: {
          tipo: RowIssueType.ERROR,
          campo: 'delegacion',
          valor: null,
          mensaje:
            'La fila no tiene delegacion y no existe una delegacion default.',
        },
      };
    }

    const existing = await this.delegacionesRepository.findOne({
      where: {
        region: { idRegion: region.idRegion },
        nombreDelegacion: normalizedName,
      },
    });

    if (existing) {
      return { value: existing, created: false };
    }

    if (!crearDelegacionesFaltantes) {
      return {
        value: null,
        created: false,
        issue: {
          tipo: RowIssueType.ERROR,
          campo: 'delegacion',
          valor: normalizedName,
          mensaje:
            'La delegacion no existe y la creacion automatica esta deshabilitada.',
        },
      };
    }

    const created = await this.delegacionesRepository.save(
      this.delegacionesRepository.create({
        region,
        nombreDelegacion: normalizedName,
      }),
    );

    return { value: created, created: true };
  }

  private async resolveOperativo(
    operativoName: string | null,
    crearCatalogosFaltantes: boolean,
  ): Promise<CatalogResolutionResult<Operativo>> {
    const normalizedName =
      operativoName?.trim().toUpperCase() || 'OPERATIVO GENERAL';
    const existing = await this.operativosRepository.findOne({
      where: { nombreOperativo: normalizedName },
    });

    if (existing) {
      return { value: existing, created: false };
    }

    if (!crearCatalogosFaltantes && normalizedName !== 'OPERATIVO GENERAL') {
      return {
        value: null,
        created: false,
        issue: {
          tipo: RowIssueType.ERROR,
          campo: 'operativo',
          valor: normalizedName,
          mensaje:
            'El operativo no existe y la creacion automatica esta deshabilitada.',
        },
      };
    }

    const created = await this.operativosRepository.save(
      this.operativosRepository.create({
        nombreOperativo: normalizedName,
      }),
    );

    return { value: created, created: true };
  }

  private async resolveEncierro(
    encierroName: string | null,
    crearCatalogosFaltantes: boolean,
  ): Promise<CatalogResolutionResult<Encierro>> {
    const normalizedName = encierroName?.trim().toUpperCase() || null;

    if (!normalizedName) {
      return {
        value: null,
        created: false,
        issue: {
          tipo: RowIssueType.ADVERTENCIA,
          campo: 'encierro',
          valor: null,
          mensaje: 'La fila indica vehiculo detenido pero no trae encierro.',
        },
      };
    }

    const existing = await this.encierrosRepository.findOne({
      where: { nombreEncierro: normalizedName },
    });

    if (existing) {
      return { value: existing, created: false };
    }

    if (!crearCatalogosFaltantes) {
      return {
        value: null,
        created: false,
        issue: {
          tipo: RowIssueType.ADVERTENCIA,
          campo: 'encierro',
          valor: normalizedName,
          mensaje: 'No se pudo resolver el encierro para la retencion.',
        },
      };
    }

    const created = await this.encierrosRepository.save(
      this.encierrosRepository.create({
        nombreEncierro: normalizedName,
      }),
    );

    return { value: created, created: true };
  }

  private async resolveLineaVehiculo(
    marcaVehiculo: MarcaVehiculo | null,
    lineaName: string | null,
    crearCatalogosFaltantes: boolean,
  ): Promise<CatalogResolutionResult<LineaVehiculo>> {
    if (!marcaVehiculo || !lineaName) {
      return {
        value: null,
        created: false,
        issue: {
          tipo: RowIssueType.ERROR,
          campo: 'lineaVehiculo',
          valor: lineaName,
          mensaje: 'No se pudo resolver la linea vehicular.',
        },
      };
    }

    const existing = await this.lineasVehiculoRepository.findOne({
      where: {
        marcaVehiculo: { idMarcaVehiculo: marcaVehiculo.idMarcaVehiculo },
        nombreLineaVehiculo: lineaName,
      },
    });

    if (existing) {
      return { value: existing, created: false };
    }

    if (!crearCatalogosFaltantes) {
      return {
        value: null,
        created: false,
        issue: {
          tipo: RowIssueType.ERROR,
          campo: 'lineaVehiculo',
          valor: lineaName,
          mensaje:
            'La linea no existe y la creacion automatica esta deshabilitada.',
        },
      };
    }

    const created = await this.lineasVehiculoRepository.save(
      this.lineasVehiculoRepository.create({
        marcaVehiculo,
        nombreLineaVehiculo: lineaName,
      }),
    );

    return { value: created, created: true };
  }

  private async resolveSimpleCatalog<T extends ObjectLiteral>(
    repository: Repository<T>,
    value: string | null,
    crearCatalogosFaltantes: boolean,
    propertyName: keyof T & string,
    label: string,
  ): Promise<CatalogResolutionResult<T>> {
    if (!value) {
      return {
        value: null,
        created: false,
        issue: {
          tipo: RowIssueType.ERROR,
          campo: String(propertyName),
          valor: null,
          mensaje: `No se pudo resolver ${label.toLowerCase()}.`,
        },
      };
    }

    const criteria = { [propertyName]: value } as FindOptionsWhere<T>;
    const existing = await repository.findOne({
      where: criteria,
    });

    if (existing) {
      return { value: existing, created: false };
    }

    if (!crearCatalogosFaltantes) {
      return {
        value: null,
        created: false,
        issue: {
          tipo: RowIssueType.ERROR,
          campo: String(propertyName),
          valor: value,
          mensaje: `${label} no existe y la creacion automatica esta deshabilitada.`,
        },
      };
    }

    const created = await repository.save(
      repository.create(criteria as DeepPartial<T>),
    );

    return { value: created, created: true };
  }

  private async getOfficialMotivosByKey(): Promise<Map<string, Motivo>> {
    const motivos = await this.motivosRepository.find();
    return new Map(motivos.map((motivo) => [motivo.nombreMotivo, motivo]));
  }

  private collectPreviewSets(
    row: NormalizedInfraccionesExcelRow,
    sets: {
      delegaciones: Set<string>;
      servicios: Set<string>;
      clases: Set<string>;
      sexos: Set<string>;
      encierros: Set<string>;
      motivos: Set<string>;
    },
  ): void {
    if (row.delegacion) {
      sets.delegaciones.add(row.delegacion);
    }
    if (row.servicio) {
      sets.servicios.add(row.servicio);
    }
    if (row.clase) {
      sets.clases.add(row.clase);
    }
    if (row.sexo) {
      sets.sexos.add(row.sexo);
    }
    if (row.encierro) {
      sets.encierros.add(row.encierro);
    }
    for (const motivo of row.motivos) {
      sets.motivos.add(motivo);
    }
  }

  private buildPreviewRow(
    row: NormalizedInfraccionesExcelRow,
  ): PreviewRowOutput {
    return {
      numeroFila: row.numeroFila,
      delegacion: row.delegacion,
      folioInfraccion: row.folioInfraccion,
      fechaInfraccion: row.fechaInfraccion,
      horaInfraccion: row.hora,
      sexo: row.sexo,
      servicio: row.servicio,
      clase: row.clase,
      marca: row.marca,
      linea: row.tipo,
      encierro: row.encierro,
      operativo: row.operativo,
      motivos: row.motivos,
      soloInfraccionOVehiculoDetenido: row.soloInfraccionOVehiculoDetenido,
      issues: row.issues,
    };
  }

  private chunkRows<T>(rows: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let index = 0; index < rows.length; index += size) {
      chunks.push(rows.slice(index, index + size));
    }

    return chunks;
  }

  private appendObservation(existing: string | null, message: string): string {
    return [existing, message].filter(Boolean).join(' | ');
  }

  private async findRegionByIdOrFail(idRegion: number): Promise<Region> {
    const region = await this.regionesRepository.findOne({
      where: { idRegion },
    });

    if (!region) {
      throw new NotFoundException(`Region ${idRegion} no encontrada`);
    }

    return region;
  }

  private async findDelegacionByIdOrFail(
    idDelegacion: number,
  ): Promise<Delegacion> {
    const delegacion = await this.delegacionesRepository.findOne({
      where: { idDelegacion },
    });

    if (!delegacion) {
      throw new NotFoundException(`Delegacion ${idDelegacion} no encontrada`);
    }

    return delegacion;
  }

  private async findUsuarioByIdOrFail(idUsuario: number): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { idUsuario },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario ${idUsuario} no encontrado`);
    }

    return usuario;
  }
}
