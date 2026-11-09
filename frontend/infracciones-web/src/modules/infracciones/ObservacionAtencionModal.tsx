import { useState, type FormEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { TextAreaField } from '../../components/ui/TextAreaField';
import { getErrorMessage } from '../../services/api/apiClient';
import {
  resolverObservacion,
  type DecisionObservacion,
  type ObservacionPendienteItem,
  type ResolverObservacionResponse,
} from '../../services/api/encierros.api';
import { formatDateTime, formatEmptyValue } from '../../utils/formatters';
import { confirmAction } from '../../utils/sweetAlert';

interface ObservacionAtencionModalProps {
  open: boolean;
  token: string;
  observacion: ObservacionPendienteItem | null;
  onClose: () => void;
  onCompleted: (result: ResolverObservacionResponse) => void;
}

export function ObservacionAtencionModal({
  open,
  token,
  observacion,
  onClose,
  onCompleted,
}: ObservacionAtencionModalProps) {
  const [decision, setDecision] = useState<DecisionObservacion | null>(null);
  const [justificacion, setJustificacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const motivo = justificacion.trim();
  const valido = Boolean(decision) && motivo.length >= 10 &&
    motivo.length <= 1000 && !saving;

  function cambiarDecision(next: DecisionObservacion): void {
    setDecision(next);
    setError(null);
  }

  function cerrar(): void {
    if (!saving) {
      onClose();
    }
  }

  async function guardar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!observacion || !decision || !valido) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const confirmado = await confirmAction({
        title: decision === 'CORREGIR'
          ? 'Confirmar corrección de vehículo'
          : 'Confirmar rechazo de observación',
        text: decision === 'CORREGIR'
          ? 'Se cambiará únicamente el dato reportado en el expediente ' +
            observacion.folioInfraccion + '. La salida física no se modifica.'
          : 'La observación se marcará como rechazada y el dato del vehículo permanecerá igual.',
        confirmButtonText: decision === 'CORREGIR'
          ? 'Confirmar corrección'
          : 'Confirmar rechazo',
        cancelButtonText: 'Volver a revisar',
      });
      if (!confirmado) {
        return;
      }

      const resultado = await resolverObservacion(token, observacion.idObservacion, {
        decision,
        resolucion: motivo,
      });
      onCompleted(resultado);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={observacion
        ? 'Atender observación ' + observacion.folioInfraccion
        : 'Atender observación'}
      description="Revisa la evidencia antes de decidir. Solo se puede corregir el campo observado."
      eyebrowLabel="Infracciones · atención de observaciones"
      size="wide"
      onClose={cerrar}
    >
      {observacion ? (
        <form className="page-stack" onSubmit={(event) => { void guardar(event); }}>
          <div className="form-grid form-grid-2">
            <div className="table-cell-stack">
              <strong>Expediente</strong>
              <span>{observacion.folioInfraccion}</span>
              <span>Placas: {formatEmptyValue(observacion.placas)}</span>
            </div>
            <div className="table-cell-stack">
              <strong>Campo observado</strong>
              <span>{observacion.campoObservado === 'ANIO_MODELO'
                ? 'Año modelo' : 'Color'}</span>
            </div>
            <div className="table-cell-stack">
              <strong>Dato registrado</strong>
              <span>{observacion.valorOriginal}</span>
            </div>
            <div className="table-cell-stack">
              <strong>Dato reportado por Encierros</strong>
              <span>{observacion.valorReportado}</span>
            </div>
          </div>

          <div className="table-cell-stack">
            <strong>Motivo del reporte</strong>
            <p>{observacion.motivoReporte}</p>
            <strong>Referencia de evidencia</strong>
            <p>{observacion.referenciaEvidencia}</p>
            <span>Reportó: {observacion.nombreUsuarioReporta} · {formatDateTime(observacion.fechaReporte)}</span>
          </div>

          <div className="notice">
            Si corriges, el sistema actualizará solo el color o el año modelo.
            Si rechazas, conservará el valor registrado. Ambos resultados quedan auditados.
          </div>

          <div className="field">
            <strong>Decisión de Infracciones</strong>
            <div className="button-row" role="group" aria-label="Decisión sobre la observación">
              <Button
                type="button"
                variant={decision === 'CORREGIR' ? 'primary' : 'secondary'}
                aria-pressed={decision === 'CORREGIR'}
                disabled={saving}
                onClick={() => cambiarDecision('CORREGIR')}
              >
                Corregir dato
              </Button>
              <Button
                type="button"
                variant={decision === 'RECHAZAR' ? 'primary' : 'secondary'}
                aria-pressed={decision === 'RECHAZAR'}
                disabled={saving}
                onClick={() => cambiarDecision('RECHAZAR')}
              >
                Rechazar observación
              </Button>
            </div>
          </div>

          <Field htmlFor="observacion-justificacion" label="Justificación de la decisión">
            <TextAreaField
              id="observacion-justificacion"
              rows={4}
              minLength={10}
              maxLength={1000}
              required
              disabled={saving}
              value={justificacion}
              onChange={(event) => {
                setJustificacion(event.target.value);
                setError(null);
              }}
              placeholder="Explica los documentos revisados y por qué procedió tu decisión."
            />
          </Field>
          <p className="page-description">
            Escribe de 10 a 1,000 caracteres. No se modifican placas, serie, motor ni la salida.
          </p>
          <ErrorMessage message={error} />
          <div className="button-row">
            <Button type="button" variant="secondary" disabled={saving} onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={!valido}>
              {saving
                ? 'Guardando decisión...'
                : decision === 'CORREGIR'
                  ? 'Confirmar corrección'
                  : decision === 'RECHAZAR'
                    ? 'Confirmar rechazo'
                    : 'Selecciona una decisión'}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
