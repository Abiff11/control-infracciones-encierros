import { useMemo, useState, type FormEvent } from 'react';

import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { JsonResult } from '../components/ui/JsonResult';
import { LoadingMessage } from '../components/ui/LoadingMessage';
import { SelectField } from '../components/ui/SelectField';
import { TextAreaField } from '../components/ui/TextAreaField';
import { Field, TextInput } from '../components/ui/Field';
import { getErrorMessage } from '../services/api/apiClient';
import { copyTextToClipboard } from '../utils/clipboard';
import {
  createClaseVehiculo,
  createDelegacion,
  createEncierro,
  createEstatusInfraccion,
  createLineaVehiculo,
  createMarcaVehiculo,
  createMotivo,
  createOperativo,
  createRegion,
  createServicio,
  createSexo,
  createTipoProcedimiento,
} from '../services/api/catalogos.api';
import type {
  CatalogosBundle,
  ClaseVehiculo,
  Delegacion,
  Encierro,
  EstatusInfraccion,
  LineaVehiculo,
  MarcaVehiculo,
  Motivo,
  Operativo,
  Region,
  Servicio,
  Sexo,
  TipoProcedimiento,
} from '../types/catalogos.types';

const EMPTY_LIST: never[] = [];

const MIN_TEST_LOAD_LINES = [
  'Sexo: MASCULINO, FEMENINO',
  'Region: OAXACA',
  'Delegacion: OAXACA DE JUAREZ',
  'Servicio: PARTICULAR',
  'Clase vehiculo: AUTOMOVIL',
  'Marca vehiculo: NISSAN',
  'Linea vehiculo: TSURU',
  'Tipo procedimiento: INFRACCION',
  'Motivo: T - ESTACIONARSE EN LUGAR PROHIBIDO',
  'Encierro: ENCIERRO MUNICIPAL',
  'Estatus: CAPTURADA, PAGADA, LIBERACION_GENERADA, VEHICULO_ENTREGADO',
];

const MIN_TEST_LOAD_JSON = JSON.stringify(
  {
    sexo: ['MASCULINO', 'FEMENINO'],
    region: 'OAXACA',
    delegacion: 'OAXACA DE JUAREZ',
    servicio: 'PARTICULAR',
    claseVehiculo: 'AUTOMOVIL',
    marcaVehiculo: 'NISSAN',
    lineaVehiculo: 'TSURU',
    tipoProcedimiento: 'INFRACCION',
    motivo: 'T - ESTACIONARSE EN LUGAR PROHIBIDO',
    encierro: 'ENCIERRO MUNICIPAL',
    estatus: [
      'CAPTURADA',
      'PAGADA',
      'LIBERACION_GENERADA',
      'VEHICULO_ENTREGADO',
    ],
  },
  null,
  2,
);

type FieldType = 'text' | 'select' | 'textarea';

interface Option {
  label: string;
  value: string;
}

interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: Option[];
  rows?: number;
}

interface CatalogSectionProps {
  title: string;
  description: string;
  items: unknown[];
  emptyLabel: string;
  fields: FieldConfig[];
  initialValues: Record<string, string>;
  onSubmit: (values: Record<string, string>) => Promise<unknown>;
  onRefresh: () => Promise<void> | void;
  renderItem: (item: unknown) => string;
}

interface CatalogosPageProps {
  catalogs: CatalogosBundle | null;
  loading: boolean;
  error: string | null;
  onRefreshCatalogs: () => Promise<void> | void;
  token: string;
}

function toValueList<T>(
  items: T[] | undefined,
  getLabel: (item: T) => string,
  getValue: (item: T) => string,
): Option[] {
  return (items ?? []).map((item) => ({
    label: getLabel(item),
    value: getValue(item),
  }));
}

function CatalogSection({
  description,
  emptyLabel,
  fields,
  initialValues,
  items,
  onRefresh,
  onSubmit,
  renderItem,
  title,
}: CatalogSectionProps) {
  const [form, setForm] = useState<Record<string, string>>(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const sectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  function updateField(name: string, value: string): void {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await onSubmit(form);
      setResult(response);
      await onRefresh();
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="page-stack">
        <header className="panel-header">
          <div>
            <p className="section-label">Catalogo</p>
            <h2>{title}</h2>
            <p className="page-description">{description}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void onRefresh()}>
            Refrescar
          </Button>
        </header>

        <div className="catalog-items">
          {items.length === 0 ? (
            <div className="notice">{emptyLabel}</div>
          ) : (
            <ul className="catalog-list">
              {items.map((item, index) => (
                <li key={`${title}-${index}`}>{renderItem(item)}</li>
              ))}
            </ul>
          )}
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-grid form-grid-2">
            {fields.map((field) => (
              <Field key={field.name} htmlFor={`${sectionId}-${field.name}`} label={field.label}>
                {field.type === 'textarea' ? (
                  <TextAreaField
                    id={`${sectionId}-${field.name}`}
                    rows={field.rows ?? 3}
                    value={form[field.name] ?? ''}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                ) : field.type === 'select' ? (
                  <SelectField
                    id={`${sectionId}-${field.name}`}
                    value={form[field.name] ?? ''}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    required={field.required}
                  >
                    <option value="">Selecciona</option>
                    {field.options?.map((option) => (
                      <option key={`${field.name}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                ) : (
                  <TextInput
                    id={`${sectionId}-${field.name}`}
                    value={form[field.name] ?? ''}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </Field>
            ))}
          </div>

          <ErrorMessage message={error} />

          <div className="button-row">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>

        <JsonResult value={result} emptyLabel="Sin respuesta todavia." />
      </div>
    </Card>
  );
}

function CatalogosPage({
  catalogs,
  loading,
  error,
  onRefreshCatalogs,
  token,
}: CatalogosPageProps) {
  const regions = catalogs?.regiones ?? EMPTY_LIST;
  const delegaciones = catalogs?.delegaciones ?? EMPTY_LIST;
  const sexos = catalogs?.sexos ?? EMPTY_LIST;
  const servicios = catalogs?.servicios ?? EMPTY_LIST;
  const clasesVehiculo = catalogs?.clasesVehiculo ?? EMPTY_LIST;
  const marcasVehiculo = catalogs?.marcasVehiculo ?? EMPTY_LIST;
  const lineasVehiculo = catalogs?.lineasVehiculo ?? EMPTY_LIST;
  const tiposProcedimiento = catalogs?.tiposProcedimiento ?? EMPTY_LIST;
  const operativos = catalogs?.operativos ?? EMPTY_LIST;
  const motivos = catalogs?.motivos ?? EMPTY_LIST;
  const encierros = catalogs?.encierros ?? EMPTY_LIST;
  const estatusInfraccion = catalogs?.estatusInfraccion ?? EMPTY_LIST;

  const regionOptions = useMemo(
    () => toValueList(regions, (item) => item.nombreRegion, (item) => String(item.idRegion)),
    [regions],
  );

  const marcaOptions = useMemo(
    () =>
      toValueList(
        marcasVehiculo,
        (item) => item.nombreMarcaVehiculo,
        (item) => String(item.idMarcaVehiculo),
      ),
    [marcasVehiculo],
  );

  return (
    <section className="page-stack">
      <Header
        eyebrow="Administracion"
        title="Catalogos"
        description="Alta manual de catálogos operativos y referencia para probar el flujo completo."
      />

      {loading ? <LoadingMessage message="Cargando catalogos..." /> : null}
      <ErrorMessage message={error} />

      <Card>
        <div className="page-stack">
          <div>
            <p className="section-label">Carga minima sugerida para pruebas</p>
            <p className="page-description">
              Usa estos valores para preparar un entorno minimo y probar el flujo
              completo sin improvisar catalogos base.
            </p>
          </div>

          <ul className="catalog-list">
            {MIN_TEST_LOAD_LINES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="button-row">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void copyTextToClipboard(MIN_TEST_LOAD_LINES.join('\n'))}
            >
              Copiar lista
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void copyTextToClipboard(MIN_TEST_LOAD_JSON)}
            >
              Copiar JSON
            </Button>
          </div>
        </div>
      </Card>

      <CatalogSection
        title="Region"
        description="Crear regiones."
        items={regions}
        emptyLabel="Sin regiones registradas."
        fields={[
          {
            name: 'nombreRegion',
            label: 'nombreRegion',
            type: 'text',
            required: true,
          },
        ]}
        initialValues={{ nombreRegion: '' }}
        onRefresh={onRefreshCatalogs}
        onSubmit={(values) =>
          createRegion(token, { nombreRegion: values.nombreRegion.trim() })
        }
        renderItem={(item) => (item as Region).nombreRegion}
      />

      <CatalogSection
        title="Delegacion"
        description="Relaciona la delegacion con una region."
        items={delegaciones}
        emptyLabel="Sin delegaciones registradas."
        fields={[
          {
            name: 'idRegion',
            label: 'idRegion',
            type: 'select',
            required: true,
            options: regionOptions,
          },
          {
            name: 'nombreDelegacion',
            label: 'nombreDelegacion',
            type: 'text',
            required: true,
          },
        ]}
        initialValues={{ idRegion: '', nombreDelegacion: '' }}
        onRefresh={onRefreshCatalogs}
        onSubmit={(values) =>
          createDelegacion(token, {
            idRegion: Number(values.idRegion),
            nombreDelegacion: values.nombreDelegacion.trim(),
          })
        }
        renderItem={(item) => {
          const delegacion = item as Delegacion;
          return `${delegacion.region?.nombreRegion ?? 'Sin region'} - ${delegacion.nombreDelegacion}`;
        }}
      />

      <CatalogSection
        title="Sexo"
        description="Alta de sexos."
        items={sexos}
        emptyLabel="Sin sexos registrados."
        fields={[
          {
            name: 'claveSexo',
            label: 'claveSexo',
            type: 'text',
            required: true,
          },
        ]}
        initialValues={{ claveSexo: '' }}
        onRefresh={onRefreshCatalogs}
        onSubmit={(values) =>
          createSexo(token, { claveSexo: values.claveSexo.trim() })
        }
        renderItem={(item) => (item as Sexo).nombreSexo}
      />

      <CatalogSection
        title="Servicio"
        description="Alta de servicios."
        items={servicios}
        emptyLabel="Sin servicios registrados."
        fields={[
          {
            name: 'nombreServicio',
            label: 'nombreServicio',
            type: 'text',
            required: true,
          },
        ]}
        initialValues={{ nombreServicio: '' }}
        onRefresh={onRefreshCatalogs}
        onSubmit={(values) =>
          createServicio(token, { nombreServicio: values.nombreServicio.trim() })
        }
        renderItem={(item) => (item as Servicio).nombreServicio}
      />

      <CatalogSection
        title="Clase vehiculo"
        description="Alta de clases vehiculares."
        items={clasesVehiculo}
        emptyLabel="Sin clases de vehiculo registradas."
        fields={[
          {
            name: 'nombreClase',
            label: 'nombreClase',
            type: 'text',
            required: true,
          },
        ]}
        initialValues={{ nombreClase: '' }}
        onRefresh={onRefreshCatalogs}
        onSubmit={(values) =>
          createClaseVehiculo(token, { nombreClase: values.nombreClase.trim() })
        }
        renderItem={(item) => (item as ClaseVehiculo).nombreClaseVehiculo}
      />

      <CatalogSection
        title="Marca vehiculo"
        description="Alta de marcas vehiculares."
        items={marcasVehiculo}
        emptyLabel="Sin marcas de vehiculo registradas."
        fields={[
          {
            name: 'nombreMarca',
            label: 'nombreMarca',
            type: 'text',
            required: true,
          },
        ]}
        initialValues={{ nombreMarca: '' }}
        onRefresh={onRefreshCatalogs}
        onSubmit={(values) =>
          createMarcaVehiculo(token, { nombreMarca: values.nombreMarca.trim() })
        }
        renderItem={(item) => (item as MarcaVehiculo).nombreMarcaVehiculo}
      />

      <CatalogSection
        title="Linea vehiculo"
        description="Relaciona la linea con una marca."
        items={lineasVehiculo}
        emptyLabel="Sin lineas de vehiculo registradas."
        fields={[
          {
            name: 'idMarcaVehiculo',
            label: 'idMarcaVehiculo',
            type: 'select',
            required: true,
            options: marcaOptions,
          },
          {
            name: 'nombreLinea',
            label: 'nombreLinea',
            type: 'text',
            required: true,
          },
        ]}
        initialValues={{ idMarcaVehiculo: '', nombreLinea: '' }}
        onRefresh={onRefreshCatalogs}
        onSubmit={(values) =>
          createLineaVehiculo(token, {
            idMarcaVehiculo: Number(values.idMarcaVehiculo),
            nombreLinea: values.nombreLinea.trim(),
          })
        }
        renderItem={(item) => {
          const linea = item as LineaVehiculo;
          return `${linea.marcaVehiculo?.nombreMarcaVehiculo ?? 'Sin marca'} - ${linea.nombreLineaVehiculo}`;
        }}
      />

      <CatalogSection
        title="Tipo procedimiento"
        description="Alta de tipos de procedimiento."
        items={tiposProcedimiento}
        emptyLabel="Sin tipos de procedimiento registrados."
        fields={[
          {
            name: 'procedimiento',
            label: 'procedimiento',
            type: 'text',
            required: true,
          },
        ]}
        initialValues={{ procedimiento: '' }}
        onRefresh={onRefreshCatalogs}
        onSubmit={(values) =>
          createTipoProcedimiento(token, { procedimiento: values.procedimiento.trim() })
        }
        renderItem={(item) => (item as TipoProcedimiento).nombreTipoProcedimiento}
      />

      <CatalogSection
        title="Operativo"
        description="Alta de operativos."
        items={operativos}
        emptyLabel="Sin operativos registrados."
        fields={[
          {
            name: 'nombreOperativo',
            label: 'nombreOperativo',
            type: 'text',
            required: true,
          },
        ]}
        initialValues={{ nombreOperativo: '' }}
        onRefresh={onRefreshCatalogs}
        onSubmit={(values) =>
          createOperativo(token, { nombreOperativo: values.nombreOperativo.trim() })
        }
        renderItem={(item) => (item as Operativo).nombreOperativo}
      />

      <CatalogSection
        title="Motivo"
        description="Alta de motivos con clave y descripcion persistidas en la tabla."
        items={motivos}
        emptyLabel="Sin motivos registrados."
        fields={[
          {
            name: 'claveMotivo',
            label: 'claveMotivo',
            type: 'text',
            required: true,
          },
          {
            name: 'descripcionMotivo',
            label: 'descripcionMotivo',
            type: 'textarea',
            rows: 3,
          },
        ]}
        initialValues={{ claveMotivo: '', descripcionMotivo: '' }}
        onRefresh={onRefreshCatalogs}
        onSubmit={(values) =>
          createMotivo(token, {
            claveMotivo: values.claveMotivo.trim(),
            descripcionMotivo: values.descripcionMotivo.trim() || undefined,
          })
        }
        renderItem={(item) => {
          const motivo = item as Motivo;
          return `${motivo.nombreMotivo} - ${motivo.descripcionMotivo}`;
        }}
      />

      <CatalogSection
        title="Encierro"
        description="Alta de encierros."
        items={encierros}
        emptyLabel="Sin encierros registrados."
        fields={[
          {
            name: 'nombreEncierro',
            label: 'nombreEncierro',
            type: 'text',
            required: true,
          },
        ]}
        initialValues={{ nombreEncierro: '' }}
        onRefresh={onRefreshCatalogs}
        onSubmit={(values) =>
          createEncierro(token, { nombreEncierro: values.nombreEncierro.trim() })
        }
        renderItem={(item) => (item as Encierro).nombreEncierro}
      />

      <CatalogSection
        title="Estatus infraccion"
        description="Alta de estatus de infraccion."
        items={estatusInfraccion}
        emptyLabel="Sin estatus registrados."
        fields={[
          {
            name: 'nombreEstatus',
            label: 'nombreEstatus',
            type: 'text',
            required: true,
          },
        ]}
        initialValues={{ nombreEstatus: '' }}
        onRefresh={onRefreshCatalogs}
        onSubmit={(values) =>
          createEstatusInfraccion(token, {
            nombreEstatus: values.nombreEstatus.trim(),
          })
        }
        renderItem={(item) => (item as EstatusInfraccion).nombreEstatus}
      />
    </section>
  );
}

export default CatalogosPage;
