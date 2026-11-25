import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ExportInfraccionesExcelPayload,
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

function createItem(idInfraccion = 10): InfraccionListItem {
  return {
    idInfraccion,
    folioInfraccion: `INF-${idInfraccion}`,
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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

interface AvailabilityScenarioOptions {
  availability?: PdfReportAvailability;
  items?: InfraccionListItem[];
  selectedRowIds?: Set<number>;
  onGetReportAvailability?: (query: InfraccionesQuery) => Promise<PdfReportAvailability>;
  onExportExcel?: (payload: ExportInfraccionesExcelPayload) => Promise<Blob>;
  onGeneratePdf?: (query: InfraccionesQuery) => Promise<InfraccionListItem[]>;
  open?: boolean;
  reportQuery?: InfraccionesQuery;
}

function createAvailabilityScenarioElement({
  availability = { total: 13_827, limitePdf: 500, permitido: false },
  items = [createItem(10), createItem(11)],
  selectedRowIds = new Set([10]),
  onGetReportAvailability = vi.fn().mockResolvedValue(availability),
  onExportExcel = vi.fn().mockResolvedValue(new Blob()),
  onGeneratePdf = vi.fn().mockResolvedValue(items),
  open = true,
  reportQuery = { fechaInicio: '2026-08-01', fechaFin: '2026-08-31' },
}: AvailabilityScenarioOptions = {}) {
  return (
    <InfraccionesReportModal
      dateRangeLabel="Agosto 2026"
      reportQuery={reportQuery}
      items={items}
      open={open}
      pdfAvailability={availability}
      selectedRowIds={selectedRowIds}
      onGetReportAvailability={onGetReportAvailability}
      onExportExcel={onExportExcel}
      onGeneratePdf={onGeneratePdf}
      onClose={vi.fn()}
    />
  );
}

function renderAvailabilityScenario(options: AvailabilityScenarioOptions = {}) {
  const result = render(createAvailabilityScenarioElement(options));

  return { ...result, onGetReportAvailability: options.onGetReportAvailability };
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

    await screen.findByRole('button', { name: 'Generar PDF' });
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

    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeEnabled());
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

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
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

  it.each([
    { selectedIds: new Set([10]), total: 1 },
    { selectedIds: new Set([10, 11]), total: 2 },
  ])('habilita PDF para una seleccion de $total registro(s) y elimina el aviso anterior', async ({
    selectedIds,
    total,
  }) => {
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      Promise.resolve(
        query.idInfracciones
          ? { total: query.idInfracciones.length, limitePdf: 500, permitido: true }
          : { total: 13_827, limitePdf: 500, permitido: false },
      ),
    );
    renderAvailabilityScenario({ onGetReportAvailability, selectedRowIds: selectedIds });

    expect(await screen.findByText(/contiene 13827 registros/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));

    expect(screen.getByRole('button', { name: /Generar PDF|Consultando disponibilidad/ })).toBeDisabled();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeEnabled();
    });
    expect(screen.queryByText(/contiene 13827 registros/)).not.toBeInTheDocument();
    expect(onGetReportAvailability).toHaveBeenLastCalledWith(
      expect.objectContaining({ idInfracciones: Array.from(selectedIds) }),
    );
    expect(screen.getByText(new RegExp(`Se exportar.n ${total} registros`))).toBeInTheDocument();
  });

  it('restaura el aviso al volver de seleccionadas a todos los resultados', async () => {
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      Promise.resolve(
        query.idInfracciones
          ? { total: 1, limitePdf: 500, permitido: true }
          : { total: 13_827, limitePdf: 500, permitido: false },
      ),
    );
    renderAvailabilityScenario({ onGetReportAvailability });

    await screen.findByText(/contiene 13827 registros/);
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /^Todos los resultados/ }));

    expect(await screen.findByText(/contiene 13827 registros/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeDisabled();
  });

  it('mantiene PDF deshabilitado durante la consulta y muestra el error de disponibilidad', async () => {
    const selectedAvailability = createDeferred<PdfReportAvailability>();
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      query.idInfracciones
        ? selectedAvailability.promise
        : Promise.resolve({ total: 13_827, limitePdf: 500, permitido: false }),
    );
    renderAvailabilityScenario({ onGetReportAvailability });

    await screen.findByText(/contiene 13827 registros/);
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));
    expect(screen.getByRole('button', { name: 'Consultando disponibilidad...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    expect(screen.queryByText(/contiene 13827 registros/)).not.toBeInTheDocument();

    selectedAvailability.reject(new Error('No fue posible consultar la disponibilidad PDF.'));
    expect(await screen.findByText('No fue posible consultar la disponibilidad PDF.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeDisabled();
  });

  it('limpia errores previos al cambiar de alcance', async () => {
    const selectedAvailability = createDeferred<PdfReportAvailability>();
    const onGetReportAvailability = vi
      .fn()
      .mockRejectedValueOnce(new Error('Error anterior de disponibilidad.'))
      .mockImplementationOnce(() => selectedAvailability.promise);
    renderAvailabilityScenario({ onGetReportAvailability });

    expect(await screen.findByText('Error anterior de disponibilidad.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));

    expect(screen.queryByText('Error anterior de disponibilidad.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consultando disponibilidad...' })).toBeDisabled();
    selectedAvailability.resolve({ total: 1, limitePdf: 500, permitido: true });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeEnabled());
  });

  it('ignora respuestas antiguas que llegan despues de la consulta vigente', async () => {
    const allAvailability = createDeferred<PdfReportAvailability>();
    const selectedAvailability = createDeferred<PdfReportAvailability>();
    const onGetReportAvailability = vi
      .fn()
      .mockReturnValueOnce(allAvailability.promise)
      .mockReturnValueOnce(selectedAvailability.promise);
    renderAvailabilityScenario({ onGetReportAvailability });

    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));
    selectedAvailability.resolve({ total: 1, limitePdf: 500, permitido: true });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeEnabled());
    allAvailability.resolve({ total: 13_827, limitePdf: 500, permitido: false });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeEnabled());
    expect(screen.queryByText(/contiene 13827 registros/)).not.toBeInTheDocument();
  });

  it('actualiza la disponibilidad al reabrir con la misma consulta', async () => {
    const availability = { total: 1, limitePdf: 500, permitido: true };
    const onGetReportAvailability = vi.fn().mockResolvedValue(availability);
    const props = {
      availability,
      onGetReportAvailability,
    };
    const { rerender } = renderAvailabilityScenario(props);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeEnabled());
    expect(onGetReportAvailability).toHaveBeenCalledTimes(1);
    rerender(
      <InfraccionesReportModal
        dateRangeLabel="Agosto 2026"
        reportQuery={{ fechaInicio: '2026-08-01', fechaFin: '2026-08-31' }}
        items={[createItem(10), createItem(11)]}
        open={false}
        pdfAvailability={availability}
        selectedRowIds={new Set([10])}
        onGetReportAvailability={onGetReportAvailability}
        onExportExcel={vi.fn().mockResolvedValue(new Blob())}
        onGeneratePdf={vi.fn().mockResolvedValue([createItem(10)])}
        onClose={vi.fn()}
      />,
    );
    rerender(
      <InfraccionesReportModal
        dateRangeLabel="Agosto 2026"
        reportQuery={{ fechaInicio: '2026-08-01', fechaFin: '2026-08-31' }}
        items={[createItem(10), createItem(11)]}
        open
        pdfAvailability={availability}
        selectedRowIds={new Set([10])}
        onGetReportAvailability={onGetReportAvailability}
        onExportExcel={vi.fn().mockResolvedValue(new Blob())}
        onGeneratePdf={vi.fn().mockResolvedValue([createItem(10)])}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeEnabled());
    expect(onGetReportAvailability).toHaveBeenCalledTimes(2);
  });

  it('espera la disponibilidad vigente antes de habilitar Excel y confirmar el total', async () => {
    alertMocks.confirmAction.mockResolvedValue(false);
    const selectedAvailability = createDeferred<PdfReportAvailability>();
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      query.idInfracciones
        ? selectedAvailability.promise
        : Promise.resolve({ total: 13_827, limitePdf: 500, permitido: false }),
    );
    const onExportExcel = vi.fn().mockResolvedValue(new Blob());
    renderAvailabilityScenario({
      onExportExcel,
      onGetReportAvailability,
      reportQuery: {},
    });

    await screen.findByText(/contiene 13827 registros/);
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));

    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    expect(alertMocks.confirmAction).not.toHaveBeenCalled();
    selectedAvailability.resolve({ total: 1, limitePdf: 500, permitido: true });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    await waitFor(() => {
      expect(alertMocks.confirmAction).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('1 registros') }),
      );
    });
    expect(alertMocks.confirmAction).not.toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('0 registros') }),
    );
    expect(onExportExcel).not.toHaveBeenCalled();
  });

  it('deshabilita Excel cuando la consulta vigente resuelve cero registros', async () => {
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      Promise.resolve(
        query.idInfracciones
          ? { total: 0, limitePdf: 500, permitido: true }
          : { total: 13_827, limitePdf: 500, permitido: false },
      ),
    );
    renderAvailabilityScenario({ onGetReportAvailability });

    await screen.findByText(/contiene 13827 registros/);
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));

    await waitFor(() => expect(screen.getByText(/Se exportar.n 0 registros/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
  });

  it('reintenta una disponibilidad fallida al reabrir sin crear un ciclo de solicitudes', async () => {
    const retryAvailability = createDeferred<PdfReportAvailability>();
    const onGetReportAvailability = vi
      .fn()
      .mockRejectedValueOnce(new Error('Disponibilidad temporalmente no disponible.'))
      .mockImplementationOnce(() => retryAvailability.promise);
    const options = { onGetReportAvailability };
    const { rerender } = renderAvailabilityScenario(options);

    expect(await screen.findByText('Disponibilidad temporalmente no disponible.')).toBeInTheDocument();
    rerender(createAvailabilityScenarioElement({ ...options, open: false }));
    rerender(createAvailabilityScenarioElement({ ...options, open: true }));

    expect(screen.getByRole('button', { name: 'Consultando disponibilidad...' })).toBeDisabled();
    expect(onGetReportAvailability).toHaveBeenCalledTimes(2);
    retryAvailability.resolve({ total: 1, limitePdf: 500, permitido: true });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeEnabled());
    expect(onGetReportAvailability).toHaveBeenCalledTimes(2);
  });

  it('actualiza la disponibilidad cuando cambian los datos de la pagina con los mismos filtros', async () => {
    const refreshedAvailability = createDeferred<PdfReportAvailability>();
    const onGetReportAvailability = vi
      .fn()
      .mockResolvedValueOnce({ total: 1, limitePdf: 500, permitido: true })
      .mockImplementationOnce(() => refreshedAvailability.promise);
    const options = { onGetReportAvailability };
    const { rerender } = renderAvailabilityScenario({
      ...options,
      availability: { total: 1, limitePdf: 500, permitido: true },
    });

    await waitFor(() => expect(screen.getByText(/Se exportar.n 1 registros/)).toBeInTheDocument());
    rerender(
      createAvailabilityScenarioElement({
        ...options,
        availability: { total: 2, limitePdf: 500, permitido: true },
      }),
    );

    expect(screen.getByRole('button', { name: 'Consultando disponibilidad...' })).toBeDisabled();
    expect(onGetReportAvailability).toHaveBeenCalledTimes(2);
    refreshedAvailability.resolve({ total: 2, limitePdf: 500, permitido: true });
    await waitFor(() => expect(screen.getByText(/Se exportar.n 2 registros/)).toBeInTheDocument());
  });

  it('ignora el rechazo tardio de una exportacion iniciada para otro alcance', async () => {
    const exportResult = createDeferred<Blob>();
    const onExportExcel = vi.fn().mockReturnValue(exportResult.promise);
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      Promise.resolve(
        query.idInfracciones
          ? { total: 1, limitePdf: 500, permitido: true }
          : { total: 13_827, limitePdf: 500, permitido: false },
      ),
    );
    renderAvailabilityScenario({ onExportExcel, onGetReportAvailability });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => expect(onExportExcel).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));
    await waitFor(() => expect(screen.getByText(/Se exportar.n 1 registros/)).toBeInTheDocument());

    exportResult.reject(new Error('Error tardio de la exportacion anterior.'));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar PDF' })).toBeEnabled());
    expect(screen.queryByText('Error tardio de la exportacion anterior.')).not.toBeInTheDocument();
    expect(onGetReportAvailability).toHaveBeenCalledTimes(2);
  });

  it.each([
    { availability: { total: 0, limitePdf: 500, permitido: true }, enabled: false, warning: false },
    { availability: { total: 500, limitePdf: 500, permitido: true }, enabled: true, warning: false },
    { availability: { total: 501, limitePdf: 500, permitido: false }, enabled: false, warning: true },
  ])('aplica el limite PDF para $availability.total registros', async ({ availability, enabled, warning }) => {
    renderAvailabilityScenario({ availability });

    await screen.findByRole('button', { name: 'Generar PDF' });
    const pdfButton = screen.getByRole('button', { name: 'Generar PDF' });
    if (enabled) {
      expect(pdfButton).toBeEnabled();
    } else {
      expect(pdfButton).toBeDisabled();
    }
    const limitWarning = screen.queryByText(/supera el l.mite de 500 registros/);
    if (warning) {
      expect(limitWarning).toBeInTheDocument();
    } else {
      expect(limitWarning).not.toBeInTheDocument();
    }
  });
});
