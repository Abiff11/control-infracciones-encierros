import { DashboardDistributionsService } from './dashboard-distributions.service';

function createService() {
  const dataSource = {
    query: jest.fn(),
  };

  return {
    dataSource,
    service: new DashboardDistributionsService(dataSource as never),
  };
}

describe('DashboardDistributionsService', () => {
  it('combina conteos e ingresos por territorio y conserva distribuciones operativas', async () => {
    const { dataSource, service } = createService();

    dataSource.query
      .mockResolvedValueOnce([
        {
          id: 1,
          nombre: 'Valles Centrales',
          totalExpedientes: 20,
          totalInfracciones: 18,
        },
      ])
      .mockResolvedValueOnce([{ id: 1, totalIngresos: '15000.50' }])
      .mockResolvedValueOnce([
        {
          id: 10,
          nombre: 'Oaxaca',
          totalExpedientes: 12,
          totalInfracciones: 11,
        },
      ])
      .mockResolvedValueOnce([{ id: 10, totalIngresos: '9000.00' }])
      .mockResolvedValueOnce([
        { idMotivo: 4, nombreMotivo: 'Exceso de velocidad', totalInfracciones: 7 },
      ])
      .mockResolvedValueOnce([
        {
          idTipoProcedimiento: 2,
          claveTipoProcedimiento: 'INFRACCION',
          nombreTipoProcedimiento: 'INFRACCION',
          totalExpedientes: 11,
        },
      ])
      .mockResolvedValueOnce([
        {
          idEncierro: 3,
          nombreEncierro: 'Encierro Central',
          totalExpedientes: 6,
          actualmenteEnEncierro: 4,
        },
      ])
      .mockResolvedValueOnce([{ idEncierro: 3, totalIngresos: '4200.00' }])
      .mockResolvedValueOnce([
        { estado: 'EN_ENCIERRO_SIN_PAGO', total: 4 },
        { estado: 'VEHICULO_ENTREGADO', total: 2 },
      ]);

    const result = await service.getDistribuciones({});

    expect(result.regiones[0]).toEqual({
      id: 1,
      nombre: 'Valles Centrales',
      totalExpedientes: 20,
      totalInfracciones: 18,
      totalIngresos: 15000.5,
    });
    expect(result.delegaciones[0].totalIngresos).toBe(9000);
    expect(result.motivos[0].totalInfracciones).toBe(7);
    expect(result.encierros[0]).toEqual({
      idEncierro: 3,
      nombreEncierro: 'Encierro Central',
      totalExpedientes: 6,
      actualmenteEnEncierro: 4,
      totalIngresos: 4200,
    });
    expect(
      result.estadosOperativos.find(
        (item) => item.estado === 'EN_ENCIERRO_SIN_PAGO',
      )?.total,
    ).toBe(4);
    expect(
      result.estadosOperativos.find((item) => item.estado === 'SIN_RETENCION')
        ?.total,
    ).toBe(0);
    expect(dataSource.query).toHaveBeenCalledTimes(9);
  });

  it('usa el monto del concepto seleccionado en distribuciones de ingresos', async () => {
    const { dataSource, service } = createService();

    for (let index = 0; index < 9; index += 1) {
      dataSource.query.mockResolvedValueOnce([]);
    }

    await service.getDistribuciones({ claveConcepto: ' abc-20 ' });

    const [regionRevenueSql, regionRevenueParams] = dataSource.query.mock.calls[1] as [
      string,
      unknown[],
    ];

    expect(regionRevenueSql).toContain('pc_distribution_revenue.monto::numeric');
    expect(regionRevenueSql).toContain('cp_distribution_revenue.clave_concepto');
    expect(regionRevenueParams).toContain('ABC-20');

    const [regionCountSql, regionCountParams] = dataSource.query.mock.calls[0] as [
      string,
      unknown[],
    ];

    expect(regionCountSql).toContain('pago_distribution_key');
    expect(regionCountParams).toContain('ABC-20');
  });
});
