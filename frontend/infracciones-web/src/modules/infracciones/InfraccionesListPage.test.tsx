import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("InfraccionesListPage bandeja de observaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.findConceptosPago.mockResolvedValue([]);
    apiMocks.getObservacionesPendientes.mockResolvedValue({
      data: [{
        idObservacion: 12,
        idInfraccion: 10,
        folioInfraccion: "INF-2026-0125",
        placas: "ABC123",
        campoObservado: "ANIO_MODELO",
        valorOriginal: "2022",
        valorReportado: "2023",
        motivoReporte: "La tarjeta indica un modelo distinto.",
        referenciaEvidencia: "Tarjeta de circulación revisada",
        nombreUsuarioReporta: "Encierros Central",
        fechaReporte: "2026-11-09T17:00:00.000Z",
        estatus: "PENDIENTE",
      }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it("permite a INFRACCIONES consultar la observacion con evidencia y comparación", async () => {
    await renderWithItem(createItem(), "INFRACCIONES");
    const abrir = await screen.findByRole("button", { name: "Ver observaciones (1)" });
    fireEvent.click(abrir);
    expect(screen.getByRole("heading", { name: "Observaciones pendientes" })).toBeInTheDocument();
    expect(screen.getByText("INF-2026-0125")).toBeInTheDocument();
    expect(screen.getByText("Registrado: 2022")).toBeInTheDocument();
    expect(screen.getByText("Reportado: 2023")).toBeInTheDocument();
    expect(screen.getByText("Evidencia: Tarjeta de circulación revisada")).toBeInTheDocument();
    expect(screen.getByText("Encierros Central")).toBeInTheDocument();
    expect(apiMocks.getObservacionesPendientes).toHaveBeenCalledWith(
      "token-test", 1, 20,
    );
  });

  it("abre la atención de la observación seleccionada sin modificar otras operaciones", async () => {
    await renderWithItem(createItem(), "INFRACCIONES");
    fireEvent.click(await screen.findByRole("button", { name: "Ver observaciones (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Atender observación" }));

    expect(screen.getByTestId("observacion-atencion")).toHaveTextContent(
      "Atendiendo observación 12",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cerrar atención" }));
    expect(screen.queryByTestId("observacion-atencion")).not.toBeInTheDocument();
  });

  it("actualiza bandeja y listado al terminar una corrección", async () => {
    await renderWithItem(createItem(), "INFRACCIONES");
    fireEvent.click(await screen.findByRole("button", { name: "Ver observaciones (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Atender observación" }));
    apiMocks.getObservacionesPendientes.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simular resolución" }));

    expect(screen.getByRole("status")).toHaveTextContent("Observación 12 corregida correctamente.");
    expect(screen.queryByTestId("observacion-atencion")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(apiMocks.getObservacionesPendientes).toHaveBeenCalledTimes(2);
      expect(apiMocks.getInfracciones).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("No hay observaciones pendientes para mostrar.")).toBeInTheDocument();
  });

  it("no muestra ni consulta la bandeja con el rol ENCIERRO", async () => {
    await renderWithItem(createItem(), "ENCIERRO");
    expect(screen.queryByRole("heading", { name: "Observaciones pendientes" })).not.toBeInTheDocument();
    expect(apiMocks.getObservacionesPendientes).not.toHaveBeenCalled();
  });

  it("mantiene el listado principal cuando falla la consulta de observaciones", async () => {
    apiMocks.getObservacionesPendientes.mockRejectedValueOnce(
      new Error("No se pudo consultar la bandeja"),
    );
    await renderWithItem(createItem(), "INFRACCIONES");
    fireEvent.click(screen.getByRole("button", { name: "Ver observaciones (0)" }));
    expect(await screen.findByText("No se pudo consultar la bandeja")).toBeInTheDocument();
    expect(screen.getByText("INF-10")).toBeInTheDocument();
  });
});

describe("InfraccionesListPage solventacion sin pago", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.findConceptosPago.mockResolvedValue([]);
  });

  it("marca como completada una infraccion sin retencion solventada sin pago", async () => {
    await renderWithItem(createItem());

    expect(screen.getByRole("button", { name: "Completado" })).toBeDisabled();
    expect(
      screen.getByText("Infraccion solventada sin pago"),
    ).toBeInTheDocument();
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
    expect(screen.getByText("INF-10").closest("tr")).toHaveTextContent("Vehiculo entregado");
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
