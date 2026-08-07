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
import { Usuario } from '../usuarios/entities/usuario.entity';
import { PagoInfraccion } from './entities/pago-infraccion.entity';

interface RegistrarPagoParams {
  idInfraccion: number;
  idUsuarioRegistraPago: number;
  folioPago: string;
  monto?: string;
  montoInfraccion?: string;
  diasPisoCobrados?: number;
  montoDiasPiso?: string;
  fechaPago?: string | Date;
  observaciones?: string | null;
}

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(PagoInfraccion)
    private readonly pagosRepository: Repository<PagoInfraccion>,
    @InjectRepository(RetencionVehiculo)
    private readonly retencionesRepository: Repository<RetencionVehiculo>,
    private readonly infraccionesService: InfraccionesService,
    private readonly auditoriaService: AuditoriaService,
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
      throw new NotFoundException(
        `Pago de infraccion ${idPagoInfraccion} no encontrado`,
      );
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
    const infraccion = await this.infraccionesService.findByIdOrFail(
      params.idInfraccion,
    );
    const montoInfraccion = this.normalizeMoney(
      params.montoInfraccion ?? params.monto ?? '0',
      'monto de infraccion',
    );
    const montoDiasPiso = this.normalizeMoney(
      params.montoDiasPiso ?? '0',
      'monto de dias de piso',
    );
    const diasPisoCobrados = params.diasPisoCobrados ?? 0;

    if (diasPisoCobrados < 0) {
      throw new BadRequestException('Los dias de piso no pueden ser negativos');
    }

    const hasRetencion =
      (await this.retencionesRepository.count({
        where: {
          infraccion: {
            idInfraccion: params.idInfraccion,
          },
        },
      })) > 0;

    if (!infraccion.tipoProcedimiento.permiteRetencion) {
      if (diasPisoCobrados !== 0 || montoDiasPiso !== '0.00') {
        throw new BadRequestException(
          'El tipo de expediente no permite cobrar dias de piso',
        );
      }
    } else if (
      !hasRetencion &&
      (diasPisoCobrados > 0 || montoDiasPiso !== '0.00')
    ) {
      throw new BadRequestException(
        'No se pueden cobrar dias de piso sin una retencion vehicular registrada',
      );
    }

    const monto = this.sumMoney(montoInfraccion, montoDiasPiso);

    const pago = this.pagosRepository.create({
      infraccion: { idInfraccion: params.idInfraccion } as Infraccion,
      usuarioRegistraPago: {
        idUsuario: params.idUsuarioRegistraPago,
      } as Usuario,
      folioPago: params.folioPago,
      monto,
      montoInfraccion,
      diasPisoCobrados,
      montoDiasPiso,
      fechaPago: normalizeDate(params.fechaPago),
      observaciones: params.observaciones ?? null,
    });

    const savedPago = await this.pagosRepository.save(pago);

    await this.infraccionesService.actualizarEstatusYRegistrarMovimiento({
      idInfraccion: params.idInfraccion,
      nombreEstatus: ESTATUS_INFRACCION.PAGADA,
      idUsuario: params.idUsuarioRegistraPago,
      accion: ACCION_MOVIMIENTO.PAGO_REGISTRADO,
      observaciones: `Pago registrado con folio ${params.folioPago}`,
      fechaMovimiento: params.fechaPago,
    });

    await this.auditoriaService.registrar({
      idUsuario: params.idUsuarioRegistraPago,
      accion: 'PAGO_REGISTRADO',
      entidad: 'pagos',
      entidadId: savedPago.idPagoInfraccion,
      despuesJson: {
        idPagoInfraccion: savedPago.idPagoInfraccion,
        idInfraccion: params.idInfraccion,
        folioPago: params.folioPago,
        monto,
        montoInfraccion,
        diasPisoCobrados,
        montoDiasPiso,
        fechaPago: params.fechaPago,
      },
    });

    return savedPago;
  }

  private normalizeMoney(value: string, label: string): string {
    const normalizedValue = value.trim();

    if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
      throw new BadRequestException(`El ${label} no tiene formato valido`);
    }

    return Number(normalizedValue).toFixed(2);
  }

  private sumMoney(firstValue: string, secondValue: string): string {
    const cents =
      Math.round(Number(firstValue) * 100) +
      Math.round(Number(secondValue) * 100);

    return (cents / 100).toFixed(2);
  }
}
