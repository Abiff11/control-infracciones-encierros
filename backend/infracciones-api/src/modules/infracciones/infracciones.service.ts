import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EstatusInfraccion } from '../catalogos/entities/estatus-infraccion.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { InfraccionMotivo } from './entities/infraccion-motivo.entity';
import { InfraccionMovimiento } from './entities/infraccion-movimiento.entity';
import { Infraccion } from './entities/infraccion.entity';

interface RegistrarMovimientoParams {
  idInfraccion: number;
  idEstatusInfraccion: number;
  idUsuario: number;
  accion: string;
  observaciones?: string | null;
  fechaMovimiento?: Date;
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

  async registrarMovimiento(params: RegistrarMovimientoParams): Promise<InfraccionMovimiento> {
    const movimiento = this.infraccionMovimientosRepository.create({
      infraccion: { idInfraccion: params.idInfraccion } as Infraccion,
      estatusInfraccion: {
        idEstatusInfraccion: params.idEstatusInfraccion,
      } as EstatusInfraccion,
      usuario: { idUsuario: params.idUsuario } as Usuario,
      accion: params.accion,
      observaciones: params.observaciones ?? null,
      fechaMovimiento: params.fechaMovimiento ?? new Date(),
    });

    return this.infraccionMovimientosRepository.save(movimiento);
  }
}
