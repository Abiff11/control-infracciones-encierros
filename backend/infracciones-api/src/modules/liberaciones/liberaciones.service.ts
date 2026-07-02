import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { normalizeDate } from '../../common/utils/normalize-date';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ACCION_MOVIMIENTO } from '../infracciones/constants/accion-movimiento.constants';
import { ESTATUS_INFRACCION } from '../infracciones/constants/estatus-infraccion.constants';
import { InfraccionesService } from '../infracciones/infracciones.service';
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
  nombreRecibeLiberacion?: string | null;
  fechaLiberacion?: string | Date;
  observacion?: string | null;
}

@Injectable()
export class LiberacionesService {
  constructor(
    @InjectRepository(LiberacionVehiculo)
    private readonly liberacionesRepository: Repository<LiberacionVehiculo>,
    private readonly infraccionesService: InfraccionesService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findByIdOrFail(
    idLiberacionVehiculo: number,
  ): Promise<LiberacionVehiculo> {
    const liberacion = await this.liberacionesRepository.findOne({
      where: { idLiberacionVehiculo },
      relations: {
        infraccion: true,
        pagoInfraccion: true,
        usuarioLibera: true,
      },
    });

    if (!liberacion) {
      throw new NotFoundException(
        `Liberacion vehicular ${idLiberacionVehiculo} no encontrada`,
      );
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

  async generarLiberacion(
    params: GenerarLiberacionParams,
  ): Promise<LiberacionVehiculo> {
    const liberacion = this.liberacionesRepository.create({
      infraccion: { idInfraccion: params.idInfraccion } as Infraccion,
      pagoInfraccion: {
        idPagoInfraccion: params.idPagoInfraccion,
      } as PagoInfraccion,
      usuarioLibera: { idUsuario: params.idUsuarioLibera } as Usuario,
      folioLiberacion: params.folioLiberacion,
      fechaLiberacion: normalizeDate(params.fechaLiberacion),
      liberadoPor: params.liberadoPor,
      nombreRecibeLiberacion: params.nombreRecibeLiberacion ?? null,
      observacion: params.observacion ?? null,
    });

    const savedLiberacion = await this.liberacionesRepository.save(liberacion);

    await this.infraccionesService.actualizarEstatusYRegistrarMovimiento({
      idInfraccion: params.idInfraccion,
      nombreEstatus: ESTATUS_INFRACCION.LIBERACION_GENERADA,
      idUsuario: params.idUsuarioLibera,
      accion: ACCION_MOVIMIENTO.LIBERACION_GENERADA,
      observaciones: `Liberacion generada con folio ${params.folioLiberacion}`,
      fechaMovimiento: params.fechaLiberacion,
    });

    await this.auditoriaService.registrar({
      idUsuario: params.idUsuarioLibera,
      accion: 'LIBERACION_GENERADA',
      entidad: 'liberaciones',
      entidadId: savedLiberacion.idLiberacionVehiculo,
      despuesJson: {
        idLiberacionVehiculo: savedLiberacion.idLiberacionVehiculo,
        idInfraccion: params.idInfraccion,
        idPagoInfraccion: params.idPagoInfraccion,
        folioLiberacion: params.folioLiberacion,
        responsableLibera: params.liberadoPor,
        fechaLiberacion: params.fechaLiberacion,
      },
    });

    return savedLiberacion;
  }
}
