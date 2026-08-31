import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { InfraccionListItem } from '../../types/infracciones.types';
import InfraccionesReportPage from './InfraccionesReportPage';

const apiMocks = vi.hoisted(() => ({
  getAllInfracciones: vi.fn(),
  exportInfraccionesExcel: vi.fn(),
  getInfracciones: vi.fn(),
  getPdfReportAvailability: vi.fn(),
  validatePdfReport: vi.fn(),
}));

vi.mock('../../services/api/infracciones.api', () => ({
  getAllInfracciones: apiMocks.getAllInfracciones,
  exportInfraccionesExcel: apiMocks.exportInfraccionesExcel,
  getInfracciones: apiMocks.getInfracciones,
  getPdfReportAvailability: apiMocks.getPdfReportAvailability,
  validatePdfReport: apiMocks.validatePdfReport,
}));

vi.mock('./InfraccionesReportModal', () => ({
  InfraccionesReportModal: ({
    dateRangeLabel,
    items,
    open,
  }: {
    dateRangeLabel: string;
    items: InfraccionListItem[];
    open: boolean;
  }) =>
    open ? (
      <div
        data-testid="report-modal"
        data-count={String(items.length)}
        data-range={dateRangeLabel}
      />
    ) : null,
}));

function createItem(
  overrides: Partial<InfraccionListItem> = {},
): InfraccionListItem {
  return {
    idInfraccion: 10,
    folioInfraccion: 'INF-10',
    fechaInfraccion: '2026-08-15',
    horaInfraccion: '08:20:00',
    observaciones: null,
    clavePolicia: 'PV-1',
    numParteInformativo: null,
    infractor: {
      nombre: 'Hiram',
      apellidoPaterno: 'Carreño',
      apellidoMaterno: 'Armenta',
      licencia: 'LIC-1',
    },
    vehiculo: {
      placas: 'ABC123',
      estadoPlacas: 'OAXACA',
      serie: null,
      motor: null,
      color: 'BLANCO',
      marca: 'SUZUKI',
      linea: 'SWIFT',
      clase: 'AUTOMOVIL',
    },
    region: {
      idRegion: 1,
      nombreRegion: 'Valles Centrales',
    },
    delegacion: {
      idDelegacion: 1,
      nombreDelegacion: 'Oaxaca',
    },
    estatusInfraccion: {
      idEstatusInfraccion: 1,
      nombreEstatus: 'CAPTURADA',
    },
    tipoProcedimiento: {
      idTipoProcedimiento: 1,
      claveTipoProcedimiento: 'INFRACCION',
      nombreTipoProcedimiento: 'INFRACCION',
      esTipoExpediente: true,
      requiereFolioInfraccion: true,
      requiereNumParteInformativo: false,
      requiereMotivos: true,
      permiteRetencion: false,
      activo: true,
    },
    motivos: [],
    retencion: null,
    pago: {
      tienePago: false,
      idPagoInfraccion: null,
      fechaUltimoPago: null,
      montoPagado: null,
      clavesConcepto: null,
    },
    liberacion: {
      tieneLiberacion: false,
      idLiberacionVehiculo: null,
      fechaLiberacion: null,
    },
    salida: {
      tieneSalida: false,
      fechaSalida: null,
    },
    estadoOperativoCalculado: 'SIN_RETENCION',
    ...overrides,
  };
}

describe('InfraccionesReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getInfracciones.mockResolvedValue({
      data: [createItem()],
      meta: {
        page: 1,
        limit: 30,
        total: 125,
        totalPages: 5,
      },
    });
    apiMocks.getAllInfracciones.mockResolvedValue([
      createItem(),
      createItem({ idInfraccion: 11, folioInfraccion: 'INF-11' }),
    ]);
    apiMocks.getPdfReportAvailability.mockResolvedValue({
      total: 125,
      limitePdf: 500,
      permitido: true,
    });
    apiMocks.validatePdfReport.mockResolvedValue({
      total: 125,
      limitePdf: 500,
      permitido: true,
    });
  });

  it('aplica el rango al listado y abre el reporte sin descargar todas las paginas', async () => {
    render(<InfraccionesReportPage refreshKey={0} token="token-test" />);

    expect(await screen.findByText('INF-10')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-08-01' },
    });
    fireEvent.change(screen.getByLabelText('Hasta'), {
      target: { value: '2026-08-31' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar rango' }));

    await waitFor(() => {
      expect(apiMocks.getInfracciones).toHaveBeenLastCalledWith(
        'token-test',
        expect.objectContaining({
          page: 1,
          limit: 30,
          fechaInicio: '2026-08-01',
          fechaFin: '2026-08-31',
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte' }));

    expect(apiMocks.getAllInfracciones).not.toHaveBeenCalled();

    const modal = await screen.findByTestId('report-modal');
    expect(modal).toHaveAttribute('data-count', '1');
    expect(modal.getAttribute('data-range')).not.toBe('Todas las fechas');
  });

  it('rechaza un rango invertido antes de consultar de nuevo', async () => {
    render(<InfraccionesReportPage refreshKey={0} token="token-test" />);

    expect(await screen.findByText('INF-10')).toBeInTheDocument();
    const callsBeforeInvalidRange = apiMocks.getInfracciones.mock.calls.length;

    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-08-31' },
    });
    fireEvent.change(screen.getByLabelText('Hasta'), {
      target: { value: '2026-08-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar rango' }));

    expect(
      screen.getByText('La fecha inicial no puede ser posterior a la fecha final.'),
    ).toBeInTheDocument();
    expect(apiMocks.getInfracciones).toHaveBeenCalledTimes(callsBeforeInvalidRange);
  });

  it('muestra el limite de PDF con el total disponible sin cargar el reporte completo', async () => {
    apiMocks.getPdfReportAvailability.mockResolvedValueOnce({
      total: 501,
      limitePdf: 500,
      permitido: false,
    });

    render(<InfraccionesReportPage refreshKey={0} token="token-test" />);

    expect(await screen.findByText('INF-10')).toBeInTheDocument();
    expect(
      screen.getByText(
        'PDF no disponible para esta consulta. El reporte contiene 501 registros y supera el límite de 500 registros para PDF. Reduce el rango o los filtros, o utiliza Exportar Excel.',
      ),
    ).toBeInTheDocument();
    expect(apiMocks.getAllInfracciones).not.toHaveBeenCalled();
  });
});
