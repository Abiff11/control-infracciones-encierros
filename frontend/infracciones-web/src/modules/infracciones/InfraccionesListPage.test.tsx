import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InfraccionListItem } from "../../types/infracciones.types";
import InfraccionesListPage from "./InfraccionesListPage";

const apiMocks = vi.hoisted(() => ({
  findConceptosPago: vi.fn(),
  getInfraccionDetalle: vi.fn(),
  getInfracciones: vi.fn(),
}));

vi.mock("../../services/api/infracciones.api", () => ({
  getInfraccionDetalle: apiMocks.getInfraccionDetalle,
  getInfracciones: apiMocks.getInfracciones,
}));

vi.mock("../../services/api/pagos.api", () => ({
  findConceptosPago: apiMocks.findConceptosPago,
}));

vi.mock("./InfraccionDetalleModal", () => ({
  InfraccionDetalleModal: () => null,
}));

vi.mock("./InfraccionOperacionModal", () => ({
  InfraccionOperacionModal: () => null,
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

async function renderWithItem(item: InfraccionListItem) {
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
      onNavigateCreate={vi.fn()}
    />,
  );

  expect(await screen.findByText("INF-10")).toBeInTheDocument();
}

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
