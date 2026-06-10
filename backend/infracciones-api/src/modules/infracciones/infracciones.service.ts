import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';

import { EstatusInfraccion } from '../catalogos/entities/estatus-infraccion.entity';
import { normalizeDate } from '../../common/utils/normalize-date';
import { LiberacionVehiculo } from '../liberaciones/entities/liberacion-vehiculo.entity';
import { PagoInfraccion } from '../pagos/entities/pago-infraccion.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { type EstatusInfraccionNombre } from './constants/estatus-infraccion.constants';
import { FindInfraccionesQueryDto } from './dto/find-infracciones-query.dto';
import { InfraccionFlujoResponseDto } from './dto/infraccion-flujo-response.dto';
import { InfraccionMotivo } from './entities/infraccion-motivo.entity';
import { InfraccionMovimiento } from './entities/infraccion-movimiento.entity';
import { Infraccion } from './entities/infraccion.entity';
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
}
