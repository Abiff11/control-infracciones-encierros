import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ObservacionPendienteItem } from '../../services/api/encierros.api';
import { ObservacionAtencionModal } from './ObservacionAtencionModal';

const mocks = vi.hoisted(() => ({
  confirmAction: vi.fn(),
  resolverObservacion: vi.fn(),
}));

vi.mock('../../services/api/encierros.api', () => ({
  resolverObservacion: mocks.resolverObservacion,
}));
vi.mock('../../utils/sweetAlert', () => ({
  confirmAction: mocks.confirmAction,
}));

const observation: ObservacionPendienteItem = {
  idObservacion: 12,
  idInfraccion: 10,
  folioInfraccion: 'INF-2026-0125',
  placas: 'ABC123',
  campoObservado: 'ANIO_MODELO',
  valorOriginal: '2022',
  valorReportado: '2023',
  motivoReporte: 'La tarjeta indica un modelo distinto.',
  referenciaEvidencia: 'Tarjeta de circulación revisada',
  nombreUsuarioReporta: 'Encierros Central',
  fechaReporte: '2026-11-09T17:00:00.000Z',
  estatus: 'PENDIENTE',
};

function renderModal() {
  const onClose = vi.fn();
  const onCompleted = vi.fn();
  render(
    <ObservacionAtencionModal
      open
      token="token-test"
      observacion={observation}
      onClose={onClose}
      onCompleted={onCompleted}
    />,
  );
  return { onClose, onCompleted };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.confirmAction.mockResolvedValue(true);
  mocks.resolverObservacion.mockResolvedValue({
    idObservacion: 12,
    idInfraccion: 10,
    campoObservado: 'ANIO_MODELO',
    estatus: 'CORREGIDA',
    resolucion: 'Se confirmó el año con la tarjeta.',
    fechaResolucion: '2026-11-09T17:20:00.000Z',
    valorAnterior: '2022',
    valorPosterior: '2023',
  });
});

describe('ObservacionAtencionModal', () => {
  it('muestra la evidencia y confirma la corrección limitada', async () => {
    const { onCompleted } = renderModal();
    expect(screen.getByText('2022')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('Tarjeta de circulación revisada')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Corregir dato' }));
    fireEvent.change(screen.getByLabelText('Justificación de la decisión'), {
      target: { value: 'Se confirmó el modelo en la tarjeta de circulación.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar corrección' }));

    await waitFor(() => {
      expect(mocks.resolverObservacion).toHaveBeenCalledWith(
        'token-test', 12, {
          decision: 'CORREGIR',
          resolucion: 'Se confirmó el modelo en la tarjeta de circulación.',
        },
      );
    });
    expect(mocks.confirmAction).toHaveBeenCalledTimes(1);
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('rechaza la observación justificadamente sin editar el vehículo', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar observación' }));
    fireEvent.change(screen.getByLabelText('Justificación de la decisión'), {
      target: { value: 'El documento no permite validar el nuevo dato.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }));

    await waitFor(() => {
      expect(mocks.resolverObservacion).toHaveBeenCalledWith(
        'token-test', 12, {
          decision: 'RECHAZAR',
          resolucion: 'El documento no permite validar el nuevo dato.',
        },
      );
    });
  });

  it('no permite enviar una justificación incompleta', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Corregir dato' }));
    const submit = screen.getByRole('button', { name: 'Confirmar corrección' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Justificación de la decisión'), {
      target: { value: 'Corto' },
    });
    expect(submit).toBeDisabled();
    expect(mocks.resolverObservacion).not.toHaveBeenCalled();
  });

  it('no llama a la API cuando se cancela la confirmación', async () => {
    mocks.confirmAction.mockResolvedValueOnce(false);
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Corregir dato' }));
    fireEvent.change(screen.getByLabelText('Justificación de la decisión'), {
      target: { value: 'El año modelo fue revisado en documentación.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar corrección' }));
    await waitFor(() => expect(mocks.confirmAction).toHaveBeenCalledTimes(1));
    expect(mocks.resolverObservacion).not.toHaveBeenCalled();
  });

  it('muestra el conflicto sin cerrar la observación ni confirmar el cambio', async () => {
    mocks.resolverObservacion.mockRejectedValueOnce(
      new Error('El valor del vehículo cambió desde el reporte.'),
    );
    const { onCompleted } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Corregir dato' }));
    fireEvent.change(screen.getByLabelText('Justificación de la decisión'), {
      target: { value: 'Se encontró nueva información del documento oficial.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar corrección' }));
    expect(await screen.findByText('El valor del vehículo cambió desde el reporte.')).toBeInTheDocument();
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it('impide un doble envío mientras se confirma la corrección', async () => {
    const pendiente: { resolve: (value: unknown) => void } = {
      resolve: () => undefined,
    };
    mocks.resolverObservacion.mockImplementationOnce(
      () => new Promise<unknown>((resolve) => { pendiente.resolve = resolve; }),
    );
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Corregir dato' }));
    fireEvent.change(screen.getByLabelText('Justificación de la decisión'), {
      target: { value: 'La tarjeta muestra un año distinto.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar corrección' }));
    await waitFor(() => expect(mocks.resolverObservacion).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Guardando decisión...' })).toBeDisabled();
    pendiente.resolve({ idObservacion: 12, estatus: 'CORREGIDA' });
    await waitFor(() => expect(mocks.resolverObservacion).toHaveBeenCalledTimes(1));
  });
});
