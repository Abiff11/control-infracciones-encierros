import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  RegistrarNoAplicaPagoPayload,
  RegistrarPagoPayload,
} from "../../types/operaciones.types";
import PagoCreatePage from "./PagoCreatePage";

const sweetAlertMock = vi.hoisted(() => ({
  confirmAction: vi.fn(),
}));

vi.mock("../../utils/sweetAlert", () => ({
  confirmAction: sweetAlertMock.confirmAction,
}));

function renderPage(initialIdInfraccion = 10) {
  const onCompleted = vi.fn();
  const onSubmit = vi.fn((payload: RegistrarPagoPayload) =>
    Promise.resolve({ idPagoInfraccion: payload.idInfraccion }),
  );
  const onSubmitNoAplica = vi.fn((payload: RegistrarNoAplicaPagoPayload) =>
    Promise.resolve({
      idSolventacionSinPago: payload.idInfraccion,
      motivo: payload.motivo,
    }),
  );

  render(
    <PagoCreatePage
      initialIdInfraccion={initialIdInfraccion}
      onCompleted={onCompleted}
      onSubmit={onSubmit}
      onSubmitNoAplica={onSubmitNoAplica}
    />,
  );

  return { onCompleted, onSubmit, onSubmitNoAplica };
}

function getPaymentForm(): HTMLFormElement {
  const form = screen
    .getByRole("button", { name: "Solventar sin pago" })
    .closest("form");

  if (!(form instanceof HTMLFormElement)) {
    throw new Error("No se encontro el formulario de pago.");
  }

  return form;
}

describe("PagoCreatePage No aplica pago", () => {
  beforeEach(() => {
    sweetAlertMock.confirmAction.mockReset();
    sweetAlertMock.confirmAction.mockResolvedValue(true);
  });

  it("activa el modo sin pago y oculta los campos financieros", () => {
    renderPage();

    expect(screen.getByLabelText(/Folio/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Clave 1/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Monto$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "No aplica pago" }));

    expect(screen.getByLabelText(/Motivo/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Folio/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Clave 1/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Monto$/)).not.toBeInTheDocument();
  });

  it("requiere un motivo valido antes de solventar sin pago", async () => {
    const { onSubmitNoAplica } = renderPage();

    fireEvent.click(screen.getByRole("button", { name: "No aplica pago" }));

    const submitButton = screen.getByRole("button", {
      name: "Solventar sin pago",
    });
    expect(submitButton).toBeDisabled();

    fireEvent.submit(getPaymentForm());
    expect(await screen.findByText(/Escribe el motivo/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "ab" },
    });
    expect(submitButton).toBeDisabled();

    fireEvent.submit(getPaymentForm());
    await waitFor(() => {
      expect(screen.getByText(/Escribe el motivo/)).toBeInTheDocument();
    });
    expect(sweetAlertMock.confirmAction).not.toHaveBeenCalled();
    expect(onSubmitNoAplica).not.toHaveBeenCalled();
  });

  it("respeta la confirmacion y envia solo el payload de solventacion", async () => {
    const { onSubmit, onSubmitNoAplica } = renderPage();

    fireEvent.click(screen.getByRole("button", { name: "No aplica pago" }));
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "No se genero linea de captura" },
    });

    sweetAlertMock.confirmAction.mockResolvedValueOnce(false);
    fireEvent.click(
      screen.getByRole("button", { name: "Solventar sin pago" }),
    );

    await waitFor(() => {
      expect(sweetAlertMock.confirmAction).toHaveBeenCalledTimes(1);
    });
    expect(onSubmitNoAplica).not.toHaveBeenCalled();

    sweetAlertMock.confirmAction.mockResolvedValueOnce(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Solventar sin pago" }),
    );

    await waitFor(() => {
      expect(onSubmitNoAplica).toHaveBeenCalledTimes(1);
    });

    const [payload] = onSubmitNoAplica.mock.calls[0] ?? [];

    expect(payload).toEqual({
      idInfraccion: 10,
      motivo: "No se genero linea de captura",
    });
    expect(payload).not.toHaveProperty("folioLineaCaptura");
    expect(payload).not.toHaveProperty("conceptos");
    expect(payload).not.toHaveProperty("monto");
    expect(payload).not.toHaveProperty("fechaPago");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("conserva el flujo de pago normal", async () => {
    const { onSubmit, onSubmitNoAplica } = renderPage();

    fireEvent.change(screen.getByLabelText(/Folio/), {
      target: { value: "LC-123" },
    });
    fireEvent.change(screen.getByLabelText(/Clave 1/), {
      target: { value: "101" },
    });
    fireEvent.change(screen.getByLabelText(/^Monto$/), {
      target: { value: "150.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        idInfraccion: 10,
        folioLineaCaptura: "LC-123",
        conceptos: [{ claveConcepto: "101", monto: "150.50" }],
      }),
    );
    expect(onSubmitNoAplica).not.toHaveBeenCalled();
  });
});
