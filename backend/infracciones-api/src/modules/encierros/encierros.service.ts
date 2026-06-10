import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LiberacionVehiculo } from '../liberaciones/entities/liberacion-vehiculo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Encierro } from './entities/encierro.entity';
import { RetencionVehiculo } from './entities/retencion-vehiculo.entity';
import { SalidaVehiculo } from './entities/salida-vehiculo.entity';

interface RegistrarRetencionParams {
  idInfraccion: number;
  idEncierro: number;
  recibidoPor: string;
  fechaIngreso?: Date;
  folioResguardo?: string | null;
  observacionesIngreso?: string | null;
  estadoIngreso?: string | null;
}

interface RegistrarSalidaParams {
  idRetencionVehiculo: number;
  idLiberacionVehiculo: number;
  idUsuarioValidaSalida: number;
  validadoPor: string;
  personaRecibeVehiculo: string;
  fechaSalida?: Date;
  observacionesSalida?: string | null;
  estadoSalida: string;
}

@Injectable()
export class EncierrosService {
  constructor(
    @InjectRepository(Encierro)
    private readonly encierrosRepository: Repository<Encierro>,
    @InjectRepository(RetencionVehiculo)
    private readonly retencionesRepository: Repository<RetencionVehiculo>,
    @InjectRepository(SalidaVehiculo)
    private readonly salidasRepository: Repository<SalidaVehiculo>,
  ) {}

  async findEncierroByIdOrFail(idEncierro: number): Promise<Encierro> {
    const encierro = await this.encierrosRepository.findOne({
      where: { idEncierro },
    });

    if (!encierro) {
      throw new NotFoundException(`Encierro ${idEncierro} no encontrado`);
    }

    return encierro;
  }

  async findRetencionByIdOrFail(idRetencionVehiculo: number): Promise<RetencionVehiculo> {
    const retencion = await this.retencionesRepository.findOne({
      where: { idRetencionVehiculo },
      relations: {
        infraccion: true,
        encierro: true,
      },
    });

    if (!retencion) {
      throw new NotFoundException(`Retencion vehicular ${idRetencionVehiculo} no encontrada`);
    }

    return retencion;
  }

  async registrarRetencion(params: RegistrarRetencionParams): Promise<RetencionVehiculo> {
    const retencion = this.retencionesRepository.create({
      infraccion: { idInfraccion: params.idInfraccion },
      encierro: { idEncierro: params.idEncierro },
      fechaIngreso: params.fechaIngreso ?? new Date(),
      recibidoPor: params.recibidoPor,
      folioResguardo: params.folioResguardo ?? null,
      observacionesIngreso: params.observacionesIngreso ?? null,
      estadoIngreso: params.estadoIngreso ?? null,
    });

    return this.retencionesRepository.save(retencion);
  }

  async registrarSalida(params: RegistrarSalidaParams): Promise<SalidaVehiculo> {
    const salida = this.salidasRepository.create({
      retencionVehiculo: {
        idRetencionVehiculo: params.idRetencionVehiculo,
      } as RetencionVehiculo,
      liberacionVehiculo: {
        idLiberacionVehiculo: params.idLiberacionVehiculo,
      } as LiberacionVehiculo,
      usuarioValidaSalida: { idUsuario: params.idUsuarioValidaSalida } as Usuario,
      fechaSalida: params.fechaSalida ?? new Date(),
      validadoPor: params.validadoPor,
      personaRecibeVehiculo: params.personaRecibeVehiculo,
      observacionesSalida: params.observacionesSalida ?? null,
      estadoSalida: params.estadoSalida,
    });

    return this.salidasRepository.save(salida);
  }
}
