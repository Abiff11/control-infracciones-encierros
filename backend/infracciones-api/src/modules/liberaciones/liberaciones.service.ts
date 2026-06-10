import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Infraccion } from '../infracciones/entities/infraccion.entity';
import { PagoInfraccion } from '../pagos/entities/pago-infraccion.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LiberacionVehiculo } from './entities/liberacion-vehiculo.entity';

interface GenerarLiberacionParams {
  idInfraccion: number;
  idPagoInfraccion: number;
  idUsuarioLibera: number;
  folioLiberacion: string;
  liberadoPor: string;
  nombreRecibeLiberacion: string;
  fechaLiberacion?: Date;
  observacion?: string | null;
}

@Injectable()
export class LiberacionesService {
  constructor(
    @InjectRepository(LiberacionVehiculo)
    private readonly liberacionesRepository: Repository<LiberacionVehiculo>,
  ) {}

  async findByIdOrFail(idLiberacionVehiculo: number): Promise<LiberacionVehiculo> {
    const liberacion = await this.liberacionesRepository.findOne({
      where: { idLiberacionVehiculo },
      relations: {
        infraccion: true,
        pagoInfraccion: true,
        usuarioLibera: true,
      },
    });

    if (!liberacion) {
      throw new NotFoundException(`Liberacion vehicular ${idLiberacionVehiculo} no encontrada`);
    }

    return liberacion;
  }

  async findByInfraccion(idInfraccion: number): Promise<LiberacionVehiculo[]> {
    return this.liberacionesRepository.find({
      where: {
        infraccion: { idInfraccion },
      },
      order: {
        fechaLiberacion: 'DESC',
      },
    });
  }

  async generarLiberacion(params: GenerarLiberacionParams): Promise<LiberacionVehiculo> {
    const liberacion = this.liberacionesRepository.create({
      infraccion: { idInfraccion: params.idInfraccion } as Infraccion,
      pagoInfraccion: { idPagoInfraccion: params.idPagoInfraccion } as PagoInfraccion,
      usuarioLibera: { idUsuario: params.idUsuarioLibera } as Usuario,
      folioLiberacion: params.folioLiberacion,
      fechaLiberacion: params.fechaLiberacion ?? new Date(),
      liberadoPor: params.liberadoPor,
      nombreRecibeLiberacion: params.nombreRecibeLiberacion,
      observacion: params.observacion ?? null,
    });

    return this.liberacionesRepository.save(liberacion);
  }
}
