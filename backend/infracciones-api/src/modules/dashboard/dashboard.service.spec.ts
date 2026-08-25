import { DashboardService } from './dashboard.service';

function createService() {
  const dataSource = {
    query: jest.fn(),
  };

  return {
    dataSource,
    service: new DashboardService(dataSource as never),
  };
}

describe('DashboardService analitica', () => {
  it('calcula resumen de expedientes e ingresos sin mezclar pagos historicos sin claves', async () => {
    const { dataSource, service } = createService();

    dataSource.query
      .mockResolvedValueOnce([
        {
          totalExpedientes: 120,
          totalInfracciones: 100,
          infraccionesConRetencion: 40,
          infraccionesSinRetencion: 60,
          tipoInfraccionSinRetencion: 35,
          vehiculosSinInfraccion: 20,
          vehiculosActualmenteEnEncierro: 48,
        },
      ])
      .mockResolvedValueOnce([
        {
          totalPagos: 90,
          totalIngresos: '125000.50',
          promedioPago: '1388.89',
        },
      ])
      .mockResolvedValueOnce([
        {
          ingresosConClaveIdentificada: '100000.50',
          ingresosSinDesgloseClave: '25000.00',
        },
      ]);

    const result = await service.getAnaliticaResumen({});

    expect(result.expedientes).toEqual({
      totalExpedientes: 120,
      totalInfracciones: 100,
      infraccionesConRetencion: 40,
      infraccionesSinRetencion: 60,
      tipoInfraccionSinRetencion: 35,
      vehiculosSinInfraccion: 20,
      vehiculosActualmenteEnEncierro: 48,
    });
    expect(result.ingresos).toEqual({
      totalPagos: 90,
      totalIngresos: 125000.5,
      promedioPago: 1388.89,
      ingresosConClaveIdentificada: 100000.5,
      ingresosSinDesgloseClave: 25000,
    });
    expect(dataSource.query).toHaveBeenCalledTimes(3);
  });

  it('excluye solventaciones sin pago del resumen financiero', async () => {
    const { dataSource, service } = createService();

    dataSource.query
      .mockResolvedValueOnce([
        {
          totalExpedientes: 1,
          totalInfracciones: 1,
          infraccionesConRetencion: 0,
          infraccionesSinRetencion: 1,
          tipoInfraccionSinRetencion: 0,
          vehiculosSinInfraccion: 0,
          vehiculosActualmenteEnEncierro: 0,
        },
      ])
      .mockResolvedValueOnce([
        {
          totalPagos: 0,
          totalIngresos: '0.00',
          promedioPago: '0.00',
        },
      ])
      .mockResolvedValueOnce([
        {
          ingresosConClaveIdentificada: '0.00',
          ingresosSinDesgloseClave: '0.00',
        },
      ]);

    const result = await service.getAnaliticaResumen({});
    const [ingresosSql] = dataSource.query.mock.calls[1] as [string];
    const [coberturaSql] = dataSource.query.mock.calls[2] as [string];

    expect(result.ingresos).toEqual({
      totalPagos: 0,
      totalIngresos: 0,
      promedioPago: 0,
      ingresosConClaveIdentificada: 0,
      ingresosSinDesgloseClave: 0,
    });
    expect(ingresosSql).toContain('FROM pago_infraccion p');
    expect(ingresosSql).toContain('COUNT(DISTINCT p.id_pago_infraccion)');
    expect(ingresosSql).toContain('SUM(p.monto::numeric)');
    expect(ingresosSql).toContain('AVG(p.monto::numeric)');
    expect(ingresosSql).not.toContain('solventacion_sin_pago');
    expect(coberturaSql).toContain('FROM pago_infraccion p');
    expect(coberturaSql).not.toContain('solventacion_sin_pago');
  });

  it('genera tendencia mensual de infracciones y calcula variacion contra el periodo anterior', async () => {
    const { dataSource, service } = createService();

    dataSource.query.mockResolvedValueOnce([
      {
        periodo: '2026-07-01',
        totalExpedientes: 110,
        totalInfracciones: 100,
        conRetencion: 40,
        sinRetencion: 60,
        tipoInfraccionSinRetencion: 30,
        vehiculosSinInfraccion: 10,
      },
      {
        periodo: '2026-08-01',
        totalExpedientes: 135,
        totalInfracciones: 120,
        conRetencion: 50,
        sinRetencion: 70,
        tipoInfraccionSinRetencion: 42,
        vehiculosSinInfraccion: 15,
      },
    ]);

    const result = await service.getTendenciaInfracciones({
      agrupacion: 'mes',
    });

    expect(result.agrupacion).toBe('mes');
    expect(result.series[0].variacionVsPeriodoAnteriorPct).toEqual({
      totalInfracciones: null,
      conRetencion: null,
      sinRetencion: null,
      vehiculosSinInfraccion: null,
    });
    expect(result.series[1].variacionVsPeriodoAnteriorPct).toEqual({
      totalInfracciones: 20,
      conRetencion: 25,
      sinRetencion: 16.67,
      vehiculosSinInfraccion: 50,
    });
  });

  it('usa el monto del concepto cuando la tendencia de ingresos se filtra por clave', async () => {
    const { dataSource, service } = createService();

    dataSource.query.mockResolvedValueOnce([
      {
        periodo: '2026-07-01',
        totalIngresos: '1000.00',
        totalPagos: 5,
        promedioPago: '200.00',
      },
      {
        periodo: '2026-08-01',
        totalIngresos: '1250.00',
        totalPagos: 5,
        promedioPago: '250.00',
      },
    ]);

    const result = await service.getTendenciaIngresos({
      agrupacion: 'mes',
      claveConcepto: ' abc-10 ',
    });

    const [sql, params] = dataSource.query.mock.calls[0] as [string, unknown[]];

    expect(sql).toContain('FROM pago_infraccion p');
    expect(sql).toContain('INNER JOIN pago_concepto pc_trend');
    expect(sql).toContain('pc_trend.monto::numeric');
    expect(sql).not.toContain('solventacion_sin_pago');
    expect(params).toContain('ABC-10');
    expect(result.series[1].variacionIngresosVsPeriodoAnteriorPct).toBe(25);
  });

  it('calcula monto y participacion por clave de concepto', async () => {
    const { dataSource, service } = createService();

    dataSource.query.mockResolvedValueOnce([
      {
        idConceptoPago: 1,
        claveConcepto: '101',
        totalPagos: 10,
        monto: '750.00',
      },
      {
        idConceptoPago: 2,
        claveConcepto: '205',
        totalPagos: 4,
        monto: '250.00',
      },
    ]);

    const result = await service.getIngresosPorClave({});
    const [sql] = dataSource.query.mock.calls[0] as [string];

    expect(result.totalIdentificado).toBe(1000);
    expect(sql).toContain('FROM pago_infraccion p');
    expect(sql).toContain('INNER JOIN pago_concepto pc');
    expect(sql).toContain('INNER JOIN concepto_pago cp');
    expect(sql).not.toContain('solventacion_sin_pago');
    expect(result.claves).toEqual([
      {
        idConceptoPago: 1,
        claveConcepto: '101',
        totalPagos: 10,
        monto: 750,
        participacionPct: 75,
      },
      {
        idConceptoPago: 2,
        claveConcepto: '205',
        totalPagos: 4,
        monto: 250,
        participacionPct: 25,
      },
    ]);
  });
});
