import { BadRequestException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';

import { InfraccionesAdminService } from './infracciones-admin.service';

const VERSION_EXPEDIENTE = '0'.repeat(64);

function buildCore(observaciones = 'antes') {
  return {
    idInfraccion: 7,
    idInfractor: 11,
    idVehiculo: 12,
    idLugarInfraccion: 13,
    idDelegacion: 1,
    idTipoProcedimiento: 1,
    idEstatusInfraccion: 1,
    idOperativo: null,
    folioInfraccion: 'TEST-007',
    fechaInfraccion: '2026-08-14',
    horaInfraccion: '11:30:00',
    observaciones,
    clavePolicia: 'P-1',
    numParteInformativo: null,
    idSexo: 1,
    nombre: 'Persona',
    apellidoPaterno: 'Prueba',
    apellidoMaterno: null,
    licencia: null,
    curp: null,
    idClaseVehiculo: 1,
    idLineaVehiculo: 1,
    idServicio: 1,
    anioModelo: 2020,
    sitioServicioPublico: null,
    color: 'BLANCO',
    placas: 'ABC123',
    estadoPlacas: 'OAXACA',
    serie: null,
    motor: null,
    nombreLugarInfraccion: 'OAXACA DE JUAREZ',
  };
}

function createHarness() {
  let updated = false;
  const query = jest.fn((sql: string) => {
    if (
      sql.includes('FROM infracciones i') &&
      sql.includes('INNER JOIN infractor inf')
    ) {
      return Promise.resolve([buildCore(updated ? 'despues' : 'antes')]);
    }
    if (sql.includes('FROM infraccion_motivo') && sql.includes('SELECT id_motivo')) {
      return Promise.resolve([]);
    }
    if (sql.includes('FROM retencion_vehiculo') && sql.includes('fecha_ingreso')) {
      return Promise.resolve([]);
    }
    if (sql.includes('FROM pago_infraccion') && sql.includes('monto_infraccion')) {
      return Promise.resolve([]);
    }
    if (
      sql.includes('FROM liberacion_vehiculo') &&
      sql.includes('folio_liberacion')
    ) {
      return Promise.resolve([]);
    }
    if (sql.includes('FROM salida_vehiculo s')) {
      return Promise.resolve([]);
    }
    if (sql.includes('tp.nombre_tipo_procedimiento')) {
      return Promise.resolve([
        {
          nombreTipoProcedimiento: 'INFRACCION',
          activo: true,
          esTipoExpediente: true,
          requiereFolioInfraccion: true,
          requiereNumParteInformativo: false,
          requiereMotivos: false,
          permiteRetencion: true,
          folioInfraccion: 'TEST-007',
          numParteInformativo: null,
        },
      ]);
    }
    if (sql.includes('SELECT COUNT(*)::int AS total')) {
      return Promise.resolve([{ total: 0 }]);
    }
    if (sql.startsWith('UPDATE "infracciones"')) {
      updated = true;
      return Promise.resolve([]);
    }
    return Promise.resolve([]);
  });

  const manager = { query } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn((callback: (value: EntityManager) => unknown) =>
      Promise.resolve(callback(manager)),
    ),
  } as unknown as DataSource;

  return {
    query,
    service: new InfraccionesAdminService(dataSource),
  };
}

describe('InfraccionesAdminService', () => {
  const audit = {
    idUsuario: 1,
    ip: '127.0.0.1',
    requestId: 'test-request',
    httpMethod: 'PATCH',
    requestPath: '/api/infracciones/7',
    userAgent: 'jest',
  };

  it('rejects deletion when the confirmation folio does not match', async () => {
    const { query, service } = createHarness();

    await expect(
      service.eliminarExpediente(
        7,
        {
          versionExpediente: VERSION_EXPEDIENTE,
          folioConfirmacion: 'OTRO-FOLIO',
          motivoEliminacion: 'Correccion de captura',
        },
        { ...audit, httpMethod: 'DELETE' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      query.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM infracciones')),
    ).toBe(false);
  });

  it('deletes a simple expediente in dependency order and writes audit', async () => {
    const { query, service } = createHarness();

    const result = await service.eliminarExpediente(
      7,
      {
        versionExpediente: VERSION_EXPEDIENTE,
        folioConfirmacion: 'TEST-007',
        motivoEliminacion: 'Registro duplicado de prueba',
      },
      { ...audit, httpMethod: 'DELETE' },
    );

    expect(result.eliminado).toBe(true);
    expect(result.folioInfraccion).toBe('TEST-007');
    const sqlCalls = query.mock.calls.map(([sql]) => String(sql));
    expect(sqlCalls.some((sql) => sql.includes('DELETE FROM salida_vehiculo'))).toBe(
      true,
    );
    expect(
      sqlCalls.some((sql) => sql.includes('DELETE FROM liberacion_vehiculo')),
    ).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes('DELETE FROM pago_infraccion'))).toBe(
      true,
    );
    expect(sqlCalls.some((sql) => sql.includes('DELETE FROM retencion_vehiculo'))).toBe(
      true,
    );
    expect(sqlCalls.some((sql) => sql.includes('DELETE FROM infracciones'))).toBe(
      true,
    );
    expect(sqlCalls.some((sql) => sql.includes('INSERT INTO auditoria'))).toBe(true);
  });

  it('updates the expediente and stores before/after audit in the transaction', async () => {
    const { query, service } = createHarness();

    const result = await service.actualizarExpediente(
      7,
      {
        versionExpediente: VERSION_EXPEDIENTE,
        motivoEdicion: 'Corregir observaciones',
        infraccion: {
          observaciones: 'despues',
        },
      },
      audit,
    );

    expect(result.infraccion.observaciones).toBe('despues');
    const sqlCalls = query.mock.calls.map(([sql]) => String(sql));
    expect(
      sqlCalls.some((sql) => sql.startsWith('UPDATE "infracciones"')),
    ).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes('INSERT INTO auditoria'))).toBe(true);
  });
});
