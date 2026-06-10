import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { normalizeDate } from '../../common/utils/normalize-date';
import { Infraccion } from '../infracciones/entities/infraccion.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { PagoInfraccion } from './entities/pago-infraccion.entity';

interface RegistrarPagoParams {
  idInfraccion: number;
  idUsuarioRegistraPago: number;
  folioPago: string;
  monto: string;
  fechaPago?: string | Date;
  observaciones?: string | null;
}

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(PagoInfraccion)
    private readonly pagosRepository: Repository<PagoInfraccion>,
  ) {}

  async findByIdOrFail(idPagoInfraccion: number): Promise<PagoInfraccion> {
    const pago = await this.pagosRepository.findOne({
      where: { idPagoInfraccion },
      relations: {
        infraccion: true,
        usuarioRegistraPago: true,
      },
    });

    if (!pago) {
      throw new NotFoundException(`Pago de infraccion ${idPagoInfraccion} no encontrado`);
    }

    return pago;
  }

  async findByInfraccion(idInfraccion: number): Promise<PagoInfraccion[]> {
    return this.pagosRepository.find({
      where: {
        infraccion: { idInfraccion },
      },
      order: {
        fechaPago: 'DESC',
      },
    });
  }

  async registrarPago(params: RegistrarPagoParams): Promise<PagoInfraccion> {
    const pago = this.pagosRepository.create({
      infraccion: { idInfraccion: params.idInfraccion } as Infraccion,
      usuarioRegistraPago: { idUsuario: params.idUsuarioRegistraPago } as Usuario,
      folioPago: params.folioPago,
      monto: params.monto,
      fechaPago: normalizeDate(params.fechaPago),
      observaciones: params.observaciones ?? null,
    });

    const savedPago = await this.pagosRepository.save(pago);

    // El cambio automatico de estatus a PAGADA se conectara en un bloque posterior.
    return savedPago;
  }
}
