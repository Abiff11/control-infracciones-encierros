import { BadRequestException } from '@nestjs/common';

import { Auditoria } from '../auditoria/entities/auditoria.entity';
import { EstatusInfraccion } from '../catalogos/entities/estatus-infraccion.entity';
import { InfraccionMovimiento } from '../infracciones/entities/infraccion-movimiento.entity';
import { Infraccion } from '../infracciones/entities/infraccion.entity';
import { LiberacionVehiculo } from '../liberaciones/entities/liberacion-vehiculo.entity';
import { RetencionVehiculo } from './entities/retencion-vehiculo.entity';
import { SalidaVehiculo } from './entities/salida-vehiculo.entity';
import { EncierrosService } from './encierros.service';

function createRepositoryMock() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value: Record<string, unknown>) => value),
    save: jest.fn((value: Record<string, unknown>) => Promise.resolve(value)),
  };
}

describe('EncierrosService registrarRetencion', () => {
  it('rechaza retencion para un tipo sin retencion permitida', async () => {
    const encierrosRepository = createRepositoryMock();
    const retencionesRepository = createRepositoryMock();
    const salidasRepository = createRepositoryMock();
    const infraccionesService = {
      findByIdOrFail: jest.fn().mockResolvedValue({
        tipoProcedimiento: {
          nombreTipoProcedimiento: 'INFRACCION SIN RETENCION',
          permiteRetencion: false,
        },
      }),
    };

    const service = new EncierrosService(
      {} as never,
      encierrosRepository as never,
      retencionesRepository as never,
      salidasRepository as never,
      { registrar: jest.fn() } as never,
      infraccionesService as never,
    );

    await expect(
      service.registrarRetencion({
        idInfraccion: 10,
        idEncierro: 4,
        recibidoPor: 'Operador',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('guarda la retencion cuando el tipo la permite y no existe previa', async () => {
    const encierrosRepository = createRepositoryMock();
    const retencionesRepository = createRepositoryMock();
    retencionesRepository.findOne.mockResolvedValue(null);
    const salidasRepository = createRepositoryMock();
    const infraccionesService = {
      findByIdOrFail: jest.fn().mockResolvedValue({
        tipoProcedimiento: {
          nombreTipoProcedimiento: 'INFRACCION',
          permiteRetencion: true,
        },
      }),
    };

    const service = new EncierrosService(
      {} as never,
      encierrosRepository as never,
      retencionesRepository as never,
      salidasRepository as never,
      { registrar: jest.fn() } as never,
      infraccionesService as never,
    );

    await service.registrarRetencion({
      idInfraccion: 11,
      idEncierro: 7,
      recibidoPor: 'Operador',
    });

    expect(retencionesRepository.save).toHaveBeenCalled();
  });

  it('rechaza salida cuando la liberacion no corresponde a la retencion seleccionada', async () => {
    const encierrosRepository = createRepositoryMock();
    const retencionesRepository = createRepositoryMock();
    retencionesRepository.findOne.mockResolvedValue({
      idRetencionVehiculo: 14,
      infraccion: {
        idInfraccion: 11,
      },
      encierro: {
        idEncierro: 7,
      },
    });
    const salidasRepository = createRepositoryMock();
    salidasRepository.findOne.mockResolvedValue(null);
    const dataSource = {
      getRepository: jest.fn(() => ({
        findOne: jest.fn().mockResolvedValue({
          idLiberacionVehiculo: 99,
          infraccion: {
            idInfraccion: 88,
          },
        }),
      })),
    };

    const service = new EncierrosService(
      dataSource as never,
      encierrosRepository as never,
      retencionesRepository as never,
      salidasRepository as never,
      { registrar: jest.fn() } as never,
      {
        findByIdOrFail: jest.fn(),
        actualizarEstatusYRegistrarMovimiento: jest.fn(),
      } as never,
    );

    await expect(
      service.registrarSalida({
        idRetencionVehiculo: 14,
        idLiberacionVehiculo: 99,
        idUsuarioValidaSalida: 3,
        validadoPor: 'Operador',
        personaRecibeVehiculo: 'Propietario',
        estadoSalida: 'ENTREGADO',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});


describe('EncierrosService registrarSalidaAnticipada', () => {
  function fixture() {
    const retencion = {
      idRetencionVehiculo: 14,
      infraccion: {
        idInfraccion: 11,
        vehiculo: {
          placas: 'ABC-123-D',
          color: 'Blanco',
          anioModelo: 2023,
          serie: '123456VIN',
          motor: '123456MOT',
          estadoPlacas: 'Oaxaca',
          lineaVehiculo: {
            nombreLineaVehiculo: 'Versa',
            marcaVehiculo: { nombreMarcaVehiculo: 'Nissan' },
          },
          claseVehiculo: { nombreClaseVehiculo: 'Automovil' },
        },
      },
    };
    const queryBuilder = {
      innerJoinAndSelect: jest.fn(),
      leftJoinAndSelect: jest.fn(),
      where: jest.fn(),
      getOne: jest.fn().mockResolvedValue(retencion),
    };
    queryBuilder.innerJoinAndSelect.mockReturnValue(queryBuilder);
    queryBuilder.leftJoinAndSelect.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    const retenciones = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) };
    const salidas = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn((value: Record<string, unknown>) => Promise.resolve({ idSalidaVehiculo: 100, ...value })),
    };
    const liberaciones = { exists: jest.fn().mockResolvedValue(false) };
    const estatus = { findOne: jest.fn().mockResolvedValue({ idEstatusInfraccion: 5 }) };
    const infracciones = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    const movimientos = { create: jest.fn((value: Record<string, unknown>) => value), save: jest.fn().mockResolvedValue({}) };
    const auditoria = { create: jest.fn((value: Record<string, unknown>) => value), save: jest.fn().mockResolvedValue({}) };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === RetencionVehiculo) return retenciones;
        if (entity === SalidaVehiculo) return salidas;
        if (entity === LiberacionVehiculo) return liberaciones;
        if (entity === EstatusInfraccion) return estatus;
        if (entity === Infraccion) return infracciones;
        if (entity === InfraccionMovimiento) return movimientos;
        if (entity === Auditoria) return auditoria;
        throw new Error('Repositorio no esperado');
      }),
      query: jest.fn().mockResolvedValue([]),
    };
    const dataSource = { transaction: jest.fn((fn: (manager: unknown) => Promise<unknown>) => fn(manager)) };
    const service = new EncierrosService(
      dataSource as never,
      {} as never,
      {} as never,
      {} as never,
      { registrar: jest.fn() } as never,
      {} as never,
    );
    const params = {
      idRetencionVehiculo: 14,
      folioLiberacionPresentado: 'FL-2026-55',
      placasCotejadas: 'ABC123D',
      datosVehiculoCotejados: { marca: 'NISSAN', linea: 'VERSA', color: 'blanco' },
      autorizacionDocumentalVerificada: true as const,
      referenciaDocumentoLiberacion: 'Documento oficial cotejado',
      nombrePropietarioDeclarado: 'Persona propietaria',
      validadoPor: 'Responsable',
      personaRecibeVehiculo: 'Persona receptora',
      idUsuarioValidaSalida: 3,
    };
    return { service, params, dataSource, retenciones, queryBuilder, salidas, liberaciones, estatus, infracciones, movimientos, auditoria, manager };
  }

  it('registra salida, estatus, movimiento y auditoria en una sola transaccion', async () => {
    const f = fixture();
    const salida = await f.service.registrarSalidaAnticipada(f.params);
    expect(f.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(f.salidas.save).toHaveBeenCalledTimes(1);
    expect(salida.liberacionVehiculo).toBeNull();
    expect(salida.modalidadSalida).toBe('ANTICIPADA');
    expect(f.infracciones.update).toHaveBeenCalledTimes(1);
    expect(f.movimientos.save).toHaveBeenCalledTimes(1);
    expect(f.auditoria.save).toHaveBeenCalledTimes(1);
  });

  it('bloquea una segunda salida para la misma retencion', async () => {
    const f = fixture();
    f.salidas.exists.mockResolvedValue(true);
    await expect(f.service.registrarSalidaAnticipada(f.params)).rejects.toBeInstanceOf(BadRequestException);
    expect(f.salidas.save).not.toHaveBeenCalled();
  });

  it('bloquea placas diferentes aunque coincidan los demas datos', async () => {
    const f = fixture();
    await expect(f.service.registrarSalidaAnticipada({ ...f.params, placasCotejadas: 'OTRAS' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(f.salidas.save).not.toHaveBeenCalled();
  });

  it('bloquea un dato general divergente hasta habilitar observaciones', async () => {
    const f = fixture();
    await expect(f.service.registrarSalidaAnticipada({
      ...f.params,
      datosVehiculoCotejados: { marca: 'NISSAN', linea: 'VERSA', color: 'negro' },
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.salidas.save).not.toHaveBeenCalled();
  });

  it('exige placas y al menos dos datos generales cotejados', async () => {
    const f = fixture();
    await expect(f.service.registrarSalidaAnticipada({
      ...f.params,
      datosVehiculoCotejados: { marca: 'Nissan' },
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.salidas.save).not.toHaveBeenCalled();
  });

  it('impide salida anticipada cuando ya existe liberacion electronica', async () => {
    const f = fixture();
    f.liberaciones.exists.mockResolvedValue(true);
    await expect(f.service.registrarSalidaAnticipada(f.params)).rejects.toBeInstanceOf(BadRequestException);
    expect(f.salidas.save).not.toHaveBeenCalled();
  });

  it('exige soporte documental verificable', async () => {
    const f = fixture();
    await expect(f.service.registrarSalidaAnticipada({
      ...f.params,
      referenciaDocumentoLiberacion: ' ',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.dataSource.transaction).not.toHaveBeenCalled();
  });
});
