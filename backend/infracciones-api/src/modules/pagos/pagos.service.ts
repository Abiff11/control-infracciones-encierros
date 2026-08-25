import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike, Repository } from 'typeorm';

import { normalizeDate } from '../../common/utils/normalize-date';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ACCION_MOVIMIENTO } from '../infracciones/constants/accion-movimiento.constants';
import { ESTATUS_INFRACCION } from '../infracciones/constants/estatus-infraccion.constants';
import { Infraccion } from '../infracciones/entities/infraccion.entity';
import { InfraccionesService } from '../infracciones/infracciones.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ConceptoPago } from './entities/concepto-pago.entity';
import { PagoConcepto } from './entities/pago-concepto.entity';
import { PagoInfraccion } from './entities/pago-infraccion.entity';
import { SolventacionSinPago } from './entities/solventacion-sin-pago.entity';

const CLAVE_INFRACCION_SIN_RETENCION = 'INFRACCION_SIN_RETENCION';

interface RegistrarPagoConceptoParams {
  claveConcepto: string;
  monto: string;
}

interface RegistrarPagoParams {
  idInfraccion: number;
  idUsuarioRegistraPago: number;
  folioLineaCaptura: string;
  conceptos: RegistrarPagoConceptoParams[];
  fechaPago?: string | Date;
  observaciones?: string | null;
}

interface RegistrarNoAplicaPagoParams {
  idInfraccion: number;
  idUsuarioRegistra: number;
  motivo: string;
}

interface ConceptoPagoUpsertRow {
  idConceptoPago: number;
  claveConcepto: string;
  activo: boolean;
}

interface ConceptoNormalizado {
  claveConcepto: string;
  monto: string;
}

@Injectable()
export class PagosService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(PagoInfraccion)
    private readonly pagosRepository: Repository<PagoInfraccion>,
    @InjectRepository(ConceptoPago)
    private readonly conceptosRepository: Repository<ConceptoPago>,
    @InjectRepository(SolventacionSinPago)
    private readonly solventacionesRepository: Repository<SolventacionSinPago>,
    private readonly infraccionesService: InfraccionesService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findByIdOrFail(idPagoInfraccion: number): Promise<PagoInfraccion> {
    const pago = await this.pagosRepository.findOne({
      where: { idPagoInfraccion },
      relations: {
        infraccion: true,
        usuarioRegistraPago: true,
        conceptos: {
          conceptoPago: true,
        },
      },
    });

    if (!pago) {
      throw new NotFoundException(
        `Pago de infraccion ${idPagoInfraccion} no encontrado`,
      );
    }

    pago.conceptos.sort((first, second) => first.orden - second.orden);
    return pago;
  }

  async findByInfraccion(idInfraccion: number): Promise<PagoInfraccion[]> {
    const pagos = await this.pagosRepository.find({
      where: {
        infraccion: { idInfraccion },
      },
      relations: {
        conceptos: {
          conceptoPago: true,
        },
      },
      order: {
        fechaPago: 'DESC',
      },
    });

    for (const pago of pagos) {
      pago.conceptos.sort((first, second) => first.orden - second.orden);
    }

    return pagos;
  }

  async findNoAplicaByIdOrFail(
    idSolventacionSinPago: number,
  ): Promise<SolventacionSinPago> {
    const solventacion = await this.solventacionesRepository.findOne({
      where: { idSolventacionSinPago },
      relations: {
        infraccion: true,
        usuarioRegistra: true,
      },
    });

    if (!solventacion) {
      throw new NotFoundException(
        `Solventacion sin pago ${idSolventacionSinPago} no encontrada`,
      );
    }

    return solventacion;
  }

  findNoAplicaByInfraccion(
    idInfraccion: number,
  ): Promise<SolventacionSinPago | null> {
    return this.solventacionesRepository.findOne({
      where: {
        infraccion: { idInfraccion },
      },
      relations: {
        infraccion: true,
        usuarioRegistra: true,
      },
    });
  }

  findConceptos(q?: string, limit = 20): Promise<ConceptoPago[]> {
    const query = q?.trim().toUpperCase();

    return this.conceptosRepository.find({
      where: query
        ? {
            activo: true,
            claveConcepto: ILike(`%${query}%`),
          }
        : {
            activo: true,
          },
      order: {
        claveConcepto: 'ASC',
      },
      take: Math.min(Math.max(limit, 1), 50),
    });
  }

  async registrarPago(params: RegistrarPagoParams): Promise<PagoInfraccion> {
    const solventacionExistente = await this.findNoAplicaByInfraccion(
      params.idInfraccion,
    );

    if (solventacionExistente) {
      throw new BadRequestException(
        'La infraccion ya fue solventada mediante No aplica pago',
      );
    }

    const infraccion = await this.infraccionesService.findByIdOrFail(
      params.idInfraccion,
    );

    const folioLineaCaptura = params.folioLineaCaptura.trim();
    if (!folioLineaCaptura) {
      throw new BadRequestException(
        'El folio de linea de captura es obligatorio',
      );
    }

    const conceptos = this.normalizeConceptos(params.conceptos);
    const montoTotal = this.sumMoney(
      conceptos.map((concepto) => concepto.monto),
    );

    const idPagoInfraccion = await this.dataSource.transaction(
      async (manager): Promise<number> => {
        const pagoRepository = manager.getRepository(PagoInfraccion);
        const pagoConceptoRepository = manager.getRepository(PagoConcepto);

        const pago = pagoRepository.create({
          infraccion: { idInfraccion: params.idInfraccion } as Infraccion,
          usuarioRegistraPago: {
            idUsuario: params.idUsuarioRegistraPago,
          } as Usuario,
          folioLineaCaptura,
          monto: montoTotal,
          montoInfraccion: montoTotal,
          diasPisoCobrados: 0,
          montoDiasPiso: '0.00',
          fechaPago: normalizeDate(params.fechaPago),
          observaciones: params.observaciones ?? null,
        });

        const savedPago = await pagoRepository.save(pago);

        for (const [index, concepto] of conceptos.entries()) {
          const conceptoPago = await this.getOrCreateConcepto(
            manager,
            concepto.claveConcepto,
          );

          await pagoConceptoRepository.save(
            pagoConceptoRepository.create({
              pagoInfraccion: savedPago,
              conceptoPago,
              monto: concepto.monto,
              orden: index + 1,
            }),
          );
        }

        return savedPago.idPagoInfraccion;
      },
    );

    const nombreEstatus =
      infraccion.tipoProcedimiento.claveTipoProcedimiento ===
      CLAVE_INFRACCION_SIN_RETENCION
        ? ESTATUS_INFRACCION.PAGADA_SIN_RETENCION
        : ESTATUS_INFRACCION.PAGADA;

    await this.infraccionesService.actualizarEstatusYRegistrarMovimiento({
      idInfraccion: params.idInfraccion,
      nombreEstatus,
      idUsuario: params.idUsuarioRegistraPago,
      accion: ACCION_MOVIMIENTO.PAGO_REGISTRADO,
      observaciones: `Pago registrado con linea de captura ${folioLineaCaptura}`,
      fechaMovimiento: params.fechaPago,
    });

    await this.auditoriaService.registrar({
      idUsuario: params.idUsuarioRegistraPago,
      accion: 'PAGO_REGISTRADO',
      entidad: 'pagos',
      entidadId: idPagoInfraccion,
      despuesJson: {
        idPagoInfraccion,
        idInfraccion: params.idInfraccion,
        folioLineaCaptura,
        monto: montoTotal,
        conceptos,
        fechaPago: params.fechaPago,
      },
    });

    return this.findByIdOrFail(idPagoInfraccion);
  }

  async registrarNoAplicaPago(
    params: RegistrarNoAplicaPagoParams,
  ): Promise<SolventacionSinPago> {
    await this.infraccionesService.findByIdOrFail(params.idInfraccion);

    const motivo = params.motivo.trim();
    if (motivo.length < 3) {
      throw new BadRequestException(
        'Captura un motivo valido para solventar la infraccion sin pago',
      );
    }

    const [pagoExistente, solventacionExistente] = await Promise.all([
      this.pagosRepository.findOne({
        where: {
          infraccion: { idInfraccion: params.idInfraccion },
        },
      }),
      this.findNoAplicaByInfraccion(params.idInfraccion),
    ]);

    if (pagoExistente) {
      throw new BadRequestException(
        'La infraccion ya tiene un pago registrado y no puede marcarse como No aplica pago',
      );
    }

    if (solventacionExistente) {
      throw new BadRequestException(
        'La infraccion ya fue solventada mediante No aplica pago',
      );
    }

    const solventacion = this.solventacionesRepository.create({
      infraccion: { idInfraccion: params.idInfraccion } as Infraccion,
      usuarioRegistra: { idUsuario: params.idUsuarioRegistra } as Usuario,
      motivo,
      fechaSolventacion: new Date(),
    });

    const savedSolventacion =
      await this.solventacionesRepository.save(solventacion);

    await this.infraccionesService.actualizarEstatusYRegistrarMovimiento({
      idInfraccion: params.idInfraccion,
      nombreEstatus: ESTATUS_INFRACCION.SOLVENTADA_SIN_PAGO,
      idUsuario: params.idUsuarioRegistra,
      accion: ACCION_MOVIMIENTO.NO_APLICA_PAGO,
      observaciones: `No aplica pago: ${motivo}`,
      fechaMovimiento: savedSolventacion.fechaSolventacion,
    });

    await this.auditoriaService.registrar({
      idUsuario: params.idUsuarioRegistra,
      accion: 'NO_APLICA_PAGO',
      entidad: 'solventacion_sin_pago',
      entidadId: savedSolventacion.idSolventacionSinPago,
      despuesJson: {
        idSolventacionSinPago: savedSolventacion.idSolventacionSinPago,
        idInfraccion: params.idInfraccion,
        motivo,
        fechaSolventacion: savedSolventacion.fechaSolventacion,
      },
    });

    return this.findNoAplicaByIdOrFail(
      savedSolventacion.idSolventacionSinPago,
    );
  }

  private normalizeConceptos(
    conceptos: RegistrarPagoConceptoParams[],
  ): ConceptoNormalizado[] {
    if (!Array.isArray(conceptos) || conceptos.length === 0) {
      throw new BadRequestException('Captura al menos una clave de concepto');
    }

    const claves = new Set<string>();

    return conceptos.map((concepto) => {
      const claveConcepto = this.normalizeClaveConcepto(concepto.claveConcepto);
      const monto = this.normalizeMoney(concepto.monto, 'monto del concepto');

      if (Number(monto) <= 0) {
        throw new BadRequestException(
          `El monto del concepto ${claveConcepto} debe ser mayor a cero`,
        );
      }

      if (claves.has(claveConcepto)) {
        throw new BadRequestException(
          `La clave de concepto ${claveConcepto} esta repetida en el pago`,
        );
      }

      claves.add(claveConcepto);
      return { claveConcepto, monto };
    });
  }

  private normalizeClaveConcepto(value: string): string {
    const normalizedValue = value.trim().toUpperCase();

    if (!normalizedValue) {
      throw new BadRequestException('La clave de concepto es obligatoria');
    }

    if (normalizedValue.length > 50) {
      throw new BadRequestException(
        'La clave de concepto no puede exceder 50 caracteres',
      );
    }

    return normalizedValue;
  }

  private async getOrCreateConcepto(
    manager: EntityManager,
    claveConcepto: string,
  ): Promise<ConceptoPago> {
    const rows: ConceptoPagoUpsertRow[] = await manager.query(
      `
        INSERT INTO concepto_pago (clave_concepto, activo)
        VALUES ($1, TRUE)
        ON CONFLICT (clave_concepto)
        DO UPDATE SET activo = TRUE
        RETURNING
          id_concepto_pago AS "idConceptoPago",
          clave_concepto AS "claveConcepto",
          activo
      `,
      [claveConcepto],
    );

    const row = rows[0];
    if (!row) {
      throw new BadRequestException(
        `No se pudo resolver la clave de concepto ${claveConcepto}`,
      );
    }

    return manager.getRepository(ConceptoPago).create(row);
  }

  private normalizeMoney(value: string, label: string): string {
    const normalizedValue = value.trim();

    if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
      throw new BadRequestException(`El ${label} no tiene formato valido`);
    }

    return Number(normalizedValue).toFixed(2);
  }

  private sumMoney(values: string[]): string {
    const cents = values.reduce(
      (total, value) => total + Math.round(Number(value) * 100),
      0,
    );

    return (cents / 100).toFixed(2);
  }
}
