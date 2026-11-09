import { canPerformOperationForRole } from "../../app/navigation-access";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { Button } from "../../components/ui/Button";
import { Field, TextInput } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { SelectField } from "../../components/ui/SelectField";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getErrorMessage } from "../../services/api/apiClient";
import {
  createRetencion,
  createSalida,
  createSalidaAnticipada,
} from "../../services/api/encierros.api";
import { createLiberacion } from "../../services/api/liberaciones.api";
import {
  createNoAplicaPago,
  createPago,
} from "../../services/api/pagos.api";
import {
  formatDate,
  formatEmptyValue,
  formatFullName,
  formatTimeOfDay,
} from "../../utils/formatters";
import {
  dateTimeLocalToIso,
  formatDateTimeLocalInput,
} from "../../utils/timezone";
import { confirmAction } from "../../utils/sweetAlert";
import type { CatalogosBundle } from "../../types/catalogos.types";
import type { InfraccionListItem } from "../../types/infracciones.types";
import type {
  GenerarLiberacionPayload,
  RegistrarNoAplicaPagoPayload,
  RegistrarPagoPayload,
  RegistrarRetencionPayload,
  RegistrarSalidaPayload,
  RegistrarSalidaAnticipadaPayload,
} from "../../types/operaciones.types";
import {
  createEmptyPagoConceptoRow,
  PagoConceptosEditor,
  type PagoConceptoFormRow,
} from "./PagoConceptosEditor";
import "./InfraccionOperacionModal.css";

export type InfraccionOperacionTipo =
  | "retencion"
  | "pago"
  | "liberacion"
  | "salida";

interface InfraccionOperacionModalProps {
  catalogs: CatalogosBundle | null;
  item: InfraccionListItem | null;
  open: boolean;
  token: string;
  type: InfraccionOperacionTipo | null;
  roleName?: string;
  onClose: () => void;
  onCompleted: () => void;
}

interface OperationCopy {
  title: string;
  description: string;
  submitLabel: string;
}

interface OperationFormState {
  idEncierro: string;
  fechaIngreso: string;
  recibidoPor: string;
  folioResguardo: string;
  estadoIngreso: string;
  observacionesIngreso: string;
  folioPago: string;
  fechaPago: string;
  observacionesPago: string;
  folioLiberacion: string;
  liberadoPor: string;
  fechaLiberacion: string;
  observacionLiberacion: string;
  validadoPor: string;
  personaRecibeVehiculo: string;
  fechaSalida: string;
  estadoSalida: string;
  observacionesSalida: string;
  folioLiberacionPresentado: string;
  placasCotejadas: string;
  marcaCotejada: string;
  lineaCotejada: string;
  claseCotejada: string;
  colorCotejado: string;
  anioModeloCotejado: string;
  estadoPlacasCotejado: string;
  serieCotejada: string;
  motorCotejado: string;
  referenciaDocumentoLiberacion: string;
  nombrePropietarioDeclarado: string;
  autorizacionDocumentalVerificada: boolean;
  reportarDiferencia: boolean;
  motivoDiferencia: string;
  evidenciaDiferencia: string;
}

function toNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function toIsoDateTime(value: string): string | undefined {
  return value ? dateTimeLocalToIso(value) : undefined;
}

function toMoney(value: string): string {
  const numericValue = Number(value || "0");

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return "0.00";
  }

  return numericValue.toFixed(2);
}

function createInitialForm(
  type: InfraccionOperacionTipo | null,
  item: InfraccionListItem | null,
): OperationFormState {
  const now = formatDateTimeLocalInput();
  const vehiculoParaCotejo =
    type === "salida" &&
    Boolean(item?.retencion?.idRetencionVehiculo) &&
    !item?.liberacion?.tieneLiberacion
      ? item?.vehiculo
      : null;

  return {
    idEncierro: "",
    fechaIngreso: now,
    recibidoPor: "",
    folioResguardo: "",
    estadoIngreso: "CAPTURADO",
    observacionesIngreso: "",
    folioPago: "",
    fechaPago: now,
    observacionesPago: "",
    folioLiberacion: "",
    liberadoPor: "",
    fechaLiberacion: now,
    observacionLiberacion: "",
    validadoPor: "",
    personaRecibeVehiculo: "",
    fechaSalida: now,
    estadoSalida: type === "salida" ? "ENTREGADO" : "",
    observacionesSalida: "",
    folioLiberacionPresentado: "",
    placasCotejadas: vehiculoParaCotejo?.placas ?? "",
    marcaCotejada: vehiculoParaCotejo?.marca ?? "",
    lineaCotejada: vehiculoParaCotejo?.linea ?? "",
    claseCotejada: vehiculoParaCotejo?.clase ?? "",
    colorCotejado: vehiculoParaCotejo?.color ?? "",
    anioModeloCotejado: vehiculoParaCotejo?.anioModelo == null
      ? ""
      : String(vehiculoParaCotejo.anioModelo),
    estadoPlacasCotejado: vehiculoParaCotejo?.estadoPlacas ?? "",
    serieCotejada: vehiculoParaCotejo?.serie ?? "",
    motorCotejado: vehiculoParaCotejo?.motor ?? "",
    referenciaDocumentoLiberacion: "",
    nombrePropietarioDeclarado: "",
    autorizacionDocumentalVerificada: false,
    reportarDiferencia: false,
    motivoDiferencia: "",
    evidenciaDiferencia: "",
  };
}


interface DiferenciaCotejo {
  campo: "COLOR" | "ANIO_MODELO";
  etiqueta: string;
  registrado: string;
  reportado: string;
}

interface ResultadoCotejo {
  coincidencias: number;
  diferencias: DiferenciaCotejo[];
  problemas: string[];
}

function normalizarCotejo(value: string | number): string {
  return String(value).normalize("NFKC").trim().replace(/\s+/gu, " ").toUpperCase();
}

function normalizarPlacas(value: string): string {
  return normalizarCotejo(value).replace(/[\s-]/gu, "");
}

function analizarCotejo(
  item: InfraccionListItem,
  form: OperationFormState,
): ResultadoCotejo {
  const result: ResultadoCotejo = {
    coincidencias: 0,
    diferencias: [],
    problemas: [],
  };

  if (form.placasCotejadas.trim() &&
      (!item.vehiculo.placas ||
        normalizarPlacas(form.placasCotejadas) !==
          normalizarPlacas(item.vehiculo.placas))) {
    result.problemas.push(
      "Las placas no coinciden con el expediente. Se requiere revisión antes de la entrega.",
    );
  }

  const generales: Array<{
    etiqueta: string;
    valor: string;
    registrado: string | number | null | undefined;
    menor?: DiferenciaCotejo["campo"];
  }> = [
    { etiqueta: "Marca", valor: form.marcaCotejada, registrado: item.vehiculo.marca },
    { etiqueta: "Línea", valor: form.lineaCotejada, registrado: item.vehiculo.linea },
    { etiqueta: "Clase", valor: form.claseCotejada, registrado: item.vehiculo.clase },
    { etiqueta: "Color", valor: form.colorCotejado, registrado: item.vehiculo.color, menor: "COLOR" },
    { etiqueta: "Año modelo", valor: form.anioModeloCotejado, registrado: item.vehiculo.anioModelo, menor: "ANIO_MODELO" },
  ];

  for (const { etiqueta, valor, registrado, menor } of generales) {
    if (!valor.trim()) {
      continue;
    }
    if (registrado === null || registrado === undefined || String(registrado).trim() === "") {
      result.problemas.push(etiqueta + ": no hay dato registrado para cotejar.");
      continue;
    }
    if (normalizarCotejo(valor) === normalizarCotejo(registrado)) {
      result.coincidencias += 1;
    } else if (menor) {
      result.diferencias.push({
        campo: menor,
        etiqueta,
        registrado: String(registrado),
        reportado: valor.trim(),
      });
    } else {
      result.problemas.push(etiqueta + ": el dato observado no coincide con el expediente.");
    }
  }

  const identificadores: Array<{
    etiqueta: string;
    valor: string;
    registrado: string | null | undefined;
  }> = [
    { etiqueta: "Estado de placas", valor: form.estadoPlacasCotejado, registrado: item.vehiculo.estadoPlacas },
    { etiqueta: "Número de serie", valor: form.serieCotejada, registrado: item.vehiculo.serie },
    { etiqueta: "Número de motor", valor: form.motorCotejado, registrado: item.vehiculo.motor },
  ];
  for (const { etiqueta, valor, registrado } of identificadores) {
    if (valor.trim() &&
        (!registrado || normalizarCotejo(valor) !== normalizarCotejo(registrado))) {
      result.problemas.push(etiqueta + ": discrepancia que requiere revisión.");
    }
  }
  if (result.diferencias.length > 1) {
    result.problemas.push(
      "Hay dos diferencias generales: se requiere revisión antes de entregar el vehículo.",
    );
  }
  return result;
}

function getOperationCopy(type: InfraccionOperacionTipo | null): OperationCopy {
  switch (type) {
    case "retencion":
      return {
        title: "Registrar retencion",
        description: "Captura el ingreso del vehiculo al encierro.",
        submitLabel: "Guardar retencion",
      };
    case "pago":
      return {
        title: "Registrar pago",
        description:
          "Registra la linea de captura o solventa la infraccion mediante No aplica pago.",
        submitLabel: "Guardar pago",
      };
    case "liberacion":
      return {
        title: "Generar liberacion",
        description:
          "Genera la liberacion del vehiculo cuando el expediente fue pagado o solventado sin pago.",
        submitLabel: "Guardar liberacion",
      };
    case "salida":
      return {
        title: "Registrar salida",
        description: "Registra la entrega fisica del vehiculo.",
        submitLabel: "Guardar salida",
      };
    default:
      return {
        title: "Operacion",
        description: "Actualiza el expediente operativo.",
        submitLabel: "Guardar",
      };
  }
}

function getInfractorLabel(item: InfraccionListItem): string {
  return formatFullName([
    item.infractor.nombre,
    item.infractor.apellidoPaterno,
    item.infractor.apellidoMaterno,
  ]);
}

function getVehicleLabel(item: InfraccionListItem): string {
  return [item.vehiculo.marca, item.vehiculo.linea, item.vehiculo.clase]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" - ");
}

function OperationSummary({ item }: { item: InfraccionListItem }) {
  return (
    <section className="operation-modal-summary">
      <div>
        <p className="section-label">Expediente</p>
        <h3>{item.folioInfraccion}</h3>
        <strong>{getInfractorLabel(item)}</strong>
      </div>

      <div className="operation-modal-facts">
        <span>{formatDate(item.fechaInfraccion)}</span>
        <span>{formatTimeOfDay(item.horaInfraccion)}</span>
        <span>Placas: {formatEmptyValue(item.vehiculo.placas)}</span>
        <span>{getVehicleLabel(item)}</span>
        <span>Color: {formatEmptyValue(item.vehiculo.color)}</span>
        <span>Año modelo: {formatEmptyValue(item.vehiculo.anioModelo == null ? null : String(item.vehiculo.anioModelo))}</span>
      </div>

      <StatusBadge value={item.estadoOperativoCalculado} />
    </section>
  );
}

function FormActions({
  alternateLabel,
  disabled,
  onAlternate,
  onClose,
  saving,
  submitLabel,
}: {
  alternateLabel?: string;
  disabled: boolean;
  onAlternate?: () => void;
  onClose: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="operation-modal-actions">
      <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
        Cancelar
      </Button>
      {alternateLabel && onAlternate ? (
        <Button
          type="button"
          variant="secondary"
          onClick={onAlternate}
          disabled={saving}
        >
          {alternateLabel}
        </Button>
      ) : null}
      <Button type="submit" variant="primary" disabled={disabled || saving}>
        {saving ? "Guardando..." : submitLabel}
      </Button>
    </div>
  );
}

function RequiredNote({ children }: { children: ReactNode }) {
  return <p className="operation-modal-note">{children}</p>;
}

function isSolventadaSinPago(item: InfraccionListItem | null): boolean {
  return item?.estatusInfraccion.nombreEstatus === "SOLVENTADA_SIN_PAGO";
}

export function InfraccionOperacionModal({
  catalogs,
  item,
  onClose,
  onCompleted,
  open,
  token,
  type,
  roleName,
}: InfraccionOperacionModalProps) {
  const copy = useMemo(() => getOperationCopy(type), [type]);
  const [form, setForm] = useState<OperationFormState>(() =>
    createInitialForm(type, item),
  );
  const [pagoConceptos, setPagoConceptos] = useState<PagoConceptoFormRow[]>([
    createEmptyPagoConceptoRow(),
  ]);
  const [noAplicaPago, setNoAplicaPago] = useState(false);
  const [motivoNoAplica, setMotivoNoAplica] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montoTotalPago = useMemo(
    () =>
      toMoney(
        String(
          pagoConceptos.reduce((total, concepto) => {
            const monto = Number(concepto.monto || "0");
            return total + (Number.isFinite(monto) ? monto : 0);
          }, 0),
        ),
      ),
    [pagoConceptos],
  );
  const permiteRetencion = item?.tipoProcedimiento.permiteRetencion ?? true;
  const isSalidaAnticipada =
    type === "salida" &&
    Boolean(item?.retencion?.idRetencionVehiculo) &&
    !item?.liberacion?.tieneLiberacion;
  const cotejo = isSalidaAnticipada && item
    ? analizarCotejo(item, form)
    : null;
  const diferenciaMenor = cotejo &&
    cotejo.diferencias.length === 1 &&
    cotejo.problemas.length === 0
      ? cotejo.diferencias[0]
      : null;

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(createInitialForm(type, item));
      setPagoConceptos([createEmptyPagoConceptoRow()]);
      setNoAplicaPago(false);
      setMotivoNoAplica("");
      setSaving(false);
      setError(null);
    }
  }, [open, type, item]);

  function updateField(field: keyof OperationFormState, value: string): void {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function updateReporteDiferencia(checked: boolean): void {
    setForm((current) => ({ ...current, reportarDiferencia: checked }));
    setError(null);
  }

  function updateAutorizacionDocumental(checked: boolean): void {
    setForm((current) => ({ ...current, autorizacionDocumentalVerificada: checked }));
    setError(null);
  }

  function updatePagoConceptos(rows: PagoConceptoFormRow[]): void {
    setPagoConceptos(rows);
    setError(null);
  }

  function toggleNoAplicaPago(): void {
    setNoAplicaPago((current) => !current);
    setMotivoNoAplica("");
    setError(null);
  }

  function getValidationError(): string | null {
    if (!item || !type) {
      return "No hay expediente seleccionado.";
    }

    if (!canPerformOperationForRole(roleName, type)) {
      return "El rol ENCIERRO solo puede registrar salidas vehiculares.";
    }

    if (isSalidaAnticipada && roleName?.toUpperCase() !== "ENCIERRO") {
      return "Solo el rol ENCIERRO puede registrar salidas anticipadas.";
    }

    if (type === "retencion") {
      if (!permiteRetencion) {
        return "El tipo de expediente seleccionado no permite ingreso a encierro.";
      }

      if (!catalogs) {
        return "Los catalogos aun no estan disponibles.";
      }

      if (!form.idEncierro) {
        return "Selecciona el encierro.";
      }

      if (!form.recibidoPor.trim()) {
        return "Captura quien recibe el vehiculo.";
      }
    }

    if (type === "pago") {
      if (noAplicaPago) {
        if (motivoNoAplica.trim().length < 3) {
          return "Escribe el motivo por el que no aplica pago.";
        }

        return null;
      }

      if (!form.folioPago.trim()) {
        return "Captura el folio de la linea de captura.";
      }

      if (pagoConceptos.length === 0) {
        return "Agrega al menos una clave de concepto.";
      }

      const claves = new Set<string>();

      for (const concepto of pagoConceptos) {
        const clave = concepto.claveConcepto.trim().toUpperCase();
        const monto = Number(concepto.monto);

        if (!clave) {
          return "Captura la clave de todos los conceptos.";
        }

        if (!Number.isFinite(monto) || monto <= 0) {
          return `Captura un monto mayor a cero para la clave ${clave}.`;
        }

        if (claves.has(clave)) {
          return `La clave ${clave} esta repetida en la linea de captura.`;
        }

        claves.add(clave);
      }

      if (Number(montoTotalPago) <= 0) {
        return "El total de la linea de captura debe ser mayor a cero.";
      }
    }

    if (type === "liberacion") {
      if (!form.folioLiberacion.trim()) {
        return "Captura el folio de liberacion.";
      }

      if (!form.liberadoPor.trim()) {
        return "Captura el responsable que libera.";
      }
    }

    if (type === "salida") {
      if (!item.retencion?.idRetencionVehiculo || item.salida?.tieneSalida) {
        return "No existe una retencion disponible para registrar salida.";
      }
      if (!form.validadoPor.trim() || !form.personaRecibeVehiculo.trim()) {
        return "Captura quien valida y quien recibe el vehiculo.";
      }
      if (isSalidaAnticipada) {
        if (!form.folioLiberacionPresentado.trim() ||
            !form.referenciaDocumentoLiberacion.trim() ||
            !form.nombrePropietarioDeclarado.trim()) {
          return "Captura folio, referencia documental y propietario.";
        }
        if (!form.placasCotejadas.trim()) {
          return "Escribe las placas verificadas fisicamente.";
        }
        if (form.anioModeloCotejado.trim() &&
            (!/^[0-9]{4}$/u.test(form.anioModeloCotejado.trim()) ||
              Number(form.anioModeloCotejado) < 1900 ||
              Number(form.anioModeloCotejado) > 2100)) {
          return "Captura un año modelo valido.";
        }
        if (cotejo?.problemas.length) {
          return cotejo.problemas[0];
        }
        if (!cotejo || cotejo.coincidencias < 2) {
          return "Las placas y al menos dos datos generales deben coincidir con el expediente.";
        }
        if (diferenciaMenor) {
          if (!form.reportarDiferencia) {
            return "Confirma que reportaras la diferencia menor a Infracciones.";
          }
          if (!form.motivoDiferencia.trim() || !form.evidenciaDiferencia.trim()) {
            return "Describe la diferencia y la referencia de evidencia.";
          }
        }
        if (!form.autorizacionDocumentalVerificada) {
          return "Confirma que verificaste la autorizacion documental.";
        }
      } else {
        if (!item.liberacion?.idLiberacionVehiculo ||
            !item.liberacion.folioLiberacion?.trim()) {
          return "No se encontro la liberacion electronica vigente.";
        }
        if (!form.estadoSalida.trim()) {
          return "Captura el estado de salida.";
        }
      }
    }

    return null;
  }

  async function submitPago(currentItem: InfraccionListItem): Promise<boolean> {
    if (noAplicaPago) {
      const motivo = motivoNoAplica.trim();
      const confirmed = await confirmAction({
        title: "Solventar sin pago",
        text: `La infraccion ${currentItem.folioInfraccion} quedara solventada sin linea de captura ni ingreso registrado. Motivo: ${motivo}`,
        confirmButtonText: "Confirmar no aplica pago",
        cancelButtonText: "Seguir editando",
      });

      if (!confirmed) {
        return false;
      }

      setSaving(true);
      setError(null);

      const payload: RegistrarNoAplicaPagoPayload = {
        idInfraccion: currentItem.idInfraccion,
        motivo,
      };
      await createNoAplicaPago(token, payload);
      return true;
    }

    const confirmed = await confirmAction({
      title: "Registrar pago",
      text: `Vas a registrar la linea de captura ${form.folioPago.trim()} del expediente ${currentItem.folioInfraccion} por ${montoTotalPago}.`,
      confirmButtonText: "Registrar pago",
      cancelButtonText: "Seguir editando",
    });

    if (!confirmed) {
      return false;
    }

    setSaving(true);
    setError(null);

    const payload: RegistrarPagoPayload = {
      idInfraccion: currentItem.idInfraccion,
      folioLineaCaptura: form.folioPago.trim(),
      conceptos: pagoConceptos.map((concepto) => ({
        claveConcepto: concepto.claveConcepto.trim().toUpperCase(),
        monto: toMoney(concepto.monto),
      })),
      fechaPago: toIsoDateTime(form.fechaPago),
      observaciones: toNullableString(form.observacionesPago),
    };
    await createPago(token, payload);
    return true;
  }

  async function submitLiberacion(
    currentItem: InfraccionListItem,
  ): Promise<boolean> {
    const idPagoInfraccion = currentItem.pago?.idPagoInfraccion ?? null;
    const usingNoAplica = !idPagoInfraccion && isSolventadaSinPago(currentItem);
    const respaldo = idPagoInfraccion
      ? `el pago ${idPagoInfraccion}`
      : usingNoAplica
        ? "la solventacion No aplica pago"
        : "el respaldo operativo disponible";

    const confirmed = await confirmAction({
      title: "Generar liberación",
      text: `Vas a generar la liberación del expediente ${currentItem.folioInfraccion} usando ${respaldo}.`,
      confirmButtonText: "Generar liberación",
      cancelButtonText: "Seguir editando",
    });

    if (!confirmed) {
      return false;
    }

    setSaving(true);
    setError(null);

    const payload: GenerarLiberacionPayload = {
      idInfraccion: currentItem.idInfraccion,
      ...(idPagoInfraccion ? { idPagoInfraccion } : {}),
      folioLiberacion: form.folioLiberacion.trim(),
      liberadoPor: form.liberadoPor.trim(),
      nombreRecibeLiberacion: null,
      fechaLiberacion: toIsoDateTime(form.fechaLiberacion),
      observacion: toNullableString(form.observacionLiberacion),
    };
    await createLiberacion(token, payload);
    return true;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const validationError = getValidationError();
    if (validationError || !item || !type) {
      setError(validationError ?? "No hay expediente seleccionado.");
      return;
    }

    try {
      let completed = false;

      if (type === "retencion") {
        const confirmed = await confirmAction({
          title: "Registrar retención",
          text: `Vas a registrar la retención del expediente ${item.folioInfraccion}.`,
          confirmButtonText: "Registrar retención",
          cancelButtonText: "Seguir editando",
        });

        if (!confirmed) {
          return;
        }

        setSaving(true);
        setError(null);

        const payload: RegistrarRetencionPayload = {
          idInfraccion: item.idInfraccion,
          idEncierro: Number(form.idEncierro),
          fechaIngreso: toIsoDateTime(form.fechaIngreso),
          recibidoPor: form.recibidoPor.trim(),
          folioResguardo: toNullableString(form.folioResguardo),
          estadoIngreso: toNullableString(form.estadoIngreso),
          observacionesIngreso: toNullableString(form.observacionesIngreso),
        };
        await createRetencion(token, payload);
        completed = true;
      }

      if (type === "pago") {
        completed = await submitPago(item);
      }

      if (type === "liberacion") {
        completed = await submitLiberacion(item);
      }

      if (type === "salida" && isSalidaAnticipada && item.retencion?.idRetencionVehiculo) {
        const confirmed = await confirmAction({
          title: "Registrar salida anticipada",
          text: `Vas a entregar el vehículo del expediente ${item.folioInfraccion} sin liberación electrónica. Folio presentado: ${form.folioLiberacionPresentado.trim()}.${diferenciaMenor ? " Se creará una observación pendiente para Infracciones." : ""}`,
          confirmButtonText: "Registrar salida anticipada",
          cancelButtonText: "Seguir editando",
        });
        if (!confirmed) {
          return;
        }
        setSaving(true);
        setError(null);
        const datos = form;
        const payload: RegistrarSalidaAnticipadaPayload = {
          idRetencionVehiculo: item.retencion.idRetencionVehiculo,
          folioLiberacionPresentado: datos.folioLiberacionPresentado.trim(),
          placasCotejadas: datos.placasCotejadas.trim(),
          datosVehiculoCotejados: {
            ...(datos.marcaCotejada.trim() && { marca: datos.marcaCotejada.trim() }),
            ...(datos.lineaCotejada.trim() && { linea: datos.lineaCotejada.trim() }),
            ...(datos.claseCotejada.trim() && { clase: datos.claseCotejada.trim() }),
            ...(datos.colorCotejado.trim() && { color: datos.colorCotejado.trim() }),
            ...(datos.anioModeloCotejado.trim() && { anioModelo: Number(datos.anioModeloCotejado.trim()) }),
            ...(datos.estadoPlacasCotejado.trim() && { estadoPlacas: datos.estadoPlacasCotejado.trim() }),
            ...(datos.serieCotejada.trim() && { serie: datos.serieCotejada.trim() }),
            ...(datos.motorCotejado.trim() && { motor: datos.motorCotejado.trim() }),
          },
          autorizacionDocumentalVerificada: true,
          referenciaDocumentoLiberacion: datos.referenciaDocumentoLiberacion.trim(),
          nombrePropietarioDeclarado: datos.nombrePropietarioDeclarado.trim(),
          validadoPor: datos.validadoPor.trim(),
          personaRecibeVehiculo: datos.personaRecibeVehiculo.trim(),
          observacionesSalida: toNullableString(datos.observacionesSalida),
          ...(diferenciaMenor && {
            discrepanciaMenor: {
              motivo: datos.motivoDiferencia.trim(),
              referenciaEvidencia: datos.evidenciaDiferencia.trim(),
            },
          }),
        };
        await createSalidaAnticipada(token, payload);
        completed = true;
      }

      if (
        type === "salida" &&
        !isSalidaAnticipada &&
        item.retencion?.idRetencionVehiculo &&
        item.liberacion?.idLiberacionVehiculo
      ) {
        const confirmed = await confirmAction({
          title: "Registrar salida",
          text: `Vas a registrar la salida del vehículo correspondiente al expediente de infracción ${item.folioInfraccion}, con folio de liberación ${item.liberacion.folioLiberacion}.`,
          confirmButtonText: "Registrar salida",
          cancelButtonText: "Seguir editando",
        });

        if (!confirmed) {
          return;
        }

        setSaving(true);
        setError(null);

        const payload: RegistrarSalidaPayload = {
          idRetencionVehiculo: item.retencion.idRetencionVehiculo,
          idLiberacionVehiculo: item.liberacion.idLiberacionVehiculo,
          validadoPor: form.validadoPor.trim(),
          personaRecibeVehiculo: form.personaRecibeVehiculo.trim(),
          fechaSalida: toIsoDateTime(form.fechaSalida),
          estadoSalida: form.estadoSalida.trim(),
          observacionesSalida: toNullableString(form.observacionesSalida),
        };
        await createSalida(token, payload);
        completed = true;
      }

      if (completed) {
        onCompleted();
      }
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    } finally {
      setSaving(false);
    }
  }

  const operationRestricted = Boolean(
    type && !canPerformOperationForRole(roleName, type),
  );
  const canSubmit = getValidationError() === null;
  const submitLabel =
    type === "pago" && noAplicaPago
      ? "Solventar sin pago"
      : isSalidaAnticipada
        ? "Registrar salida anticipada"
        : copy.submitLabel;
  const alternateLabel =
    type === "pago"
      ? noAplicaPago
        ? "Volver a registrar pago"
        : "No aplica pago"
      : undefined;

  if (isSalidaAnticipada && roleName?.toUpperCase() !== "ENCIERRO") {
    return null;
  }

  return (
    <Modal
      open={open}
      title={copy.title}
      description={copy.description}
      onClose={onClose}
    >
      {item ? <OperationSummary item={item} /> : null}
      {operationRestricted ? (
        <p className="notice notice-error" role="alert">
          El rol ENCIERRO solo puede registrar salidas vehiculares.
        </p>
      ) : null}

      <form className="operation-modal-form" onSubmit={handleSubmit}>
        {type === "retencion" ? (
          <div className="form-grid form-grid-2">
            <Field htmlFor="operacion-retencion-encierro" label="Encierro">
              <SelectField
                id="operacion-retencion-encierro"
                value={form.idEncierro}
                onChange={(event) =>
                  updateField("idEncierro", event.target.value)
                }
                required
              >
                <option value="">Selecciona</option>
                {(catalogs?.encierros ?? []).map((encierro) => (
                  <option key={encierro.idEncierro} value={encierro.idEncierro}>
                    {encierro.nombreEncierro}
                  </option>
                ))}
              </SelectField>
            </Field>

            <Field htmlFor="operacion-retencion-fecha" label="Fecha ingreso">
              <TextInput
                id="operacion-retencion-fecha"
                type="datetime-local"
                value={form.fechaIngreso}
                onChange={(event) =>
                  updateField("fechaIngreso", event.target.value)
                }
              />
            </Field>

            <Field htmlFor="operacion-retencion-recibido" label="Recibido por">
              <TextInput
                id="operacion-retencion-recibido"
                value={form.recibidoPor}
                onChange={(event) =>
                  updateField("recibidoPor", event.target.value)
                }
                required
              />
            </Field>

            <Field htmlFor="operacion-retencion-folio" label="Folio resguardo">
              <TextInput
                id="operacion-retencion-folio"
                value={form.folioResguardo}
                onChange={(event) =>
                  updateField("folioResguardo", event.target.value)
                }
              />
            </Field>

            <Field htmlFor="operacion-retencion-estado" label="Estado ingreso">
              <TextInput
                id="operacion-retencion-estado"
                value={form.estadoIngreso}
                onChange={(event) =>
                  updateField("estadoIngreso", event.target.value)
                }
              />
            </Field>

            <div className="field field-span-2">
              <label htmlFor="operacion-retencion-observaciones">
                Observaciones
              </label>
              <textarea
                id="operacion-retencion-observaciones"
                rows={3}
                value={form.observacionesIngreso}
                onChange={(event) =>
                  updateField("observacionesIngreso", event.target.value)
                }
              />
            </div>
          </div>
        ) : null}

        {type === "pago" ? (
          noAplicaPago ? (
            <div className="form-stack">
              <div className="notice">
                Esta opcion solventa la infraccion sin registrar pago ni ingreso.
                El motivo quedara asociado al usuario autenticado y al historial
                del expediente.
              </div>
              <div className="field field-span-2">
                <label htmlFor="operacion-pago-no-aplica-motivo">Motivo *</label>
                <textarea
                  id="operacion-pago-no-aplica-motivo"
                  rows={5}
                  maxLength={1000}
                  value={motivoNoAplica}
                  onChange={(event) => {
                    setMotivoNoAplica(event.target.value);
                    setError(null);
                  }}
                  placeholder="Describe por que la infraccion no genero linea de captura ni pago."
                  required
                />
              </div>
            </div>
          ) : (
            <div className="form-grid form-grid-2">
              <Field
                htmlFor="operacion-pago-folio"
                label="Folio linea de captura"
              >
                <TextInput
                  id="operacion-pago-folio"
                  value={form.folioPago}
                  onChange={(event) =>
                    updateField("folioPago", event.target.value)
                  }
                  required
                />
              </Field>

              <Field htmlFor="operacion-pago-fecha" label="Fecha pago">
                <TextInput
                  id="operacion-pago-fecha"
                  type="datetime-local"
                  value={form.fechaPago}
                  onChange={(event) =>
                    updateField("fechaPago", event.target.value)
                  }
                />
              </Field>

              <div className="field-span-2">
                <PagoConceptosEditor
                  rows={pagoConceptos}
                  token={token}
                  onChange={updatePagoConceptos}
                />
              </div>

              <Field htmlFor="operacion-pago-total" label="Total calculado">
                <TextInput
                  id="operacion-pago-total"
                  value={montoTotalPago}
                  readOnly
                />
              </Field>

              <div className="field field-span-2">
                <label htmlFor="operacion-pago-observaciones">
                  Observaciones
                </label>
                <textarea
                  id="operacion-pago-observaciones"
                  rows={3}
                  value={form.observacionesPago}
                  onChange={(event) =>
                    updateField("observacionesPago", event.target.value)
                  }
                />
              </div>
            </div>
          )
        ) : null}

        {type === "liberacion" ? (
          <div className="form-grid form-grid-2">
            <RequiredNote>
              {item?.pago?.idPagoInfraccion
                ? "Se usara automaticamente el pago registrado del expediente. No se muestra el ID tecnico."
                : "Si el expediente fue solventado con No aplica pago, la liberacion usara automaticamente esa solventacion como respaldo."}
            </RequiredNote>

            <Field
              htmlFor="operacion-liberacion-folio"
              label="Folio liberacion"
            >
              <TextInput
                id="operacion-liberacion-folio"
                value={form.folioLiberacion}
                onChange={(event) =>
                  updateField("folioLiberacion", event.target.value)
                }
                required
              />
            </Field>

            <Field
              htmlFor="operacion-liberacion-por"
              label="Responsable que libera"
            >
              <TextInput
                id="operacion-liberacion-por"
                value={form.liberadoPor}
                onChange={(event) =>
                  updateField("liberadoPor", event.target.value)
                }
                required
              />
            </Field>

            <Field
              htmlFor="operacion-liberacion-fecha"
              label="Fecha liberacion"
            >
              <TextInput
                id="operacion-liberacion-fecha"
                type="datetime-local"
                value={form.fechaLiberacion}
                onChange={(event) =>
                  updateField("fechaLiberacion", event.target.value)
                }
              />
            </Field>

            <div className="field field-span-2">
              <label htmlFor="operacion-liberacion-observacion">
                Observaciones
              </label>
              <textarea
                id="operacion-liberacion-observacion"
                rows={3}
                value={form.observacionLiberacion}
                onChange={(event) =>
                  updateField("observacionLiberacion", event.target.value)
                }
              />
            </div>
          </div>
        ) : null}

        {type === "salida" ? (
          <div className="form-grid form-grid-2">
            <RequiredNote>
              {isSalidaAnticipada
                ? "Los datos del vehículo están precargados desde el expediente. Verifícalos físicamente antes de confirmar. Si difiere el color o año modelo, modifica ese campo y registra una observación para Infracciones con evidencia. Las demás diferencias bloquean la salida."
                : "Se usaran automaticamente la retencion y la liberacion vigentes del expediente."}
            </RequiredNote>

            {isSalidaAnticipada ? (
              <>
                <Field htmlFor="operacion-ant-folioLiberacionPresentado" label="Folio de liberacion presentado">
                  <TextInput
                    id="operacion-ant-folioLiberacionPresentado"
                    value={form.folioLiberacionPresentado}
                    
                    onChange={(event) => updateField("folioLiberacionPresentado", event.target.value)}
                  />
                </Field>
                <Field htmlFor="operacion-ant-placasCotejadas" label="Placas verificadas fisicamente">
                  <TextInput
                    id="operacion-ant-placasCotejadas"
                    value={form.placasCotejadas}
                    onChange={(event) => updateField("placasCotejadas", event.target.value)}
                  />
                </Field>
                <Field htmlFor="operacion-ant-marcaCotejada" label="Marca cotejada">
                  <TextInput
                    id="operacion-ant-marcaCotejada"
                    value={form.marcaCotejada}
                    onChange={(event) => updateField("marcaCotejada", event.target.value)}
                  />
                </Field>
                <Field htmlFor="operacion-ant-lineaCotejada" label="Linea cotejada">
                  <TextInput
                    id="operacion-ant-lineaCotejada"
                    value={form.lineaCotejada}
                    onChange={(event) => updateField("lineaCotejada", event.target.value)}
                  />
                </Field>
                <Field htmlFor="operacion-ant-claseCotejada" label="Clase cotejada">
                  <TextInput
                    id="operacion-ant-claseCotejada"
                    value={form.claseCotejada}
                    onChange={(event) => updateField("claseCotejada", event.target.value)}
                  />
                </Field>
                <Field htmlFor="operacion-ant-colorCotejado" label="Color cotejado">
                  <TextInput
                    id="operacion-ant-colorCotejado"
                    value={form.colorCotejado}
                    onChange={(event) => updateField("colorCotejado", event.target.value)}
                  />
                </Field>
                <Field htmlFor="operacion-ant-anioModeloCotejado" label="Año modelo cotejado (opcional)">
                  <TextInput
                    id="operacion-ant-anioModeloCotejado"
                    value={form.anioModeloCotejado}
                    
                    onChange={(event) => updateField("anioModeloCotejado", event.target.value)}
                  />
                </Field>
                <Field htmlFor="operacion-ant-estadoPlacasCotejado" label="Estado de placas (opcional)">
                  <TextInput
                    id="operacion-ant-estadoPlacasCotejado"
                    value={form.estadoPlacasCotejado}
                    onChange={(event) => updateField("estadoPlacasCotejado", event.target.value)}
                  />
                </Field>
                <Field htmlFor="operacion-ant-serieCotejada" label="Numero de serie (opcional)">
                  <TextInput
                    id="operacion-ant-serieCotejada"
                    value={form.serieCotejada}
                    onChange={(event) => updateField("serieCotejada", event.target.value)}
                  />
                </Field>
                <Field htmlFor="operacion-ant-motorCotejado" label="Numero de motor (opcional)">
                  <TextInput
                    id="operacion-ant-motorCotejado"
                    value={form.motorCotejado}
                    onChange={(event) => updateField("motorCotejado", event.target.value)}
                  />
                </Field>
                <Field htmlFor="operacion-ant-referenciaDocumentoLiberacion" label="Referencia del documento de liberacion">
                  <TextInput
                    id="operacion-ant-referenciaDocumentoLiberacion"
                    value={form.referenciaDocumentoLiberacion}
                    
                    onChange={(event) => updateField("referenciaDocumentoLiberacion", event.target.value)}
                  />
                </Field>
                <Field htmlFor="operacion-ant-nombrePropietarioDeclarado" label="Propietario declarado">
                  <TextInput
                    id="operacion-ant-nombrePropietarioDeclarado"
                    value={form.nombrePropietarioDeclarado}
                    
                    onChange={(event) => updateField("nombrePropietarioDeclarado", event.target.value)}
                  />
                </Field>
                {cotejo && cotejo.problemas.length > 0 ? (
                  <div className="notice notice-error field-span-2" role="alert">
                    <strong>Salida bloqueada por diferencias de identidad.</strong>
                    <ul>
                      {cotejo.problemas.map((problema) => (
                        <li key={problema}>{problema}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {diferenciaMenor ? (
                  <section
                    className="field field-span-2"
                    aria-label="Detalle de discrepancia menor"
                  >
                    <div className="notice">
                      <strong>Diferencia menor detectada: {diferenciaMenor.etiqueta}</strong>
                      <p>Registrado: {diferenciaMenor.registrado}</p>
                      <p>Cotejado por Encierros: {diferenciaMenor.reportado}</p>
                      <p>La salida requiere reporte con evidencia; el expediente no se modifica.</p>
                    </div>
                    <label htmlFor="operacion-ant-reportar-diferencia">
                      <input
                        id="operacion-ant-reportar-diferencia"
                        type="checkbox"
                        checked={form.reportarDiferencia}
                        onChange={(event) => updateReporteDiferencia(event.target.checked)}
                      />
                      {" "}Reportar diferencia a Infracciones
                    </label>
                    {form.reportarDiferencia ? (
                      <>
                        <label htmlFor="operacion-ant-motivo-diferencia">Motivo de la diferencia</label>
                        <textarea
                          id="operacion-ant-motivo-diferencia"
                          rows={3}
                          maxLength={1000}
                          value={form.motivoDiferencia}
                          onChange={(event) => updateField("motivoDiferencia", event.target.value)}
                          required
                        />
                        <label htmlFor="operacion-ant-evidencia-diferencia">Referencia de evidencia</label>
                        <TextInput
                          id="operacion-ant-evidencia-diferencia"
                          maxLength={255}
                          placeholder="Documento o constancia consultada"
                          value={form.evidenciaDiferencia}
                          onChange={(event) => updateField("evidenciaDiferencia", event.target.value)}
                          required
                        />
                      </>
                    ) : null}
                  </section>
                ) : null}
                <div className="field field-span-2">
                  <label htmlFor="operacion-ant-autorizacion">
                    <input
                      type="checkbox"
                      id="operacion-ant-autorizacion"
                      checked={form.autorizacionDocumentalVerificada}
                      onChange={(event) => updateAutorizacionDocumental(event.target.checked)}
                    />
                    {" "}Confirmo que verifiqué físicamente el vehículo contra los datos del expediente y revisé el documento de liberación presentado.
                  </label>
                </div>
              </>
            ) : null}

            <Field htmlFor="operacion-salida-validado" label="Validado por">
              <TextInput
                id="operacion-salida-validado"
                value={form.validadoPor}
                onChange={(event) =>
                  updateField("validadoPor", event.target.value)
                }
                required
              />
            </Field>

            <Field
              htmlFor="operacion-salida-recibe"
              label="Persona recibe vehiculo"
            >
              <TextInput
                id="operacion-salida-recibe"
                value={form.personaRecibeVehiculo}
                onChange={(event) =>
                  updateField("personaRecibeVehiculo", event.target.value)
                }
                required
              />
            </Field>

            {!isSalidaAnticipada ? (
              <>
                <Field htmlFor="operacion-salida-fecha" label="Fecha salida">
                  <TextInput
                    id="operacion-salida-fecha"
                    type="datetime-local"
                    value={form.fechaSalida}
                    onChange={(event) =>
                      updateField("fechaSalida", event.target.value)
                    }
                  />
                </Field>
    
                <Field htmlFor="operacion-salida-estado" label="Estado salida">
                  <TextInput
                    id="operacion-salida-estado"
                    value={form.estadoSalida}
                    onChange={(event) =>
                      updateField("estadoSalida", event.target.value)
                    }
                    required
                  />
                </Field>
              </>
            ) : null}

            <div className="field field-span-2">
              <label htmlFor="operacion-salida-observaciones">
                Observaciones
              </label>
              <textarea
                id="operacion-salida-observaciones"
                rows={3}
                value={form.observacionesSalida}
                onChange={(event) =>
                  updateField("observacionesSalida", event.target.value)
                }
              />
            </div>
          </div>
        ) : null}

        {error ? <div className="notice notice-error">{error}</div> : null}

        <FormActions
          alternateLabel={alternateLabel}
          disabled={!canSubmit}
          onAlternate={type === "pago" ? toggleNoAplicaPago : undefined}
          onClose={onClose}
          saving={saving}
          submitLabel={submitLabel}
        />
      </form>
    </Modal>
  );
}
