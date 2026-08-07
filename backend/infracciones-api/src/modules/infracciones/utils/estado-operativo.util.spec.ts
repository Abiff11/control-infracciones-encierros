import { resolveEstadoOperativoVehiculo } from './estado-operativo.util';

describe('resolveEstadoOperativoVehiculo', () => {
  it('mantiene SIN_RETENCION para expediente sin retencion aun no pagado', () => {
    expect(
      resolveEstadoOperativoVehiculo({
        permiteRetencion: false,
        hasRetencion: false,
        hasPago: false,
        hasLiberacion: false,
        hasSalida: false,
      }),
    ).toBe('SIN_RETENCION');
  });

  it('usa PAGADA_SIN_RETENCION cuando el tipo no permite retencion y ya tiene pago', () => {
    expect(
      resolveEstadoOperativoVehiculo({
        permiteRetencion: false,
        hasRetencion: false,
        hasPago: true,
        hasLiberacion: false,
        hasSalida: false,
      }),
    ).toBe('PAGADA_SIN_RETENCION');
  });

  it('mantiene el flujo tradicional para expedientes con retencion', () => {
    expect(
      resolveEstadoOperativoVehiculo({
        permiteRetencion: true,
        hasRetencion: true,
        hasPago: true,
        hasLiberacion: false,
        hasSalida: false,
      }),
    ).toBe('PAGADO_PENDIENTE_LIBERACION');
  });
});
