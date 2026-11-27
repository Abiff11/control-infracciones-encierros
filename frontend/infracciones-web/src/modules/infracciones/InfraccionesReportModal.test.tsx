import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  exportInfraccionesExcel,
  getReportAvailability,
} from '../../services/api/infracciones.api';

import type {
  ExportInfraccionesExcelPayload,
  InfraccionListItem,
  InfraccionesQuery,
  ReportAvailability,
} from '../../types/infracciones.types';
import { InfraccionesReportModal } from './InfraccionesReportModal';

const reportMocks = vi.hoisted(() => ({
  downloadBlob: vi.fn(),
}));
const alertMocks = vi.hoisted(() => ({
  confirmAction: vi.fn(),
}));
const EXPECTED_RATE_LIMIT_MESSAGE =
  'Se alcanzó temporalmente el límite de solicitudes. Espera un momento e intenta nuevamente.';
const TECHNICAL_RATE_LIMIT_MESSAGE = 'ThrottlerException: Too Many Requests';
const CSRF_COOKIE = 'cie_csrf_token';

vi.mock('./infracciones-report-export', () => ({
  buildInfraccionesReportTable: vi.fn((items: InfraccionListItem[]) => ({
    columns: [{ id: 'folioInfraccion', label: 'Folio' }],
    rows: items.map((item) => ({
      id: String(item.idInfraccion),
      cells: [item.folioInfraccion],
    })),
  })),
  downloadBlob: reportMocks.downloadBlob,
  buildInfraccionesExcelFileName: vi.fn(() => 'reporte-infracciones.xlsx'),
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
  availability?: ReportAvailability;
  items?: InfraccionListItem[];
  selectedRowIds?: Set<number>;
  onGetReportAvailability?: (query: InfraccionesQuery) => Promise<ReportAvailability>;
  onExportExcel?: (payload: ExportInfraccionesExcelPayload) => Promise<Blob>;
  open?: boolean;
  reportQuery?: InfraccionesQuery;
}

function createAvailabilityScenarioElement({
  availability = { total: 13_827 },
  items = [createItem(10), createItem(11)],
  selectedRowIds = new Set([10]),
  onGetReportAvailability = vi.fn().mockResolvedValue(availability),
  onExportExcel = vi.fn().mockResolvedValue(new Blob()),
  open = true,
  reportQuery = { fechaInicio: '2026-08-01', fechaFin: '2026-08-31' },
}: AvailabilityScenarioOptions = {}) {
  return (
    <InfraccionesReportModal
      reportQuery={reportQuery}
      items={items}
      open={open}
      reportAvailability={availability}
      selectedRowIds={selectedRowIds}
      onGetReportAvailability={onGetReportAvailability}
      onExportExcel={onExportExcel}
      onClose={vi.fn()}
    />
  );
}

function renderAvailabilityScenario(options: AvailabilityScenarioOptions = {}) {
  const result = render(createAvailabilityScenarioElement(options));

  return { ...result, onGetReportAvailability: options.onGetReportAvailability };
}

function renderModal(
  reportAvailability: ReportAvailability,
  onExportExcel = vi.fn().mockResolvedValue(new Blob()),
  reportQuery: InfraccionesQuery = { fechaInicio: '2026-08-01', fechaFin: '2026-08-31' },
) {
  render(
    <InfraccionesReportModal
      reportQuery={reportQuery}
      items={[createItem()]}
      open
      reportAvailability={reportAvailability}
      selectedRowIds={new Set()}
      onGetReportAvailability={vi.fn().mockResolvedValue(reportAvailability)}
      onExportExcel={onExportExcel}
      onClose={vi.fn()}
    />,
  );

  return { onExportExcel };
}

describe('InfraccionesReportModal exportacion Excel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.cookie = `${CSRF_COOKIE}=; Path=/; Max-Age=0`;
    vi.unstubAllGlobals();
  });

  it.each([
    { idDelegacion: 1, label: 'PLAZA - CENTRO', total: 13_755 },
    { idDelegacion: 10, label: 'CUENCA - CENTRO', total: 6 },
  ])('Q5.1 distingue $label y conserva el ID en disponibilidad y Excel', async ({
    idDelegacion,
    label,
    total,
  }) => {
    const plaza = {
      ...createItem(10),
      region: { idRegion: 1, nombreRegion: 'PLAZA' },
      delegacion: { idDelegacion: 1, nombreDelegacion: 'CENTRO' },
    };
    const cuenca = {
      ...createItem(11),
      region: { idRegion: 10, nombreRegion: 'CUENCA' },
      delegacion: { idDelegacion: 10, nombreDelegacion: 'CENTRO' },
    };
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      Promise.resolve({ total: query.idDelegacion === idDelegacion ? total : 13_827 }),
    );
    const onExportExcel = vi.fn().mockResolvedValue(new Blob());

    renderAvailabilityScenario({
      items: [plaza, cuenca, { ...plaza, idInfraccion: 12, folioInfraccion: 'INF-12' }],
      onGetReportAvailability,
      onExportExcel,
      reportQuery: {},
    });

    await screen.findByText('13827 registros del alcance');
    const select = screen.getByRole('combobox', { name: 'Delegación' });
    expect(within(select).getByRole('option', { name: 'PLAZA - CENTRO' })).toHaveValue('1');
    expect(within(select).getByRole('option', { name: 'CUENCA - CENTRO' })).toHaveValue('10');
    expect(within(select).getAllByRole('option')).toHaveLength(3);

    fireEvent.change(select, { target: { value: String(idDelegacion) } });
    expect(within(select).getByRole('option', { name: label })).toHaveProperty('selected', true);
    await screen.findByText(`${total} registros del alcance`);
    expect(onGetReportAvailability).toHaveBeenLastCalledWith(
      expect.objectContaining({ idDelegacion }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => expect(onExportExcel).toHaveBeenCalledWith(
      expect.objectContaining({ idDelegacion, campos: expect.any(Array) }),
    ));
    expect(alertMocks.confirmAction).not.toHaveBeenCalled();
    expect(reportMocks.downloadBlob).toHaveBeenCalledTimes(1);

    fireEvent.change(select, { target: { value: '' } });
    await screen.findByText('13827 registros del alcance');
    expect(onGetReportAvailability).toHaveBeenLastCalledWith(
      expect.objectContaining({ idDelegacion: undefined }),
    );
  });

  it('ofrece unicamente Excel y no muestra advertencias PDF para 24,000 registros', async () => {
    renderModal({ total: 24_000 });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    expect(screen.queryByRole('button', { name: 'Generar PDF' })).not.toBeInTheDocument();
    expect(screen.queryByText(/límite de 500 registros para PDF/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => {
      expect(reportMocks.downloadBlob).toHaveBeenCalledTimes(1);
    });
  });

  it('confirma antes de exportar todo el historial sin rango', async () => {
    alertMocks.confirmAction.mockResolvedValue(false);
    const onExportExcel = vi.fn().mockResolvedValue(new Blob());
    renderModal(
      { total: 24_000 },
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

  it('no llama historial completo a una exportacion filtrada sin fechas', async () => {
    const onExportExcel = vi.fn().mockResolvedValue(new Blob());
    renderModal(
      { total: 3 },
      onExportExcel,
      { search: '117225' },
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    await waitFor(() => {
      expect(onExportExcel).toHaveBeenCalledWith(
        expect.objectContaining({ search: '117225' }),
      );
    });
    expect(alertMocks.confirmAction).not.toHaveBeenCalled();
  });

  it.each([
    { selectedIds: new Set([10]), total: 1 },
    { selectedIds: new Set([10, 11]), total: 2 },
  ])('conserva $total identificador(es) al exportar una seleccion', async ({
    selectedIds,
    total,
  }) => {
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      Promise.resolve(
        query.idInfracciones
          ? { total: query.idInfracciones.length }
          : { total: 13_827 },
      ),
    );
    const onExportExcel = vi.fn().mockResolvedValue(new Blob());
    renderAvailabilityScenario({ onExportExcel, onGetReportAvailability, selectedRowIds: selectedIds });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));

    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled();
    });
    expect(onGetReportAvailability).toHaveBeenLastCalledWith(
      expect.objectContaining({ idInfracciones: Array.from(selectedIds) }),
    );
    expect(screen.getByText(new RegExp(`Se exportar.n ${total} registros`))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => {
      expect(onExportExcel).toHaveBeenCalledWith(
        expect.objectContaining({ idInfracciones: Array.from(selectedIds) }),
      );
    });
  });

  it('restaura el total al volver de seleccionadas a todos los resultados', async () => {
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      Promise.resolve(
        query.idInfracciones
          ? { total: 1 }
          : { total: 13_827 },
      ),
    );
    renderAvailabilityScenario({ onGetReportAvailability });

    await screen.findByText('13827 registros del alcance');
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /^Todos los resultados/ }));

    expect(await screen.findByText('13827 registros del alcance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled();
  });

  it('mantiene Excel deshabilitado durante la consulta y muestra el error de disponibilidad', async () => {
    const selectedAvailability = createDeferred<ReportAvailability>();
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      query.idInfracciones
        ? selectedAvailability.promise
        : Promise.resolve({ total: 13_827 }),
    );
    renderAvailabilityScenario({ onGetReportAvailability });

    await screen.findByText('13827 registros del alcance');
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();

    selectedAvailability.reject(new Error('No fue posible consultar la disponibilidad del reporte.'));
    expect(await screen.findByText('No fue posible consultar la disponibilidad del reporte.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
  });

  it('limpia errores previos al cambiar de alcance', async () => {
    const selectedAvailability = createDeferred<ReportAvailability>();
    const onGetReportAvailability = vi
      .fn()
      .mockRejectedValueOnce(new Error('Error anterior de disponibilidad.'))
      .mockImplementationOnce(() => selectedAvailability.promise);
    renderAvailabilityScenario({ onGetReportAvailability });

    expect(await screen.findByText('Error anterior de disponibilidad.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));

    expect(screen.queryByText('Error anterior de disponibilidad.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    selectedAvailability.resolve({ total: 1 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
  });

  it('ignora respuestas antiguas que llegan despues de la consulta vigente', async () => {
    const allAvailability = createDeferred<ReportAvailability>();
    const selectedAvailability = createDeferred<ReportAvailability>();
    const onGetReportAvailability = vi
      .fn()
      .mockReturnValueOnce(allAvailability.promise)
      .mockReturnValueOnce(selectedAvailability.promise);
    renderAvailabilityScenario({ onGetReportAvailability });

    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));
    selectedAvailability.resolve({ total: 1 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    allAvailability.resolve({ total: 13_827 });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    expect(screen.queryByText('13827 registros del alcance')).not.toBeInTheDocument();
  });

  it('actualiza la disponibilidad al reabrir con la misma consulta', async () => {
    const availability = { total: 1 };
    const onGetReportAvailability = vi.fn().mockResolvedValue(availability);
    const props = {
      availability,
      onGetReportAvailability,
    };
    const { rerender } = renderAvailabilityScenario(props);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    expect(onGetReportAvailability).toHaveBeenCalledTimes(1);
    rerender(
      <InfraccionesReportModal
        reportQuery={{ fechaInicio: '2026-08-01', fechaFin: '2026-08-31' }}
        items={[createItem(10), createItem(11)]}
        open={false}
        reportAvailability={availability}
        selectedRowIds={new Set([10])}
        onGetReportAvailability={onGetReportAvailability}
        onExportExcel={vi.fn().mockResolvedValue(new Blob())}
        onClose={vi.fn()}
      />,
    );
    rerender(
      <InfraccionesReportModal
        reportQuery={{ fechaInicio: '2026-08-01', fechaFin: '2026-08-31' }}
        items={[createItem(10), createItem(11)]}
        open
        reportAvailability={availability}
        selectedRowIds={new Set([10])}
        onGetReportAvailability={onGetReportAvailability}
        onExportExcel={vi.fn().mockResolvedValue(new Blob())}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    expect(onGetReportAvailability).toHaveBeenCalledTimes(2);
  });

  it('espera la disponibilidad vigente y no confunde una seleccion sin fechas con todo el historial', async () => {
    const selectedAvailability = createDeferred<ReportAvailability>();
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      query.idInfracciones
        ? selectedAvailability.promise
        : Promise.resolve({ total: 13_827 }),
    );
    const onExportExcel = vi.fn().mockResolvedValue(new Blob());
    renderAvailabilityScenario({
      onExportExcel,
      onGetReportAvailability,
      reportQuery: {},
    });

    await screen.findByText('13827 registros del alcance');
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));

    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    expect(alertMocks.confirmAction).not.toHaveBeenCalled();
    selectedAvailability.resolve({ total: 1 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    await waitFor(() => expect(onExportExcel).toHaveBeenCalledTimes(1));
    expect(alertMocks.confirmAction).not.toHaveBeenCalled();
  });

  it('deshabilita Excel cuando la consulta vigente resuelve cero registros', async () => {
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      Promise.resolve(
        query.idInfracciones
          ? { total: 0 }
          : { total: 13_827 },
      ),
    );
    renderAvailabilityScenario({ onGetReportAvailability });

    await screen.findByText('13827 registros del alcance');
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));

    await waitFor(() => expect(screen.getByText(/Se exportar.n 0 registros/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
  });

  it('reintenta una disponibilidad fallida al reabrir sin crear un ciclo de solicitudes', async () => {
    const retryAvailability = createDeferred<ReportAvailability>();
    const onGetReportAvailability = vi
      .fn()
      .mockRejectedValueOnce(new Error('Disponibilidad temporalmente no disponible.'))
      .mockImplementationOnce(() => retryAvailability.promise);
    const options = { onGetReportAvailability };
    const { rerender } = renderAvailabilityScenario(options);

    expect(await screen.findByText('Disponibilidad temporalmente no disponible.')).toBeInTheDocument();
    rerender(createAvailabilityScenarioElement({ ...options, open: false }));
    rerender(createAvailabilityScenarioElement({ ...options, open: true }));

    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    expect(onGetReportAvailability).toHaveBeenCalledTimes(2);
    retryAvailability.resolve({ total: 1 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    expect(onGetReportAvailability).toHaveBeenCalledTimes(2);
  });

  it('actualiza la disponibilidad cuando cambian los datos de la pagina con los mismos filtros', async () => {
    const refreshedAvailability = createDeferred<ReportAvailability>();
    const onGetReportAvailability = vi
      .fn()
      .mockResolvedValueOnce({ total: 1 })
      .mockImplementationOnce(() => refreshedAvailability.promise);
    const options = { onGetReportAvailability };
    const { rerender } = renderAvailabilityScenario({
      ...options,
      availability: { total: 1 },
    });

    await waitFor(() => expect(screen.getByText(/Se exportar.n 1 registros/)).toBeInTheDocument());
    rerender(
      createAvailabilityScenarioElement({
        ...options,
        availability: { total: 2 },
      }),
    );

    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    expect(onGetReportAvailability).toHaveBeenCalledTimes(2);
    refreshedAvailability.resolve({ total: 2 });
    await waitFor(() => expect(screen.getByText(/Se exportar.n 2 registros/)).toBeInTheDocument());
  });

  it('ignora el rechazo tardio de una exportacion iniciada para otro alcance', async () => {
    const exportResult = createDeferred<Blob>();
    const onExportExcel = vi.fn().mockReturnValue(exportResult.promise);
    const onGetReportAvailability = vi.fn().mockImplementation((query: InfraccionesQuery) =>
      Promise.resolve(
        query.idInfracciones
          ? { total: 1 }
          : { total: 13_827 },
      ),
    );
    renderAvailabilityScenario({ onExportExcel, onGetReportAvailability });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => expect(onExportExcel).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));
    await waitFor(() => expect(screen.getByText(/Se exportar.n 1 registros/)).toBeInTheDocument());

    exportResult.reject(new Error('Error tardio de la exportacion anterior.'));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    expect(screen.queryByText('Error tardio de la exportacion anterior.')).not.toBeInTheDocument();
    expect(onGetReportAvailability).toHaveBeenCalledTimes(2);
  });

  it('usa el total confirmado del backend y separa la muestra local de 30 registros', async () => {
    const items = Array.from({ length: 30 }, (_, index) => createItem(index + 1));
    renderAvailabilityScenario({ items, selectedRowIds: new Set() });

    await screen.findByText('13827 registros del alcance');

    expect(screen.getByText('13827 registros del alcance')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Vista previa' }));
    expect(screen.getAllByText(/8 filas de muestra/)).toHaveLength(2);
    expect(screen.getByText(/30 registros cargados para vista previa/)).toBeInTheDocument();
    expect(screen.getByText(/13827 registros a exportar/)).toBeInTheDocument();
    expect(screen.queryByText(/30 registros a exportar/)).not.toBeInTheDocument();
  });

  it('no presenta ceros definitivos mientras consulta la disponibilidad', async () => {
    const availability = createDeferred<ReportAvailability>();
    renderAvailabilityScenario({ onGetReportAvailability: vi.fn(() => availability.promise) });

    expect(screen.getAllByText('Consultando disponibilidad...').length).toBeGreaterThan(1);
    expect(screen.queryByText('0 registros del alcance')).not.toBeInTheDocument();
    expect(screen.getByText('Vista previa no disponible')).toBeInTheDocument();
    expect(screen.queryByText(/filas de muestra/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();

    availability.resolve({ total: 2 });
    expect(await screen.findByText('2 registros del alcance')).toBeInTheDocument();
  });

  it('distingue un alcance vacio confirmado de una consulta pendiente', async () => {
    renderAvailabilityScenario({
      availability: { total: 0 },
      onGetReportAvailability: vi.fn().mockResolvedValue({ total: 0 }),
    });

    expect(await screen.findByText('0 registros del alcance')).toBeInTheDocument();
    expect(screen.getByText('No hay registros en el alcance actual.')).toBeInTheDocument();
  });

  it('permite exportar un total positivo aunque las filas no esten cargadas en la pagina', async () => {
    renderAvailabilityScenario({
      availability: { total: 1 },
      items: [createItem(10)],
      selectedRowIds: new Set([999]),
      onGetReportAvailability: vi.fn().mockResolvedValue({ total: 1 }),
    });

    fireEvent.click(screen.getByRole('button', { name: /^Seleccionadas/ }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled());
    fireEvent.click(screen.getByRole('tab', { name: 'Vista previa' }));
    expect(
      screen.getByText('Hay registros en el alcance, pero no están cargados para la vista previa.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('No hay registros para exportar.')).not.toBeInTheDocument();
  });

  it('muestra el error de disponibilidad sin presentarlo como un alcance vacio', async () => {
    renderAvailabilityScenario({
      onGetReportAvailability: vi.fn().mockRejectedValue(new Error('Disponibilidad no disponible.')),
    });

    expect(await screen.findByText('Disponibilidad no disponible.')).toBeInTheDocument();
    expect(screen.getAllByText('Total no disponible')).toHaveLength(2);
    expect(screen.queryByText('No hay registros en el alcance actual.')).not.toBeInTheDocument();
  });

  it('Q4-I02 integra disponibilidad HTTP 429 con el estado de error del modal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: TECHNICAL_RATE_LIMIT_MESSAGE }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onGetReportAvailability = vi.fn((query: InfraccionesQuery) =>
      getReportAvailability('test-token', query),
    );
    const onExportExcel = vi.fn().mockResolvedValue(new Blob());

    renderAvailabilityScenario({
      onExportExcel,
      onGetReportAvailability,
      reportQuery: { search: 'q4-i02' },
    });

    expect(await screen.findByText(EXPECTED_RATE_LIMIT_MESSAGE)).toBeInTheDocument();
    expect(screen.getAllByText('Total no disponible')).toHaveLength(2);
    expect(screen.queryByText('No hay registros en el alcance actual.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    expect(onExportExcel).not.toHaveBeenCalled();
    expect(reportMocks.downloadBlob).not.toHaveBeenCalled();
    expect(onGetReportAvailability).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Q4-I03 recupera la exportacion despues de un rechazo HTTP 429 sin descargar', async () => {
    document.cookie = `${CSRF_COOKIE}=test-csrf; Path=/; SameSite=Lax`;
    const response = new Response(
      JSON.stringify({ message: TECHNICAL_RATE_LIMIT_MESSAGE }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
    const readBlob = vi.spyOn(response, 'blob');
    const exportResult = createDeferred<Response>();
    const fetchMock = vi.fn(() => exportResult.promise);
    vi.stubGlobal('fetch', fetchMock);
    const onExportExcel = vi.fn((payload: ExportInfraccionesExcelPayload) =>
      exportInfraccionesExcel('test-token', payload),
    );

    renderAvailabilityScenario({
      availability: { total: 1 },
      onExportExcel,
      onGetReportAvailability: vi.fn().mockResolvedValue({ total: 1 }),
      reportQuery: { search: 'q4-i03' },
    });

    const exportButton = await screen.findByRole('button', { name: 'Exportar Excel' });
    expect(exportButton).toBeEnabled();
    fireEvent.click(exportButton);
    expect(await screen.findByRole('button', { name: 'Exportando Excel...' })).toBeDisabled();

    exportResult.resolve(response);

    expect(await screen.findByText(EXPECTED_RATE_LIMIT_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exportando Excel...' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled();
    expect(reportMocks.downloadBlob).not.toHaveBeenCalled();
    expect(readBlob).not.toHaveBeenCalled();
    expect(onExportExcel).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    { availability: { total: 0 }, enabled: false },
    { availability: { total: 500 }, enabled: true },
    { availability: { total: 501 }, enabled: true },
    { availability: { total: 13_827 }, enabled: true },
  ])('habilita Excel por disponibilidad para $availability.total registros', async ({ availability, enabled }) => {
    renderAvailabilityScenario({ availability });

    const excelButton = await screen.findByRole('button', { name: 'Exportar Excel' });
    if (enabled) {
      expect(excelButton).toBeEnabled();
    } else {
      expect(excelButton).toBeDisabled();
    }
    expect(screen.queryByText(/supera el l.mite de 500 registros/)).not.toBeInTheDocument();
  });
});
