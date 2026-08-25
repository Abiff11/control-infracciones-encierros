import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { normalizeDate } from '../../common/utils/normalize-date';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ACCION_MOVIMIENTO } from '../infracciones/constants/accion-movimiento.constants';
import { ESTATUS_INFRACCION } from '../infracciones/constants/estatus-infraccion.constants';
import { InfraccionesService } from '../infracciones/infracciones.service';
import { Infraccion } from '../infracciones/entities/infraccion.entity';
import { RetencionVehiculo } from '../encierros/entities/retencion-vehiculo.entity';
import { PagoInfraccion } from '../pagos/entities/pago-infraccion.entity';
import { SolventacionSinPago } from '../pagos/entities/solventacion-sin-pago.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LiberacionVehiculo } from './entities/liberacion-vehiculo.entity';

interface GenerarLiberacionParams {
  idInfraccion: number;
  idPagoInfraccion?: number;
  idSolventacionSinPago?: number;
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
    @InjectRepository(RetencionVehiculo)
    private readonly retencionesRepository: Repository<RetencionVehiculo>,
    @InjectRepository(PagoInfraccion)
    private readonly pagosRepository: Repository<PagoInfraccion>,
    @InjectRepository(SolventacionSinPago)
    private readonly solventacionesRepository: Repository<SolventacionSinPago>,
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
        solventacionSinPago: true,
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
      relations: {
        pagoInfraccion: true,
        solventacionSinPago: true,
      },
      order: {
        fechaLiberacion: 'DESC',
      },
    });
  }

  async generarLiberacion(
    params: GenerarLiberacionParams,
  ): Promise<LiberacionVehiculo> {
    const infraccion = await this.infraccionesService.findByIdOrFail(
      params.idInfraccion,
    );
    const hasRetencion =
      (await this.retencionesRepository.count({
        where: {
          infraccion: {
            idInfraccion: params.idInfraccion,
          },
        },
      })) > 0;

    if (!infraccion.tipoProcedimiento.permiteRetencion) {
      throw new BadRequestException(
        `El tipo de expediente ${infraccion.tipoProcedimiento.nombreTipoProcedimiento} no permite generar liberacion vehicular`,
      );
    }

    if (!hasRetencion) {
      throw new BadRequestException(
        'No existe una retencion vehicular asociada para generar la liberacion',
      );
    }

    if (params.idPagoInfraccion && params.idSolventacionSinPago) {
      throw new BadRequestException(
        'La liberacion debe respaldarse con un pago o con No aplica pago, no con ambos',
      );
    }

    let pagoInfraccion: PagoInfraccion | null = null;
    let solventacionSinPago: SolventacionSinPago | null = null;

    if (params.idPagoInfraccion) {
      pagoInfraccion = await this.pagosRepository.findOne({
        where: {
          idPagoInfraccion: params.idPagoInfraccion,
          infraccion: { idInfraccion: params.idInfraccion },
        },
      });

      if (!pagoInfraccion) {
        throw new BadRequestException(
          'El pago indicado no pertenece a la infraccion o no existe',
        );
      }
    } else if (params.idSolventacionSinPago) {
      solventacionSinPago = await this.solventacionesRepository.findOne({
        where: {
          idSolventacionSinPago: params.idSolventacionSinPago,
          infraccion: { idInfraccion: params.idInfraccion },
        },
      });

      if (!solventacionSinPago) {
        throw new BadRequestException(
          'La solventacion sin pago indicada no pertenece a la infraccion o no existe',
        );
      }
    } else {
      solventacionSinPago = await this.solventacionesRepository.findOne({
        where: {
          infraccion: { idInfraccion: params.idInfraccion },
        },
      });

      if (!solventacionSinPago) {
        throw new BadRequestException(
          'Indica el ID del pago. Si la infraccion fue marcada como No aplica pago, deja el ID de pago vacio.',
        );
      }
    }

    const liberacion = this.liberacionesRepository.create({
      infraccion: { idInfraccion: params.idInfraccion } as Infraccion,
      pagoInfraccion: pagoInfraccion
        ? ({ idPagoInfraccion: pagoInfraccion.idPagoInfraccion } as PagoInfraccion)
        : null,
      solventacionSinPago: solventacionSinPago
        ? ({
            idSolventacionSinPago:
              solventacionSinPago.idSolventacionSinPago,
          } as SolventacionSinPago)
        : null,
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
        idPagoInfraccion: pagoInfraccion?.idPagoInfraccion ?? null,
        idSolventacionSinPago:
          solventacionSinPago?.idSolventacionSinPago ?? null,
        folioLiberacion: params.folioLiberacion,
        responsableLibera: params.liberadoPor,
        fechaLiberacion: params.fechaLiberacion,
      },
    });

    return this.findByIdOrFail(savedLiberacion.idLiberacionVehiculo);
  }
}
