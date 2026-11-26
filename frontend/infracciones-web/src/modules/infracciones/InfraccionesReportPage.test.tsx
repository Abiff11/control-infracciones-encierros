import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { InfraccionListItem } from '../../types/infracciones.types';
import InfraccionesReportPage from './InfraccionesReportPage';

const apiMocks = vi.hoisted(() => ({
  exportInfraccionesExcel: vi.fn(),
  getInfracciones: vi.fn(),
  getReportAvailability: vi.fn(),
}));

vi.mock('../../services/api/infracciones.api', () => ({
  exportInfraccionesExcel: apiMocks.exportInfraccionesExcel,
  getInfracciones: apiMocks.getInfracciones,
  getReportAvailability: apiMocks.getReportAvailability,
}));

vi.mock('./InfraccionesReportModal', () => ({
  InfraccionesReportModal: ({
    items,
    open,
    reportQuery,
  }: {
    items: InfraccionListItem[];
    open: boolean;
    reportQuery: { fechaInicio?: string; fechaFin?: string };
  }) =>
    open ? (
      <div
        data-testid="report-modal"
        data-count={String(items.length)}
        data-range={`${reportQuery.fechaInicio ?? ''}:${reportQuery.fechaFin ?? ''}`}
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
    apiMocks.getReportAvailability.mockResolvedValue({
      total: 125,
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

    expect(apiMocks.getReportAvailability).toHaveBeenLastCalledWith(
      'token-test',
      expect.objectContaining({ fechaInicio: '2026-08-01', fechaFin: '2026-08-31' }),
    );

    const modal = await screen.findByTestId('report-modal');
    expect(modal).toHaveAttribute('data-count', '1');
    expect(modal).toHaveAttribute('data-range', '2026-08-01:2026-08-31');
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

  it('no muestra advertencias PDF para una disponibilidad de 501 registros', async () => {
    apiMocks.getReportAvailability.mockResolvedValueOnce({
      total: 501,
    });

    render(<InfraccionesReportPage refreshKey={0} token="token-test" />);

    expect(await screen.findByText('INF-10')).toBeInTheDocument();
    expect(screen.queryByText(/PDF no disponible/)).not.toBeInTheDocument();
    expect(screen.getByText(/exporta todos los resultados a Excel\./)).toBeInTheDocument();
  });

  it('distingue solventacion sin pago real en la tabla', async () => {
    apiMocks.getInfracciones.mockResolvedValueOnce({
      data: [createItem({
        estatusInfraccion: {
          idEstatusInfraccion: 99,
          nombreEstatus: 'SOLVENTADA_SIN_PAGO',
        },
      })],
      meta: { page: 1, limit: 30, total: 1, totalPages: 1 },
    });

    render(<InfraccionesReportPage refreshKey={0} token="token-test" />);

    const folio = await screen.findByText('INF-10');
    const row = folio.closest('tr');
    expect(row).not.toBeNull();
    expect(within(row!).getByText('Solventada sin pago', {
      selector: '.status-badge',
    })).toBeInTheDocument();
    expect(within(row!).getByText('Solventada sin pago', {
      selector: '.table-cell-stack span',
    })).toBeInTheDocument();
    expect(within(row!).queryByText('Pago registrado')).not.toBeInTheDocument();
  });

  it('muestra solventacion y liberacion pendiente con vehiculo retenido', async () => {
    apiMocks.getInfracciones.mockResolvedValueOnce({
      data: [createItem({
        estatusInfraccion: {
          idEstatusInfraccion: 99,
          nombreEstatus: 'SOLVENTADA_SIN_PAGO',
        },
        tipoProcedimiento: { ...createItem().tipoProcedimiento, permiteRetencion: true },
        retencion: {
          idRetencionVehiculo: 20,
          encierro: 'Encierro Central',
          fechaIngreso: '2026-11-24T09:00:00.000Z',
          folioResguardo: 'RES-1',
          estadoIngreso: 'CAPTURADO',
        },
        estadoOperativoCalculado: 'EN_ENCIERRO_SIN_PAGO',
      })],
      meta: { page: 1, limit: 30, total: 1, totalPages: 1 },
    });

    render(<InfraccionesReportPage refreshKey={0} token="token-test" />);

    const folio = await screen.findByText('INF-10');
    const row = folio.closest('tr');
    expect(row).not.toBeNull();
    expect(within(row!).getByText('Solventada, pendiente de liberacion', {
      selector: '.status-badge',
    })).toBeInTheDocument();
    expect(within(row!).getByText('Solventada sin pago', {
      selector: '.table-cell-stack span',
    })).toBeInTheDocument();
  });

  it('prioriza el vehiculo entregado sin inventar un pago', async () => {
    apiMocks.getInfracciones.mockResolvedValueOnce({
      data: [createItem({
        estatusInfraccion: {
          idEstatusInfraccion: 99,
          nombreEstatus: 'SOLVENTADA_SIN_PAGO',
        },
        tipoProcedimiento: { ...createItem().tipoProcedimiento, permiteRetencion: true },
        salida: { tieneSalida: true, fechaSalida: '2026-11-24T10:00:00.000Z' },
        estadoOperativoCalculado: 'EN_ENCIERRO_SIN_PAGO',
      })],
      meta: { page: 1, limit: 30, total: 1, totalPages: 1 },
    });

    render(<InfraccionesReportPage refreshKey={0} token="token-test" />);

    const folio = await screen.findByText('INF-10');
    const row = folio.closest('tr');
    expect(row).not.toBeNull();
    expect(within(row!).getByText('Vehiculo entregado', {
      selector: '.status-badge',
    })).toBeInTheDocument();
    expect(within(row!).getByText('Solventada sin pago', {
      selector: '.table-cell-stack span',
    })).toBeInTheDocument();
    expect(within(row!).queryByText('Pago registrado')).not.toBeInTheDocument();
  });

});
