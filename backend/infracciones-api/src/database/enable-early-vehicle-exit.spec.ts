import { type QueryRunner } from 'typeorm';

import { EnableEarlyVehicleExit1980000000000 } from './migrations/1980000000000-EnableEarlyVehicleExit';

function createRunner(rows: unknown[] = []) {
  const query = jest.fn().mockResolvedValue(rows);
  return {
    query,
    runner: { query } as unknown as QueryRunner,
  };
}

describe('EnableEarlyVehicleExit1980000000000', () => {
  const migration = new EnableEarlyVehicleExit1980000000000();

  it('prepara salidas anticipadas sin modificar filas historicas', async () => {
    const { runner, query } = createRunner();

    await migration.up(runner);

    const statements = query.mock.calls
      .map(([statement]) => String(statement))
      .join('\n');

    expect(statements).toContain('DROP NOT NULL');
    expect(statements).toContain("DEFAULT 'ORDINARIA'");
    expect(statements).toContain('folio_liberacion_presentado');
    expect(statements).toContain('datos_vehiculo_cotejados');
    expect(statements).toContain('CHK_salida_anticipada_respaldo');
    expect(statements).toContain('CREATE UNIQUE INDEX');
    expect(statements).not.toMatch(/\b(?:UPDATE|DELETE|TRUNCATE)\b/i);
  });

  it('rechaza una reversion que dejaria salidas sin liberacion', async () => {
    const { runner, query } = createRunner([{ idSalidaVehiculo: 25 }]);

    await expect(migration.down(runner)).rejects.toThrow(
      'No se puede revertir la migracion',
    );
    expect(query).toHaveBeenCalledTimes(1);
    const statements = query.mock.calls
      .map(([statement]) => String(statement))
      .join('\n');
    expect(statements).toContain('OR "modalidad_salida" =');
  });

  it('restaura la restriccion original cuando no hay pendientes', async () => {
    const { runner, query } = createRunner();

    await migration.down(runner);

    const statements = query.mock.calls
      .map(([statement]) => String(statement))
      .join('\n');

    expect(statements).toContain('SET NOT NULL');
    expect(statements).toContain('DROP COLUMN "modalidad_salida"');
  });
});
