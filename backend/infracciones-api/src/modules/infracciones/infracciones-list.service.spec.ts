import { join } from 'node:path';

import { DataSource, SelectQueryBuilder } from 'typeorm';

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

interface DataSourceMetadataBuilder {
  buildMetadatas(): Promise<void>;
}

async function createMetadataDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    username: 'metadata_test',
    password: 'metadata_test',
    database: 'metadata_test',
    entities: [join(__dirname, '..', '**', '*.entity.ts')],
    synchronize: false,
    migrationsRun: false,
    dropSchema: false,
  });

  await (dataSource as unknown as DataSourceMetadataBuilder).buildMetadatas();
  return dataSource;
}

describe('InfraccionesListService filtros relacionales con metadatos reales', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createMetadataDataSource();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    {
      name: 'estatus individual',
      query: { idEstatusInfraccion: 7 },
      expectedPredicates: ['"estatusInfraccion"."id_estatus_infraccion" = $1'],
      expectedParameters: [7],
    },
    {
      name: 'delegacion individual',
      query: { idDelegacion: 3 },
      expectedPredicates: ['"delegacion"."id_delegacion" = $1'],
      expectedParameters: [3],
    },
    {
      name: 'tipo de procedimiento individual',
      query: { idTipoProcedimiento: 2 },
      expectedPredicates: ['"tipoProcedimiento"."id_tipo_procedimiento" = $1'],
      expectedParameters: [2],
    },
    {
      name: 'region individual',
      query: { idRegion: 10 },
      expectedPredicates: ['"region"."id_region" = $1'],
      expectedParameters: [10],
    },
    {
      name: 'estatus y region',
      query: { idEstatusInfraccion: 7, idRegion: 10 },
      expectedPredicates: [
        '"estatusInfraccion"."id_estatus_infraccion" = $1',
        '"region"."id_region" = $2',
      ],
      expectedParameters: [7, 10],
    },
    {
      name: 'identificadores y estatus',
      query: { idEstatusInfraccion: 7, idInfracciones: [101, 102] },
      expectedPredicates: [
        '"estatusInfraccion"."id_estatus_infraccion" = $1',
        '"infraccion"."id_infraccion" IN ($2, $3)',
      ],
      expectedParameters: [7, 101, 102],
    },
    {
      name: 'identificadores y delegacion',
      query: { idDelegacion: 3, idInfracciones: [101, 102] },
      expectedPredicates: [
        '"delegacion"."id_delegacion" = $1',
        '"infraccion"."id_infraccion" IN ($2, $3)',
      ],
      expectedParameters: [3, 101, 102],
    },
    {
      name: 'identificadores y tipo de procedimiento',
      query: { idTipoProcedimiento: 2, idInfracciones: [101, 102] },
      expectedPredicates: [
        '"tipoProcedimiento"."id_tipo_procedimiento" = $1',
        '"infraccion"."id_infraccion" IN ($2, $3)',
      ],
      expectedParameters: [2, 101, 102],
    },
    {
      name: 'todos los filtros relacionales',
      query: {
        idEstatusInfraccion: 7,
        idDelegacion: 3,
        idRegion: 10,
        idTipoProcedimiento: 2,
      },
      expectedPredicates: [
        '"estatusInfraccion"."id_estatus_infraccion" = $1',
        '"delegacion"."id_delegacion" = $2',
        '"region"."id_region" = $3',
        '"tipoProcedimiento"."id_tipo_procedimiento" = $4',
      ],
      expectedParameters: [7, 3, 10, 2],
    },
  ])('genera SQL valido para $name', async ({
    query,
    expectedPredicates,
    expectedParameters,
  }) => {
    let generatedSql = '';
    let boundParameters: unknown[] = [];
    jest.spyOn(SelectQueryBuilder.prototype, 'getCount').mockImplementation(function (
      this: SelectQueryBuilder<Infraccion>,
    ) {
      [generatedSql, boundParameters] = this.getQueryAndParameters();
      return Promise.resolve(0);
    });
    const service = new InfraccionesListService(dataSource);

    await service.countForReport(query as FindInfraccionesQueryDto);

    for (const predicate of expectedPredicates) {
      expect(generatedSql).toContain(predicate);
    }
    expect(generatedSql).not.toMatch(
      /infraccion\.(?:idEstatusInfraccion|idDelegacion|idTipoProcedimiento)/u,
    );
    expect(boundParameters).toEqual(expectedParameters);
  });

  it('conserva los filtros relacionales en listado, conteo y bloques de exportacion', async () => {
    const generatedQueries: Array<{ parameters: unknown[]; sql: string }> = [];
    jest.spyOn(SelectQueryBuilder.prototype, 'getCount').mockImplementation(function (
      this: SelectQueryBuilder<Infraccion>,
    ) {
      const [sql, parameters] = this.getQueryAndParameters();
      generatedQueries.push({ sql, parameters });
      return Promise.resolve(0);
    });
    jest.spyOn(SelectQueryBuilder.prototype, 'getRawMany').mockImplementation(function (
      this: SelectQueryBuilder<Infraccion>,
    ) {
      const [sql, parameters] = this.getQueryAndParameters();
      generatedQueries.push({ sql, parameters });
      return Promise.resolve([]);
    });
    const service = new InfraccionesListService(dataSource);
    const query = {
      idEstatusInfraccion: 7,
      idDelegacion: 3,
      idRegion: 10,
      idTipoProcedimiento: 2,
    } as FindInfraccionesQueryDto;

    await service.findAll({ ...query, page: 1, limit: 2 });
    await service.countForReport(query);
    await service.findForReportExportBlock(query, 0, 2);

    expect(generatedQueries).toHaveLength(4);
    for (const { sql, parameters } of generatedQueries) {
      expect(sql).toContain('"estatusInfraccion"."id_estatus_infraccion" = $1');
      expect(sql).toContain('"delegacion"."id_delegacion" = $2');
      expect(sql).toContain('"region"."id_region" = $3');
      expect(sql).toContain('"tipoProcedimiento"."id_tipo_procedimiento" = $4');
      expect(sql).not.toMatch(
        /infraccion\.(?:idEstatusInfraccion|idDelegacion|idTipoProcedimiento)/u,
      );
      expect(parameters).toEqual([7, 3, 10, 2]);
    }
  });
});

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

describe('InfraccionesListService fecha civil de infraccion', () => {
  it('devuelve la fecha como YYYY-MM-DD sin convertirla a un instante UTC', () => {
    const addSelect = jest.fn().mockReturnThis();
    const builder = {
      select: jest.fn().mockReturnThis(),
      addSelect,
    } as unknown as SelectQueryBuilder<Infraccion>;
    const service = new InfraccionesListService({} as DataSource) as unknown as {
      applySelects(query: SelectQueryBuilder<Infraccion>): SelectQueryBuilder<Infraccion>;
    };

    service.applySelects(builder);

    const fechaSelect = (addSelect.mock.calls as Array<[string, string]>).find(
      ([, alias]) => alias === 'fechaInfraccion',
    );
    expect(fechaSelect?.[0]).toBe(
      "TO_CHAR(infraccion.fechaInfraccion, 'YYYY-MM-DD')",
    );
  });
});
