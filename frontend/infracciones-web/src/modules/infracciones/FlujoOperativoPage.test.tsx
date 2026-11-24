import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { InfraccionFlujoResponse } from "../../types/infracciones.types";
import FlujoOperativoPage from "./FlujoOperativoPage";

function createFlowResponse({
  estatus = "SOLVENTADA_SIN_PAGO",
  permiteRetencion = false,
  pagos = [],
  retenciones = [],
  liberaciones = [],
  salidas = [],
}: {
  estatus?: string;
  permiteRetencion?: boolean;
  pagos?: unknown[];
  retenciones?: unknown[];
  liberaciones?: unknown[];
  salidas?: unknown[];
} = {}): InfraccionFlujoResponse {
  return {
    infraccion: {
      folioInfraccion: "INF-4C2A",
      fechaInfraccion: "2026-11-24",
      horaInfraccion: "10:30:00",
      infractor: {
        nombre: "Persona",
        apellidoPaterno: "Prueba",
        apellidoMaterno: null,
      },
      vehiculo: {
        placas: "ABC123",
        lineaVehiculo: {
          nombreLineaVehiculo: "SWIFT",
          marcaVehiculo: { nombreMarcaVehiculo: "SUZUKI" },
        },
        claseVehiculo: { nombreClaseVehiculo: "AUTOMOVIL" },
      },
      estatusInfraccion: { nombreEstatus: estatus },
      tipoProcedimiento: { permiteRetencion },
    },
    motivos: [],
    pagos,
    liberaciones,
    retenciones,
    salidas,
    movimientos: [],
  } as unknown as InfraccionFlujoResponse;
}

async function renderFlow(response: InfraccionFlujoResponse) {
  const onSubmit = vi.fn().mockResolvedValue(response);
  render(<FlujoOperativoPage onSubmit={onSubmit} />);

  fireEvent.change(screen.getByLabelText("Folio infraccion"), {
    target: { value: " INF-4C2A " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

  expect(await screen.findByRole("heading", { name: "INF-4C2A" })).toBeInTheDocument();
  expect(onSubmit).toHaveBeenCalledWith("INF-4C2A");
}

function getFlowStep(label: string): HTMLElement {
  const step = screen.getByText(label, { selector: ".flow-step-label" }).closest("article");
  expect(step).not.toBeNull();
  return step as HTMLElement;
}

function getNextAction(): HTMLElement {
  const section = screen.getByText("Siguiente accion").closest("section");
  expect(section).not.toBeNull();
  return section as HTMLElement;
}

describe("FlujoOperativoPage solventacion sin pago", () => {
  it("completa el tramite sin retencion y no recomienda registrar otro pago", async () => {
    await renderFlow(createFlowResponse({ permiteRetencion: true }));

    expect(screen.getByText("Solventada sin pago", { selector: ".status-badge" }))
      .toBeInTheDocument();
    expect(getFlowStep("Solventacion")).toHaveClass("flow-step-card-done");
    expect(getFlowStep("Solventacion")).toHaveTextContent("Sin pago");
    expect(screen.queryByText("Retencion", { selector: ".flow-step-label" }))
      .not.toBeInTheDocument();
    expect(getNextAction()).toHaveTextContent("Flujo completo");
    expect(getNextAction()).not.toHaveTextContent("Registrar pago");
  });

  it("mantiene pendiente la liberacion cuando existe retencion", async () => {
    await renderFlow(
      createFlowResponse({
        permiteRetencion: true,
        retenciones: [
          {
            fechaIngreso: "2026-11-24T11:00:00.000Z",
            encierro: { nombreEncierro: "Encierro Central" },
          },
        ],
      }),
    );

    expect(getFlowStep("Solventacion")).toHaveClass("flow-step-card-done");
    expect(getFlowStep("Solventacion")).toHaveTextContent(
      "Solventacion sin pago registrada",
    );
    expect(getNextAction()).toHaveTextContent("Generar liberacion");
    expect(getNextAction()).not.toHaveTextContent("Ya existe pago");
  });

  it("conserva el pago registrado cuando existe un pago real", async () => {
    await renderFlow(
      createFlowResponse({
        estatus: "PAGADA",
        pagos: [
          {
            folioPago: "PAGO-100",
            fechaPago: "2026-11-24T12:00:00.000Z",
          },
        ],
      }),
    );

    expect(getFlowStep("Pago")).toHaveClass("flow-step-card-done");
    expect(getFlowStep("Pago")).toHaveTextContent("PAGO-100");
    expect(getNextAction()).toHaveTextContent("Pago registrado");
  });

  it("mantiene la entrega visible y solicita liberar la salida solventada", async () => {
    await renderFlow(
      createFlowResponse({
        permiteRetencion: true,
        retenciones: [{ encierro: { nombreEncierro: "Encierro Central" } }],
        salidas: [{ fechaSalida: "2026-11-24T14:00:00.000Z" }],
      }),
    );

    expect(screen.getByText("Vehiculo entregado", { selector: ".status-badge" }))
      .toBeInTheDocument();
    expect(getFlowStep("Salida")).toHaveClass("flow-step-card-done");
    expect(getNextAction()).toHaveTextContent("Autorizar liberacion pendiente");
    expect(getNextAction()).not.toHaveTextContent("Registrar salida");
  });

  it("mantiene la entrega visible e informa el pago pendiente", async () => {
    await renderFlow(
      createFlowResponse({
        estatus: "PENDIENTE_PAGO",
        permiteRetencion: true,
        retenciones: [{ encierro: { nombreEncierro: "Encierro Central" } }],
        salidas: [{ fechaSalida: "2026-11-24T14:00:00.000Z" }],
      }),
    );

    expect(screen.getByText("Vehiculo entregado", { selector: ".status-badge" }))
      .toBeInTheDocument();
    expect(getNextAction()).toHaveTextContent("Pago pendiente");
    expect(getNextAction()).not.toHaveTextContent("Registrar salida");
  });

  it("cierra el flujo entregado con respaldo y liberacion completos", async () => {
    await renderFlow(
      createFlowResponse({
        permiteRetencion: true,
        retenciones: [{ encierro: { nombreEncierro: "Encierro Central" } }],
        liberaciones: [{ folioLiberacion: "LIB-100" }],
        salidas: [{ fechaSalida: "2026-11-24T14:00:00.000Z" }],
      }),
    );

    expect(screen.getByText("Vehiculo entregado", { selector: ".status-badge" }))
      .toBeInTheDocument();
    expect(getNextAction()).toHaveTextContent("Flujo completo");
    expect(getNextAction()).not.toHaveTextContent("Registrar salida");
  });
});
