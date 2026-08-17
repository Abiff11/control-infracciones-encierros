import { BadRequestException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';

import { InfraccionesAdminOperacionesService } from './infracciones-admin-operaciones.service';

function createHarness() {
  const query = jest.fn((sql: string) => {
    if (
      sql.includes('FROM pago_infraccion') &&
      sql.includes('id_pago_infraccion = $1')
    ) {
      return Promise.resolve([
        {
          idPagoInfraccion: 20,
          folioLineaCaptura: 'PAGO-20',
          monto: '1000.00',
          fechaPago: '2026-08-17T12:00:00.000Z',
          observaciones: null,
        },
      ]);
    }
    if (
      sql.includes('FROM liberacion_vehiculo') &&
      sql.includes('id_pago_infraccion = $2')
    ) {
      return Promise.resolve([
        {
          idLiberacionVehiculo: 30,
          idPagoInfraccion: 20,
          folioLiberacion: 'LIB-30',
          fechaLiberacion: '2026-08-17T13:00:00.000Z',
        },
      ]);
    }
    if (
      sql.includes('FROM salida_vehiculo') &&
      sql.includes('id_liberacion_vehiculo = ANY')
    ) {
      return Promise.resolve([
        {
          idSalidaVehiculo: 40,
          idRetencionVehiculo: 50,
          idLiberacionVehiculo: 30,
          fechaSalida: '2026-08-17T14:00:00.000Z',
          estadoSalida: 'ENTREGADO',
        },
      ]);
    }
    if (
      sql.includes('FROM salida_vehiculo s') &&
      sql.includes('s.id_salida_vehiculo = $1')
    ) {
      return Promise.resolve([
        {
          idSalidaVehiculo: 40,
          idRetencionVehiculo: 50,
          idLiberacionVehiculo: 30,
          fechaSalida: '2026-08-17T14:00:00.000Z',
          estadoSalida: 'ENTREGADO',
        },
      ]);
    }
    return Promise.resolve([]);
  });
  const manager = { query } as unknown as EntityManager;
  const transaction = jest.fn((callback: (value: EntityManager) => unknown) =>
    Promise.resolve(callback(manager)),
  );
  const dataSource = { transaction } as unknown as DataSource;

  return {
    query,
    service: new InfraccionesAdminOperacionesService(dataSource),
  };
}

const audit = {
  idUsuario: 1,
  ip: '127.0.0.1',
  requestId: 'request-test',
  httpMethod: 'DELETE',
  requestPath: '/api/infracciones/7/admin/operaciones/PAGO/20',
  userAgent: 'jest',
};

describe('InfraccionesAdminOperacionesService', () => {
  it('exige confirmacion cuando eliminar un pago afecta liberacion y salida', async () => {
    const { query, service } = createHarness();

    await expect(
      service.eliminarOperacion(
        7,
        'PAGO',
        20,
        {
          versionExpediente: 'a'.repeat(64),
          motivoEliminacion: 'Pago registrado por error',
          confirmarDependencias: false,
        },
        audit,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      query.mock.calls.some(([sql]) => String(sql).startsWith('DELETE FROM')),
    ).toBe(false);
  });

  it('elimina salida, liberacion y pago en orden al confirmar dependencias', async () => {
    const { query, service } = createHarness();

    const result = await service.eliminarOperacion(
      7,
      'PAGO',
      20,
      {
        versionExpediente: 'a'.repeat(64),
        motivoEliminacion: 'Pago registrado por error',
        confirmarDependencias: true,
      },
      audit,
    );

    expect(result.dependenciasEliminadas).toEqual({
      pagos: 1,
      liberaciones: 1,
      salidas: 1,
      retenciones: 0,
    });

    const calls = query.mock.calls.map(([sql]) => String(sql).trim());
    const salidaIndex = calls.findIndex((sql) =>
      sql.startsWith('DELETE FROM salida_vehiculo'),
    );
    const liberacionIndex = calls.findIndex((sql) =>
      sql.startsWith('DELETE FROM liberacion_vehiculo'),
    );
    const pagoIndex = calls.findIndex((sql) =>
      sql.startsWith('DELETE FROM pago_infraccion'),
    );
    const auditIndex = calls.findIndex((sql) => sql.includes('INSERT INTO auditoria'));

    expect(salidaIndex).toBeGreaterThan(-1);
    expect(liberacionIndex).toBeGreaterThan(salidaIndex);
    expect(pagoIndex).toBeGreaterThan(liberacionIndex);
    expect(auditIndex).toBeGreaterThan(pagoIndex);
  });

  it('permite eliminar una salida sin tocar pago, liberacion o retencion', async () => {
    const { query, service } = createHarness();

    const result = await service.eliminarOperacion(
      7,
      'SALIDA',
      40,
      {
        versionExpediente: 'a'.repeat(64),
        motivoEliminacion: 'Salida capturada por error',
      },
      audit,
    );

    expect(result.dependenciasEliminadas).toEqual({
      pagos: 0,
      liberaciones: 0,
      salidas: 1,
      retenciones: 0,
    });
    const deleteCalls = query.mock.calls
      .map(([sql]) => String(sql).trim())
      .filter((sql) => sql.startsWith('DELETE FROM'));
    expect(deleteCalls).toEqual([
      'DELETE FROM salida_vehiculo WHERE id_salida_vehiculo = $1',
    ]);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO auditoria'))).toBe(
      true,
    );
  });
});
