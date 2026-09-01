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

describe('InfraccionesListService filtro de clave de pago', () => {
  it('busca la clave exacta normalizada en cualquier pago de la infraccion', () => {
    const { andWhere, builder, filterService } = createFilterHarness();

    filterService.applyFilters(builder, {
      clavePago: ' 1eaaa002 ',
    } as FindInfraccionesQueryDto);

    expect(andWhere).toHaveBeenCalledTimes(1);

    const [where, params] = andWhere.mock.calls[0] as [
      string,
      { clavePago: string },
    ];

    expect(where).toContain('EXISTS');
    expect(where).toContain('FROM pago_infraccion pago_clave');
    expect(where).toContain('INNER JOIN pago_concepto pago_concepto_clave');
    expect(where).toContain('INNER JOIN concepto_pago concepto_pago_clave');
    expect(where).toContain(
      'pago_clave.id_infraccion = infraccion.id_infraccion',
    );
    expect(where).toContain(
      'concepto_pago_clave.clave_concepto = :clavePago',
    );
    expect(where).not.toContain('ILIKE :clavePago');
    expect(params).toEqual({ clavePago: '1EAAA002' });
  });

  it('no agrega condicion cuando la clave de pago esta vacia', () => {
    const { andWhere, builder, filterService } = createFilterHarness();

    filterService.applyFilters(builder, {
      clavePago: '   ',
    } as FindInfraccionesQueryDto);

    expect(andWhere).not.toHaveBeenCalled();
  });
});
