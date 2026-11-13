import { BadRequestException, ConflictException } from '@nestjs/common';

import { Auditoria } from '../auditoria/entities/auditoria.entity';
import { EstatusInfraccion } from '../catalogos/entities/estatus-infraccion.entity';
import { InfraccionMovimiento } from '../infracciones/entities/infraccion-movimiento.entity';
import { Infraccion } from '../infracciones/entities/infraccion.entity';
import { LiberacionVehiculo } from '../liberaciones/entities/liberacion-vehiculo.entity';
import { RetencionVehiculo } from './entities/retencion-vehiculo.entity';
import { SalidaVehiculo } from './entities/salida-vehiculo.entity';
import { ObservacionExpediente } from './entities/observacion-expediente.entity';
import type { CampoObservado } from './entities/observacion-expediente.entity';
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
    const observaciones = {
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn().mockResolvedValue([]),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === RetencionVehiculo) return retenciones;
        if (entity === SalidaVehiculo) return salidas;
        if (entity === LiberacionVehiculo) return liberaciones;
        if (entity === EstatusInfraccion) return estatus;
        if (entity === Infraccion) return infracciones;
        if (entity === InfraccionMovimiento) return movimientos;
        if (entity === Auditoria) return auditoria;
        if (entity === ObservacionExpediente) return observaciones;
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
      nombrePropietarioDeclarado: 'Persona propietaria',
      validadoPor: 'Responsable',
      personaRecibeVehiculo: 'Persona receptora',
      idUsuarioValidaSalida: 3,
    };
    return { service, params, dataSource, retenciones, queryBuilder, salidas, liberaciones, estatus, infracciones, movimientos, auditoria, observaciones, manager };
  }

  it('registra salida, estatus, movimiento y auditoria en una sola transaccion', async () => {
    const f = fixture();
    const salida = await f.service.registrarSalidaAnticipada(f.params);
    expect(f.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(f.salidas.save).toHaveBeenCalledTimes(1);
    expect(salida.liberacionVehiculo).toBeNull();
    expect(salida.modalidadSalida).toBe('ANTICIPADA');
    expect(salida.referenciaDocumentoLiberacion).toBe('FL-2026-55');
    expect(salida.folioLiberacionPresentado).toBe('FL-2026-55');
    expect(salida.nombrePropietarioDeclarado).toBe('Persona propietaria');
    expect(salida.personaRecibeVehiculo).toBe('Persona receptora');
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

  it('registra placas diferentes con evidencia sin alterar el vehiculo original', async () => {
    const f = fixture();
    await f.service.registrarSalidaAnticipada({
      ...f.params,
      placasCotejadas: 'OTRAS',
      discrepanciaMenor: {
        motivo: 'Placas cotejadas diferentes; se verifico el documento',
        referenciaEvidencia: 'Tarjeta presentada',
      },
    });
    expect(f.observaciones.create).toHaveBeenCalledWith(
      expect.objectContaining({ campoObservado: 'PLACAS',
        valorOriginal: 'ABC-123-D', valorReportado: 'OTRAS' }),
    );
    expect(f.infracciones.update).toHaveBeenCalledTimes(1);
  });

  it('bloquea una discrepancia menor sin motivo y evidencia', async () => {
    const f = fixture();
    await expect(f.service.registrarSalidaAnticipada({
      ...f.params,
      datosVehiculoCotejados: { marca: 'NISSAN', linea: 'VERSA', color: 'negro' },
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.salidas.save).not.toHaveBeenCalled();
  });


  it('registra la entrega y una observacion pendiente cuando el año modelo es distinto', async () => {
    const f = fixture();
    const salida = await f.service.registrarSalidaAnticipada({
      ...f.params,
      datosVehiculoCotejados: {
        marca: 'NISSAN',
        linea: 'VERSA',
        anioModelo: 2022,
      },
      discrepanciaMenor: {
        motivo: 'El documento indica año 2022, mientras que el sistema dice 2023.',
        referenciaEvidencia: 'Tarjeta de circulacion presentada y cotejada',
      },
    });

    expect(salida.modalidadSalida).toBe('ANTICIPADA');
    expect(f.observaciones.save).toHaveBeenCalledTimes(1);
    expect(f.observaciones.create).toHaveBeenCalledWith(
      expect.objectContaining({
        campoObservado: 'ANIO_MODELO',
        valorOriginal: '2023',
        valorReportado: '2022',
        estatus: 'PENDIENTE',
        infraccion: { idInfraccion: 11 },
        salidaVehiculo: { idSalidaVehiculo: 100 },
        usuarioReporta: { idUsuario: 3 },
      }),
    );
    expect(f.salidas.save).toHaveBeenCalledTimes(1);
    expect(f.auditoria.save).toHaveBeenCalledTimes(1);
    expect(f.dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('permite una diferencia de color con dos caracteristicas adicionales coincidentes', async () => {
    const f = fixture();
    await f.service.registrarSalidaAnticipada({
      ...f.params,
      datosVehiculoCotejados: {
        marca: 'NISSAN',
        linea: 'VERSA',
        color: 'PLATA',
      },
      discrepanciaMenor: {
        motivo: 'Color registrado distinto al inspeccionado.',
        referenciaEvidencia: 'Constancia de inspeccion visual',
      },
    });
    expect(f.observaciones.create).toHaveBeenCalledWith(
      expect.objectContaining({
        campoObservado: 'COLOR',
        valorOriginal: 'Blanco',
        valorReportado: 'PLATA',
      }),
    );
  });

  it('registra diferencias de marca, serie y motor junto con año modelo', async () => {
    const f = fixture();
    await f.service.registrarSalidaAnticipada({
      ...f.params,
      datosVehiculoCotejados: {
        marca: 'OTRA MARCA', linea: 'VERSA', anioModelo: 2022,
        serie: 'OTRO VIN', motor: 'OTRO MOTOR',
      },
      discrepanciaMenor: {
        motivo: 'Se cotejaron todos los datos vehiculares y requieren revision',
        referenciaEvidencia: 'Documento y fotografia inspeccionados',
      },
    });
    expect(f.observaciones.create.mock.calls.map(([arg]) => arg.campoObservado))
      .toEqual(['MARCA', 'ANIO_MODELO', 'SERIE', 'MOTOR']);
    expect(f.observaciones.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ campoObservado: 'MARCA' }),
        expect.objectContaining({ campoObservado: 'SERIE' }),
      ]),
    );
    expect(f.salidas.save).toHaveBeenCalledTimes(1);
  });

  it('crea una observacion independiente por cada diferencia encontrada', async () => {
    const f = fixture();
    await f.service.registrarSalidaAnticipada({
      ...f.params,
      datosVehiculoCotejados: {
        marca: 'NISSAN', linea: 'VERSA',
        color: 'ROJO', anioModelo: 2022,
      },
      discrepanciaMenor: {
        motivo: 'Ambos datos requieren revision',
        referenciaEvidencia: 'Informe de cotejo',
      },
    });
    expect(f.observaciones.create).toHaveBeenCalledTimes(2);
    expect(f.observaciones.create.mock.calls.map(([arg]) => arg.campoObservado))
      .toEqual(['COLOR', 'ANIO_MODELO']);
    expect(f.salidas.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza enviar un reporte cuando no se detecto ninguna diferencia', async () => {
    const f = fixture();
    await expect(f.service.registrarSalidaAnticipada({
      ...f.params,
      discrepanciaMenor: {
        motivo: 'Observacion sin diferencias',
        referenciaEvidencia: 'Sin evidencia de diferencia',
      },
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.observaciones.save).not.toHaveBeenCalled();
  });

  it('no necesita observacion cuando todos los datos cotejados coinciden', async () => {
    const f = fixture();
    await f.service.registrarSalidaAnticipada(f.params);
    expect(f.observaciones.create).not.toHaveBeenCalled();
  });

  it('revierte la entrega si falla guardar la observacion en la misma transaccion', async () => {
    const f = fixture();
    f.observaciones.save.mockRejectedValue(new Error('Error de escritura de observacion'));
    await expect(f.service.registrarSalidaAnticipada({
      ...f.params,
      datosVehiculoCotejados: {
        marca: 'NISSAN', linea: 'VERSA', anioModelo: 2022,
      },
      discrepanciaMenor: {
        motivo: 'Modelo real distinto',
        referenciaEvidencia: 'Tarjeta de circulacion',
      },
    })).rejects.toThrow('Error de escritura de observacion');
    expect(f.infracciones.update).not.toHaveBeenCalled();
    expect(f.movimientos.save).not.toHaveBeenCalled();
    expect(f.auditoria.save).not.toHaveBeenCalled();
  });

  it('permite una sola caracteristica cotejada si se confirma la documentacion', async () => {
    const f = fixture();
    await f.service.registrarSalidaAnticipada({
      ...f.params,
      datosVehiculoCotejados: { marca: 'Nissan' },
    });
    expect(f.salidas.save).toHaveBeenCalledTimes(1);
    expect(f.observaciones.create).not.toHaveBeenCalled();
  });

  it('impide salida anticipada cuando ya existe liberacion electronica', async () => {
    const f = fixture();
    f.liberaciones.exists.mockResolvedValue(true);
    await expect(f.service.registrarSalidaAnticipada(f.params)).rejects.toBeInstanceOf(BadRequestException);
    expect(f.salidas.save).not.toHaveBeenCalled();
  });

  it('exige un folio de liberación presentado aunque derive la referencia automáticamente', async () => {
    const f = fixture();
    await expect(f.service.registrarSalidaAnticipada({
      ...f.params,
      folioLiberacionPresentado: ' ',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.dataSource.transaction).not.toHaveBeenCalled();
  });
});

describe('EncierrosService resolverObservacion', () => {
  function fixture(options?: {
    campo?: CampoObservado;
    estatus?: string;
    valorOriginal?: string;
    valorReportado?: string;
    colorActual?: string;
    anioActual?: number;
    referencias?: number;
    filasActualizadas?: number;
    idObservacionActualizada?: number;
  }) {
    const observacion = {
      idObservacion: 21,
      idInfraccion: 15,
      idInfraccionRetencion: 15,
      idVehiculo: 47,
      modalidadSalida: 'ANTICIPADA',
      estatus: options?.estatus ?? 'PENDIENTE',
      campoObservado: options?.campo ?? 'ANIO_MODELO',
      valorOriginal: options?.valorOriginal ?? '2022',
      valorReportado: options?.valorReportado ?? '2023',
    };
    const auditoria = {
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn((value: Record<string, unknown>) => Promise.resolve(value)),
    };
    const query = jest.fn((sql: string) => {
      if (sql.includes('FROM observacion_expediente o')) return Promise.resolve([observacion]);
      if (sql.includes('FROM vehiculo')) return Promise.resolve([{
        color: options?.colorActual ?? 'BLANCO',
        anioModelo: options?.anioActual ?? 2022,
      }]);
      if (sql.includes('COUNT(*)::int AS total')) return Promise.resolve([{
        total: options?.referencias ?? 1,
      }]);
      if (sql.includes('UPDATE vehiculo')) return Promise.resolve([]);
      if (sql.includes('UPDATE observacion_expediente')) {
        const cantidad = options?.filasActualizadas ?? 1;
        const filas = cantidad === 1
          ? [{ idObservacion: options?.idObservacionActualizada ?? 21 }]
          : [];
        return Promise.resolve([filas, cantidad]);
      }
      throw new Error('SQL inesperado: ' + sql);
    });
    const manager = {
      query,
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Auditoria) return auditoria;
        throw new Error('Repositorio inesperado');
      }),
    };
    const dataSource = {
      transaction: jest.fn((fn: (manager: typeof manager) => Promise<unknown>) => fn(manager)),
    };
    const service = new EncierrosService(
      dataSource as never, {} as never, {} as never, {} as never,
      { registrar: jest.fn() } as never, {} as never,
    );
    const params = {
      idObservacion: 21, idUsuarioResuelve: 9,
      decision: 'CORREGIR' as const,
      resolucion: 'Tarjeta de circulacion cotejada y verificada.',
    };
    return { service, params, query, auditoria, dataSource };
  }

  it('corrige solo el año modelo con auditoria y mantiene la salida intacta', async () => {
    const f = fixture();
    const r = await f.service.resolverObservacion(f.params);
    expect(r).toEqual(expect.objectContaining({
      campoObservado: 'ANIO_MODELO',
      estatus: 'CORREGIDA',
      valorAnterior: '2022',
      valorPosterior: '2023',
    }));
    expect(f.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE vehiculo SET anio_modelo'),
      [2023, 47],
    );
    expect(f.auditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'OBSERVACION_EXPEDIENTE_CORREGIDA', idUsuario: 9,
      }),
    );
    expect(f.dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('solo actualiza color y no toca placas, serie ni motor', async () => {
    const f = fixture({
      campo: 'COLOR', valorOriginal: 'BLANCO', valorReportado: 'PLATA',
    });
    const r = await f.service.resolverObservacion(f.params);
    expect(r.valorPosterior).toBe('PLATA');
    const changed = f.query.mock.calls
      .map(([sql]) => String(sql))
      .filter((sql) => sql.includes('UPDATE vehiculo'));
    expect(changed).toHaveLength(1);
    expect(changed[0]).toContain('SET color');
    expect(changed[0]).not.toMatch(/placas|serie|motor/u);
  });

  it('rechaza una observacion con motivo sin cambiar datos del vehiculo', async () => {
    const f = fixture();
    const r = await f.service.resolverObservacion({
      ...f.params,
      decision: 'RECHAZAR',
    });
    expect(r.estatus).toBe('RECHAZADA');
    expect(f.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE vehiculo')))
      .toBe(false);
    expect(f.auditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'OBSERVACION_EXPEDIENTE_RECHAZADA' }),
    );
  });

  it('rechaza la resolucion si PostgreSQL no actualiza ninguna fila', async () => {
    const f = fixture({ filasActualizadas: 0 });
    await expect(f.service.resolverObservacion(f.params))
      .rejects.toThrow('No fue posible completar la resolucion.');
    expect(f.auditoria.save).not.toHaveBeenCalled();
  });

  it('rechaza la resolucion si PostgreSQL devuelve otro ID de observacion', async () => {
    const f = fixture({ idObservacionActualizada: 22 });
    await expect(f.service.resolverObservacion({
      ...f.params,
      decision: 'RECHAZAR',
    })).rejects.toBeInstanceOf(ConflictException);
    expect(f.auditoria.save).not.toHaveBeenCalled();
  });

  it('permite atender placas distintas sin modificar el vehiculo', async () => {
    const f = fixture({ campo: 'PLACAS' });
    const resultado = await f.service.resolverObservacion({
      ...f.params, decision: 'RECHAZAR',
    });
    expect(resultado.estatus).toBe('RECHAZADA');
    expect(f.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE vehiculo')))
      .toBe(false);
  });

  it('impide corregir placas directamente desde el formulario de observaciones', async () => {
    const f = fixture({ campo: 'PLACAS' });
    await expect(f.service.resolverObservacion(f.params))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(f.auditoria.save).not.toHaveBeenCalled();
  });

  it('impide volver a resolver una observacion atendida', async () => {
    const f = fixture({ estatus: 'CORREGIDA' });
    await expect(f.service.resolverObservacion(f.params))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('bloquea sobrescribir un dato que cambio posteriormente', async () => {
    const f = fixture({ anioActual: 2024 });
    await expect(f.service.resolverObservacion(f.params))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('protege otros expedientes cuando comparten el mismo vehiculo', async () => {
    const f = fixture({ referencias: 2 });
    await expect(f.service.resolverObservacion(f.params))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza años reportados fuera del intervalo permitido', async () => {
    const f = fixture({ valorReportado: '2200' });
    await expect(f.service.resolverObservacion(f.params))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('exige justificacion de la decision', async () => {
    const f = fixture();
    await expect(f.service.resolverObservacion({ ...f.params, resolucion: ' ' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(f.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('no da por exitosa la operacion cuando falla la auditoria', async () => {
    const f = fixture();
    f.auditoria.save.mockRejectedValue(new Error('Auditoria no disponible'));
    await expect(f.service.resolverObservacion(f.params))
      .rejects.toThrow('Auditoria no disponible');
  });
});

describe('EncierrosService consultar observaciones filtradas', () => {
  it('consulta únicamente pendientes de la infracción solicitada', async () => {
    const builder: Record<string, jest.Mock> = {};
    for (const name of [
      'innerJoin', 'select', 'addSelect', 'orderBy', 'addOrderBy',
      'offset', 'limit', 'where', 'andWhere',
    ]) {
      builder[name] = jest.fn().mockReturnValue(builder);
    }
    builder.getCount = jest.fn().mockResolvedValue(1);
    builder.getRawMany = jest.fn().mockResolvedValue([{
      idObservacion: 32, idInfraccion: 11434, folioInfraccion: '117225',
      placas: 'RY5471A', campoObservado: 'COLOR',
      valorOriginal: 'BLANCO', valorReportado: 'GRIS',
      motivoReporte: 'Diferencia constatada', referenciaEvidencia: 'Tarjeta',
      nombreUsuarioReporta: 'Encierros', fechaReporte: '2026-11-11T12:00:00.000Z',
    }]);
    const dataSource = { getRepository: jest.fn(() => ({
      createQueryBuilder: jest.fn(() => builder),
    })) };
    const service = new EncierrosService(
      dataSource as never, {} as never, {} as never, {} as never,
      {} as never, {} as never,
    );

    const result = await service.listarObservacionesPendientes({
      page: 1, limit: 20, idInfraccion: 11434,
    });
    expect(builder.andWhere).toHaveBeenCalledWith(
      'infraccion.idInfraccion = :idInfraccion',
      { idInfraccion: 11434 },
    );
    expect(result.meta.total).toBe(1);
    expect(result.data[0]).toEqual(expect.objectContaining({
      idInfraccion: 11434, idObservacion: 32, estatus: 'PENDIENTE',
    }));
  });

  it('rechaza un id de infracción no válido antes de consultar', async () => {
    const service = new EncierrosService(
      { getRepository: jest.fn() } as never, {} as never, {} as never,
      {} as never, {} as never, {} as never,
    );
    await expect(service.listarObservacionesPendientes({
      page: 1, limit: 20, idInfraccion: -1,
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
