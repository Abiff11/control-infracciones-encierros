import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { InfraccionDetalleResponse } from "../../types/infracciones.types";
import { InfraccionDetalleModal } from "./InfraccionDetalleModal";

function createDetalle(
  overrides: Partial<InfraccionDetalleResponse> = {},
): InfraccionDetalleResponse {
  return {
    infraccion: {
      idInfraccion: 10,
      folioInfraccion: "INF-4C2B",
      fechaInfraccion: "2026-11-24",
      horaInfraccion: "08:30:00",
      observaciones: null,
      clavePolicia: "PV-100",
      numParteInformativo: null,
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
    region: { idRegion: 1, nombreRegion: "Valles Centrales" },
    delegacion: { idDelegacion: 1, nombreDelegacion: "Oaxaca" },
    usuarioCaptura: { idUsuario: 1, nombreUsuario: "Prueba" },
    infractor: {
      nombre: "Persona",
      apellidoPaterno: "Prueba",
      apellidoMaterno: null,
      licencia: null,
      sexo: null,
    },
    vehiculo: {
      placas: "ABC123",
      estadoPlacas: "OAXACA",
      serie: null,
      motor: null,
      anioModelo: 2020,
      color: "BLANCO",
      sitioServicioPublico: null,
      claseVehiculo: { idClaseVehiculo: 1, nombreClaseVehiculo: "AUTOMOVIL" },
      marcaVehiculo: { idMarcaVehiculo: 1, nombreMarcaVehiculo: "SUZUKI" },
      lineaVehiculo: { idLineaVehiculo: 1, nombreLineaVehiculo: "SWIFT" },
      servicio: { idServicio: 1, nombreServicio: "PARTICULAR" },
    },
    lugarInfraccion: { idLugarInfraccion: 1, nombreLugarInfraccion: "CENTRO" },
    motivos: [],
    retencionVehiculo: null,
    pagos: [],
    liberaciones: [],
    salidas: [],
    movimientos: [],
    estadoOperativoCalculado: "SIN_RETENCION",
    ...overrides,
  };
}

function renderDetalle(data: InfraccionDetalleResponse): void {
  render(
    <InfraccionDetalleModal
      open
      loading={false}
      error={null}
      data={data}
      onClose={vi.fn()}
    />,
  );
}

describe("InfraccionDetalleModal estado visual", () => {
  it("muestra solventada sin pago sin crear pagos ficticios", () => {
    renderDetalle(createDetalle());

    expect(screen.getByText("Solventada sin pago", {
      selector: ".detail-hero-status .status-badge",
    })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pagos" })).not.toBeInTheDocument();
  });

  it("con retencion muestra solventacion y liberacion pendientes", () => {
    renderDetalle(createDetalle({
      tipoProcedimiento: {
        ...createDetalle().tipoProcedimiento,
        permiteRetencion: true,
      },
      retencionVehiculo: {
        idRetencionVehiculo: 20,
        encierro: { idEncierro: 1, nombreEncierro: "Encierro Central" },
        fechaIngreso: "2026-11-24T09:00:00.000Z",
        recibidoPor: "Operador",
        folioResguardo: "RES-1",
        estadoIngreso: "CAPTURADO",
        observacionesIngreso: null,
      },
      estadoOperativoCalculado: "EN_ENCIERRO_SIN_PAGO",
    }));

    const badge = screen.getByText("Solventada, pendiente de liberacion", {
      selector: ".detail-hero-status .status-badge",
    });
    expect(badge).toHaveClass("status-badge-info");
    expect(screen.queryByRole("button", { name: "Pagos" })).not.toBeInTheDocument();
  });

  it("conserva la etiqueta pagada cuando existe pago real", () => {
    renderDetalle(createDetalle({
      estatusInfraccion: { idEstatusInfraccion: 2, nombreEstatus: "PAGADA" },
      pagos: [{
        idPagoInfraccion: 30,
        folioPago: "PAGO-10",
        monto: "1200.00",
        fechaPago: "2026-11-24T10:00:00.000Z",
        observaciones: null,
      }],
      estadoOperativoCalculado: "PAGADA_SIN_RETENCION",
    }));

    expect(screen.getByText("Pagada sin retencion", {
      selector: ".detail-hero-status .status-badge",
    })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagos" })).toBeInTheDocument();
  });

  it("prioriza vehiculo entregado, aunque falte liberacion", () => {
    renderDetalle(createDetalle({
      tipoProcedimiento: {
        ...createDetalle().tipoProcedimiento,
        permiteRetencion: true,
      },
      retencionVehiculo: {
        idRetencionVehiculo: 20,
        encierro: { idEncierro: 1, nombreEncierro: "Encierro Central" },
        fechaIngreso: "2026-11-24T09:00:00.000Z",
        recibidoPor: "Operador",
        folioResguardo: "RES-1",
        estadoIngreso: "CAPTURADO",
        observacionesIngreso: null,
      },
      salidas: [{
        idSalidaVehiculo: 40,
        fechaSalida: "2026-11-24T12:00:00.000Z",
        validadoPor: "Operador",
        personaRecibeVehiculo: "Persona propietaria",
        observacionesSalida: null,
        estadoSalida: "ENTREGADO",
      }],
      estadoOperativoCalculado: "VEHICULO_ENTREGADO",
    }));

    expect(screen.getByText("Vehiculo entregado", {
      selector: ".detail-hero-status .status-badge",
    })).toBeInTheDocument();
  });

  it("con liberacion registrada conserva el estado pendiente de salida", () => {
    renderDetalle(createDetalle({
      tipoProcedimiento: {
        ...createDetalle().tipoProcedimiento,
        permiteRetencion: true,
      },
      retencionVehiculo: {
        idRetencionVehiculo: 20,
        encierro: { idEncierro: 1, nombreEncierro: "Encierro Central" },
        fechaIngreso: "2026-11-24T09:00:00.000Z",
        recibidoPor: "Operador",
        folioResguardo: "RES-1",
        estadoIngreso: "CAPTURADO",
        observacionesIngreso: null,
      },
      liberaciones: [{
        idLiberacionVehiculo: 41,
        folioLiberacion: "LIB-10",
        fechaLiberacion: "2026-11-24T11:00:00.000Z",
        liberadoPor: "Operador",
        nombreRecibeLiberacion: "Persona propietaria",
        observacion: null,
      }],
      estadoOperativoCalculado: "LIBERADO_PENDIENTE_SALIDA",
    }));

    expect(screen.getByText("Liberado, pendiente de salida", {
      selector: ".detail-hero-status .status-badge",
    })).toBeInTheDocument();
  });
});
