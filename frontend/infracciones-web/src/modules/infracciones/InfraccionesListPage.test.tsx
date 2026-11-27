import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CatalogosBundle } from "../../types/catalogos.types";
import type { InfraccionListItem } from "../../types/infracciones.types";
import InfraccionesListPage from "./InfraccionesListPage";

const apiMocks = vi.hoisted(() => ({
  findConceptosPago: vi.fn(),
  getObservacionesPendientes: vi.fn().mockResolvedValue({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  }),
  getInfraccionDetalle: vi.fn(),
  getInfracciones: vi.fn(),
}));

vi.mock("../../services/api/infracciones.api", () => ({
  getInfraccionDetalle: apiMocks.getInfraccionDetalle,
  getInfracciones: apiMocks.getInfracciones,
}));

vi.mock("../../services/api/encierros.api", () => ({
  getObservacionesPendientes: apiMocks.getObservacionesPendientes,
}));

vi.mock("../../services/api/pagos.api", () => ({
  findConceptosPago: apiMocks.findConceptosPago,
}));

vi.mock("./ObservacionAtencionModal", () => ({
  ObservacionAtencionModal: ({
    open,
    observacion,
    onClose,
    onCompleted,
  }: {
    open: boolean;
    observacion: { idObservacion: number } | null;
    onClose: () => void;
    onCompleted: (result: { idObservacion: number; estatus: "CORREGIDA" }) => void;
  }) => open ? (
    <div data-testid="observacion-atencion">
      <span>Atendiendo observación {observacion?.idObservacion}</span>
      <button type="button" onClick={() => onCompleted({
        idObservacion: observacion?.idObservacion ?? 0,
        estatus: "CORREGIDA",
      })}>Simular resolución</button>
      <button type="button" onClick={onClose}>Cerrar atención</button>
    </div>
  ) : null,
}));

vi.mock("./InfraccionDetalleModal", () => ({
  InfraccionDetalleModal: () => null,
}));

vi.mock("./InfraccionOperacionModal", () => ({
  InfraccionOperacionModal: ({
    open,
    type,
  }: {
    open: boolean;
    type: string | null;
  }) => (open ? <div data-testid="operation-open">{type}</div> : null),
}));

function createItem(
  overrides: Partial<InfraccionListItem> = {},
): InfraccionListItem {
  return {
    idInfraccion: 10,
    folioInfraccion: "INF-10",
    fechaInfraccion: "2026-08-26",
    horaInfraccion: "08:20:00",
    observaciones: null,
    clavePolicia: "PV-1",
    numParteInformativo: null,
    infractor: {
      nombre: "Hiram",
      apellidoPaterno: "Carreño",
      apellidoMaterno: "Armenta",
      licencia: "LIC-1",
    },
    vehiculo: {
      placas: "ABC123",
      estadoPlacas: "OAXACA",
      serie: null,
      motor: null,
      color: "BLANCO",
      marca: "SUZUKI",
      linea: "SWIFT",
      clase: "AUTOMOVIL",
    },
    region: {
      idRegion: 1,
      nombreRegion: "Valles Centrales",
    },
    delegacion: {
      idDelegacion: 1,
      nombreDelegacion: "Oaxaca",
    },
    estatusInfraccion: {
      idEstatusInfraccion: 99,
      nombreEstatus: "SOLVENTADA_SIN_PAGO",
    },
    tipoProcedimiento: {
      idTipoProcedimiento: 1,
      claveTipoProcedimiento: "INFRACCION",
      nombreTipoProcedimiento: "INFRACCION",
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
    estadoOperativoCalculado: "SIN_RETENCION",
    ...overrides,
  };
}

async function renderWithItem(item: InfraccionListItem, roleName?: string) {
  apiMocks.getInfracciones.mockResolvedValue({
    data: [item],
    meta: {
      page: 1,
      limit: 30,
      total: 1,
      totalPages: 1,
    },
  });

  render(
    <InfraccionesListPage
      catalogs={null}
      token="token-test"
      refreshKey={0}
      roleName={roleName}
      onNavigateCreate={vi.fn()}
    />,
  );

  expect(await screen.findByText("INF-10")).toBeInTheDocument();
}

function getMainStatusBadge(): HTMLElement {
  const row = screen.getByText("INF-10").closest("tr");
  expect(row).not.toBeNull();

  return within(row as HTMLTableRowElement).getByText(/./, {
    selector: ".status-badge",
  });
}

describe("InfraccionesListPage identificacion de delegaciones", () => {
  const plaza = { idRegion: 1, nombreRegion: "PLAZA" };
  const cuenca = { idRegion: 10, nombreRegion: "CUENCA" };
  const catalogs: CatalogosBundle = {
    roles: [],
    regiones: [plaza, cuenca],
    delegaciones: [
      { idDelegacion: 1, nombreDelegacion: "CENTRO", region: plaza },
      { idDelegacion: 10, nombreDelegacion: "CENTRO", region: cuenca },
      { idDelegacion: 11, nombreDelegacion: "EL RETIRO", region: plaza },
      { idDelegacion: 99, nombreDelegacion: "CENTRO" },
    ],
    sexos: [],
    servicios: [],
    clasesVehiculo: [],
    marcasVehiculo: [],
    lineasVehiculo: [],
    tiposProcedimiento: [],
    operativos: [],
    estatusInfraccion: [],
    motivos: [],
    encierros: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.findConceptosPago.mockResolvedValue([]);
    apiMocks.getInfracciones.mockResolvedValue({
      data: [createItem()],
      meta: { page: 1, limit: 30, total: 1, totalPages: 1 },
    });
  });

  async function renderDelegationFilters() {
    render(
      <InfraccionesListPage
        catalogs={catalogs}
        token="token-test"
        refreshKey={0}
        onNavigateCreate={vi.fn()}
      />,
    );
    await screen.findByText("INF-10");
    return screen.getByRole("combobox", { name: "Delegacion" });
  }

  it("Q5.1-01 distingue delegaciones homonimas y conserva sus identificadores", async () => {
    const select = await renderDelegationFilters();
    expect(within(select).getByRole("option", { name: "PLAZA - CENTRO" })).toHaveValue("1");
    expect(within(select).getByRole("option", { name: "CUENCA - CENTRO" })).toHaveValue("10");
    expect(within(select).getByRole("option", { name: "PLAZA - EL RETIRO" })).toHaveValue("11");
    expect(within(select).queryByRole("option", { name: "CENTRO" })).not.toBeInTheDocument();

    for (const idDelegacion of [1, 10]) {
      fireEvent.change(select, { target: { value: String(idDelegacion) } });
      fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
      await waitFor(() => expect(apiMocks.getInfracciones).toHaveBeenLastCalledWith(
        "token-test",
        expect.objectContaining({ idDelegacion, page: 1 }),
      ));
    }

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() => expect(apiMocks.getInfracciones).toHaveBeenLastCalledWith(
      "token-test",
      expect.objectContaining({ idDelegacion: undefined, page: 1 }),
    ));
    expect(select).toHaveValue("");
  });

  it("Q5.1-02 usa el ID como respaldo cuando no existe region en el catalogo", async () => {
    const select = await renderDelegationFilters();
    expect(within(select).getByRole("option", { name: "CENTRO (ID: 99)" })).toHaveValue("99");
    expect(within(select).getByRole("option", { name: "Todas" })).toHaveValue("");
  });
});

describe("InfraccionesListPage validacion de rango de fechas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.findConceptosPago.mockResolvedValue([]);
  });

  async function renderDateFilters(): Promise<number> {
    await renderWithItem(createItem());
    return apiMocks.getInfracciones.mock.calls.length;
  }

  function setDateRange(fechaDesde: string, fechaHasta: string): void {
    fireEvent.change(screen.getByLabelText("Fecha desde"), {
      target: { value: fechaDesde },
    });
    fireEvent.change(screen.getByLabelText("Fecha hasta"), {
      target: { value: fechaHasta },
    });
  }

  it("Q3.1-01 envia un rango valido", async () => {
    await renderDateFilters();
    setDateRange("2026-08-20", "2026-08-24");

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => expect(apiMocks.getInfracciones).toHaveBeenLastCalledWith(
      "token-test",
      expect.objectContaining({
        fechaDesde: "2026-08-20",
        fechaHasta: "2026-08-24",
        page: 1,
      }),
    ));
  });

  it("Q3.1-02 permite ambas fechas iguales", async () => {
    await renderDateFilters();
    setDateRange("2026-08-22", "2026-08-22");

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => expect(apiMocks.getInfracciones).toHaveBeenLastCalledWith(
      "token-test",
      expect.objectContaining({
        fechaDesde: "2026-08-22",
        fechaHasta: "2026-08-22",
      }),
    ));
  });

  it("Q3.1-03 permite solo fecha inicial", async () => {
    await renderDateFilters();
    fireEvent.change(screen.getByLabelText("Fecha desde"), {
      target: { value: "2026-08-22" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => expect(apiMocks.getInfracciones).toHaveBeenLastCalledWith(
      "token-test",
      expect.objectContaining({
        fechaDesde: "2026-08-22",
        fechaHasta: undefined,
      }),
    ));
  });

  it("Q3.1-04 permite solo fecha final", async () => {
    await renderDateFilters();
    fireEvent.change(screen.getByLabelText("Fecha hasta"), {
      target: { value: "2026-08-22" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => expect(apiMocks.getInfracciones).toHaveBeenLastCalledWith(
      "token-test",
      expect.objectContaining({
        fechaDesde: undefined,
        fechaHasta: "2026-08-22",
      }),
    ));
  });

  it("Q3.1-05 bloquea un rango invertido mediante Buscar", async () => {
    const initialCallCount = await renderDateFilters();
    setDateRange("2026-08-24", "2026-08-20");

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(screen.getByText(
      "La fecha inicial no puede ser posterior a la fecha final.",
    )).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha desde")).toHaveValue("2026-08-24");
    expect(screen.getByLabelText("Fecha hasta")).toHaveValue("2026-08-20");
    expect(screen.getByText("INF-10")).toBeInTheDocument();
    expect(apiMocks.getInfracciones).toHaveBeenCalledTimes(initialCallCount);
  });

  it("Q3.1-06 bloquea un rango invertido mediante filtro rapido", async () => {
    const initialCallCount = await renderDateFilters();
    setDateRange("2026-08-24", "2026-08-20");

    fireEvent.click(screen.getByRole("button", { name: "Pagada sin retencion" }));

    expect(screen.getByText(
      "La fecha inicial no puede ser posterior a la fecha final.",
    )).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha desde")).toHaveValue("2026-08-24");
    expect(screen.getByLabelText("Fecha hasta")).toHaveValue("2026-08-20");
    expect(screen.getByText("INF-10")).toBeInTheDocument();
    expect(apiMocks.getInfracciones).toHaveBeenCalledTimes(initialCallCount);
  });

  it("Q3.1-07 elimina el error al corregir y aplica el rango valido", async () => {
    const initialCallCount = await renderDateFilters();
    setDateRange("2026-08-24", "2026-08-20");
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(screen.getByText(
      "La fecha inicial no puede ser posterior a la fecha final.",
    )).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Fecha hasta"), {
      target: { value: "2026-08-26" },
    });
    expect(screen.queryByText(
      "La fecha inicial no puede ser posterior a la fecha final.",
    )).not.toBeInTheDocument();
    expect(apiMocks.getInfracciones).toHaveBeenCalledTimes(initialCallCount);

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(apiMocks.getInfracciones).toHaveBeenCalledTimes(
      initialCallCount + 1,
    ));
    expect(apiMocks.getInfracciones).toHaveBeenLastCalledWith(
      "token-test",
      expect.objectContaining({
        fechaDesde: "2026-08-24",
        fechaHasta: "2026-08-26",
      }),
    );
  });

  it("Q3.1-08 limpiar filtros restablece fechas, error y alcance", async () => {
    const initialCallCount = await renderDateFilters();
    setDateRange("2026-08-24", "2026-08-20");
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(screen.getByText(
      "La fecha inicial no puede ser posterior a la fecha final.",
    )).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(screen.getByLabelText("Fecha desde")).toHaveValue("");
    expect(screen.getByLabelText("Fecha hasta")).toHaveValue("");
    expect(screen.queryByText(
      "La fecha inicial no puede ser posterior a la fecha final.",
    )).not.toBeInTheDocument();
    expect(apiMocks.getInfracciones).toHaveBeenCalledTimes(initialCallCount);
    expect(apiMocks.getInfracciones).toHaveBeenLastCalledWith(
      "token-test",
      expect.objectContaining({
        fechaDesde: undefined,
        fechaHasta: undefined,
        estadoOperativo: undefined,
        page: 1,
      }),
    );
  });
});

describe("InfraccionesListPage notificaciones por expediente", () => {
  const observacion = {
    idObservacion: 12,
    idInfraccion: 10,
    folioInfraccion: "INF-10",
    placas: "ABC123",
    campoObservado: "ANIO_MODELO",
    valorOriginal: "2022",
    valorReportado: "2023",
    motivoReporte: "La tarjeta indica un modelo distinto.",
    referenciaEvidencia: "Tarjeta de circulación revisada",
    nombreUsuarioReporta: "Encierros Central",
    fechaReporte: "2026-11-09T17:00:00.000Z",
    estatus: "PENDIENTE",
  };
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.findConceptosPago.mockResolvedValue([]);
    apiMocks.getObservacionesPendientes.mockResolvedValue({
      data: [observacion],
      meta: { page: 1, limit: 1, total: 1, totalPages: 1 },
    });
  });

  it("muestra campana exclusivamente en la infracción con pendientes", async () => {
    await renderWithItem(createItem({ cantidadObservacionesPendientes: 2 }), "INFRACCIONES");
    expect(screen.getByRole("button", {
      name: "Revisar 2 observaciones pendientes del expediente INF-10",
    })).toBeEnabled();
    expect(apiMocks.getObservacionesPendientes).not.toHaveBeenCalled();
  });

  it("consulta la infracción exacta al pulsar la campana y abre su atención", async () => {
    await renderWithItem(createItem({ cantidadObservacionesPendientes: 1 }), "INFRACCIONES");
    fireEvent.click(screen.getByRole("button", {
      name: "Revisar 1 observaciones pendientes del expediente INF-10",
    }));
    await waitFor(() => expect(apiMocks.getObservacionesPendientes).toHaveBeenCalledWith(
      "token-test", 1, 1, 10,
    ));
    expect(await screen.findByTestId("observacion-atencion")).toHaveTextContent(
      "Atendiendo observación 12",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cerrar atención" }));
    expect(screen.queryByTestId("observacion-atencion")).not.toBeInTheDocument();
  });

  it("actualiza el listado después de resolver una observación", async () => {
    await renderWithItem(createItem({ cantidadObservacionesPendientes: 1 }), "INFRACCIONES");
    fireEvent.click(screen.getByRole("button", {
      name: "Revisar 1 observaciones pendientes del expediente INF-10",
    }));
    await screen.findByTestId("observacion-atencion");
    apiMocks.getInfracciones.mockResolvedValue({
      data: [createItem({ cantidadObservacionesPendientes: 0 })],
      meta: { page: 1, limit: 30, total: 1, totalPages: 1 },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simular resolución" }));
    expect(screen.getByRole("status")).toHaveTextContent("Observación 12 corregida correctamente.");
    await waitFor(() => expect(screen.queryByRole("button", {
      name: /Revisar 1 observaciones pendientes del expediente INF-10/,
    })).not.toBeInTheDocument());
  });

  it.each(["ENCIERRO", "CONSULTA", "LIBERACIONES", "OPERADOR"] as const)(
    "no expone la atención de observaciones al rol %s",
    async (rol) => {
      await renderWithItem(createItem({ cantidadObservacionesPendientes: 1 }), rol);
      expect(screen.queryByRole("button", { name: /observaciones pendientes del expediente/i }))
        .not.toBeInTheDocument();
      expect(apiMocks.getObservacionesPendientes).not.toHaveBeenCalled();
    },
  );

  it("mantiene visible y habilitado Registrar pago cuando hay observación", async () => {
    await renderWithItem({
      ...createItemEnEncierro("EN_ENCIERRO_SIN_PAGO"),
      cantidadObservacionesPendientes: 1,
    }, "INFRACCIONES");
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeEnabled();
    expect(screen.getByRole("button", {
      name: "Revisar 1 observaciones pendientes del expediente INF-10",
    })).toBeEnabled();
  });

  it("muestra fallo de consulta sin impedir acciones del listado", async () => {
    apiMocks.getObservacionesPendientes.mockRejectedValueOnce(new Error("Consulta no disponible"));
    await renderWithItem(createItem({ cantidadObservacionesPendientes: 1 }), "ADMIN");
    fireEvent.click(screen.getByRole("button", {
      name: "Revisar 1 observaciones pendientes del expediente INF-10",
    }));
    expect(await screen.findByText("Consulta no disponible")).toBeInTheDocument();
    expect(screen.getByText("INF-10")).toBeInTheDocument();
  });

  it("no muestra campana cuando el expediente no tiene observaciones pendientes", async () => {
    await renderWithItem(createItem({ cantidadObservacionesPendientes: 0 }), "INFRACCIONES");
    expect(screen.queryByRole("button", { name: /observaciones pendientes del expediente/i }))
      .not.toBeInTheDocument();
  });
});

describe("InfraccionesListPage solventacion sin pago", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.findConceptosPago.mockResolvedValue([]);
  });

  it("marca como completada una infraccion sin retencion solventada sin pago", async () => {
    await renderWithItem(createItem());

    expect(getMainStatusBadge()).toHaveTextContent("Solventada sin pago");
    expect(screen.getByRole("button", { name: "Completado" })).toBeDisabled();
    expect(
      screen.getByText("Infraccion solventada sin pago"),
    ).toBeInTheDocument();
  });

  it("conserva pagada sin retencion cuando existe un pago real", async () => {
    await renderWithItem(
      createItem({
        estatusInfraccion: {
          idEstatusInfraccion: 2,
          nombreEstatus: "PAGADA",
        },
        pago: {
          tienePago: true,
          idPagoInfraccion: 60,
          fechaUltimoPago: "2026-08-26T12:00:00.000Z",
          montoPagado: "1200.00",
          clavesConcepto: "1EAAA002",
        },
        estadoOperativoCalculado: "PAGADA_SIN_RETENCION",
      }),
    );

    expect(getMainStatusBadge()).toHaveTextContent("Pagada sin retencion");
  });

  it("habilita liberacion para una infraccion retenida solventada sin pago", async () => {
    await renderWithItem(
      createItem({
        tipoProcedimiento: {
          idTipoProcedimiento: 1,
          claveTipoProcedimiento: "INFRACCION",
          nombreTipoProcedimiento: "INFRACCION",
          esTipoExpediente: true,
          requiereFolioInfraccion: true,
          requiereNumParteInformativo: false,
          requiereMotivos: true,
          permiteRetencion: true,
          activo: true,
        },
        retencion: {
          idRetencionVehiculo: 50,
          encierro: "Encierro Central",
          fechaIngreso: "2026-08-26T08:00:00.000Z",
          folioResguardo: "RES-1",
          estadoIngreso: "CAPTURADO",
        },
        estadoOperativoCalculado: "EN_ENCIERRO_SIN_PAGO",
      }),
    );

    expect(
      screen.getByRole("button", { name: "Autorizar liberacion" }),
    ).toBeEnabled();
    expect(getMainStatusBadge()).toHaveTextContent(
      "Pagado, pendiente de liberacion",
    );
    expect(screen.getByText("Expediente solventado sin pago")).toBeInTheDocument();
  });

  it("envia la clave de concepto normalizada al aplicar los filtros", async () => {
    await renderWithItem(createItem());

    fireEvent.change(screen.getByLabelText("Clave de concepto"), {
      target: { value: " 1eaaa002 " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(apiMocks.getInfracciones).toHaveBeenLastCalledWith(
        "token-test",
        expect.objectContaining({
          claveConcepto: "1EAAA002",
          page: 1,
          limit: 30,
        }),
      );
    });
  });

  it("consulta y muestra sugerencias de claves de concepto", async () => {
    apiMocks.findConceptosPago.mockResolvedValue([
      {
        idConceptoPago: 7,
        claveConcepto: "1EAAA002",
        activo: true,
      },
    ]);
    await renderWithItem(createItem());

    fireEvent.change(screen.getByLabelText("Clave de concepto"), {
      target: { value: "1e" },
    });

    await waitFor(() => {
      expect(apiMocks.findConceptosPago).toHaveBeenCalledWith(
        "token-test",
        "1E",
        20,
      );
    });

    await waitFor(() => {
      expect(
        document.querySelector(
          '#infracciones-conceptos-sugerencias option[value="1EAAA002"]',
        ),
      ).not.toBeNull();
    });
  });

  it("restablece la clave de concepto al limpiar filtros", async () => {
    await renderWithItem(createItem());

    const input = screen.getByLabelText("Clave de concepto");
    fireEvent.change(input, { target: { value: "1EAAA002" } });
    expect(input).toHaveValue("1EAAA002");

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(input).toHaveValue("");
    expect(screen.getByText("Todas las claves")).toBeInTheDocument();
  });
});

function createItemEnEncierro(
  state: "EN_ENCIERRO_SIN_PAGO" | "LIBERADO_PENDIENTE_SALIDA",
): InfraccionListItem {
  const item = createItem();
  const liberado = state === "LIBERADO_PENDIENTE_SALIDA";
  return createItem({
    estatusInfraccion: {
      idEstatusInfraccion: 1,
      nombreEstatus: "PENDIENTE_PAGO",
    },
    tipoProcedimiento: {
      ...item.tipoProcedimiento,
      permiteRetencion: true,
    },
    retencion: {
      idRetencionVehiculo: 50,
      encierro: "Encierro Central",
      fechaIngreso: "2026-08-26T08:00:00.000Z",
      folioResguardo: "RES-1",
      estadoIngreso: "CAPTURADO",
    },
    pago: {
      tienePago: liberado,
      idPagoInfraccion: liberado ? 60 : null,
      fechaUltimoPago: null,
      montoPagado: null,
      clavesConcepto: null,
    },
    liberacion: {
      tieneLiberacion: liberado,
      idLiberacionVehiculo: liberado ? 70 : null,
      fechaLiberacion: null,
    },
    estadoOperativoCalculado: state,
  });
}

describe("InfraccionesListPage regularizacion de entregas anticipadas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.findConceptosPago.mockResolvedValue([]);
  });

  function delivered(overrides: Partial<InfraccionListItem> = {}): InfraccionListItem {
    const item = createItemEnEncierro("EN_ENCIERRO_SIN_PAGO");
    return {
      ...item,
      salida: {
        tieneSalida: true,
        fechaSalida: "2026-08-26T10:00:00.000Z",
        folioLiberacionPresentado: "FL-2026-01",
      },
      estatusInfraccion: {
        idEstatusInfraccion: 8,
        nombreEstatus: "VEHICULO_ENTREGADO",
      },
      estadoOperativoCalculado: "VEHICULO_ENTREGADO",
      ...overrides,
    };
  }

  it("ofrece registrar pago pendiente a INFRACCIONES sin duplicar salida", async () => {
    await renderWithItem(delivered(), "INFRACCIONES");

    fireEvent.click(screen.getByRole("button", { name: "Registrar pago pendiente" }));
    expect(screen.getByTestId("operation-open")).toHaveTextContent("pago");
    expect(screen.getByText("Regularización administrativa; vehículo ya entregado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar salida" })).not.toBeInTheDocument();
  });

  it("ofrece liberar tras pago y muestra el folio documental", async () => {
    await renderWithItem(
      delivered({ pago: { tienePago: true, idPagoInfraccion: 11,
        fechaUltimoPago: "2026-08-26T12:00:00.000Z",
        montoPagado: "1200", clavesConcepto: null } }),
      "INFRACCIONES",
    );

    fireEvent.click(screen.getByRole("button", { name: "Autorizar liberacion pendiente" }));
    expect(screen.getByTestId("operation-open")).toHaveTextContent("liberacion");
    expect(screen.getByText(/Folio documental: FL-2026-01/)).toBeInTheDocument();
  });

  it("permite la liberacion posterior cuando se registro No aplica pago", async () => {
    await renderWithItem(
      delivered({ pago: { tienePago: false, tieneSolventacionSinPago: true,
        idPagoInfraccion: null, fechaUltimoPago: null,
        montoPagado: null, clavesConcepto: null } }),
      "INFRACCIONES",
    );
    expect(screen.getByRole("button", { name: "Autorizar liberacion pendiente" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Registrar pago pendiente" })).not.toBeInTheDocument();
  });

  it("no muestra una segunda salida ni operaciones pendientes tras regularizar", async () => {
    await renderWithItem(
      delivered({ liberacion: { tieneLiberacion: true,
        idLiberacionVehiculo: 12, folioLiberacion: "FL-2026-01",
        fechaLiberacion: "2026-08-26T13:00:00.000Z" } }),
      "INFRACCIONES",
    );
    expect(screen.getByRole("button", { name: "Completado" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Registrar salida/i })).not.toBeInTheDocument();
  });

  it("conserva el estado fisico entregado aunque exista un estatus No aplica pago", async () => {
    await renderWithItem(
      delivered({ estatusInfraccion: { idEstatusInfraccion: 7,
        nombreEstatus: "SOLVENTADA_SIN_PAGO" },
        pago: { tienePago: false, idPagoInfraccion: null,
          fechaUltimoPago: null, montoPagado: null, clavesConcepto: null } }),
      "INFRACCIONES",
    );
    expect(getMainStatusBadge()).toHaveTextContent("Vehiculo entregado");
    expect(screen.getByRole("button", { name: "Autorizar liberacion pendiente" })).toBeEnabled();
  });

  it("impide que LIBERACIONES registre el pago pendiente de una salida anticipada", async () => {
    await renderWithItem(delivered(), "LIBERACIONES");
    expect(screen.getByRole("button", { name: "Pago pendiente" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Registrar pago pendiente" })).not.toBeInTheDocument();
  });

  it("no habilita otra salida a ENCIERRO si falta pago y liberacion", async () => {
    await renderWithItem(delivered(), "ENCIERRO");
    expect(screen.getByRole("button", { name: "Completado" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Registrar salida/i })).not.toBeInTheDocument();
  });
});

describe("InfraccionesListPage rol ENCIERRO", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.findConceptosPago.mockResolvedValue([]);
  });

  it("muestra salida anticipada cuando aun no hay pago y oculta Nueva infraccion", async () => {
    await renderWithItem(
      createItemEnEncierro("EN_ENCIERRO_SIN_PAGO"),
      "ENCIERRO",
    );

    expect(
      screen.queryByRole("button", { name: /Nueva infraccion/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Registrar pago" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Registrar salida anticipada" }));
    expect(screen.getByTestId("operation-open")).toHaveTextContent("salida");
  });

  it.each(["ADMIN", "OPERADOR", "INFRACCIONES", "LIBERACIONES"] as const)(
    "no ofrece el botón de salida anticipada al rol %s",
    async (rol) => {
      await renderWithItem(createItemEnEncierro("EN_ENCIERRO_SIN_PAGO"), rol);
      expect(
        screen.queryByRole("button", { name: "Registrar salida anticipada" }),
      ).not.toBeInTheDocument();
    },
  );

  it("bloquea salida anticipada si la entrega ya fue registrada", async () => {
    const item = createItemEnEncierro("EN_ENCIERRO_SIN_PAGO");
    await renderWithItem({
      ...item,
      salida: { tieneSalida: true, fechaSalida: "2026-08-26T10:00:00.000Z" },
      estadoOperativoCalculado: "VEHICULO_ENTREGADO",
    }, "ENCIERRO");
    expect(screen.queryByRole("button", { name: "Registrar salida anticipada" })).not.toBeInTheDocument();
  });

  it("mantiene habilitada la salida cuando el expediente fue liberado", async () => {
    await renderWithItem(
      createItemEnEncierro("LIBERADO_PENDIENTE_SALIDA"),
      "ENCIERRO",
    );

    fireEvent.click(screen.getByRole("button", { name: "Registrar salida" }));
    expect(screen.getByTestId("operation-open")).toHaveTextContent("salida");
  });

  it("conserva la accion de pago del rol ADMIN", async () => {
    await renderWithItem(createItemEnEncierro("EN_ENCIERRO_SIN_PAGO"), "ADMIN");

    expect(
      screen.getByRole("button", { name: "Registrar pago" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Nueva infraccion/i }),
    ).toBeEnabled();
  });
});
