import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InfraccionListItem } from "../../types/infracciones.types";
import { InfraccionOperacionModal } from "./InfraccionOperacionModal";

const apiMocks = vi.hoisted(() => ({
  confirmAction: vi.fn(),
  createLiberacion: vi.fn(),
  createNoAplicaPago: vi.fn(),
  createPago: vi.fn(),
  createRetencion: vi.fn(),
  createSalida: vi.fn(),
  createSalidaAnticipada: vi.fn(),
  findConceptosPago: vi.fn(),
}));

vi.mock("../../utils/sweetAlert", () => ({
  confirmAction: apiMocks.confirmAction,
}));

vi.mock("../../services/api/pagos.api", () => ({
  createNoAplicaPago: apiMocks.createNoAplicaPago,
  createPago: apiMocks.createPago,
  findConceptosPago: apiMocks.findConceptosPago,
}));

vi.mock("../../services/api/liberaciones.api", () => ({
  createLiberacion: apiMocks.createLiberacion,
}));

vi.mock("../../services/api/encierros.api", () => ({
  createRetencion: apiMocks.createRetencion,
  createSalida: apiMocks.createSalida,
  createSalidaAnticipada: apiMocks.createSalidaAnticipada,
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
      idEstatusInfraccion: 1,
      nombreEstatus: "PENDIENTE_PAGO",
    },
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
      folioLiberacion: null,
      fechaLiberacion: null,
    },
    salida: {
      tieneSalida: false,
      fechaSalida: null,
    },
    estadoOperativoCalculado: "EN_ENCIERRO_SIN_PAGO",
    ...overrides,
  };
}

function renderModal(
  type: "pago" | "liberacion" | "retencion" | "salida",
  item = createItem(),
  roleName?: string,
) {
  const onClose = vi.fn();
  const onCompleted = vi.fn();

  render(
    <InfraccionOperacionModal
      catalogs={null}
      item={item}
      open
      token="token-test"
      type={type}
      roleName={roleName}
      onClose={onClose}
      onCompleted={onCompleted}
    />,
  );

  return { onClose, onCompleted };
}

describe("InfraccionOperacionModal No aplica pago", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.confirmAction.mockResolvedValue(true);
    apiMocks.createNoAplicaPago.mockResolvedValue({
      idSolventacionSinPago: 20,
      motivo: "No se genero linea de captura",
      fechaSolventacion: "2026-08-26T08:30:00.000Z",
    });
    apiMocks.createPago.mockResolvedValue({ idPagoInfraccion: 30 });
    apiMocks.createLiberacion.mockResolvedValue({ idLiberacionVehiculo: 40 });
    apiMocks.findConceptosPago.mockResolvedValue([]);
  });

  it("muestra No aplica pago en el modal operativo y oculta campos financieros", () => {
    renderModal("pago");

    expect(screen.getByLabelText(/Folio linea de captura/i)).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: /Conceptos de la línea de captura/i,
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "No aplica pago" }));

    expect(screen.getByLabelText(/Motivo/i)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Folio linea de captura/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", {
        name: /Conceptos de la línea de captura/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Solventar sin pago" }),
    ).toBeDisabled();
  });

  it("envia el payload de No aplica pago sin crear un pago ficticio", async () => {
    const { onCompleted } = renderModal("pago");

    fireEvent.click(screen.getByRole("button", { name: "No aplica pago" }));
    fireEvent.change(screen.getByLabelText(/Motivo/i), {
      target: { value: "No se genero linea de captura" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Solventar sin pago" }),
    );

    await waitFor(() => {
      expect(apiMocks.createNoAplicaPago).toHaveBeenCalledWith("token-test", {
        idInfraccion: 10,
        motivo: "No se genero linea de captura",
      });
    });

    expect(apiMocks.createPago).not.toHaveBeenCalled();
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it("no solventa cuando el usuario cancela la confirmacion", async () => {
    renderModal("pago");
    apiMocks.confirmAction.mockResolvedValueOnce(false);

    fireEvent.click(screen.getByRole("button", { name: "No aplica pago" }));
    fireEvent.change(screen.getByLabelText(/Motivo/i), {
      target: { value: "No se genero linea de captura" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Solventar sin pago" }),
    );

    await waitFor(() => {
      expect(apiMocks.confirmAction).toHaveBeenCalledTimes(1);
    });
    expect(apiMocks.createNoAplicaPago).not.toHaveBeenCalled();
  });

  it("genera liberacion sin id de pago para una infraccion solventada sin pago", async () => {
    const item = createItem({
      estatusInfraccion: {
        idEstatusInfraccion: 99,
        nombreEstatus: "SOLVENTADA_SIN_PAGO",
      },
      retencion: {
        idRetencionVehiculo: 50,
        encierro: "Encierro Central",
        fechaIngreso: "2026-08-26T08:00:00.000Z",
        folioResguardo: "RES-1",
        estadoIngreso: "CAPTURADO",
      },
      estadoOperativoCalculado: "PAGADO_PENDIENTE_LIBERACION",
    });
    const { onCompleted } = renderModal("liberacion", item);

    fireEvent.change(screen.getByLabelText(/Folio liberacion/i), {
      target: { value: "LIB-10" },
    });
    fireEvent.change(screen.getByLabelText(/Responsable que libera/i), {
      target: { value: "Operador" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar liberacion" }),
    );

    await waitFor(() => {
      expect(apiMocks.createLiberacion).toHaveBeenCalledTimes(1);
    });

    const [, payload] = apiMocks.createLiberacion.mock.calls[0] ?? [];
    expect(payload).toEqual(
      expect.objectContaining({
        idInfraccion: 10,
        folioLiberacion: "LIB-10",
        liberadoPor: "Operador",
      }),
    );
    expect(payload).not.toHaveProperty("idPagoInfraccion");
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });
});

describe("InfraccionOperacionModal rol ENCIERRO", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.confirmAction.mockResolvedValue(true);
    apiMocks.createSalida.mockResolvedValue({ idSalidaVehiculo: 99 });
    apiMocks.createSalidaAnticipada.mockResolvedValue({ idSalidaVehiculo: 100 });
  });

  it.each(["retencion", "pago", "liberacion"] as const)(
    "bloquea el formulario de %s",
    (operation) => {
      renderModal(operation, createItem(), "ENCIERRO");
      expect(
        screen.getByRole("alert"),
      ).toHaveTextContent("solo puede registrar salidas vehiculares");
      const submitButton = screen.getByRole("button", {
        name: /guardar (retencion|pago|liberacion)/i,
      });
      expect(submitButton).toBeDisabled();
      fireEvent.click(submitButton);
      expect(apiMocks.createRetencion).not.toHaveBeenCalled();
      expect(apiMocks.createPago).not.toHaveBeenCalled();
      expect(apiMocks.createLiberacion).not.toHaveBeenCalled();
    },
  );

  it("permite guardar una salida con liberacion registrada", async () => {
    const item = createItem({
      retencion: {
        idRetencionVehiculo: 50,
        encierro: "Encierro Central",
        fechaIngreso: "2026-08-26T08:00:00.000Z",
        folioResguardo: "RES-1",
        estadoIngreso: "CAPTURADO",
      },
      liberacion: {
        tieneLiberacion: true,
        idLiberacionVehiculo: 51,
        folioLiberacion: "LI-1236",
        fechaLiberacion: "2026-08-26T09:00:00.000Z",
      },
      estadoOperativoCalculado: "LIBERADO_PENDIENTE_SALIDA",
    });

    const { onCompleted } = renderModal("salida", item, "ENCIERRO");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Validado por/i), {
      target: { value: "Encargado de encierro" },
    });
    fireEvent.change(screen.getByLabelText(/Persona recibe vehiculo/i), {
      target: { value: "Propietario" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar salida" }));

    await waitFor(() => {
      expect(apiMocks.createSalida).toHaveBeenCalledWith(
        "token-test",
        expect.objectContaining({
          idRetencionVehiculo: 50,
          idLiberacionVehiculo: 51,
          validadoPor: "Encargado de encierro",
          personaRecibeVehiculo: "Propietario",
        }),
      );
    });
    expect(apiMocks.confirmAction).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Registrar salida",
        text: "Vas a registrar la salida del vehículo correspondiente al expediente de infracción INF-10, con folio de liberación LI-1236.",
      }),
    );
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });


  it("precarga los datos del vehículo, no el folio, y deja sin marcar la verificación", () => {
    renderModal("salida", expedienteRetenido({
      anioModelo: 2022,
      serie: "3N6AD33B4NK844448",
      motor: "MTR-555",
    }), "ENCIERRO");

    const precargados = [
      ["Placas verificadas fisicamente", "ABC123"],
      ["Marca cotejada", "SUZUKI"],
      ["Linea cotejada", "SWIFT"],
      ["Clase cotejada", "AUTOMOVIL"],
      ["Color cotejado", "BLANCO"],
      ["Año modelo cotejado (opcional)", "2022"],
      ["Estado de placas (opcional)", "OAXACA"],
      ["Numero de serie (opcional)", "3N6AD33B4NK844448"],
      ["Numero de motor (opcional)", "MTR-555"],
    ] as const;
    for (const [campo, valor] of precargados) {
      expect(screen.getByLabelText(campo)).toHaveValue(valor);
    }
    expect(screen.getByLabelText("Folio de liberacion presentado")).toHaveValue("");
    expect(screen.getByLabelText("Referencia del documento de liberacion")).toHaveValue("");
    expect(screen.getByLabelText("Propietario declarado")).toHaveValue("");
    expect(screen.getByLabelText(/Confirmo que verifiqué físicamente el vehículo/i)).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Registrar salida anticipada" })).toBeDisabled();
  });

  it("exige confirmación física aun cuando todos los valores estén precargados", () => {
    renderModal("salida", expedienteRetenido({ anioModelo: 2022 }), "ENCIERRO");
    const manuales = [
      ["Folio de liberacion presentado", "FL-2026-55"],
      ["Referencia del documento de liberacion", "Oficio firmado"],
      ["Propietario declarado", "Persona propietaria"],
      ["Validado por", "Encargado"],
      ["Persona recibe vehiculo", "Persona receptora"],
    ] as const;
    for (const [campo, valor] of manuales) {
      fireEvent.change(screen.getByLabelText(campo), { target: { value: valor } });
    }
    const guardar = screen.getByRole("button", { name: "Registrar salida anticipada" });
    expect(guardar).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Confirmo que verifiqué físicamente el vehículo/i));
    expect(guardar).toBeEnabled();
  });

  it.each(["ADMIN", "OPERADOR", "INFRACCIONES"] as const)(
    "no muestra el formulario de salida anticipada al rol %s",
    (rol) => {
      renderModal("salida", expedienteRetenido(), rol);
      expect(screen.queryByRole("button", { name: "Registrar salida anticipada" })).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Placas verificadas fisicamente")).not.toBeInTheDocument();
      expect(apiMocks.createSalidaAnticipada).not.toHaveBeenCalled();
    },
  );

  it("permite salida anticipada con cotejo y autorizacion documental", async () => {
    const item = createItem({
      retencion: {
        idRetencionVehiculo: 50,
        encierro: "Encierro Central",
        fechaIngreso: "2026-08-26T08:00:00.000Z",
        folioResguardo: "RES-1",
        estadoIngreso: "CAPTURADO",
      },
    });
    const { onCompleted } = renderModal("salida", item, "ENCIERRO");
    const fields = [
      ["Folio de liberacion presentado", "FL-2026-55"],
      ["Placas verificadas fisicamente", "ABC123"],
      ["Marca cotejada", "SUZUKI"],
      ["Linea cotejada", "SWIFT"],
      ["Propietario declarado", "Persona propietaria"],
      ["Referencia del documento de liberacion", "Oficio firmado"],
      ["Validado por", "Encargado"],
      ["Persona recibe vehiculo", "Persona receptora"],
    ] as const;
    for (const [name, value] of fields) {
      fireEvent.change(screen.getByLabelText(name), { target: { value } });
    }
    fireEvent.click(screen.getByLabelText(/Confirmo que verifiqué físicamente el vehículo/i));
    fireEvent.click(screen.getByRole("button", { name: "Registrar salida anticipada" }));
    await waitFor(() => {
      expect(apiMocks.createSalidaAnticipada).toHaveBeenCalledWith(
        "token-test",
        expect.objectContaining({
          idRetencionVehiculo: 50,
          folioLiberacionPresentado: "FL-2026-55",
          placasCotejadas: "ABC123",
          datosVehiculoCotejados: expect.objectContaining({
            marca: "SUZUKI",
            linea: "SWIFT",
            clase: "AUTOMOVIL",
            color: "BLANCO",
            estadoPlacas: "OAXACA",
          }),
          autorizacionDocumentalVerificada: true,
        }),
      );
    });
    expect(apiMocks.createSalida).not.toHaveBeenCalled();
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });


  function expedienteRetenido(
    vehiculo?: Partial<InfraccionListItem["vehiculo"]>,
  ): InfraccionListItem {
    const item = createItem();
    return createItem({
      vehiculo: { ...item.vehiculo, ...vehiculo },
      retencion: {
        idRetencionVehiculo: 50,
        encierro: "Encierro Central",
        fechaIngreso: "2026-08-26T08:00:00.000Z",
        folioResguardo: "RES-1",
        estadoIngreso: "CAPTURADO",
      },
    });
  }

  function completarSalida(): void {
    const fields = [
      ["Folio de liberacion presentado", "FL-2026-55"],
      ["Placas verificadas fisicamente", "ABC123"],
      ["Marca cotejada", "SUZUKI"],
      ["Linea cotejada", "SWIFT"],
      ["Propietario declarado", "Persona propietaria"],
      ["Referencia del documento de liberacion", "Oficio firmado"],
      ["Validado por", "Encargado"],
      ["Persona recibe vehiculo", "Persona receptora"],
    ] as const;
    for (const [label, value] of fields) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(
      screen.getByLabelText(/Confirmo que verifiqué físicamente el vehículo/i),
    );
  }

  it.each([
    { label: "color", campo: "Color cotejado", observado: "PLATA", registrado: "BLANCO" },
    { label: "año modelo", campo: "Año modelo cotejado (opcional)", observado: "2023", registrado: "2022" },
  ])("reporta una diferencia de $label con evidencia sin modificar el expediente", async ({ campo, observado, registrado }) => {
    const item = expedienteRetenido({ anioModelo: 2022 });
    const { onCompleted } = renderModal("salida", item, "ENCIERRO");
    completarSalida();
    fireEvent.change(screen.getByLabelText(campo), { target: { value: observado } });
    expect(screen.getByText("Registrado: " + registrado)).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Registrar salida anticipada" });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Reportar diferencia a Infracciones"));
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Motivo de la diferencia"), {
      target: { value: "Dato revisado en el documento oficial" },
    });
    fireEvent.change(screen.getByLabelText("Referencia de evidencia"), {
      target: { value: "Tarjeta de circulación cotejada" },
    });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => {
      expect(apiMocks.createSalidaAnticipada).toHaveBeenCalledWith(
        "token-test",
        expect.objectContaining({
          discrepanciaMenor: {
            motivo: "Dato revisado en el documento oficial",
            referenciaEvidencia: "Tarjeta de circulación cotejada",
          },
        }),
      );
    });
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it("bloquea placas distintas, incluso con características coincidentes", () => {
    renderModal("salida", expedienteRetenido(), "ENCIERRO");
    completarSalida();
    fireEvent.change(screen.getByLabelText("Placas verificadas fisicamente"), {
      target: { value: "OTRAS99" },
    });
    expect(screen.getByText(/Las placas no coinciden con el expediente/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar salida anticipada" })).toBeDisabled();
    expect(apiMocks.createSalidaAnticipada).not.toHaveBeenCalled();
  });

  it("bloquea varias diferencias menores y no ofrece reportarlas como una sola", () => {
    renderModal("salida", expedienteRetenido({ anioModelo: 2022 }), "ENCIERRO");
    completarSalida();
    fireEvent.change(screen.getByLabelText("Color cotejado"), {
      target: { value: "ROJO" },
    });
    fireEvent.change(screen.getByLabelText("Año modelo cotejado (opcional)"), {
      target: { value: "2023" },
    });
    expect(screen.getByText(/Hay dos diferencias generales/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Reportar diferencia a Infracciones")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar salida anticipada" })).toBeDisabled();
  });

  it("no envía observación si todos los datos coinciden", async () => {
    renderModal("salida", expedienteRetenido({ anioModelo: 2022 }), "ENCIERRO");
    completarSalida();
    fireEvent.change(screen.getByLabelText("Color cotejado"), {
      target: { value: "BLANCO" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar salida anticipada" }));
    await waitFor(() => {
      expect(apiMocks.createSalidaAnticipada).toHaveBeenCalledTimes(1);
    });
    const payload = apiMocks.createSalidaAnticipada.mock.calls[0]?.[1];
    expect(payload).not.toHaveProperty("discrepanciaMenor");
  });

  it("bloquea salida anticipada sin verificar la autorizacion y el cotejo", () => {
    const item = createItem({
      retencion: {
        idRetencionVehiculo: 50,
        encierro: "Encierro Central",
        fechaIngreso: "2026-08-26T08:00:00.000Z",
        folioResguardo: "RES-1",
        estadoIngreso: "CAPTURADO",
      },
    });
    renderModal("salida", item, "ENCIERRO");
    expect(screen.getByRole("button", { name: "Registrar salida anticipada" })).toBeDisabled();
    expect(apiMocks.createSalidaAnticipada).not.toHaveBeenCalled();
  });

  it("bloquea la salida cuando el listado no incluye el folio de liberacion", () => {
    const item = createItem({
      retencion: {
        idRetencionVehiculo: 50,
        encierro: "Encierro Central",
        fechaIngreso: "2026-08-26T08:00:00.000Z",
        folioResguardo: "RES-1",
        estadoIngreso: "CAPTURADO",
      },
      liberacion: {
        tieneLiberacion: true,
        idLiberacionVehiculo: 51,
        folioLiberacion: null,
        fechaLiberacion: "2026-08-26T09:00:00.000Z",
      },
      estadoOperativoCalculado: "LIBERADO_PENDIENTE_SALIDA",
    });

    renderModal("salida", item, "ENCIERRO");
    fireEvent.change(screen.getByLabelText(/Validado por/i), {
      target: { value: "Encargado de encierro" },
    });
    fireEvent.change(screen.getByLabelText(/Persona recibe vehiculo/i), {
      target: { value: "Propietario" },
    });
    const submitButton = screen.getByRole("button", { name: "Guardar salida" });
    expect(submitButton).toBeDisabled();
    fireEvent.click(submitButton);

    expect(apiMocks.confirmAction).not.toHaveBeenCalled();
    expect(apiMocks.createSalida).not.toHaveBeenCalled();
  });
});
