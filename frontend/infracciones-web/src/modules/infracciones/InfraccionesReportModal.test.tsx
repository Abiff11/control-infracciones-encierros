import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  InfraccionListItem,
  InfraccionesQuery,
  PdfReportAvailability,
} from '../../types/infracciones.types';
import { InfraccionesReportModal } from './InfraccionesReportModal';

const reportMocks = vi.hoisted(() => ({
  downloadBlob: vi.fn(),
  downloadInfraccionesPdfReport: vi.fn(),
}));
const alertMocks = vi.hoisted(() => ({
  confirmAction: vi.fn(),
}));

vi.mock('./infracciones-report-export', () => ({
  buildInfraccionesReportTable: vi.fn(() => ({
    columns: [{ id: 'folioInfraccion', label: 'Folio' }],
    rows: [{ id: '10', cells: ['INF-10'] }],
  })),
  downloadBlob: reportMocks.downloadBlob,
  buildInfraccionesExcelFileName: vi.fn(() => 'reporte-infracciones.xlsx'),
  downloadInfraccionesPdfReport: reportMocks.downloadInfraccionesPdfReport,
}));

vi.mock('../../utils/sweetAlert', () => ({
  confirmAction: alertMocks.confirmAction,
}));

function createItem(): InfraccionListItem {
  return {
    idInfraccion: 10,
    folioInfraccion: 'INF-10',
    fechaInfraccion: '2026-08-15',
    horaInfraccion: '08:20:00',
    observaciones: null,
    clavePolicia: null,
    numParteInformativo: null,
    infractor: {
      nombre: 'Nombre',
      apellidoPaterno: 'Paterno',
      apellidoMaterno: null,
      licencia: null,
    },
    vehiculo: {
      placas: null,
      estadoPlacas: null,
      serie: null,
      motor: null,
      color: null,
    },
    region: { idRegion: 1, nombreRegion: 'Region' },
    delegacion: { idDelegacion: 1, nombreDelegacion: 'Delegacion' },
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
    salida: { tieneSalida: false, fechaSalida: null },
    estadoOperativoCalculado: 'SIN_RETENCION',
  };
}

function renderModal(
  pdfAvailability: PdfReportAvailability,
  onGeneratePdf = vi.fn().mockResolvedValue([createItem()]),
  onExportExcel = vi.fn().mockResolvedValue(new Blob()),
  reportQuery: InfraccionesQuery = { fechaInicio: '2026-08-01', fechaFin: '2026-08-31' },
) {
  render(
    <InfraccionesReportModal
      dateRangeLabel="Todas las fechas"
      reportQuery={reportQuery}
      items={[createItem()]}
      open
      pdfAvailability={pdfAvailability}
      selectedRowIds={new Set()}
      onGetReportAvailability={vi.fn().mockResolvedValue(pdfAvailability)}
      onExportExcel={onExportExcel}
      onGeneratePdf={onGeneratePdf}
      onClose={vi.fn()}
    />,
  );

  return { onExportExcel, onGeneratePdf };
}

describe('InfraccionesReportModal limite de PDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloquea PDF para 24,000 registros y conserva Excel habilitado', async () => {
    renderModal({ total: 24_000, limitePdf: 500, permitido: false });

    expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled();
    expect(
      screen.getByText(
        'PDF no disponible para esta consulta. El reporte contiene 24000 registros y supera el límite de 500 registros para PDF. Reduce el rango o los filtros, o utiliza Exportar Excel.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => {
      expect(reportMocks.downloadBlob).toHaveBeenCalledTimes(1);
    });
  });

  it('muestra el error del servidor si el limite cambia antes de generar PDF', async () => {
    const { onGeneratePdf } = renderModal(
      { total: 500, limitePdf: 500, permitido: true },
      vi
        .fn()
        .mockRejectedValue(
          new Error(
            'PDF no disponible para esta consulta. El reporte contiene 501 registros y supera el límite de 500 registros para PDF.',
          ),
        ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Generar PDF' }));

    await waitFor(() => {
      expect(onGeneratePdf).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.getByText(
        'PDF no disponible para esta consulta. El reporte contiene 501 registros y supera el límite de 500 registros para PDF.',
      ),
    ).toBeInTheDocument();
    expect(reportMocks.downloadInfraccionesPdfReport).not.toHaveBeenCalled();
  });

  it('confirma antes de exportar todo el historial sin rango', async () => {
    alertMocks.confirmAction.mockResolvedValue(false);
    const onExportExcel = vi.fn().mockResolvedValue(new Blob());
    renderModal(
      { total: 24_000, limitePdf: 500, permitido: false },
      vi.fn(),
      onExportExcel,
      {},
    );

    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    await waitFor(() => {
      expect(alertMocks.confirmAction).toHaveBeenCalledWith({
        title: 'Exportar historial completo',
        text: 'Este reporte incluirá todo el historial disponible: 24000 registros. ¿Deseas continuar?',
        confirmButtonText: 'Exportar todo el historial',
        cancelButtonText: 'Cancelar',
      });
    });
    expect(onExportExcel).not.toHaveBeenCalled();
  });
});
