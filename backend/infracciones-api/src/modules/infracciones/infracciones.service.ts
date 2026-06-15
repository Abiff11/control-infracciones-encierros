import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { EstatusInfraccion } from '../catalogos/entities/estatus-infraccion.entity';
import { type ClaseVehiculo } from '../catalogos/entities/clase-vehiculo.entity';
import { type Delegacion } from '../catalogos/entities/delegacion.entity';
import { type LineaVehiculo } from '../catalogos/entities/linea-vehiculo.entity';
import { LugarInfraccion } from '../catalogos/entities/lugar-infraccion.entity';
import { Operativo } from '../catalogos/entities/operativo.entity';
import { type Servicio } from '../catalogos/entities/servicio.entity';
import { type TipoProcedimiento } from '../catalogos/entities/tipo-procedimiento.entity';
import { normalizeDate } from '../../common/utils/normalize-date';
import { Infractor } from '../infractores/entities/infractor.entity';
import { type Sexo } from '../catalogos/entities/sexo.entity';
import { LiberacionVehiculo } from '../liberaciones/entities/liberacion-vehiculo.entity';
import { PagoInfraccion } from '../pagos/entities/pago-infraccion.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { type EstatusInfraccionNombre } from './constants/estatus-infraccion.constants';
import { ACCION_MOVIMIENTO } from './constants/accion-movimiento.constants';
import { CreateInfraccionCompletaDto } from './dto/create-infraccion-completa.dto';
import { FindInfraccionesQueryDto } from './dto/find-infracciones-query.dto';
import { InfraccionFlujoResponseDto } from './dto/infraccion-flujo-response.dto';
import { InfraccionMotivo } from './entities/infraccion-motivo.entity';
import { InfraccionMovimiento } from './entities/infraccion-movimiento.entity';
import { Infraccion } from './entities/infraccion.entity';
import { Motivo } from '../motivos/entities/motivo.entity';
import { RetencionVehiculo } from '../encierros/entities/retencion-vehiculo.entity';
import { SalidaVehiculo } from '../encierros/entities/salida-vehiculo.entity';
import {
  ESTADO_OPERATIVO_VEHICULO,
  type EstadoOperativoVehiculo,
} from './constants/estado-operativo-vehiculo.constants';
import type { InfraccionDetalleResponseDto } from './dto/infraccion-detalle-response.dto';

interface RegistrarMovimientoParams {
  idInfraccion: number;
  idEstatusInfraccion: number;
  idUsuario: number;
  accion: string;
  observaciones?: string | null;
  fechaMovimiento?: string | Date;
}

interface ActualizarEstatusYRegistrarMovimientoParams {
  idInfraccion: number;
  nombreEstatus: EstatusInfraccionNombre;
  idUsuario: number;
  accion: string;
  observaciones?: string | null;
  fechaMovimiento?: string | Date;
}

@Injectable()
export class InfraccionesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Infraccion)
    private readonly infraccionesRepository: Repository<Infraccion>,
    @InjectRepository(InfraccionMotivo)
    private readonly infraccionMotivosRepository: Repository<InfraccionMotivo>,
    @InjectRepository(InfraccionMovimiento)
    private readonly infraccionMovimientosRepository: Repository<InfraccionMovimiento>,
    @InjectRepository(EstatusInfraccion)
    private readonly estatusInfraccionRepository: Repository<EstatusInfraccion>,
    @InjectRepository(PagoInfraccion)
    private readonly pagosRepository: Repository<PagoInfraccion>,
    @InjectRepository(LiberacionVehiculo)
    private readonly liberacionesRepository: Repository<LiberacionVehiculo>,
    @InjectRepository(RetencionVehiculo)
    private readonly retencionesRepository: Repository<RetencionVehiculo>,
    @InjectRepository(SalidaVehiculo)
    private readonly salidasRepository: Repository<SalidaVehiculo>,
  ) {}

  async findByIdOrFail(idInfraccion: number): Promise<Infraccion> {
    const infraccion = await this.buildBaseInfraccionQuery()
      .where('infraccion.idInfraccion = :idInfraccion', { idInfraccion })
      .getOne();

    if (!infraccion) {
      throw new NotFoundException(`Infraccion ${idInfraccion} no encontrada`);
    }

    return infraccion;
  }

  async findByFolioOrFail(folioInfraccion: string): Promise<Infraccion> {
    const normalizedFolio = folioInfraccion.trim();

    const infraccion = await this.buildBaseInfraccionQuery()
      .where('UPPER(infraccion.folioInfraccion) = UPPER(:folioInfraccion)', {
        folioInfraccion: normalizedFolio,
      })
      .getOne();

    if (!infraccion) {
      throw new NotFoundException(
        `Infraccion con folio ${normalizedFolio} no encontrada`,
      );
    }

    return infraccion;
  }

  async findMotivosByInfraccion(
    idInfraccion: number,
  ): Promise<InfraccionMotivo[]> {
    return this.infraccionMotivosRepository.find({
      where: {
        infraccion: { idInfraccion },
      },
      relations: {
        motivo: true,
      },
    });
  }

  async findAll(query: FindInfraccionesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const queryBuilder = this.buildBaseInfraccionQuery();

    this.applyInfraccionFilters(queryBuilder, query);

    const sortOrder = this.resolveSortOrder(query.sortOrder);
    const sortBy = this.resolveInfraccionesSortColumn(query.sortBy);

    const [data, total] = await queryBuilder
      .orderBy(sortBy, sortOrder)
      .addOrderBy('infraccion.horaInfraccion', sortOrder)
      .addOrderBy('infraccion.idInfraccion', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const estadoOperativoMap = await this.loadEstadoOperativoMap(
      data.map((item) => item.idInfraccion),
    );
    const motivosMap = await this.loadMotivosMap(
      data.map((item) => item.idInfraccion),
    );

    return {
      data: data.map((item) => ({
        idInfraccion: item.idInfraccion,
        folioInfraccion: item.folioInfraccion,
        fechaInfraccion: item.fechaInfraccion,
        horaInfraccion: item.horaInfraccion,
        observaciones: item.observaciones,
        clavePolicia: item.clavePolicia,
        numParteInformativo: item.numParteInformativo,
        infractor: {
          nombre: item.infractor.nombre,
          apellidoPaterno: item.infractor.apellidoPaterno,
          apellidoMaterno: item.infractor.apellidoMaterno,
          licencia: item.infractor.licencia,
        },
        vehiculo: {
          placas: item.vehiculo.placas,
          estadoPlacas: item.vehiculo.estadoPlacas,
          serie: item.vehiculo.serie,
          motor: item.vehiculo.motor,
          color: item.vehiculo.color,
        },
        region: {
          idRegion: item.delegacion.region.idRegion,
          nombreRegion: item.delegacion.region.nombreRegion,
        },
        delegacion: {
          idDelegacion: item.delegacion.idDelegacion,
          nombreDelegacion: item.delegacion.nombreDelegacion,
        },
        estatusInfraccion: {
          idEstatusInfraccion: item.estatusInfraccion.idEstatusInfraccion,
          nombreEstatus: item.estatusInfraccion.nombreEstatus,
        },
        tipoProcedimiento: {
          idTipoProcedimiento: item.tipoProcedimiento.idTipoProcedimiento,
          nombreTipoProcedimiento:
            item.tipoProcedimiento.nombreTipoProcedimiento,
        },
        motivos: motivosMap.get(item.idInfraccion) ?? [],
        estadoOperativoCalculado:
          estadoOperativoMap.get(item.idInfraccion) ??
          this.resolveEstadoOperativo({
            hasRetencion: false,
            hasPago: false,
            hasLiberacion: false,
            hasSalida: false,
          }),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findFlujoByInfraccion(
    folioInfraccion: string,
  ): Promise<InfraccionFlujoResponseDto> {
    const infraccion = await this.findByFolioOrFail(folioInfraccion);
    const idInfraccion = infraccion.idInfraccion;
    const [motivos, pagos, liberaciones, retenciones, movimientos] =
      await Promise.all([
        this.findMotivosByInfraccion(idInfraccion),
        this.pagosRepository.find({
          where: {
            infraccion: { idInfraccion },
          },
          relations: {
            infraccion: true,
            usuarioRegistraPago: true,
          },
          order: {
            fechaPago: 'DESC',
          },
        }),
        this.liberacionesRepository.find({
          where: {
            infraccion: { idInfraccion },
          },
          relations: {
            infraccion: true,
            pagoInfraccion: true,
            usuarioLibera: true,
          },
          order: {
            fechaLiberacion: 'DESC',
          },
        }),
        this.retencionesRepository.find({
          where: {
            infraccion: { idInfraccion },
          },
          relations: {
            infraccion: true,
            encierro: true,
          },
          order: {
            fechaIngreso: 'DESC',
          },
        }),
        this.findMovimientosByInfraccion(idInfraccion),
      ]);

    const retencionIds = retenciones.map(
      (retencion) => retencion.idRetencionVehiculo,
    );
    const salidas =
      retencionIds.length === 0
        ? []
        : await this.salidasRepository.find({
            where: {
              retencionVehiculo: {
                idRetencionVehiculo: In(retencionIds),
              },
            },
            relations: {
              retencionVehiculo: true,
              liberacionVehiculo: true,
              usuarioValidaSalida: true,
            },
            order: {
              fechaSalida: 'DESC',
            },
          });

    return {
      infraccion,
      motivos,
      pagos,
      liberaciones,
      retenciones,
      salidas,
      movimientos,
    };
  }

  async findDetalleCompletoByInfraccion(
    idInfraccion: number,
  ): Promise<InfraccionDetalleResponseDto> {
    const infraccion = await this.buildBaseInfraccionQuery()
      .where('infraccion.idInfraccion = :idInfraccion', { idInfraccion })
      .getOne();

    if (!infraccion) {
      throw new NotFoundException(`Infraccion ${idInfraccion} no encontrada`);
    }

    const [motivos, pagos, liberaciones, retenciones, movimientos] =
      await Promise.all([
        this.findMotivosByInfraccion(idInfraccion),
        this.pagosRepository.find({
          where: {
            infraccion: { idInfraccion },
          },
          relations: {
            infraccion: true,
            usuarioRegistraPago: true,
          },
          order: {
            fechaPago: 'DESC',
          },
        }),
        this.liberacionesRepository.find({
          where: {
            infraccion: { idInfraccion },
          },
          relations: {
            infraccion: true,
            pagoInfraccion: true,
            usuarioLibera: true,
          },
          order: {
            fechaLiberacion: 'DESC',
          },
        }),
        this.retencionesRepository.find({
          where: {
            infraccion: { idInfraccion },
          },
          relations: {
            infraccion: true,
            encierro: true,
          },
          order: {
            fechaIngreso: 'DESC',
          },
        }),
        this.findMovimientosByInfraccion(idInfraccion),
      ]);

    const retencionIds = retenciones.map(
      (retencion) => retencion.idRetencionVehiculo,
    );
    const salidas =
      retencionIds.length === 0
        ? []
        : await this.salidasRepository.find({
            where: {
              retencionVehiculo: {
                idRetencionVehiculo: In(retencionIds),
              },
            },
            relations: {
              retencionVehiculo: true,
              liberacionVehiculo: true,
              usuarioValidaSalida: true,
            },
            order: {
              fechaSalida: 'DESC',
            },
          });

    const retencionPrincipal = retenciones[0] ?? null;

    return {
      infraccion: {
        idInfraccion: infraccion.idInfraccion,
        folioInfraccion: infraccion.folioInfraccion,
        fechaInfraccion: infraccion.fechaInfraccion,
        horaInfraccion: infraccion.horaInfraccion,
        observaciones: infraccion.observaciones,
        clavePolicia: infraccion.clavePolicia,
        numParteInformativo: infraccion.numParteInformativo,
      },
      estatusInfraccion: {
        idEstatusInfraccion: infraccion.estatusInfraccion.idEstatusInfraccion,
        nombreEstatus: infraccion.estatusInfraccion.nombreEstatus,
      },
      tipoProcedimiento: {
        idTipoProcedimiento: infraccion.tipoProcedimiento.idTipoProcedimiento,
        nombreTipoProcedimiento:
          infraccion.tipoProcedimiento.nombreTipoProcedimiento,
      },
      region: {
        idRegion: infraccion.delegacion.region.idRegion,
        nombreRegion: infraccion.delegacion.region.nombreRegion,
      },
      delegacion: {
        idDelegacion: infraccion.delegacion.idDelegacion,
        nombreDelegacion: infraccion.delegacion.nombreDelegacion,
      },
      usuarioCaptura: {
        idUsuario: infraccion.usuarioCaptura.idUsuario,
        nombreUsuario: infraccion.usuarioCaptura.nombreUsuario,
      },
      infractor: {
        nombre: infraccion.infractor.nombre,
        apellidoPaterno: infraccion.infractor.apellidoPaterno,
        apellidoMaterno: infraccion.infractor.apellidoMaterno,
        licencia: infraccion.infractor.licencia,
        sexo: infraccion.infractor.sexo
          ? {
              idSexo: infraccion.infractor.sexo.idSexo,
              nombreSexo: infraccion.infractor.sexo.nombreSexo,
            }
          : null,
      },
      vehiculo: {
        placas: infraccion.vehiculo.placas,
        estadoPlacas: infraccion.vehiculo.estadoPlacas,
        serie: infraccion.vehiculo.serie,
        motor: infraccion.vehiculo.motor,
        anioModelo: infraccion.vehiculo.anioModelo,
        color: infraccion.vehiculo.color,
        sitioServicioPublico: infraccion.vehiculo.sitioServicioPublico,
        claseVehiculo: {
          idClaseVehiculo: infraccion.vehiculo.claseVehiculo.idClaseVehiculo,
          nombreClaseVehiculo:
            infraccion.vehiculo.claseVehiculo.nombreClaseVehiculo,
        },
        marcaVehiculo: {
          idMarcaVehiculo:
            infraccion.vehiculo.lineaVehiculo.marcaVehiculo.idMarcaVehiculo,
          nombreMarcaVehiculo:
            infraccion.vehiculo.lineaVehiculo.marcaVehiculo.nombreMarcaVehiculo,
        },
        lineaVehiculo: {
          idLineaVehiculo: infraccion.vehiculo.lineaVehiculo.idLineaVehiculo,
          nombreLineaVehiculo:
            infraccion.vehiculo.lineaVehiculo.nombreLineaVehiculo,
        },
        servicio: {
          idServicio: infraccion.vehiculo.servicio.idServicio,
          nombreServicio: infraccion.vehiculo.servicio.nombreServicio,
        },
      },
      lugarInfraccion: {
        idLugarInfraccion: infraccion.lugarInfraccion.idLugarInfraccion,
        nombreLugarInfraccion: infraccion.lugarInfraccion.nombreLugarInfraccion,
      },
      motivos: motivos.map((motivoInfraccion) => ({
        idMotivo: motivoInfraccion.motivo.idMotivo,
        nombreMotivo: motivoInfraccion.motivo.nombreMotivo,
        descripcionMotivo: motivoInfraccion.motivo.descripcionMotivo,
      })),
      retencionVehiculo: retencionPrincipal
        ? {
            idRetencionVehiculo: retencionPrincipal.idRetencionVehiculo,
            encierro: {
              idEncierro: retencionPrincipal.encierro.idEncierro,
              nombreEncierro: retencionPrincipal.encierro.nombreEncierro,
            },
            fechaIngreso: retencionPrincipal.fechaIngreso.toISOString(),
            recibidoPor: retencionPrincipal.recibidoPor,
            folioResguardo: retencionPrincipal.folioResguardo,
            estadoIngreso: retencionPrincipal.estadoIngreso,
            observacionesIngreso: retencionPrincipal.observacionesIngreso,
          }
        : null,
      pagos: pagos.map((pago) => ({
        idPagoInfraccion: pago.idPagoInfraccion,
        folioPago: pago.folioPago,
        monto: pago.monto,
        fechaPago: pago.fechaPago.toISOString(),
        observaciones: pago.observaciones,
      })),
      liberaciones: liberaciones.map((liberacion) => ({
        idLiberacionVehiculo: liberacion.idLiberacionVehiculo,
        folioLiberacion: liberacion.folioLiberacion,
        fechaLiberacion: liberacion.fechaLiberacion.toISOString(),
        liberadoPor: liberacion.liberadoPor,
        nombreRecibeLiberacion: liberacion.nombreRecibeLiberacion,
        observacion: liberacion.observacion,
      })),
      salidas: salidas.map((salida) => ({
        idSalidaVehiculo: salida.idSalidaVehiculo,
        fechaSalida: salida.fechaSalida.toISOString(),
        validadoPor: salida.validadoPor,
        personaRecibeVehiculo: salida.personaRecibeVehiculo,
        observacionesSalida: salida.observacionesSalida,
        estadoSalida: salida.estadoSalida,
      })),
      movimientos: movimientos.map((movimiento) => ({
        idInfraccionMovimiento: movimiento.idInfraccionMovimiento,
        fechaMovimiento: movimiento.fechaMovimiento.toISOString(),
        estatus: movimiento.estatusInfraccion.nombreEstatus,
        usuario: movimiento.usuario.nombreUsuario,
        observaciones: movimiento.observaciones,
        accion: movimiento.accion,
      })),
      estadoOperativoCalculado: this.resolveEstadoOperativo({
        hasRetencion: retenciones.length > 0,
        hasPago: pagos.length > 0,
        hasLiberacion: liberaciones.length > 0,
        hasSalida: salidas.length > 0,
      }),
    };
  }

  async findMovimientosByInfraccion(
    idInfraccion: number,
  ): Promise<InfraccionMovimiento[]> {
    await this.findByIdOrFail(idInfraccion);

    return this.infraccionMovimientosRepository.find({
      where: {
        infraccion: { idInfraccion },
      },
      relations: {
        estatusInfraccion: true,
        usuario: true,
      },
      order: {
        fechaMovimiento: 'ASC',
      },
    });
  }

  async getResumenPorEstatus(): Promise<
    Array<{
      idEstatusInfraccion: number;
      nombreEstatus: string;
      total: number;
    }>
  > {
    const rows = await this.infraccionesRepository
      .createQueryBuilder('infraccion')
      .innerJoin('infraccion.estatusInfraccion', 'estatusInfraccion')
      .select('estatusInfraccion.idEstatusInfraccion', 'idEstatusInfraccion')
      .addSelect('estatusInfraccion.nombreEstatus', 'nombreEstatus')
      .addSelect('COUNT(infraccion.idInfraccion)', 'total')
      .groupBy('estatusInfraccion.idEstatusInfraccion')
      .addGroupBy('estatusInfraccion.nombreEstatus')
      .orderBy('estatusInfraccion.nombreEstatus', 'ASC')
      .getRawMany<{
        idEstatusInfraccion: string;
        nombreEstatus: string;
        total: string;
      }>();

    return rows.map((row) => ({
      idEstatusInfraccion: Number(row.idEstatusInfraccion),
      nombreEstatus: row.nombreEstatus,
      total: Number(row.total),
    }));
  }

  async crearInfraccionCompleta(
    dto: CreateInfraccionCompletaDto,
    idUsuarioCaptura: number,
  ): Promise<InfraccionFlujoResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const infraccionRepo = manager.getRepository(Infraccion);
      const infractorRepo = manager.getRepository(Infractor);
      const vehiculoRepo = manager.getRepository(Vehiculo);
      const lugarRepo = manager.getRepository(LugarInfraccion);
      const infraccionMotivoRepo = manager.getRepository(InfraccionMotivo);
      const movimientoRepo = manager.getRepository(InfraccionMovimiento);

      const existingFolio = await infraccionRepo.findOneBy({
        folioInfraccion: dto.infraccion.folioInfraccion,
      });

      if (existingFolio) {
        throw new ConflictException(
          'Ya existe una infraccion con el folio indicado',
        );
      }

      const estatusInfraccion = await this.findEstatusByIdOrFail(
        manager,
        dto.infraccion.idEstatusInfraccion,
      );
      const usuarioCaptura = await this.findUsuarioByIdOrFail(
        manager,
        idUsuarioCaptura,
      );
      const motivos = await this.findMotivosByIdsOrFail(
        manager,
        dto.infraccion.motivos,
      );

      const savedInfractor = await infractorRepo.save(
        infractorRepo.create({
          sexo: { idSexo: dto.infractor.idSexo } as Sexo,
          nombre: dto.infractor.nombre,
          apellidoPaterno: dto.infractor.apellidoPaterno,
          apellidoMaterno: dto.infractor.apellidoMaterno ?? null,
          licencia: dto.infractor.licencia ?? null,
          curp: dto.infractor.curp ?? null,
        }),
      );

      const savedVehiculo = await vehiculoRepo.save(
        vehiculoRepo.create({
          claseVehiculo: {
            idClaseVehiculo: dto.vehiculo.idClaseVehiculo,
          } as ClaseVehiculo,
          lineaVehiculo: {
            idLineaVehiculo: dto.vehiculo.idLineaVehiculo,
          } as LineaVehiculo,
          servicio: { idServicio: dto.vehiculo.idServicio } as Servicio,
          anioModelo: dto.vehiculo.anioModelo ?? null,
          sitioServicioPublico: dto.vehiculo.sitioServicioPublico ?? null,
          color: dto.vehiculo.color ?? null,
          placas: dto.vehiculo.placas ?? null,
          estadoPlacas: dto.vehiculo.estadoPlacas ?? null,
          serie: dto.vehiculo.serie ?? null,
          motor: dto.vehiculo.motor ?? null,
        }),
      );

      const operativo =
        dto.infraccion.idOperativo === null ||
        dto.infraccion.idOperativo === undefined
          ? null
          : manager.getRepository(Operativo).create({
              idOperativo: dto.infraccion.idOperativo,
            });

      const lugarNombre = this.buildLugarInfraccionNombre(dto.lugarInfraccion);
      const savedLugar =
        (await lugarRepo.findOneBy({
          nombreLugarInfraccion: lugarNombre,
        })) ??
        (await lugarRepo.save(
          lugarRepo.create({
            nombreLugarInfraccion: lugarNombre,
          }),
        ));

      const savedInfraccion = await infraccionRepo.save(
        infraccionRepo.create({
          infractor: savedInfractor,
          vehiculo: savedVehiculo,
          lugarInfraccion: savedLugar,
          delegacion: {
            idDelegacion: dto.infraccion.idDelegacion,
          } as Delegacion,
          tipoProcedimiento: {
            idTipoProcedimiento: dto.infraccion.idTipoProcedimiento,
          } as TipoProcedimiento,
          estatusInfraccion,
          usuarioCaptura,
          operativo,
          folioInfraccion: dto.infraccion.folioInfraccion,
          fechaInfraccion: dto.infraccion.fechaInfraccion,
          horaInfraccion: dto.infraccion.horaInfraccion,
          observaciones: dto.infraccion.observaciones ?? null,
          clavePolicia: dto.infraccion.clavePolicia ?? null,
          numParteInformativo: dto.infraccion.numParteInformativo ?? null,
        }),
      );

      await infraccionMotivoRepo.save(
        motivos.map((motivo) =>
          infraccionMotivoRepo.create({
            infraccion: savedInfraccion,
            motivo,
          }),
        ),
      );

      await movimientoRepo.save(
        movimientoRepo.create({
          infraccion: savedInfraccion,
          estatusInfraccion,
          usuario: usuarioCaptura,
          accion: ACCION_MOVIMIENTO.INFRACCION_CAPTURADA,
          observaciones: 'Infraccion capturada',
          fechaMovimiento: new Date(),
        }),
      );

      return savedInfraccion.idInfraccion;
    });

    return this.findFlujoByInfraccion(dto.infraccion.folioInfraccion);
  }

  async actualizarEstatusYRegistrarMovimiento(
    params: ActualizarEstatusYRegistrarMovimientoParams,
  ): Promise<InfraccionMovimiento> {
    const [infraccion, estatusInfraccion] = await Promise.all([
      this.findByIdOrFail(params.idInfraccion),
      this.findEstatusByNombreOrFail(params.nombreEstatus),
    ]);

    infraccion.estatusInfraccion = estatusInfraccion;
    await this.infraccionesRepository.save(infraccion);

    return this.registrarMovimiento({
      idInfraccion: params.idInfraccion,
      idEstatusInfraccion: estatusInfraccion.idEstatusInfraccion,
      idUsuario: params.idUsuario,
      accion: params.accion,
      observaciones: params.observaciones,
      fechaMovimiento: params.fechaMovimiento,
    });
  }

  async registrarMovimiento(
    params: RegistrarMovimientoParams,
  ): Promise<InfraccionMovimiento> {
    const movimiento = this.infraccionMovimientosRepository.create({
      infraccion: { idInfraccion: params.idInfraccion } as Infraccion,
      estatusInfraccion: {
        idEstatusInfraccion: params.idEstatusInfraccion,
      } as EstatusInfraccion,
      usuario: { idUsuario: params.idUsuario } as Usuario,
      accion: params.accion,
      observaciones: params.observaciones ?? null,
      fechaMovimiento: normalizeDate(params.fechaMovimiento),
    });

    return this.infraccionMovimientosRepository.save(movimiento);
  }

  private buildBaseInfraccionQuery(): SelectQueryBuilder<Infraccion> {
    return this.infraccionesRepository
      .createQueryBuilder('infraccion')
      .leftJoinAndSelect('infraccion.infractor', 'infractor')
      .leftJoinAndSelect('infractor.sexo', 'sexo')
      .leftJoinAndSelect('infraccion.delegacion', 'delegacion')
      .leftJoinAndSelect('delegacion.region', 'region')
      .leftJoinAndSelect('infraccion.vehiculo', 'vehiculo')
      .leftJoinAndSelect('vehiculo.lineaVehiculo', 'lineaVehiculo')
      .leftJoinAndSelect('lineaVehiculo.marcaVehiculo', 'marcaVehiculo')
      .leftJoinAndSelect('vehiculo.claseVehiculo', 'claseVehiculo')
      .leftJoinAndSelect('vehiculo.servicio', 'servicio')
      .leftJoinAndSelect('infraccion.lugarInfraccion', 'lugarInfraccion')
      .leftJoinAndSelect('infraccion.tipoProcedimiento', 'tipoProcedimiento')
      .leftJoinAndSelect('infraccion.operativo', 'operativo')
      .leftJoinAndSelect('infraccion.estatusInfraccion', 'estatusInfraccion')
      .leftJoinAndSelect('infraccion.usuarioCaptura', 'usuarioCaptura')
      .distinct(true);
  }

  private applyInfraccionFilters(
    queryBuilder: SelectQueryBuilder<Infraccion>,
    query: FindInfraccionesQueryDto,
  ): void {
    const folioInfraccion = query.folioInfraccion?.trim();
    if (folioInfraccion) {
      queryBuilder.andWhere(
        'infraccion.folioInfraccion ILIKE :folioInfraccion',
        {
          folioInfraccion: `%${folioInfraccion}%`,
        },
      );
    }

    const fechaDesde = query.fechaDesde ?? query.fechaInicio;
    if (fechaDesde) {
      queryBuilder.andWhere(
        'infraccion.fechaInfraccion >= CAST(:fechaDesde AS date)',
        {
          fechaDesde,
        },
      );
    }

    const fechaHasta = query.fechaHasta ?? query.fechaFin;
    if (fechaHasta) {
      queryBuilder.andWhere(
        'infraccion.fechaInfraccion <= CAST(:fechaHasta AS date)',
        {
          fechaHasta,
        },
      );
    }

    if (query.idEstatusInfraccion) {
      queryBuilder.andWhere(
        'estatusInfraccion.idEstatusInfraccion = :idEstatusInfraccion',
        {
          idEstatusInfraccion: query.idEstatusInfraccion,
        },
      );
    }

    if (query.idDelegacion) {
      queryBuilder.andWhere('delegacion.idDelegacion = :idDelegacion', {
        idDelegacion: query.idDelegacion,
      });
    }

    if (query.idRegion) {
      queryBuilder.andWhere('region.idRegion = :idRegion', {
        idRegion: query.idRegion,
      });
    }

    if (query.idTipoProcedimiento) {
      queryBuilder.andWhere(
        'tipoProcedimiento.idTipoProcedimiento = :idTipoProcedimiento',
        {
          idTipoProcedimiento: query.idTipoProcedimiento,
        },
      );
    }

    if (query.anio) {
      queryBuilder.andWhere(
        'EXTRACT(YEAR FROM infraccion.fechaInfraccion) = :anio',
        {
          anio: query.anio,
        },
      );
    }

    const placas = query.placas?.trim();
    if (placas) {
      queryBuilder.andWhere('vehiculo.placas ILIKE :placas', {
        placas: `%${placas}%`,
      });
    }

    const serie = query.serie?.trim();
    if (serie) {
      queryBuilder.andWhere('vehiculo.serie ILIKE :serie', {
        serie: `%${serie}%`,
      });
    }

    const motor = query.motor?.trim();
    if (motor) {
      queryBuilder.andWhere('vehiculo.motor ILIKE :motor', {
        motor: `%${motor}%`,
      });
    }

    const nombreInfractor = query.nombreInfractor?.trim();
    if (nombreInfractor) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('infractor.nombre ILIKE :nombreInfractor', {
            nombreInfractor: `%${nombreInfractor}%`,
          })
            .orWhere('infractor.apellidoPaterno ILIKE :nombreInfractor', {
              nombreInfractor: `%${nombreInfractor}%`,
            })
            .orWhere('infractor.apellidoMaterno ILIKE :nombreInfractor', {
              nombreInfractor: `%${nombreInfractor}%`,
            });
        }),
      );
    }

    const licencia = query.licencia?.trim();
    if (licencia) {
      queryBuilder.andWhere('infractor.licencia ILIKE :licencia', {
        licencia: `%${licencia}%`,
      });
    }

    const clavePolicia = query.clavePolicia?.trim();
    if (clavePolicia) {
      queryBuilder.andWhere('infraccion.clavePolicia ILIKE :clavePolicia', {
        clavePolicia: `%${clavePolicia}%`,
      });
    }

    if (query.idMotivo) {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1
          FROM infraccion_motivo infraccion_motivo_filtro
          WHERE infraccion_motivo_filtro.id_infraccion = infraccion.id_infraccion
            AND infraccion_motivo_filtro.id_motivo = :idMotivo
        )`,
        {
          idMotivo: query.idMotivo,
        },
      );
    }

    if (query.idEncierro) {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1
          FROM retencion_vehiculo retencion_filtro
          WHERE retencion_filtro.id_infraccion = infraccion.id_infraccion
            AND retencion_filtro.id_encierro = :idEncierro
        )`,
        {
          idEncierro: query.idEncierro,
        },
      );
    }

    if (query.estadoOperativo) {
      this.applyEstadoOperativoFilter(queryBuilder, query.estadoOperativo);
    }
  }

  private applyEstadoOperativoFilter(
    queryBuilder: SelectQueryBuilder<Infraccion>,
    estadoOperativo: string,
  ): void {
    const delivered = `EXISTS (
      SELECT 1
      FROM salida_vehiculo salida_filtro
      INNER JOIN retencion_vehiculo retencion_salida_filtro
        ON retencion_salida_filtro.id_retencion_vehiculo = salida_filtro.id_retencion_vehiculo
      WHERE retencion_salida_filtro.id_infraccion = infraccion.id_infraccion
    )`;
    const liberado = `EXISTS (
      SELECT 1
      FROM liberacion_vehiculo liberacion_filtro
      WHERE liberacion_filtro.id_infraccion = infraccion.id_infraccion
    )`;
    const pagado = `EXISTS (
      SELECT 1
      FROM pago_infraccion pago_filtro
      WHERE pago_filtro.id_infraccion = infraccion.id_infraccion
    )`;
    const retenido = `EXISTS (
      SELECT 1
      FROM retencion_vehiculo retencion_filtro
      WHERE retencion_filtro.id_infraccion = infraccion.id_infraccion
    )`;

    switch (estadoOperativo) {
      case ESTADO_OPERATIVO_VEHICULO.VEHICULO_ENTREGADO:
        queryBuilder.andWhere(delivered);
        return;
      case ESTADO_OPERATIVO_VEHICULO.LIBERADO_PENDIENTE_SALIDA:
        queryBuilder.andWhere(liberado).andWhere(`NOT ${delivered}`);
        return;
      case ESTADO_OPERATIVO_VEHICULO.PAGADO_PENDIENTE_LIBERACION:
        queryBuilder
          .andWhere(pagado)
          .andWhere(`NOT ${liberado}`)
          .andWhere(`NOT ${delivered}`);
        return;
      case ESTADO_OPERATIVO_VEHICULO.EN_ENCIERRO_SIN_PAGO:
        queryBuilder
          .andWhere(retenido)
          .andWhere(`NOT ${pagado}`)
          .andWhere(`NOT ${liberado}`)
          .andWhere(`NOT ${delivered}`);
        return;
      case ESTADO_OPERATIVO_VEHICULO.SIN_RETENCION:
        queryBuilder.andWhere(`NOT ${retenido}`);
        return;
      default:
        return;
    }
  }

  private resolveInfraccionesSortColumn(sortBy?: string): string {
    switch (sortBy?.trim()) {
      case 'folioInfraccion':
        return 'infraccion.folioInfraccion';
      case 'fechaInfraccion':
        return 'infraccion.fechaInfraccion';
      case 'horaInfraccion':
        return 'infraccion.horaInfraccion';
      case 'placas':
        return 'vehiculo.placas';
      case 'serie':
        return 'vehiculo.serie';
      case 'motor':
        return 'vehiculo.motor';
      case 'licencia':
        return 'infractor.licencia';
      case 'clavePolicia':
        return 'infraccion.clavePolicia';
      case 'idRegion':
        return 'region.idRegion';
      case 'idDelegacion':
        return 'delegacion.idDelegacion';
      case 'estadoOperativo':
        return `CASE
          WHEN EXISTS (
            SELECT 1
            FROM salida_vehiculo salida_sort
            INNER JOIN retencion_vehiculo retencion_sort
              ON retencion_sort.id_retencion_vehiculo = salida_sort.id_retencion_vehiculo
            WHERE retencion_sort.id_infraccion = infraccion.id_infraccion
          ) THEN 5
          WHEN EXISTS (
            SELECT 1
            FROM liberacion_vehiculo liberacion_sort
            WHERE liberacion_sort.id_infraccion = infraccion.id_infraccion
          ) THEN 4
          WHEN EXISTS (
            SELECT 1
            FROM pago_infraccion pago_sort
            WHERE pago_sort.id_infraccion = infraccion.id_infraccion
          ) THEN 3
          WHEN EXISTS (
            SELECT 1
            FROM retencion_vehiculo retencion_sort
            WHERE retencion_sort.id_infraccion = infraccion.id_infraccion
          ) THEN 2
          ELSE 1
        END`;
      default:
        return 'infraccion.fechaInfraccion';
    }
  }

  private resolveSortOrder(sortOrder?: string): 'ASC' | 'DESC' {
    return sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  }

  private async findEstatusByNombreOrFail(
    nombreEstatus: EstatusInfraccionNombre,
  ): Promise<EstatusInfraccion> {
    const estatusInfraccion = await this.estatusInfraccionRepository.findOne({
      where: { nombreEstatus },
    });

    if (!estatusInfraccion) {
      throw new NotFoundException(`Estatus ${nombreEstatus} no encontrado`);
    }

    return estatusInfraccion;
  }

  private async findEstatusByIdOrFail(
    manager: EntityManager,
    idEstatusInfraccion: number,
  ): Promise<EstatusInfraccion> {
    const estatusInfraccion = await manager
      .getRepository(EstatusInfraccion)
      .findOneBy({
        idEstatusInfraccion,
      });

    if (!estatusInfraccion) {
      throw new NotFoundException(
        `Estatus ${idEstatusInfraccion} no encontrado`,
      );
    }

    return estatusInfraccion;
  }

  private async findUsuarioByIdOrFail(
    manager: EntityManager,
    idUsuario: number,
  ): Promise<Usuario> {
    const usuario = await manager.getRepository(Usuario).findOneBy({
      idUsuario,
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario ${idUsuario} no encontrado`);
    }

    return usuario;
  }

  private async findMotivosByIdsOrFail(
    manager: EntityManager,
    motivosIds: number[],
  ): Promise<Motivo[]> {
    const motivos = await manager.getRepository(Motivo).find({
      where: {
        idMotivo: In(motivosIds),
      },
    });

    if (motivos.length !== motivosIds.length) {
      const foundIds = new Set(motivos.map((motivo) => motivo.idMotivo));
      const missingIds = motivosIds.filter(
        (motivoId) => !foundIds.has(motivoId),
      );
      throw new NotFoundException(
        `Motivos no encontrados: ${missingIds.join(', ')}`,
      );
    }

    return motivos;
  }

  private async loadEstadoOperativoMap(
    idInfracciones: number[],
  ): Promise<Map<number, EstadoOperativoVehiculo>> {
    const result = new Map<number, EstadoOperativoVehiculo>();

    if (idInfracciones.length === 0) {
      return result;
    }

    const [retenciones, pagos, liberaciones, salidas] = await Promise.all([
      this.retencionesRepository.find({
        where: {
          infraccion: {
            idInfraccion: In(idInfracciones),
          },
        },
        relations: {
          infraccion: true,
        },
        order: {
          fechaIngreso: 'DESC',
        },
      }),
      this.pagosRepository.find({
        where: {
          infraccion: {
            idInfraccion: In(idInfracciones),
          },
        },
        relations: {
          infraccion: true,
        },
        order: {
          fechaPago: 'DESC',
        },
      }),
      this.liberacionesRepository.find({
        where: {
          infraccion: {
            idInfraccion: In(idInfracciones),
          },
        },
        relations: {
          infraccion: true,
        },
        order: {
          fechaLiberacion: 'DESC',
        },
      }),
      this.salidasRepository.find({
        where: {
          retencionVehiculo: {
            infraccion: {
              idInfraccion: In(idInfracciones),
            },
          },
        },
        relations: {
          retencionVehiculo: {
            infraccion: true,
          },
        },
        order: {
          fechaSalida: 'DESC',
        },
      }),
    ]);

    const hasRetencion = new Set<number>();
    const hasPago = new Set<number>();
    const hasLiberacion = new Set<number>();
    const hasSalida = new Set<number>();

    for (const retencion of retenciones) {
      hasRetencion.add(retencion.infraccion.idInfraccion);
    }

    for (const pago of pagos) {
      hasPago.add(pago.infraccion.idInfraccion);
    }

    for (const liberacion of liberaciones) {
      hasLiberacion.add(liberacion.infraccion.idInfraccion);
    }

    for (const salida of salidas) {
      hasSalida.add(salida.retencionVehiculo.infraccion.idInfraccion);
    }

    for (const idInfraccion of idInfracciones) {
      result.set(
        idInfraccion,
        this.resolveEstadoOperativo({
          hasRetencion: hasRetencion.has(idInfraccion),
          hasPago: hasPago.has(idInfraccion),
          hasLiberacion: hasLiberacion.has(idInfraccion),
          hasSalida: hasSalida.has(idInfraccion),
        }),
      );
    }

    return result;
  }

  private async loadMotivosMap(idInfracciones: number[]): Promise<
    Map<
      number,
      Array<{
        idMotivo: number;
        nombreMotivo: string;
        descripcionMotivo: string;
      }>
    >
  > {
    const result = new Map<
      number,
      Array<{
        idMotivo: number;
        nombreMotivo: string;
        descripcionMotivo: string;
      }>
    >();

    if (idInfracciones.length === 0) {
      return result;
    }

    const rows = await this.infraccionMotivosRepository.find({
      where: {
        infraccion: {
          idInfraccion: In(idInfracciones),
        },
      },
      relations: {
        infraccion: true,
        motivo: true,
      },
      order: {
        idInfraccionMotivo: 'ASC',
      },
    });

    for (const row of rows) {
      const items = result.get(row.infraccion.idInfraccion) ?? [];
      items.push({
        idMotivo: row.motivo.idMotivo,
        nombreMotivo: row.motivo.nombreMotivo,
        descripcionMotivo: row.motivo.descripcionMotivo,
      });
      result.set(row.infraccion.idInfraccion, items);
    }

    return result;
  }

  private resolveEstadoOperativo(params: {
    hasRetencion: boolean;
    hasPago: boolean;
    hasLiberacion: boolean;
    hasSalida: boolean;
  }): EstadoOperativoVehiculo {
    if (params.hasSalida) {
      return ESTADO_OPERATIVO_VEHICULO.VEHICULO_ENTREGADO;
    }

    if (!params.hasRetencion) {
      return ESTADO_OPERATIVO_VEHICULO.SIN_RETENCION;
    }

    if (params.hasLiberacion) {
      return ESTADO_OPERATIVO_VEHICULO.LIBERADO_PENDIENTE_SALIDA;
    }

    if (params.hasPago) {
      return ESTADO_OPERATIVO_VEHICULO.PAGADO_PENDIENTE_LIBERACION;
    }

    if (params.hasRetencion) {
      return ESTADO_OPERATIVO_VEHICULO.EN_ENCIERRO_SIN_PAGO;
    }

    return ESTADO_OPERATIVO_VEHICULO.SIN_RETENCION;
  }

  private buildLugarInfraccionNombre(dto: {
    municipio: string;
    colonia?: string | null;
    calle?: string | null;
    numero?: string | null;
  }): string {
    return [dto.municipio, dto.colonia, dto.calle, dto.numero]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .join(', ');
  }
}
