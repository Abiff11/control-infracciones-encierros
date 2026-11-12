import type { DataSource, SelectQueryBuilder } from 'typeorm';

import { FindInfraccionesQueryDto } from './dto/find-infracciones-query.dto';
import { Infraccion } from './entities/infraccion.entity';
import { InfraccionesListService } from './infracciones-list.service';

interface FilterServiceAccess {
  applyFilters(
    builder: SelectQueryBuilder<Infraccion>,
    query: FindInfraccionesQueryDto,
  ): void;
}

function createFilterHarness() {
  const service = new InfraccionesListService({} as DataSource);
  const andWhere = jest.fn().mockReturnThis();
  const builder = { andWhere } as unknown as SelectQueryBuilder<Infraccion>;
  const filterService = service as unknown as FilterServiceAccess;

  return { andWhere, builder, filterService };
}

describe('InfraccionesListService filtro de clave de concepto', () => {
  it('busca la clave exacta normalizada en cualquier pago de la infraccion', () => {
    const { andWhere, builder, filterService } = createFilterHarness();

    filterService.applyFilters(builder, {
      claveConcepto: ' 1eaaa002 ',
    } as FindInfraccionesQueryDto);

    expect(andWhere).toHaveBeenCalledTimes(1);

    const [where, params] = andWhere.mock.calls[0] as [
      string,
      { claveConcepto: string },
    ];

    expect(where).toContain('EXISTS');
    expect(where).toContain('FROM pago_infraccion pago_clave');
    expect(where).toContain('INNER JOIN pago_concepto pago_concepto_clave');
    expect(where).toContain('INNER JOIN concepto_pago concepto_pago_clave');
    expect(where).toContain(
      'pago_clave.id_infraccion = infraccion.id_infraccion',
    );
    expect(where).toContain(
      'concepto_pago_clave.clave_concepto = :claveConcepto',
    );
    expect(where).not.toContain('ILIKE :claveConcepto');
    expect(params).toEqual({ claveConcepto: '1EAAA002' });
  });

  it('no agrega condicion cuando la clave de concepto esta vacia', () => {
    const { andWhere, builder, filterService } = createFilterHarness();

    filterService.applyFilters(builder, {
      claveConcepto: '   ',
    } as FindInfraccionesQueryDto);

    expect(andWhere).not.toHaveBeenCalled();
  });
});

describe('InfraccionesListService folio de liberacion', () => {
  it('obtiene el folio y el ID del mismo registro de liberacion vigente', () => {
    const addSelect = jest.fn().mockReturnThis();
    const builder = {
      select: jest.fn().mockReturnThis(),
      addSelect,
    } as unknown as SelectQueryBuilder<Infraccion>;
    const service = new InfraccionesListService({} as DataSource) as unknown as {
      applySelects(query: SelectQueryBuilder<Infraccion>): SelectQueryBuilder<Infraccion>;
    };

    service.applySelects(builder);

    const queryByAlias = (alias: string): string | undefined =>
      (addSelect.mock.calls as Array<[string, string]>).find(
        ([, selectedAlias]) => selectedAlias === alias,
      )?.[0];
    const idQuery = queryByAlias('idUltimaLiberacion');
    const folioQuery = queryByAlias('folioLiberacion');

    expect(idQuery).toBeDefined();
    expect(folioQuery).toContain('SELECT liberacion.folio_liberacion');
    expect(
      folioQuery?.replace(
        'SELECT liberacion.folio_liberacion',
        'SELECT liberacion.id_liberacion_vehiculo',
      ),
    ).toBe(idQuery);
  });
});

describe('InfraccionesListService regularizacion posterior', () => {
  it('expone solventacion sin pago y folio documental de salida anticipada', () => {
    const addSelect = jest.fn().mockReturnThis();
    const builder = {
      select: jest.fn().mockReturnThis(),
      addSelect,
    } as unknown as SelectQueryBuilder<Infraccion>;
    const service = new InfraccionesListService({} as DataSource) as unknown as {
      applySelects(query: SelectQueryBuilder<Infraccion>): SelectQueryBuilder<Infraccion>;
    };

    service.applySelects(builder);

    const selected = new Map(
      (addSelect.mock.calls as Array<[string, string]>).map(([sql, alias]) => [
        alias,
        sql,
      ]),
    );
    expect(selected.get('tieneSolventacionSinPago')).toContain(
      'FROM solventacion_sin_pago solventacion',
    );
    expect(selected.get('folioLiberacionPresentado')).toContain(
      "salida_anticipada.modalidad_salida = 'ANTICIPADA'",
    );
    expect(selected.get('folioLiberacionPresentado')).toContain(
      'salida_anticipada.id_retencion_vehiculo = retencion.id_retencion_vehiculo',
    );
    expect(selected.get('cantidadObservacionesPendientes')).toContain(
      'observacion_pendiente.id_infraccion = infraccion.id_infraccion',
    );
    expect(selected.get('cantidadObservacionesPendientes')).toContain(
      "observacion_pendiente.estatus = 'PENDIENTE'",
    );
  });
});
