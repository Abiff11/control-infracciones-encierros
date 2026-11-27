import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ExportInfraccionesExcelDto } from './export-infracciones-excel.dto';
import { FindInfraccionesQueryDto } from './find-infracciones-query.dto';

const RANGE_ERROR = 'La fecha inicial no puede ser posterior a la fecha final.';

async function validateQuery(
  values: Record<string, unknown>,
): Promise<ReturnType<typeof validate> extends Promise<infer T> ? T : never> {
  return validate(plainToInstance(FindInfraccionesQueryDto, values));
}

describe('FindInfraccionesQueryDto rangos de fechas', () => {
  it('Q3.2-01 permite omitir fechas y conserva null como valor opcional', async () => {
    await expect(validateQuery({})).resolves.toHaveLength(0);
    await expect(validateQuery({ fechaInicio: null })).resolves.toHaveLength(0);
  });

  it.each([
    { fechaInicio: '2026-08-20', fechaFin: '2026-08-24' },
    { fechaDesde: '2026-08-20', fechaHasta: '2026-08-24' },
  ])('Q3.2-02 permite un rango ascendente: %o', async (values) => {
    await expect(validateQuery(values)).resolves.toHaveLength(0);
  });

  it.each([
    { fechaInicio: '2026-08-22', fechaFin: '2026-08-22' },
    { fechaDesde: '2026-08-22', fechaHasta: '2026-08-22' },
  ])('Q3.2-03 permite fechas iguales: %o', async (values) => {
    await expect(validateQuery(values)).resolves.toHaveLength(0);
  });

  it.each(['fechaInicio', 'fechaFin', 'fechaDesde', 'fechaHasta'])(
    'Q3.2-04 permite el limite individual %s',
    async (field) => {
      const values = { [field]: '2024-02-29' };
      const instance = plainToInstance(FindInfraccionesQueryDto, values);

      await expect(validate(instance)).resolves.toHaveLength(0);
      expect(instance).toMatchObject(values);
    },
  );

  it.each([
    { fechaInicio: '2026-08-24', fechaFin: '2026-08-20' },
    { fechaDesde: '2026-08-24', fechaHasta: '2026-08-20' },
  ])('Q3.2-05 rechaza un rango invertido: %o', async (values) => {
    const errors = await validateQuery(values);

    expect(errors.flatMap((error) => Object.values(error.constraints ?? {})))
      .toContain(RANGE_ERROR);
  });

  it.each([
    '2026-02-30',
    '2025-02-29',
    '22/08/2026',
    '2026-08-22T10:30:00.000Z',
    '',
    '   ',
    20260822,
    ['2026-08-22'],
    { date: '2026-08-22' },
  ])('Q3.2-06 rechaza fecha invalida %p', async (value) => {
    await expect(validateQuery({ fechaInicio: value })).resolves.not.toHaveLength(0);
  });

  it.each([
    [
      'limites cruzados compatibles',
      { fechaInicio: '2026-08-20', fechaHasta: '2026-08-24' },
      true,
    ],
    [
      'fechaDesde posterior a fechaFin',
      { fechaDesde: '2026-08-24', fechaFin: '2026-08-20' },
      false,
    ],
    [
      'fechaInicio posterior a fechaHasta',
      { fechaInicio: '2026-08-24', fechaHasta: '2026-08-20' },
      false,
    ],
    [
      'intervalos superpuestos',
      {
        fechaInicio: '2026-08-20',
        fechaFin: '2026-08-30',
        fechaDesde: '2026-08-24',
        fechaHasta: '2026-09-01',
      },
      true,
    ],
    [
      'intervalos validos sin interseccion',
      {
        fechaInicio: '2026-08-20',
        fechaFin: '2026-08-22',
        fechaDesde: '2026-08-24',
        fechaHasta: '2026-08-26',
      },
      false,
    ],
    [
      'interseccion de un dia',
      {
        fechaInicio: '2026-08-20',
        fechaFin: '2026-08-24',
        fechaDesde: '2026-08-24',
        fechaHasta: '2026-08-26',
      },
      true,
    ],
  ] as const)(
    'Q3.2-07 valida %s mediante el intervalo efectivo',
    async (_name, values, valid) => {
      const instance = plainToInstance(FindInfraccionesQueryDto, values);
      const errors = await validate(instance);

      expect(errors.length === 0).toBe(valid);
      expect(instance).toMatchObject(values);
      if (!valid) {
        expect(errors.flatMap((error) => Object.values(error.constraints ?? {})))
          .toContain(RANGE_ERROR);
      }
    },
  );

  it('Q3.2-08 hereda las validaciones en ExportInfraccionesExcelDto', async () => {
    const invalid = plainToInstance(ExportInfraccionesExcelDto, {
      campos: ['folioInfraccion'],
      fechaInicio: '2026-08-24',
      fechaHasta: '2026-08-20',
    });
    const valid = plainToInstance(ExportInfraccionesExcelDto, {
      campos: ['folioInfraccion'],
      fechaInicio: '2026-08-20',
      fechaHasta: '2026-08-24',
    });

    const invalidErrors = await validate(invalid);
    expect(invalidErrors.flatMap((error) => Object.values(error.constraints ?? {})))
      .toContain(RANGE_ERROR);
    await expect(validate(valid)).resolves.toHaveLength(0);
  });
});
