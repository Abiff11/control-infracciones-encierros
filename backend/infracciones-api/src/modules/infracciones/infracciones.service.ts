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

  async findAll(query: FindInfraccionesQueryDto): Promise<{
    data: Infraccion[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const queryBuilder = this.buildBaseInfraccionQuery();

    this.applyInfraccionFilters(queryBuilder, query);

    const [data, total] = await queryBuilder
      .orderBy('infraccion.fechaInfraccion', 'DESC')
      .addOrderBy('infraccion.horaInfraccion', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findFlujoByInfraccion(
    idInfraccion: number,
  ): Promise<InfraccionFlujoResponseDto> {
    const infraccion = await this.findByIdOrFail(idInfraccion);
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
  ): Promise<InfraccionFlujoResponseDto> {
    const createdInfraccionId = await this.dataSource.transaction(
      async (manager) => {
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
          dto.infraccion.idUsuarioCaptura,
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

        const lugarNombre = this.buildLugarInfraccionNombre(
          dto.lugarInfraccion,
        );
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
      },
    );

    return this.findFlujoByInfraccion(createdInfraccionId);
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

    if (query.fechaInicio) {
      queryBuilder.andWhere(
        'infraccion.fechaInfraccion >= CAST(:fechaInicio AS date)',
        {
          fechaInicio: query.fechaInicio,
        },
      );
    }

    if (query.fechaFin) {
      queryBuilder.andWhere(
        'infraccion.fechaInfraccion <= CAST(:fechaFin AS date)',
        {
          fechaFin: query.fechaFin,
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

    const placas = query.placas?.trim();
    if (placas) {
      queryBuilder.andWhere('vehiculo.placas ILIKE :placas', {
        placas: `%${placas}%`,
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
