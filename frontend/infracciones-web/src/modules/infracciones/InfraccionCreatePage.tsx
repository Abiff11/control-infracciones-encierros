import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import { OperationResultCard } from "../../components/operation/OperationResultCard";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field, TextInput } from "../../components/ui/Field";
import { SelectField } from "../../components/ui/SelectField";
import { confirmAction } from "../../utils/sweetAlert";
import type { CatalogosBundle, Motivo } from "../../types/catalogos.types";
import type {
  CreateInfraccionCompletaPayload,
  InfraccionFlujoResponse,
} from "../../types/infracciones.types";
import "./InfraccionCreatePage.css";

const MAX_MOTIVOS = 5;
const DEFAULT_TIPO_PROCEDIMIENTO_CLAVE = "INFRACCION";
const DEFAULT_ESTATUS_INFRACCION = "CAPTURADA";

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function normalizeCatalogText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function toOptionalNumber(value: string): number | null | undefined {
  if (value.trim() === "") {
    return undefined;
  }

  return Number(value);
}

function toNullableString(value: string): string | null | undefined {
  if (value.trim() === "") {
    return undefined;
  }

  return value.trim();
}

function isFilled(value: string): boolean {
  return value.trim() !== "";
}

function normalizeFolioPart(value: string): string {
  return value.trim().replace(/\s+/g, "-").toUpperCase();
}

interface InfraccionCreatePageProps {
  catalogs: CatalogosBundle | null;
  loading: boolean;
  onCreated: () => void;
  onSubmit: (
    payload: CreateInfraccionCompletaPayload,
  ) => Promise<InfraccionFlujoResponse>;
}

const INITIAL_FORM = {
  idTipoProcedimiento: "",
  idSexo: "",
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  licencia: "",
  curp: "",
  idClaseVehiculo: "",
  idLineaVehiculo: "",
  idServicio: "",
  anioModelo: "",
  sitioServicioPublico: "",
  color: "",
  placas: "",
  estadoPlacas: "",
  serie: "",
  motor: "",
  municipio: "",
  colonia: "",
  calle: "",
  numero: "",
  idDelegacion: "",
  idOperativo: "",
  folioInfraccion: "",
  fechaInfraccion: getTodayDate(),
  horaInfraccion: getCurrentTime(),
  observaciones: "",
  clavePolicia: "",
  numParteInformativo: "",
};

type FormState = typeof INITIAL_FORM;

function getEmptyMotivoSlots(): string[] {
  return Array.from({ length: MAX_MOTIVOS }, () => "");
}

function getMotivoLabel(motivo: Motivo): string {
  const clave = motivo.nombreMotivo.trim();
  const descripcion = motivo.descripcionMotivo.trim();

  if (!descripcion || descripcion === clave) {
    return clave;
  }

  return `${clave} - ${descripcion}`;
}

function getSectionStatus(total: number, completed: number): string {
  return `${completed}/${total}`;
}

function FieldValue({ children }: { children: ReactNode }) {
  return <span className="create-field-value">{children}</span>;
}

function SectionCard({
  children,
  completed,
  eyebrow,
  title,
  total,
}: {
  children: ReactNode;
  completed: number;
  eyebrow: string;
  title: string;
  total: number;
}) {
  return (
    <Card className="create-form-card">
      <div className="create-section-header">
        <div>
          <p className="section-label">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="create-section-counter">
          {getSectionStatus(total, completed)}
        </span>
      </div>
      {children}
    </Card>
  );
}

function SystemChip({
  label,
  value,
  valid,
}: {
  label: string;
  value: string;
  valid: boolean;
}) {
  return (
    <span
      className={
        valid
          ? "create-system-chip"
          : "create-system-chip create-system-chip-error"
      }
    >
      <strong>{label}</strong>
      {value}
    </span>
  );
}

function countFilled(values: string[]): number {
  return values.filter(isFilled).length;
}

function getUniqueSelectedMotivos(slots: string[]): number[] {
  return Array.from(
    new Set(
      slots
        .filter(isFilled)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  );
}

function InfraccionCreatePage({
  catalogs,
  loading,
  onCreated,
  onSubmit,
}: InfraccionCreatePageProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [motivoSlots, setMotivoSlots] = useState<string[]>(getEmptyMotivoSlots);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InfraccionFlujoResponse | null>(null);

  const tiposExpediente = useMemo(
    () =>
      [...(catalogs?.tiposProcedimiento ?? [])]
        .filter((tipo) => tipo.activo && tipo.esTipoExpediente)
        .sort((first, second) =>
          first.nombreTipoProcedimiento.localeCompare(
            second.nombreTipoProcedimiento,
          ),
        ),
    [catalogs?.tiposProcedimiento],
  );

  const defaultTipoProcedimiento = useMemo(
    () =>
      tiposExpediente.find(
        (tipo) =>
          normalizeCatalogText(tipo.claveTipoProcedimiento) ===
          DEFAULT_TIPO_PROCEDIMIENTO_CLAVE,
      ) ??
      tiposExpediente[0] ??
      null,
    [tiposExpediente],
  );

  const selectedTipoProcedimiento = useMemo(
    () =>
      tiposExpediente.find(
        (tipo) => String(tipo.idTipoProcedimiento) === form.idTipoProcedimiento,
      ) ??
      defaultTipoProcedimiento,
    [defaultTipoProcedimiento, form.idTipoProcedimiento, tiposExpediente],
  );

  const defaultEstatusInfraccion = useMemo(
    () =>
      catalogs?.estatusInfraccion.find(
        (estatus) =>
          normalizeCatalogText(estatus.nombreEstatus) ===
          DEFAULT_ESTATUS_INFRACCION,
      ) ?? null,
    [catalogs?.estatusInfraccion],
  );

  const sortedMotivos = useMemo(
    () =>
      [...(catalogs?.motivos ?? [])].sort((a, b) =>
        getMotivoLabel(a).localeCompare(getMotivoLabel(b)),
      ),
    [catalogs?.motivos],
  );

  const selectedMotivos = useMemo(
    () => getUniqueSelectedMotivos(motivoSlots),
    [motivoSlots],
  );
  const selectedMotivoSet = useMemo(
    () => new Set(selectedMotivos),
    [selectedMotivos],
  );
  const selectedMotivoLabels = useMemo(
    () =>
      selectedMotivos
        .map((idMotivo) =>
          sortedMotivos.find((motivo) => motivo.idMotivo === idMotivo),
        )
        .filter((motivo): motivo is Motivo => Boolean(motivo))
        .map(getMotivoLabel),
    [selectedMotivos, sortedMotivos],
  );

  const requiereFolioInfraccion =
    selectedTipoProcedimiento?.requiereFolioInfraccion ?? false;
  const requiereNumParteInformativo =
    selectedTipoProcedimiento?.requiereNumParteInformativo ?? false;
  const requiereMotivos = selectedTipoProcedimiento?.requiereMotivos ?? false;
  const permiteRetencion = selectedTipoProcedimiento?.permiteRetencion ?? false;
  const folioExpediente =
    !requiereFolioInfraccion && requiereNumParteInformativo
      ? `PI-${normalizeFolioPart(form.numParteInformativo)}`
      : form.folioInfraccion.trim();

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function updateTipoProcedimiento(value: string): void {
    const nextTipo =
      tiposExpediente.find(
        (tipo) => String(tipo.idTipoProcedimiento) === value,
      ) ?? null;

    setForm((current) => ({
      ...current,
      idTipoProcedimiento: value,
      folioInfraccion: nextTipo?.requiereFolioInfraccion
        ? current.folioInfraccion
        : "",
      numParteInformativo: nextTipo?.requiereNumParteInformativo
        ? current.numParteInformativo
        : "",
    }));
    if (!nextTipo?.requiereMotivos) {
      setMotivoSlots(getEmptyMotivoSlots());
    }
    setError(null);
  }

  function updateMotivoSlot(index: number, value: string): void {
    setMotivoSlots((current) =>
      current.map((currentValue, currentIndex) =>
        currentIndex === index ? value : currentValue,
      ),
    );
    setError(null);
  }

  function clearMotivoSlot(index: number): void {
    updateMotivoSlot(index, "");
  }

  function resetForm() {
    setForm({
      ...INITIAL_FORM,
      fechaInfraccion: getTodayDate(),
      horaInfraccion: getCurrentTime(),
    });
    setMotivoSlots(getEmptyMotivoSlots());
    setError(null);
    setResult(null);
  }

  async function handleReset(): Promise<void> {
    const confirmed = await confirmAction({
      title: "Limpiar expediente",
      text: `Se perderán los datos capturados del expediente ${folioExpediente}.`,
      confirmButtonText: "Limpiar expediente",
      cancelButtonText: "Seguir capturando",
    });

    if (!confirmed) {
      return;
    }

    resetForm();
  }

  function getValidationError(): string | null {
    if (!catalogs) {
      return "Los catalogos todavia no estan disponibles.";
    }

    if (!selectedTipoProcedimiento) {
      return tiposExpediente.length === 0
        ? "No hay tipos de expediente activos disponibles en catalogos."
        : "Selecciona un tipo de expediente valido.";
    }

    if (!defaultEstatusInfraccion) {
      return "No se encontro el estatus inicial CAPTURADA en catalogos.";
    }

    if (!isFilled(form.idSexo)) {
      return "Selecciona el sexo.";
    }

    if (!isFilled(form.nombre) || !isFilled(form.apellidoPaterno)) {
      return "Completa los datos personales obligatorios.";
    }

    if (
      !isFilled(form.idClaseVehiculo) ||
      !isFilled(form.idLineaVehiculo) ||
      !isFilled(form.idServicio)
    ) {
      return "Completa los datos obligatorios del vehiculo.";
    }

    if (!isFilled(form.municipio)) {
      return "Ingresa el municipio.";
    }

    if (
      !isFilled(form.idDelegacion) ||
      !isFilled(form.fechaInfraccion) ||
      !isFilled(form.horaInfraccion)
    ) {
      return "Completa los datos operativos obligatorios.";
    }

    if (requiereFolioInfraccion && !isFilled(form.folioInfraccion)) {
      return "Captura el folio de infraccion.";
    }

    if (requiereNumParteInformativo && !isFilled(form.numParteInformativo)) {
      return "Captura el numero de parte informativo.";
    }

    if (
      selectedTipoProcedimiento.esTipoExpediente &&
      !requiereFolioInfraccion &&
      !requiereNumParteInformativo
    ) {
      return "El tipo de expediente seleccionado no puede generar folio.";
    }

    if (requiereMotivos && selectedMotivos.length === 0) {
      return "Selecciona al menos un motivo.";
    }

    if (selectedMotivos.length !== countFilled(motivoSlots)) {
      return "No repitas motivos en la captura.";
    }

    return null;
  }

  const infractorRequiredCompleted = countFilled([
    form.idSexo,
    form.nombre,
    form.apellidoPaterno,
  ]);
  const vehiculoRequiredCompleted = countFilled([
    form.idClaseVehiculo,
    form.idLineaVehiculo,
    form.idServicio,
  ]);
  const lugarRequiredCompleted = countFilled([form.municipio]);
  const infraccionRequiredCompleted = countFilled([
    selectedTipoProcedimiento ? "x" : "",
    form.idDelegacion,
    form.fechaInfraccion,
    form.horaInfraccion,
    requiereNumParteInformativo ? form.numParteInformativo : "",
    requiereFolioInfraccion ? form.folioInfraccion : "",
  ]);
  const systemDefaultsReady = Boolean(
    selectedTipoProcedimiento && defaultEstatusInfraccion,
  );
  const motivoSelectionValid =
    selectedMotivos.length === countFilled(motivoSlots) &&
    (!requiereMotivos || selectedMotivos.length > 0);
  const canSubmit =
    Boolean(catalogs) &&
    systemDefaultsReady &&
    motivoSelectionValid &&
    infractorRequiredCompleted === 3 &&
    vehiculoRequiredCompleted === 3 &&
    lugarRequiredCompleted === 1 &&
    infraccionRequiredCompleted ===
      countFilled([
        selectedTipoProcedimiento ? "x" : "",
        form.idDelegacion,
        form.fechaInfraccion,
        form.horaInfraccion,
        requiereNumParteInformativo ? "x" : "",
        requiereFolioInfraccion ? "x" : "",
      ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = getValidationError();

    if (
      validationError ||
      !selectedTipoProcedimiento ||
      !defaultEstatusInfraccion
    ) {
      setError(
        validationError ??
          "No se pudieron resolver los valores iniciales del sistema.",
      );
      return;
    }

    const confirmed = await confirmAction({
      title: "Guardar expediente",
      text: `Vas a guardar el expediente ${folioExpediente}.`,
      confirmButtonText: "Guardar expediente",
      cancelButtonText: "Seguir editando",
    });

    if (!confirmed) {
      return;
    }

    const payload: CreateInfraccionCompletaPayload = {
      infractor: {
        idSexo: Number(form.idSexo),
        nombre: form.nombre.trim(),
        apellidoPaterno: form.apellidoPaterno.trim(),
        apellidoMaterno: toNullableString(form.apellidoMaterno) ?? null,
        licencia: toNullableString(form.licencia) ?? null,
        curp: toNullableString(form.curp) ?? null,
      },
      vehiculo: {
        idClaseVehiculo: Number(form.idClaseVehiculo),
        idLineaVehiculo: Number(form.idLineaVehiculo),
        idServicio: Number(form.idServicio),
        anioModelo: toOptionalNumber(form.anioModelo),
        sitioServicioPublico:
          toNullableString(form.sitioServicioPublico) ?? null,
        color: toNullableString(form.color) ?? null,
        placas: toNullableString(form.placas) ?? null,
        estadoPlacas: toNullableString(form.estadoPlacas) ?? null,
        serie: toNullableString(form.serie) ?? null,
        motor: toNullableString(form.motor) ?? null,
      },
      lugarInfraccion: {
        municipio: form.municipio.trim(),
        colonia: toNullableString(form.colonia) ?? null,
        calle: toNullableString(form.calle) ?? null,
        numero: toNullableString(form.numero) ?? null,
      },
      infraccion: {
        idDelegacion: Number(form.idDelegacion),
        idTipoProcedimiento: selectedTipoProcedimiento.idTipoProcedimiento,
        idEstatusInfraccion: defaultEstatusInfraccion.idEstatusInfraccion,
        idOperativo: toOptionalNumber(form.idOperativo),
        folioInfraccion: requiereFolioInfraccion ? folioExpediente : undefined,
        fechaInfraccion: form.fechaInfraccion,
        horaInfraccion: form.horaInfraccion,
        observaciones: toNullableString(form.observaciones) ?? null,
        clavePolicia: toNullableString(form.clavePolicia) ?? null,
        numParteInformativo: toNullableString(form.numParteInformativo) ?? null,
        motivos: requiereMotivos ? selectedMotivos : [],
      },
    };

    setSaving(true);

    try {
      const response = await onSubmit(payload);
      setResult(response);
      setError(null);
      onCreated();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Error desconocido al guardar el expediente.",
      );
    } finally {
      setSaving(false);
    }
  }

  const folioCreado = result?.infraccion.folioInfraccion ?? null;
  const infraccionSummary = result
    ? [
        { label: "Folio expediente", value: result.infraccion.folioInfraccion },
        {
          label: "Estatus",
          value: result.infraccion.estatusInfraccion.nombreEstatus,
        },
        { label: "Motivos", value: String(selectedMotivos.length) },
      ]
    : [];
  const resultPreview = result
    ? {
        folioInfraccion: result.infraccion.folioInfraccion,
        estatus: result.infraccion.estatusInfraccion.nombreEstatus,
        motivosSeleccionados: selectedMotivoLabels,
      }
    : null;

  return (
    <section className="page-stack create-infraccion-page">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Operacion</p>
          <h1>Nuevo expediente</h1>
          <p className="page-description">
            Captura una infraccion o un vehiculo sin infraccion con numero de
            parte informativo.
          </p>
        </div>
        <div className="create-required-summary">
          <span>
            {selectedMotivos.length}/{MAX_MOTIVOS} motivos
          </span>
          <span>{canSubmit ? "Lista para guardar" : "Captura pendiente"}</span>
        </div>
      </header>

      {!catalogs ? <div className="notice">Cargando catalogos...</div> : null}

      <form className="create-form-layout" onSubmit={handleSubmit}>
        <SectionCard
          eyebrow="Expediente"
          title="Tipo de captura"
          completed={selectedTipoProcedimiento ? 1 : 0}
          total={1}
        >
          <div className="create-system-defaults">
            <SystemChip
              label="Tipo seleccionado"
              value={
                selectedTipoProcedimiento?.nombreTipoProcedimiento ??
                "Tipo no encontrado"
              }
              valid={Boolean(selectedTipoProcedimiento)}
            />
            <SystemChip
              label="Permite retencion"
              value={permiteRetencion ? "Si" : "No"}
              valid={Boolean(selectedTipoProcedimiento)}
            />
            <SystemChip
              label="Estatus inicial"
              value={
                defaultEstatusInfraccion?.nombreEstatus ??
                "CAPTURADA no encontrado"
              }
              valid={Boolean(defaultEstatusInfraccion)}
            />
          </div>
          <div className="form-grid form-grid-2">
            <Field htmlFor="expediente-tipo" label="Tipo de expediente">
              <SelectField
                id="expediente-tipo"
                value={
                  form.idTipoProcedimiento ||
                  String(defaultTipoProcedimiento?.idTipoProcedimiento ?? "")
                }
                onChange={(event) =>
                  updateTipoProcedimiento(event.target.value)
                }
                required
              >
                <option value="">Selecciona</option>
                {tiposExpediente.map((tipo) => (
                  <option
                    key={tipo.idTipoProcedimiento}
                    value={tipo.idTipoProcedimiento}
                  >
                    {tipo.nombreTipoProcedimiento}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field htmlFor="expediente-folio-preview" label="Folio expediente">
              <TextInput
                id="expediente-folio-preview"
                value={folioExpediente}
                readOnly
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Infractor"
          title="Datos personales"
          completed={infractorRequiredCompleted}
          total={3}
        >
          <div className="form-grid form-grid-3">
            <Field htmlFor="infractor-sexo" label="Sexo">
              <SelectField
                id="infractor-sexo"
                value={form.idSexo}
                onChange={(event) => updateField("idSexo", event.target.value)}
                required
              >
                <option value="">Selecciona</option>
                {catalogs?.sexos.map((sexo) => (
                  <option key={sexo.idSexo} value={sexo.idSexo}>
                    {sexo.nombreSexo}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field htmlFor="infractor-nombre" label="Nombre">
              <TextInput
                id="infractor-nombre"
                value={form.nombre}
                onChange={(event) => updateField("nombre", event.target.value)}
                required
              />
            </Field>
            <Field
              htmlFor="infractor-apellido-paterno"
              label="Apellido paterno"
            >
              <TextInput
                id="infractor-apellido-paterno"
                value={form.apellidoPaterno}
                onChange={(event) =>
                  updateField("apellidoPaterno", event.target.value)
                }
                required
              />
            </Field>
            <Field
              htmlFor="infractor-apellido-materno"
              label="Apellido materno"
            >
              <TextInput
                id="infractor-apellido-materno"
                value={form.apellidoMaterno}
                onChange={(event) =>
                  updateField("apellidoMaterno", event.target.value)
                }
              />
            </Field>
            <Field htmlFor="infractor-licencia" label="Licencia">
              <TextInput
                id="infractor-licencia"
                value={form.licencia}
                onChange={(event) =>
                  updateField("licencia", event.target.value)
                }
              />
            </Field>
            <Field htmlFor="infractor-curp" label="CURP">
              <TextInput
                id="infractor-curp"
                value={form.curp}
                onChange={(event) => updateField("curp", event.target.value)}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Vehiculo"
          title="Caracteristicas"
          completed={vehiculoRequiredCompleted}
          total={3}
        >
          <div className="form-grid form-grid-3">
            <Field htmlFor="vehiculo-clase" label="Clase">
              <SelectField
                id="vehiculo-clase"
                value={form.idClaseVehiculo}
                onChange={(event) =>
                  updateField("idClaseVehiculo", event.target.value)
                }
                required
              >
                <option value="">Selecciona</option>
                {catalogs?.clasesVehiculo.map((clase) => (
                  <option
                    key={clase.idClaseVehiculo}
                    value={clase.idClaseVehiculo}
                  >
                    {clase.nombreClaseVehiculo}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field htmlFor="vehiculo-linea" label="Linea">
              <SelectField
                id="vehiculo-linea"
                value={form.idLineaVehiculo}
                onChange={(event) =>
                  updateField("idLineaVehiculo", event.target.value)
                }
                required
              >
                <option value="">Selecciona</option>
                {catalogs?.lineasVehiculo.map((linea) => (
                  <option
                    key={linea.idLineaVehiculo}
                    value={linea.idLineaVehiculo}
                  >
                    {linea.marcaVehiculo
                      ? `${linea.marcaVehiculo.nombreMarcaVehiculo} - ${linea.nombreLineaVehiculo}`
                      : linea.nombreLineaVehiculo}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field htmlFor="vehiculo-servicio" label="Servicio">
              <SelectField
                id="vehiculo-servicio"
                value={form.idServicio}
                onChange={(event) =>
                  updateField("idServicio", event.target.value)
                }
                required
              >
                <option value="">Selecciona</option>
                {catalogs?.servicios.map((servicio) => (
                  <option key={servicio.idServicio} value={servicio.idServicio}>
                    {servicio.nombreServicio}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field htmlFor="vehiculo-anio" label="Año modelo">
              <TextInput
                id="vehiculo-anio"
                type="number"
                min="1"
                value={form.anioModelo}
                onChange={(event) =>
                  updateField("anioModelo", event.target.value)
                }
              />
            </Field>
            <Field htmlFor="vehiculo-color" label="Color">
              <TextInput
                id="vehiculo-color"
                value={form.color}
                onChange={(event) => updateField("color", event.target.value)}
              />
            </Field>
            <Field htmlFor="vehiculo-placas" label="Placas">
              <TextInput
                id="vehiculo-placas"
                value={form.placas}
                onChange={(event) => updateField("placas", event.target.value)}
              />
            </Field>
            <Field htmlFor="vehiculo-estado-placas" label="Estado placas">
              <TextInput
                id="vehiculo-estado-placas"
                value={form.estadoPlacas}
                onChange={(event) =>
                  updateField("estadoPlacas", event.target.value)
                }
              />
            </Field>
            <Field htmlFor="vehiculo-serie" label="Serie">
              <TextInput
                id="vehiculo-serie"
                value={form.serie}
                onChange={(event) => updateField("serie", event.target.value)}
              />
            </Field>
            <Field htmlFor="vehiculo-motor" label="Motor">
              <TextInput
                id="vehiculo-motor"
                value={form.motor}
                onChange={(event) => updateField("motor", event.target.value)}
              />
            </Field>
            <Field htmlFor="vehiculo-sitio" label="Sitio servicio publico">
              <TextInput
                id="vehiculo-sitio"
                value={form.sitioServicioPublico}
                onChange={(event) =>
                  updateField("sitioServicioPublico", event.target.value)
                }
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Lugar"
          title="Ubicacion"
          completed={lugarRequiredCompleted}
          total={1}
        >
          <div className="form-grid form-grid-4">
            <Field htmlFor="lugar-municipio" label="Municipio">
              <TextInput
                id="lugar-municipio"
                value={form.municipio}
                onChange={(event) =>
                  updateField("municipio", event.target.value)
                }
                required
              />
            </Field>
            <Field htmlFor="lugar-colonia" label="Colonia">
              <TextInput
                id="lugar-colonia"
                value={form.colonia}
                onChange={(event) => updateField("colonia", event.target.value)}
              />
            </Field>
            <Field htmlFor="lugar-calle" label="Calle">
              <TextInput
                id="lugar-calle"
                value={form.calle}
                onChange={(event) => updateField("calle", event.target.value)}
              />
            </Field>
            <Field htmlFor="lugar-numero" label="Numero">
              <TextInput
                id="lugar-numero"
                value={form.numero}
                onChange={(event) => updateField("numero", event.target.value)}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Operacion"
          title="Datos operativos"
          completed={infraccionRequiredCompleted}
          total={4}
        >
          <div className="form-grid form-grid-3">
            <Field htmlFor="infraccion-delegacion" label="Delegacion">
              <SelectField
                id="infraccion-delegacion"
                value={form.idDelegacion}
                onChange={(event) =>
                  updateField("idDelegacion", event.target.value)
                }
                required
              >
                <option value="">Selecciona</option>
                {catalogs?.delegaciones.map((delegacion) => (
                  <option
                    key={delegacion.idDelegacion}
                    value={delegacion.idDelegacion}
                  >
                    {delegacion.nombreDelegacion}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field htmlFor="infraccion-operativo" label="Operativo opcional">
              <SelectField
                id="infraccion-operativo"
                value={form.idOperativo}
                onChange={(event) =>
                  updateField("idOperativo", event.target.value)
                }
              >
                <option value="">Sin operativo</option>
                {catalogs?.operativos.map((operativo) => (
                  <option
                    key={operativo.idOperativo}
                    value={operativo.idOperativo}
                  >
                    {operativo.nombreOperativo}
                  </option>
                ))}
              </SelectField>
            </Field>
            {requiereFolioInfraccion ? (
              <Field htmlFor="infraccion-folio" label="Folio infraccion">
                <TextInput
                  id="infraccion-folio"
                  value={form.folioInfraccion}
                  onChange={(event) =>
                    updateField("folioInfraccion", event.target.value)
                  }
                  required
                />
              </Field>
            ) : null}
            <Field htmlFor="infraccion-fecha" label="Fecha">
              <TextInput
                id="infraccion-fecha"
                type="date"
                value={form.fechaInfraccion}
                onChange={(event) =>
                  updateField("fechaInfraccion", event.target.value)
                }
                required
              />
            </Field>
            <Field htmlFor="infraccion-hora" label="Hora">
              <TextInput
                id="infraccion-hora"
                type="time"
                value={form.horaInfraccion}
                onChange={(event) =>
                  updateField("horaInfraccion", event.target.value)
                }
                required
              />
            </Field>
            <Field htmlFor="infraccion-clave-policia" label="Clave policia">
              <TextInput
                id="infraccion-clave-policia"
                value={form.clavePolicia}
                onChange={(event) =>
                  updateField("clavePolicia", event.target.value)
                }
              />
            </Field>
            {requiereNumParteInformativo ? (
              <Field
                htmlFor="infraccion-num-parte"
                label="Numero parte informativo"
              >
                <TextInput
                  id="infraccion-num-parte"
                  value={form.numParteInformativo}
                  onChange={(event) =>
                    updateField("numParteInformativo", event.target.value)
                  }
                  required
                />
              </Field>
            ) : null}
            <div className="field field-span-3">
              <label htmlFor="infraccion-observaciones">Observaciones</label>
              <textarea
                id="infraccion-observaciones"
                value={form.observaciones}
                onChange={(event) =>
                  updateField("observaciones", event.target.value)
                }
                rows={4}
              />
            </div>
          </div>
        </SectionCard>

        {requiereMotivos ? (
          <Card className="create-form-card create-motivos-card">
            <div className="create-section-header">
              <div>
                <p className="section-label">Motivos</p>
                <h2>Selecciona hasta {MAX_MOTIVOS}</h2>
                <p className="page-description">
                  Usa un selector por motivo. No se permiten motivos repetidos.
                </p>
              </div>
              <span className="create-section-counter">
                {selectedMotivos.length}/{MAX_MOTIVOS}
              </span>
            </div>
            <div className="create-motivo-select-grid">
              {motivoSlots.map((motivoValue, index) => (
                <div
                  key={`motivo-slot-${index}`}
                  className="create-motivo-slot"
                >
                  <Field
                    htmlFor={`motivo-${index}`}
                    label={`Motivo ${index + 1}`}
                  >
                    <SelectField
                      id={`motivo-${index}`}
                      value={motivoValue}
                      onChange={(event) =>
                        updateMotivoSlot(index, event.target.value)
                      }
                    >
                      <option value="">Sin motivo</option>
                      {sortedMotivos.map((motivo) => {
                        const value = String(motivo.idMotivo);
                        const alreadySelected =
                          selectedMotivoSet.has(motivo.idMotivo) &&
                          value !== motivoValue;
                        return (
                          <option
                            key={motivo.idMotivo}
                            value={value}
                            disabled={alreadySelected}
                          >
                            {getMotivoLabel(motivo)}
                          </option>
                        );
                      })}
                    </SelectField>
                  </Field>
                  {motivoValue ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => clearMotivoSlot(index)}
                    >
                      Quitar
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="create-selected-motivos">
              {selectedMotivoLabels.length === 0 ? (
                <FieldValue>Sin motivos seleccionados.</FieldValue>
              ) : (
                selectedMotivoLabels.map((label) => (
                  <span key={label} className="motivo-chip">
                    {label}
                  </span>
                ))
              )}
            </div>
          </Card>
        ) : null}

        {error ? <div className="notice notice-error">{error}</div> : null}

        <div className="create-sticky-actions">
          <div>
            <p className="section-label">Guardar captura</p>
            <FieldValue>
              {canSubmit
                ? "El expediente tiene los datos obligatorios completos."
                : "Completa los campos obligatorios para guardar."}
            </FieldValue>
          </div>
          <div className="button-row button-row-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleReset()}
            >
              Limpiar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || loading || !canSubmit}
            >
              {saving ? "Guardando..." : "Guardar expediente"}
            </Button>
          </div>
        </div>
      </form>

      <OperationResultCard
        title="Expediente creado"
        description="El expediente quedo registrado y listo para continuar el flujo operativo."
        result={resultPreview}
        emptyLabel="Aun no se ha guardado un expediente."
        copyLabel="Copiar folio"
        copyValue={folioCreado}
        summary={infraccionSummary}
      />
    </section>
  );
}

export default InfraccionCreatePage;
