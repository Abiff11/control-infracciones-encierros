import { isDeepStrictEqual } from 'node:util';
import { type MigrationInterface, type QueryRunner } from 'typeorm';
import {
  CATALOGO_TERRITORIAL_V1,
  EQUIVALENCIAS_DELEGACION_V1,
} from './territorial/catalogo-territorial-v1';

interface RegionRow {
  id_region: number;
  nombre_region: string;
}

interface DelegacionRow {
  id_delegacion: number;
  id_region: number;
  nombre_delegacion: string;
  activo: boolean;
}

interface EstadoCatalogo {
  regiones: RegionRow[];
  delegaciones: DelegacionRow[];
}

interface Referencias {
  infracciones: { id_infraccion: number; id_delegacion: number }[];
  importaciones: {
    id_importacion_infracciones: number;
    id_region: number;
    id_delegacion_default: number;
  }[];
}

interface Bitacora {
  previo: EstadoCatalogo;
  posterior: EstadoCatalogo;
  referencias: Referencias;
}

const BITACORA = 'regularizacion_territorial_v1';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error('Regularizacion territorial: ' + message);
}

async function snapshot(runner: QueryRunner): Promise<EstadoCatalogo> {
  const regiones = (await runner.query(
    'SELECT id_region, nombre_region FROM region ORDER BY id_region',
  )) as RegionRow[];
  const delegaciones = (await runner.query(
    'SELECT id_delegacion, id_region, nombre_delegacion, activo ' +
      'FROM delegacion ORDER BY id_delegacion',
  )) as DelegacionRow[];
  return { regiones, delegaciones };
}

async function referencias(
  runner: QueryRunner,
  ids: number[],
): Promise<Referencias> {
  const infracciones = (await runner.query(
    'SELECT id_infraccion, id_delegacion FROM infracciones ' +
      'WHERE id_delegacion = ANY($1::int[]) ORDER BY id_infraccion',
    [ids],
  )) as Referencias['infracciones'];
  const importaciones = (await runner.query(
    'SELECT id_importacion_infracciones, id_region, id_delegacion_default ' +
      'FROM importacion_infracciones ' +
      'WHERE id_delegacion_default = ANY($1::int[]) ' +
      'ORDER BY id_importacion_infracciones',
    [ids],
  )) as Referencias['importaciones'];
  return { infracciones, importaciones };
}

async function readBitacora(runner: QueryRunner): Promise<Bitacora | null> {
  if (!(await runner.hasTable(BITACORA))) return null;
  const rows = (await runner.query(
    'SELECT previo, posterior, referencias FROM regularizacion_territorial_v1 WHERE id = 1',
  )) as Bitacora[];
  requireCondition(rows.length === 1, 'bitacora ausente o invalida');
  return rows[0];
}

async function withTransaction(
  runner: QueryRunner,
  action: () => Promise<void>,
): Promise<void> {
  // El CLI configura --transaction none. Tambien permite savepoints en CI.
  await runner.startTransaction();
  try {
    await runner.query("SET LOCAL lock_timeout = '5s'");
    await runner.query(
      'LOCK TABLE region, delegacion, infracciones, importacion_infracciones ' +
        'IN SHARE ROW EXCLUSIVE MODE',
    );
    await action();
    await runner.commitTransaction();
  } catch (error) {
    await runner.rollbackTransaction();
    throw error;
  }
}

function changedIds(previo: EstadoCatalogo, posterior: EstadoCatalogo): number[] {
  return previo.delegaciones
    .filter((row) => {
      const next = posterior.delegaciones.find(
        (item) => item.id_delegacion === row.id_delegacion,
      );
      return !isDeepStrictEqual(row, next);
    })
    .map((row) => row.id_delegacion);
}

export class RegularizeTerritorialCatalog2020000000000
  implements MigrationInterface
{
  name = 'RegularizeTerritorialCatalog2020000000000';

  public async up(runner: QueryRunner): Promise<void> {
    await withTransaction(runner, async () => {
      const previo = await snapshot(runner);
      const existing = await readBitacora(runner);
      if (existing) {
        requireCondition(
          isDeepStrictEqual(previo, existing.posterior),
          'el catalogo cambio despues de la regularizacion; requiere revision',
        );
        return;
      }
      const idsPrevios = previo.delegaciones.map((row) => row.id_delegacion);
      const referenciasPrevias = await referencias(runner, idsPrevios);

      const oficiales = new Map<string, string>();
      const nombreOficial = new Map<string, string>();
      const regionesOficiales = new Map<string, string>();
      for (const region of CATALOGO_TERRITORIAL_V1) {
        regionesOficiales.set(normalize(region.nombreRegion), region.nombreRegion);
        for (const nombre of region.delegaciones) {
          const clave = normalize(nombre);
          requireCondition(!oficiales.has(clave), 'catalogo v1 duplicado');
          oficiales.set(clave, region.nombreRegion);
          nombreOficial.set(clave, nombre);
        }
      }
      requireCondition(
        regionesOficiales.size === 10 && oficiales.size === 46,
        'catalogo v1 incompleto',
      );
      const alias = new Map(
        EQUIVALENCIAS_DELEGACION_V1.map((item) => [
          normalize(item.origen),
          normalize(item.destino),
        ]),
      );

      const idsRegion = new Map<string, number>();
      const regionesPorId = new Map<number, string>();
      const clavesRegion = new Set<string>();
      for (const row of previo.regiones) {
        const clave = normalize(row.nombre_region);
        requireCondition(!!clave && !clavesRegion.has(clave), 'region ambigua: ' + row.nombre_region);
        clavesRegion.add(clave);
        regionesPorId.set(row.id_region, row.nombre_region);
        const oficial = regionesOficiales.get(clave);
        if (oficial) {
          // No renombrar una region historica sin una decision expresa.
          requireCondition(oficial === row.nombre_region, 'nombre regional no canonico: ' + row.nombre_region);
          idsRegion.set(oficial, row.id_region);
        }
      }

      const ocupadas = new Set<string>();
      const asignadas = new Map<string, DelegacionRow>();
      for (const row of previo.delegaciones) {
        const region = regionesPorId.get(row.id_region);
        requireCondition(region !== undefined, 'delegacion sin region');
        const clave = normalize(row.nombre_delegacion);
        const local = row.id_region + ':' + clave;
        requireCondition(!ocupadas.has(local), 'delegaciones normalizadas duplicadas: ' + local);
        ocupadas.add(local);
        const destino = alias.get(clave) ?? clave;
        const regionOficial = oficiales.get(destino);
        if (!regionOficial) continue;
        // Los CENTRO sinteticos no se fusionan ni se reasignan a PLAZA.
        if (destino === 'CENTRO' && region !== 'PLAZA') continue;

        const trasladoRetiro =
          clave === 'EL RETIRO' && region === 'PLAZA' && destino === 'RETIRO';
        requireCondition(
          region === regionOficial || trasladoRetiro,
          'asociacion oficial incompatible: ' + region + ' - ' + row.nombre_delegacion,
        );
        requireCondition(!asignadas.has(destino), 'colision territorial: ' + destino);
        if (trasladoRetiro) {
          const refs = await referencias(runner, [row.id_delegacion]);
          const target = idsRegion.get(regionOficial);
          requireCondition(
            refs.importaciones.every((item) => item.id_region === target),
            'importaciones incompatibles con traslado de EL RETIRO',
          );
        }
        asignadas.set(destino, row);
      }

      // Todas las asociaciones existentes se validan antes de escribir.
      for (const nombre of regionesOficiales.values()) {
        if (!idsRegion.has(nombre)) {
          const rows = (await runner.query(
            'INSERT INTO region (nombre_region) VALUES ($1) RETURNING id_region',
            [nombre],
          )) as { id_region: number }[];
          idsRegion.set(nombre, rows[0].id_region);
        }
      }

      const idsOficiales = new Set<number>();
      for (const [clave, region] of oficiales) {
        const idRegion = idsRegion.get(region);
        const nombre = nombreOficial.get(clave);
        requireCondition(idRegion !== undefined && nombre !== undefined, 'destino no resuelto');
        const row = asignadas.get(clave);
        if (row) {
          idsOficiales.add(row.id_delegacion);
          if (row.id_region !== idRegion || row.nombre_delegacion !== nombre || !row.activo) {
            await runner.query(
              'UPDATE delegacion SET id_region = $1, nombre_delegacion = $2, activo = true WHERE id_delegacion = $3',
              [idRegion, nombre, row.id_delegacion],
            );
          }
        } else {
          const rows = (await runner.query(
            'INSERT INTO delegacion (id_region, nombre_delegacion, activo) VALUES ($1, $2, true) RETURNING id_delegacion',
            [idRegion, nombre],
          )) as { id_delegacion: number }[];
          idsOficiales.add(rows[0].id_delegacion);
        }
      }
      await runner.query(
        'UPDATE delegacion SET activo = false WHERE activo AND NOT (id_delegacion = ANY($1::int[]))',
        [[...idsOficiales]],
      );

      const posterior = await snapshot(runner);
      requireCondition(
        isDeepStrictEqual(
          await referencias(runner, idsPrevios),
          referenciasPrevias,
        ),
        'referencias cambiaron durante la regularizacion',
      );
      const activas = posterior.delegaciones.filter((row) => row.activo);
      requireCondition(activas.length === 46, 'se esperaban 46 delegaciones activas');
      for (const row of activas) {
        const clave = normalize(row.nombre_delegacion);
        const region = oficiales.get(clave);
        requireCondition(
          idsOficiales.has(row.id_delegacion) &&
            row.nombre_delegacion === nombreOficial.get(clave) &&
            region !== undefined &&
            row.id_region === idsRegion.get(region),
          'asociacion final invalida',
        );
      }
      requireCondition(
        previo.regiones.every((row) =>
          posterior.regiones.some((next) => isDeepStrictEqual(row, next)),
        ) &&
          previo.delegaciones.every((row) =>
            posterior.delegaciones.some((next) => next.id_delegacion === row.id_delegacion),
          ),
        'se perdieron registros preexistentes',
      );

      // No se modifica ninguna FK. Registrar las referencias de las filas
      // cambiadas para impedir una reversa que reclasifique expedientes nuevos.
      const refs = await referencias(runner, changedIds(previo, posterior));
      await runner.query(
        'CREATE TABLE regularizacion_territorial_v1 (' +
          'id integer PRIMARY KEY CHECK (id = 1), previo jsonb NOT NULL, ' +
          'posterior jsonb NOT NULL, referencias jsonb NOT NULL)',
      );
      await runner.query(
        'INSERT INTO regularizacion_territorial_v1 (id, previo, posterior, referencias) VALUES (1, $1::jsonb, $2::jsonb, $3::jsonb)',
        [JSON.stringify(previo), JSON.stringify(posterior), JSON.stringify(refs)],
      );
    });
  }

  public async down(runner: QueryRunner): Promise<void> {
    await withTransaction(runner, async () => {
      const record = await readBitacora(runner);
      if (!record) throw new Error('Regularizacion territorial: falta bitacora de reversion');
      const { previo, posterior } = record;
      requireCondition(
        isDeepStrictEqual(await snapshot(runner), posterior),
        'catalogo modificado despues de la migracion; reversion bloqueada',
      );
      const nuevos = posterior.delegaciones
        .filter((row) => !previo.delegaciones.some((old) => old.id_delegacion === row.id_delegacion))
        .map((row) => row.id_delegacion);
      const regionesNuevas = posterior.regiones
        .filter((row) => !previo.regiones.some((old) => old.id_region === row.id_region))
        .map((row) => row.id_region);

      const nuevasRefs = await referencias(runner, nuevos);
      requireCondition(
        nuevasRefs.infracciones.length === 0 && nuevasRefs.importaciones.length === 0,
        'nuevas delegaciones referenciadas; reversion bloqueada',
      );
      requireCondition(
        isDeepStrictEqual(
          await referencias(runner, changedIds(previo, posterior)),
          record.referencias,
        ),
        'referencias historicas modificadas; reversion bloqueada',
      );
      const regionRefs = (await runner.query(
        'SELECT EXISTS (SELECT 1 FROM importacion_infracciones WHERE id_region = ANY($1::int[])) AS referenciada',
        [regionesNuevas],
      )) as { referenciada: boolean }[];
      requireCondition(!regionRefs[0].referenciada, 'nuevas regiones referenciadas; reversion bloqueada');

      await runner.query('DELETE FROM delegacion WHERE id_delegacion = ANY($1::int[])', [nuevos]);
      const cambios = new Set(changedIds(previo, posterior));
      for (const row of previo.delegaciones.filter((item) => cambios.has(item.id_delegacion))) {
        await runner.query(
          'UPDATE delegacion SET id_region = $1, nombre_delegacion = $2, activo = $3 WHERE id_delegacion = $4',
          [row.id_region, row.nombre_delegacion, row.activo, row.id_delegacion],
        );
      }
      await runner.query('DELETE FROM region WHERE id_region = ANY($1::int[])', [regionesNuevas]);
      requireCondition(
        isDeepStrictEqual(await snapshot(runner), previo),
        'no se recupero el estado previo',
      );
      await runner.query('DROP TABLE regularizacion_territorial_v1');
    });
  }
}
