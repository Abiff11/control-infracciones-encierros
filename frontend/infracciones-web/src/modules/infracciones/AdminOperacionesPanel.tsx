import { useState } from "react";
import Swal from "sweetalert2";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { getErrorMessage } from "../../services/api/apiClient";
import { deleteAdminOperacion } from "../../services/api/infracciones.api";
import type {
  AdminExpedienteSnapshot,
  AdminOperacionTipo,
} from "../../types/admin-expediente.types";

interface AdminOperacionesPanelProps {
  token: string;
  snapshot: AdminExpedienteSnapshot;
  hasUnsavedChanges: boolean;
  disabled?: boolean;
  onUpdated: (snapshot: AdminExpedienteSnapshot) => void;
  onError: (message: string | null) => void;
}

interface OperationDescriptor {
  tipo: AdminOperacionTipo;
  idOperacion: number;
  titulo: string;
  detalle: string;
  dependencias: string[];
}

function buildOperations(snapshot: AdminExpedienteSnapshot): OperationDescriptor[] {
  const operations: OperationDescriptor[] = [];

  snapshot.salidas.forEach((salida, index) => {
    operations.push({
      tipo: "SALIDA",
      idOperacion: salida.idSalidaVehiculo,
      titulo: `Salida ${index + 1}`,
      detalle: `${salida.estadoSalida} · ${salida.fechaSalida}`,
      dependencias: [],
    });
  });

  snapshot.liberaciones.forEach((liberacion, index) => {
    const salidas = snapshot.salidas.filter(
      (salida) =>
        salida.idLiberacionVehiculo === liberacion.idLiberacionVehiculo,
    );
    operations.push({
      tipo: "LIBERACION",
      idOperacion: liberacion.idLiberacionVehiculo,
      titulo: `Liberación ${index + 1}`,
      detalle: `Folio ${liberacion.folioLiberacion}`,
      dependencias:
        salidas.length > 0
          ? [`${salidas.length} salida(s) vinculada(s)`]
          : [],
    });
  });

  snapshot.pagos.forEach((pago, index) => {
    const liberaciones = snapshot.liberaciones.filter(
      (liberacion) => liberacion.idPagoInfraccion === pago.idPagoInfraccion,
    );
    const idLiberaciones = new Set(
      liberaciones.map((liberacion) => liberacion.idLiberacionVehiculo),
    );
    const salidas = snapshot.salidas.filter((salida) =>
      idLiberaciones.has(salida.idLiberacionVehiculo),
    );
    const dependencias: string[] = [];
    if (liberaciones.length > 0) {
      dependencias.push(`${liberaciones.length} liberación(es) vinculada(s)`);
    }
    if (salidas.length > 0) {
      dependencias.push(`${salidas.length} salida(s) vinculada(s)`);
    }

    operations.push({
      tipo: "PAGO",
      idOperacion: pago.idPagoInfraccion,
      titulo: `Pago ${index + 1}`,
      detalle: `${pago.folioLineaCaptura} · $${pago.monto}${
        pago.conceptos.length === 0 ? " · registro histórico sin conceptos" : ""
      }`,
      dependencias,
    });
  });

  if (snapshot.retencion) {
    const salidas = snapshot.salidas.filter(
      (salida) =>
        salida.idRetencionVehiculo === snapshot.retencion?.idRetencionVehiculo,
    );
    operations.push({
      tipo: "RETENCION",
      idOperacion: snapshot.retencion.idRetencionVehiculo,
      titulo: "Retención / encierro",
      detalle: `${snapshot.retencion.estadoIngreso ?? "Ingreso registrado"} · ${
        snapshot.retencion.fechaIngreso
      }`,
      dependencias:
        salidas.length > 0
          ? [`${salidas.length} salida(s) vinculada(s)`]
          : [],
    });
  }

  return operations;
}

function operationLabel(tipo: AdminOperacionTipo): string {
  switch (tipo) {
    case "PAGO":
      return "pago";
    case "LIBERACION":
      return "liberación";
    case "SALIDA":
      return "salida";
    case "RETENCION":
      return "retención";
  }
}

export function AdminOperacionesPanel({
  token,
  snapshot,
  hasUnsavedChanges,
  disabled = false,
  onUpdated,
  onError,
}: AdminOperacionesPanelProps) {
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const operations = buildOperations(snapshot);

  async function removeOperation(operation: OperationDescriptor): Promise<void> {
    if (hasUnsavedChanges) {
      onError(
        "Guarda o descarta los cambios del formulario antes de eliminar una operación vinculada.",
      );
      return;
    }

    const reasonResult = await Swal.fire({
      icon: "warning",
      title: `Eliminar ${operationLabel(operation.tipo)}`,
      html:
        operation.dependencias.length > 0
          ? `<p>Esta operación tiene dependencias y se eliminarán en el mismo proceso:</p><p><strong>${operation.dependencias.join(
              " · ",
            )}</strong></p>`
          : "<p>La operación se eliminará del expediente. La acción quedará registrada en auditoría.</p>",
      input: "textarea",
      inputLabel: "Motivo de eliminación",
      inputPlaceholder: "Describe por qué se corrige el flujo operativo",
      inputAttributes: { maxlength: "500" },
      showCancelButton: true,
      confirmButtonText: "Continuar",
      cancelButtonText: "Cancelar",
      focusCancel: true,
      preConfirm: (value: string) => {
        const motivo = value.trim();
        if (motivo.length < 5) {
          Swal.showValidationMessage("Describe el motivo con al menos 5 caracteres");
          return false;
        }
        return motivo;
      },
    });

    if (!reasonResult.isConfirmed || typeof reasonResult.value !== "string") {
      return;
    }

    const finalConfirmation = await Swal.fire({
      icon: "warning",
      title: "Confirmar corrección operativa",
      html: `<p>Se eliminará <strong>${operation.titulo}</strong>.</p>${
        operation.dependencias.length > 0
          ? `<p>También: <strong>${operation.dependencias.join(" y ")}</strong>.</p>`
          : ""
      }<p>Esta acción no se puede deshacer desde la interfaz.</p>`,
      showCancelButton: true,
      confirmButtonText: "Eliminar operación",
      cancelButtonText: "Cancelar",
      focusCancel: true,
    });
    if (!finalConfirmation.isConfirmed) {
      return;
    }

    const key = `${operation.tipo}-${operation.idOperacion}`;
    setProcessingKey(key);
    onError(null);
    try {
      const updated = await deleteAdminOperacion(
        token,
        snapshot.infraccion.idInfraccion,
        operation.tipo,
        operation.idOperacion,
        {
          motivoEliminacion: reasonResult.value.trim(),
          confirmarDependencias: operation.dependencias.length > 0,
        },
      );
      onUpdated(updated);
      await Swal.fire({
        icon: "success",
        title: "Operación eliminada",
        text: `${operation.titulo} fue retirada del expediente y la corrección quedó auditada.`,
      });
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setProcessingKey(null);
    }
  }

  return (
    <Card className="admin-action-card admin-danger-card">
      <div className="page-stack">
        <div>
          <p className="section-label">Corrección del flujo</p>
          <h2>Operaciones vinculadas</h2>
          <p>
            Retira pagos, liberaciones, salidas o retenciones capturadas por error.
            Si una operación depende de otra, se muestra el impacto antes de
            confirmar.
          </p>
        </div>

        {hasUnsavedChanges ? (
          <div className="admin-save-state">
            <span>Acciones bloqueadas</span>
            <strong>Guarda o descarta primero los cambios del formulario</strong>
          </div>
        ) : null}

        {operations.length === 0 ? (
          <p className="page-description">No hay operaciones vinculadas que eliminar.</p>
        ) : (
          <div className="page-stack">
            {operations.map((operation) => {
              const key = `${operation.tipo}-${operation.idOperacion}`;
              const processing = processingKey === key;
              return (
                <div className="admin-save-state" key={key}>
                  <span>{operation.titulo}</span>
                  <strong>{operation.detalle}</strong>
                  {operation.dependencias.map((dependency) => (
                    <small key={dependency}>También elimina: {dependency}</small>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    className="admin-danger-button"
                    disabled={disabled || hasUnsavedChanges || processingKey !== null}
                    onClick={() => void removeOperation(operation)}
                  >
                    {processing ? "Eliminando..." : `Eliminar ${operationLabel(operation.tipo)}`}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
