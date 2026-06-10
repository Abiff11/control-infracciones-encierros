import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EstatusInfraccion } from '../catalogos/entities/estatus-infraccion.entity';
import { normalizeDate } from '../../common/utils/normalize-date';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { type EstatusInfraccionNombre } from './constants/estatus-infraccion.constants';
import { InfraccionMotivo } from './entities/infraccion-motivo.entity';
import { InfraccionMovimiento } from './entities/infraccion-movimiento.entity';
import { Infraccion } from './entities/infraccion.entity';

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
  ) {}

  async findByIdOrFail(idInfraccion: number): Promise<Infraccion> {
    const infraccion = await this.infraccionesRepository.findOne({
      where: { idInfraccion },
    });

    if (!infraccion) {
      throw new NotFoundException(`Infraccion ${idInfraccion} no encontrada`);
    }

    return infraccion;
  }

  async findMotivosByInfraccion(idInfraccion: number): Promise<InfraccionMotivo[]> {
    return this.infraccionMotivosRepository.find({
      where: {
        infraccion: { idInfraccion },
      },
      relations: {
        motivo: true,
      },
    });
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

  async registrarMovimiento(params: RegistrarMovimientoParams): Promise<InfraccionMovimiento> {
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

  private async findEstatusByNombreOrFail(nombreEstatus: EstatusInfraccionNombre): Promise<EstatusInfraccion> {
    const estatusInfraccion = await this.estatusInfraccionRepository.findOne({
      where: { nombreEstatus },
    });

    if (!estatusInfraccion) {
      throw new NotFoundException(`Estatus ${nombreEstatus} no encontrado`);
    }

    return estatusInfraccion;
  }
}
