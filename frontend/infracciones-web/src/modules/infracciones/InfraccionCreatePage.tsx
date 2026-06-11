import { useState, type FormEvent } from 'react';

import type { CatalogosBundle } from '../catalogos/catalogos.types';
import type {
  CreateInfraccionCompletaPayload,
  InfraccionFlujoResponse,
} from './infracciones.types';

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function toOptionalNumber(value: string): number | null | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  return Number(value);
}

function toNullableString(value: string): string | null | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  return value;
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
  idSexo: '',
  nombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  licencia: '',
  curp: '',
  idClaseVehiculo: '',
  idLineaVehiculo: '',
  idServicio: '',
  anioModelo: '',
  sitioServicioPublico: '',
  color: '',
  placas: '',
  estadoPlacas: '',
  serie: '',
  motor: '',
  municipio: '',
  colonia: '',
  calle: '',
  numero: '',
  idDelegacion: '',
  idTipoProcedimiento: '',
  idEstatusInfraccion: '',
  idOperativo: '',
  folioInfraccion: '',
  fechaInfraccion: getTodayDate(),
  horaInfraccion: getCurrentTime(),
  observaciones: '',
  clavePolicia: '',
  numParteInformativo: '',
};

function InfraccionCreatePage({
  catalogs,
  loading,
  onCreated,
  onSubmit,
}: InfraccionCreatePageProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedMotivos, setSelectedMotivos] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InfraccionFlujoResponse | null>(null);

  function updateField(field: keyof typeof INITIAL_FORM, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleMotivo(idMotivo: number) {
    setSelectedMotivos((current) =>
      current.includes(idMotivo)
        ? current.filter((currentId) => currentId !== idMotivo)
        : [...current, idMotivo],
    );
  }

  function resetForm() {
    setForm({
      ...INITIAL_FORM,
      fechaInfraccion: getTodayDate(),
      horaInfraccion: getCurrentTime(),
    });
    setSelectedMotivos([]);
    setError(null);
    setResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!catalogs) {
      setError('Los catálogos todavía no están disponibles.');
      return;
    }

    if (selectedMotivos.length === 0) {
      setError('Selecciona al menos un motivo.');
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
        sitioServicioPublico: toNullableString(form.sitioServicioPublico) ?? null,
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
        idTipoProcedimiento: Number(form.idTipoProcedimiento),
        idEstatusInfraccion: Number(form.idEstatusInfraccion),
        idOperativo: toOptionalNumber(form.idOperativo),
        folioInfraccion: form.folioInfraccion.trim(),
        fechaInfraccion: form.fechaInfraccion,
        horaInfraccion: form.horaInfraccion,
        observaciones: toNullableString(form.observaciones) ?? null,
        clavePolicia: toNullableString(form.clavePolicia) ?? null,
        numParteInformativo: toNullableString(form.numParteInformativo) ?? null,
        motivos: selectedMotivos,
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
          : 'Error desconocido al guardar la infracción.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operación</p>
          <h1>Nueva infracción</h1>
          <p className="page-description">
            Captura completa en una sola transacción. El usuario operativo ya no
            se envía desde el cliente.
          </p>
        </div>
      </header>

      {!catalogs ? (
        <div className="notice">Cargando catálogos...</div>
      ) : null}

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <section className="form-section">
          <div className="panel-header">
            <div>
              <p className="section-label">Infractor</p>
              <h2>Datos personales</h2>
            </div>
          </div>

          <div className="form-grid form-grid-3">
            <div className="field">
              <label htmlFor="infractor-sexo">Sexo</label>
              <select
                id="infractor-sexo"
                value={form.idSexo}
                onChange={(event) => updateField('idSexo', event.target.value)}
                required
              >
                <option value="">Selecciona</option>
                {catalogs?.sexos.map((sexo) => (
                  <option key={sexo.idSexo} value={sexo.idSexo}>
                    {sexo.nombreSexo}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="infractor-nombre">Nombre</label>
              <input
                id="infractor-nombre"
                value={form.nombre}
                onChange={(event) => updateField('nombre', event.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="infractor-apellido-paterno">Apellido paterno</label>
              <input
                id="infractor-apellido-paterno"
                value={form.apellidoPaterno}
                onChange={(event) =>
                  updateField('apellidoPaterno', event.target.value)
                }
                required
              />
            </div>

            <div className="field">
              <label htmlFor="infractor-apellido-materno">Apellido materno</label>
              <input
                id="infractor-apellido-materno"
                value={form.apellidoMaterno}
                onChange={(event) =>
                  updateField('apellidoMaterno', event.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="infractor-licencia">Licencia</label>
              <input
                id="infractor-licencia"
                value={form.licencia}
                onChange={(event) => updateField('licencia', event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="infractor-curp">CURP</label>
              <input
                id="infractor-curp"
                value={form.curp}
                onChange={(event) => updateField('curp', event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="panel-header">
            <div>
              <p className="section-label">Vehículo</p>
              <h2>Características</h2>
            </div>
          </div>

          <div className="form-grid form-grid-3">
            <div className="field">
              <label htmlFor="vehiculo-clase">Clase</label>
              <select
                id="vehiculo-clase"
                value={form.idClaseVehiculo}
                onChange={(event) =>
                  updateField('idClaseVehiculo', event.target.value)
                }
                required
              >
                <option value="">Selecciona</option>
                {catalogs?.clasesVehiculo.map((clase) => (
                  <option key={clase.idClaseVehiculo} value={clase.idClaseVehiculo}>
                    {clase.nombreClaseVehiculo}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="vehiculo-linea">Línea</label>
              <select
                id="vehiculo-linea"
                value={form.idLineaVehiculo}
                onChange={(event) =>
                  updateField('idLineaVehiculo', event.target.value)
                }
                required
              >
                <option value="">Selecciona</option>
                {catalogs?.lineasVehiculo.map((linea) => (
                  <option key={linea.idLineaVehiculo} value={linea.idLineaVehiculo}>
                    {linea.marcaVehiculo
                      ? `${linea.marcaVehiculo.nombreMarcaVehiculo} - ${linea.nombreLineaVehiculo}`
                      : linea.nombreLineaVehiculo}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="vehiculo-servicio">Servicio</label>
              <select
                id="vehiculo-servicio"
                value={form.idServicio}
                onChange={(event) => updateField('idServicio', event.target.value)}
                required
              >
                <option value="">Selecciona</option>
                {catalogs?.servicios.map((servicio) => (
                  <option key={servicio.idServicio} value={servicio.idServicio}>
                    {servicio.nombreServicio}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="vehiculo-anio">Año modelo</label>
              <input
                id="vehiculo-anio"
                type="number"
                min="1"
                value={form.anioModelo}
                onChange={(event) => updateField('anioModelo', event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="vehiculo-color">Color</label>
              <input
                id="vehiculo-color"
                value={form.color}
                onChange={(event) => updateField('color', event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="vehiculo-placas">Placas</label>
              <input
                id="vehiculo-placas"
                value={form.placas}
                onChange={(event) => updateField('placas', event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="vehiculo-estado-placas">Estado placas</label>
              <input
                id="vehiculo-estado-placas"
                value={form.estadoPlacas}
                onChange={(event) => updateField('estadoPlacas', event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="vehiculo-serie">Serie</label>
              <input
                id="vehiculo-serie"
                value={form.serie}
                onChange={(event) => updateField('serie', event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="vehiculo-motor">Motor</label>
              <input
                id="vehiculo-motor"
                value={form.motor}
                onChange={(event) => updateField('motor', event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="vehiculo-sitio">Sitio servicio público</label>
              <input
                id="vehiculo-sitio"
                value={form.sitioServicioPublico}
                onChange={(event) =>
                  updateField('sitioServicioPublico', event.target.value)
                }
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="panel-header">
            <div>
              <p className="section-label">Lugar</p>
              <h2>Ubicación</h2>
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="field">
              <label htmlFor="lugar-municipio">Municipio</label>
              <input
                id="lugar-municipio"
                value={form.municipio}
                onChange={(event) => updateField('municipio', event.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="lugar-colonia">Colonia</label>
              <input
                id="lugar-colonia"
                value={form.colonia}
                onChange={(event) => updateField('colonia', event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="lugar-calle">Calle</label>
              <input
                id="lugar-calle"
                value={form.calle}
                onChange={(event) => updateField('calle', event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="lugar-numero">Número</label>
              <input
                id="lugar-numero"
                value={form.numero}
                onChange={(event) => updateField('numero', event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="panel-header">
            <div>
              <p className="section-label">Infracción</p>
              <h2>Datos operativos</h2>
            </div>
          </div>

          <div className="form-grid form-grid-3">
            <div className="field">
              <label htmlFor="infraccion-delegacion">Delegación</label>
              <select
                id="infraccion-delegacion"
                value={form.idDelegacion}
                onChange={(event) => updateField('idDelegacion', event.target.value)}
                required
              >
                <option value="">Selecciona</option>
                {catalogs?.delegaciones.map((delegacion) => (
                  <option key={delegacion.idDelegacion} value={delegacion.idDelegacion}>
                    {delegacion.nombreDelegacion}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="infraccion-tipo">Tipo procedimiento</label>
              <select
                id="infraccion-tipo"
                value={form.idTipoProcedimiento}
                onChange={(event) =>
                  updateField('idTipoProcedimiento', event.target.value)
                }
                required
              >
                <option value="">Selecciona</option>
                {catalogs?.tiposProcedimiento.map((tipo) => (
                  <option
                    key={tipo.idTipoProcedimiento}
                    value={tipo.idTipoProcedimiento}
                  >
                    {tipo.nombreTipoProcedimiento}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="infraccion-estatus">Estatus</label>
              <select
                id="infraccion-estatus"
                value={form.idEstatusInfraccion}
                onChange={(event) =>
                  updateField('idEstatusInfraccion', event.target.value)
                }
                required
              >
                <option value="">Selecciona</option>
                {catalogs?.estatusInfraccion.map((estatus) => (
                  <option
                    key={estatus.idEstatusInfraccion}
                    value={estatus.idEstatusInfraccion}
                  >
                    {estatus.nombreEstatus}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="infraccion-operativo">Operativo opcional</label>
              <select
                id="infraccion-operativo"
                value={form.idOperativo}
                onChange={(event) => updateField('idOperativo', event.target.value)}
              >
                <option value="">Sin operativo</option>
                {catalogs?.operativos.map((operativo) => (
                  <option key={operativo.idOperativo} value={operativo.idOperativo}>
                    {operativo.nombreOperativo}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="infraccion-folio">Folio</label>
              <input
                id="infraccion-folio"
                value={form.folioInfraccion}
                onChange={(event) => updateField('folioInfraccion', event.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="infraccion-fecha">Fecha</label>
              <input
                id="infraccion-fecha"
                type="date"
                value={form.fechaInfraccion}
                onChange={(event) => updateField('fechaInfraccion', event.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="infraccion-hora">Hora</label>
              <input
                id="infraccion-hora"
                type="time"
                value={form.horaInfraccion}
                onChange={(event) => updateField('horaInfraccion', event.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="infraccion-clave-policia">Clave policía</label>
              <input
                id="infraccion-clave-policia"
                value={form.clavePolicia}
                onChange={(event) => updateField('clavePolicia', event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="infraccion-num-parte">Número parte informativo</label>
              <input
                id="infraccion-num-parte"
                value={form.numParteInformativo}
                onChange={(event) =>
                  updateField('numParteInformativo', event.target.value)
                }
              />
            </div>

            <div className="field field-span-2">
              <label htmlFor="infraccion-observaciones">Observaciones</label>
              <textarea
                id="infraccion-observaciones"
                value={form.observaciones}
                onChange={(event) => updateField('observaciones', event.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="motivos-block">
            <div className="panel-header">
              <div>
                <p className="section-label">Motivos</p>
                <h2>Selecciona uno o más</h2>
              </div>
            </div>

            <div className="chip-grid">
              {catalogs?.motivos.map((motivo) => (
                <label key={motivo.idMotivo} className="chip-option">
                  <input
                    type="checkbox"
                    checked={selectedMotivos.includes(motivo.idMotivo)}
                    onChange={() => toggleMotivo(motivo.idMotivo)}
                  />
                  <span>{motivo.nombreMotivo}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {error ? <div className="notice notice-error">{error}</div> : null}

        <div className="button-row">
          <button className="button-primary" type="submit" disabled={saving || loading}>
            {saving ? 'Guardando...' : 'Guardar infracción'}
          </button>
          <button className="button-secondary" type="button" onClick={resetForm}>
            Limpiar
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Resultado</p>
            <h2>JSON devuelto</h2>
          </div>
        </div>

        <pre className="result-box">
          {result ? JSON.stringify(result, null, 2) : 'Aún no se ha guardado una infracción.'}
        </pre>
      </section>
    </section>
  );
}

export default InfraccionCreatePage;
