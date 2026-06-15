import { useMemo, useState, type FormEvent } from 'react';

import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Field, TextInput } from '../components/ui/Field';
import { JsonResult } from '../components/ui/JsonResult';
import { LoadingMessage } from '../components/ui/LoadingMessage';
import { Modal } from '../components/ui/Modal';
import { SelectField } from '../components/ui/SelectField';
import { TextAreaField } from '../components/ui/TextAreaField';
import { getErrorMessage } from '../services/api/apiClient';
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
  updateClaseVehiculo,
  updateDelegacion,
  updateEncierro,
  updateEstatusInfraccion,
  updateLineaVehiculo,
  updateMarcaVehiculo,
  updateMotivo,
  updateOperativo,
  updateRegion,
  updateServicio,
  updateSexo,
  updateTipoProcedimiento,
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

type CatalogId =
  | 'region'
  | 'delegacion'
  | 'sexo'
  | 'servicio'
  | 'clase-vehiculo'
  | 'marca-vehiculo'
  | 'linea-vehiculo'
  | 'tipo-procedimiento'
  | 'operativo'
  | 'motivo'
  | 'encierro'
  | 'estatus-infraccion';

interface CatalogSectionProps {
  id: string;
  title: string;
  description: string;
  items: unknown[];
  emptyLabel: string;
  fields: FieldConfig[];
  initialValues: Record<string, string>;
  getItemId: (item: unknown) => number;
  getItemFormValues: (item: unknown) => Record<string, string>;
  onCreate: (values: Record<string, string>) => Promise<unknown>;
  onUpdate: (id: number, values: Record<string, string>) => Promise<unknown>;
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

const EMPTY_LIST: never[] = [];

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
  id,
  getItemFormValues,
  getItemId,
  initialValues,
  items,
  onRefresh,
  onCreate,
  onUpdate,
  renderItem,
  title,
}: CatalogSectionProps) {
  const [createForm, setCreateForm] = useState<Record<string, string>>(initialValues);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>(initialValues);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => renderItem(item).toLowerCase().includes(query));
  }, [items, renderItem, search]);

  function updateField(name: string, value: string): void {
    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function startEditing(item: unknown): void {
    setEditingId(getItemId(item));
    setEditForm(getItemFormValues(item));
    setEditError(null);
    setResult(null);
  }

  function cancelEditing(): void {
    setEditingId(null);
    setEditForm(initialValues);
    setEditError(null);
    setResult(null);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCreateSaving(true);
    setCreateError(null);

    try {
      const response = await onCreate(createForm);
      setResult(response);
      setCreateForm(initialValues);
      await onRefresh();
    } catch (submissionError) {
      setCreateError(getErrorMessage(submissionError));
    } finally {
      setCreateSaving(false);
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (editingId === null) {
      return;
    }

    setEditSaving(true);
    setEditError(null);

    try {
      const response = await onUpdate(editingId, editForm);
      setResult(response);
      cancelEditing();
      await onRefresh();
    } catch (submissionError) {
      setEditError(getErrorMessage(submissionError));
    } finally {
      setEditSaving(false);
    }
  }

  function renderFormFields(
    values: Record<string, string>,
    onChange: (name: string, value: string) => void,
    prefix: string,
  ) {
    return fields.map((field) => (
      <Field key={field.name} htmlFor={`${prefix}-${field.name}`} label={field.label}>
        {field.type === 'textarea' ? (
          <TextAreaField
            id={`${prefix}-${field.name}`}
            rows={field.rows ?? 3}
            value={values[field.name] ?? ''}
            onChange={(event) => onChange(field.name, event.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        ) : field.type === 'select' ? (
          <SelectField
            id={`${prefix}-${field.name}`}
            value={values[field.name] ?? ''}
            onChange={(event) => onChange(field.name, event.target.value)}
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
            id={`${prefix}-${field.name}`}
            value={values[field.name] ?? ''}
            onChange={(event) => onChange(field.name, event.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        )}
      </Field>
    ));
  }

  return (
    <section id={id} className="catalogos-section">
      <Card className="catalogos-panel">
        <div className="page-stack">
          <div className="catalogos-header">
            <div className="catalogos-header-card">
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            <div className="catalogos-header-card">
              <span>Registros visibles</span>
              <strong>{filteredItems.length}</strong>
            </div>
          </div>

          <form className="catalogos-form-card" onSubmit={handleCreateSubmit}>
            <div className="catalogos-form-heading">
              <div>
                <span>Nuevo concepto</span>
                <strong>{title}</strong>
              </div>
              <Button type="button" variant="secondary" onClick={() => void onRefresh()}>
                Refrescar
              </Button>
            </div>

            <div className="catalogos-form">
              {renderFormFields(createForm, updateField, id)}
            </div>

            <ErrorMessage message={createError} />

            <div className="form-actions">
              <Button type="submit" variant="primary" disabled={createSaving}>
                {createSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>

          <div className="catalogos-toolbar">
            <div>
              <h4>Registros activos</h4>
              <p>{filteredItems.length} encontrados</p>
            </div>

            <input
              type="search"
              placeholder={`Buscar en ${title.toLowerCase()}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <Button type="button" variant="secondary" onClick={() => setSearch('')}>
              Limpiar
            </Button>
          </div>

          <div className="catalog-items">
            {filteredItems.length === 0 ? (
              <div className="notice">{emptyLabel}</div>
            ) : (
              <ul className="catalog-list">
                {filteredItems.map((item) => {
                  const itemId = getItemId(item);
                  const isEditing = editingId === itemId;

                  return (
                    <li key={`${title}-${itemId}`} className={isEditing ? 'is-editing' : undefined}>
                      <div className="catalog-list-copy">
                        <strong>{renderItem(item)}</strong>
                        <span>Registro activo</span>
                      </div>
                      <div className="catalog-list-actions">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => startEditing(item)}
                        >
                          Editar
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Modal
            open={editingId !== null}
            title={`Editar ${title}`}
            description="Actualiza el registro sin salir de la pantalla de catálogos."
            onClose={cancelEditing}
          >
            <form className="catalogos-modal-form" onSubmit={handleEditSubmit}>
              <div className="catalogos-form">
                {renderFormFields(editForm, (name, value) => {
                  setEditForm((current) => ({
                    ...current,
                    [name]: value,
                  }));
                }, `${id}-edit`)}
              </div>

              <ErrorMessage message={editError} />

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={cancelEditing}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={editSaving || editingId === null}>
                  {editSaving ? 'Actualizando...' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          </Modal>

          <JsonResult value={result} emptyLabel="Sin respuesta todavia." />
        </div>
      </Card>
    </section>
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

  const catalogConfigs: Array<{
    id: CatalogId;
    title: string;
    description: string;
    items: unknown[];
    emptyLabel: string;
    fields: FieldConfig[];
    initialValues: Record<string, string>;
    getItemId: (item: unknown) => number;
    getItemFormValues: (item: unknown) => Record<string, string>;
    onCreate: (values: Record<string, string>) => Promise<unknown>;
    onUpdate: (id: number, values: Record<string, string>) => Promise<unknown>;
    renderItem: (item: unknown) => string;
  }> = [
    {
      id: 'region',
      title: 'Region',
      description: 'Crear regiones.',
      items: regions,
      emptyLabel: 'Sin regiones registradas.',
      fields: [
        {
          name: 'nombreRegion',
          label: 'nombreRegion',
          type: 'text',
          required: true,
        },
      ],
      initialValues: { nombreRegion: '' },
      getItemId: (item: unknown) => (item as Region).idRegion,
      getItemFormValues: (item: unknown) => {
        const region = item as Region;

        return {
          nombreRegion: region.nombreRegion,
        };
      },
      onCreate: (values: Record<string, string>) =>
        createRegion(token, { nombreRegion: values.nombreRegion.trim() }),
      onUpdate: (id: number, values: Record<string, string>) =>
        updateRegion(token, id, { nombreRegion: values.nombreRegion.trim() }),
      renderItem: (item: unknown) => (item as Region).nombreRegion,
    },
    {
      id: 'delegacion',
      title: 'Delegacion',
      description: 'Relaciona la delegacion con una region.',
      items: delegaciones,
      emptyLabel: 'Sin delegaciones registradas.',
      fields: [
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
      ],
      initialValues: { idRegion: '', nombreDelegacion: '' },
      getItemId: (item: unknown) => (item as Delegacion).idDelegacion,
      getItemFormValues: (item: unknown) => {
        const delegacion = item as Delegacion;

        return {
          idRegion: String(delegacion.region?.idRegion ?? ''),
          nombreDelegacion: delegacion.nombreDelegacion,
        };
      },
      onCreate: (values: Record<string, string>) =>
        createDelegacion(token, {
          idRegion: Number(values.idRegion),
          nombreDelegacion: values.nombreDelegacion.trim(),
        }),
      onUpdate: (id: number, values: Record<string, string>) =>
        updateDelegacion(token, id, {
          idRegion: Number(values.idRegion),
          nombreDelegacion: values.nombreDelegacion.trim(),
        }),
      renderItem: (item: unknown) => {
        const delegacion = item as Delegacion;
        return `${delegacion.region?.nombreRegion ?? 'Sin region'} - ${delegacion.nombreDelegacion}`;
      },
    },
    {
      id: 'sexo',
      title: 'Sexo',
      description: 'Alta de sexos.',
      items: sexos,
      emptyLabel: 'Sin sexos registrados.',
      fields: [
        {
          name: 'claveSexo',
          label: 'claveSexo',
          type: 'text',
          required: true,
        },
      ],
      initialValues: { claveSexo: '' },
      getItemId: (item: unknown) => (item as Sexo).idSexo,
      getItemFormValues: (item: unknown) => {
        const sexo = item as Sexo;

        return {
          claveSexo: sexo.nombreSexo,
        };
      },
      onCreate: (values: Record<string, string>) =>
        createSexo(token, { claveSexo: values.claveSexo.trim() }),
      onUpdate: (id: number, values: Record<string, string>) =>
        updateSexo(token, id, { claveSexo: values.claveSexo.trim() }),
      renderItem: (item: unknown) => (item as Sexo).nombreSexo,
    },
    {
      id: 'servicio',
      title: 'Servicio',
      description: 'Alta de servicios.',
      items: servicios,
      emptyLabel: 'Sin servicios registrados.',
      fields: [
        {
          name: 'nombreServicio',
          label: 'nombreServicio',
          type: 'text',
          required: true,
        },
      ],
      initialValues: { nombreServicio: '' },
      getItemId: (item: unknown) => (item as Servicio).idServicio,
      getItemFormValues: (item: unknown) => {
        const servicio = item as Servicio;

        return {
          nombreServicio: servicio.nombreServicio,
        };
      },
      onCreate: (values: Record<string, string>) =>
        createServicio(token, { nombreServicio: values.nombreServicio.trim() }),
      onUpdate: (id: number, values: Record<string, string>) =>
        updateServicio(token, id, { nombreServicio: values.nombreServicio.trim() }),
      renderItem: (item: unknown) => (item as Servicio).nombreServicio,
    },
    {
      id: 'clase-vehiculo',
      title: 'Clase vehiculo',
      description: 'Alta de clases vehiculares.',
      items: clasesVehiculo,
      emptyLabel: 'Sin clases de vehiculo registradas.',
      fields: [
        {
          name: 'nombreClase',
          label: 'nombreClase',
          type: 'text',
          required: true,
        },
      ],
      initialValues: { nombreClase: '' },
      getItemId: (item: unknown) => (item as ClaseVehiculo).idClaseVehiculo,
      getItemFormValues: (item: unknown) => {
        const claseVehiculo = item as ClaseVehiculo;

        return {
          nombreClase: claseVehiculo.nombreClaseVehiculo,
        };
      },
      onCreate: (values: Record<string, string>) =>
        createClaseVehiculo(token, { nombreClase: values.nombreClase.trim() }),
      onUpdate: (id: number, values: Record<string, string>) =>
        updateClaseVehiculo(token, id, { nombreClase: values.nombreClase.trim() }),
      renderItem: (item: unknown) => (item as ClaseVehiculo).nombreClaseVehiculo,
    },
    {
      id: 'marca-vehiculo',
      title: 'Marca vehiculo',
      description: 'Alta de marcas vehiculares.',
      items: marcasVehiculo,
      emptyLabel: 'Sin marcas de vehiculo registradas.',
      fields: [
        {
          name: 'nombreMarca',
          label: 'nombreMarca',
          type: 'text',
          required: true,
        },
      ],
      initialValues: { nombreMarca: '' },
      getItemId: (item: unknown) => (item as MarcaVehiculo).idMarcaVehiculo,
      getItemFormValues: (item: unknown) => {
        const marcaVehiculo = item as MarcaVehiculo;

        return {
          nombreMarca: marcaVehiculo.nombreMarcaVehiculo,
        };
      },
      onCreate: (values: Record<string, string>) =>
        createMarcaVehiculo(token, { nombreMarca: values.nombreMarca.trim() }),
      onUpdate: (id: number, values: Record<string, string>) =>
        updateMarcaVehiculo(token, id, { nombreMarca: values.nombreMarca.trim() }),
      renderItem: (item: unknown) => (item as MarcaVehiculo).nombreMarcaVehiculo,
    },
    {
      id: 'linea-vehiculo',
      title: 'Linea vehiculo',
      description: 'Relaciona la linea con una marca.',
      items: lineasVehiculo,
      emptyLabel: 'Sin lineas de vehiculo registradas.',
      fields: [
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
      ],
      initialValues: { idMarcaVehiculo: '', nombreLinea: '' },
      getItemId: (item: unknown) => (item as LineaVehiculo).idLineaVehiculo,
      getItemFormValues: (item: unknown) => {
        const linea = item as LineaVehiculo;

        return {
          idMarcaVehiculo: String(linea.marcaVehiculo?.idMarcaVehiculo ?? ''),
          nombreLinea: linea.nombreLineaVehiculo,
        };
      },
      onCreate: (values: Record<string, string>) =>
        createLineaVehiculo(token, {
          idMarcaVehiculo: Number(values.idMarcaVehiculo),
          nombreLinea: values.nombreLinea.trim(),
        }),
      onUpdate: (id: number, values: Record<string, string>) =>
        updateLineaVehiculo(token, id, {
          idMarcaVehiculo: Number(values.idMarcaVehiculo),
          nombreLinea: values.nombreLinea.trim(),
        }),
      renderItem: (item: unknown) => {
        const linea = item as LineaVehiculo;
        return `${linea.marcaVehiculo?.nombreMarcaVehiculo ?? 'Sin marca'} - ${linea.nombreLineaVehiculo}`;
      },
    },
    {
      id: 'tipo-procedimiento',
      title: 'Tipo procedimiento',
      description: 'Alta de tipos de procedimiento.',
      items: tiposProcedimiento,
      emptyLabel: 'Sin tipos de procedimiento registrados.',
      fields: [
        {
          name: 'procedimiento',
          label: 'procedimiento',
          type: 'text',
          required: true,
        },
      ],
      initialValues: { procedimiento: '' },
      getItemId: (item: unknown) => (item as TipoProcedimiento).idTipoProcedimiento,
      getItemFormValues: (item: unknown) => {
        const tipoProcedimiento = item as TipoProcedimiento;

        return {
          procedimiento: tipoProcedimiento.nombreTipoProcedimiento,
        };
      },
      onCreate: (values: Record<string, string>) =>
        createTipoProcedimiento(token, { procedimiento: values.procedimiento.trim() }),
      onUpdate: (id: number, values: Record<string, string>) =>
        updateTipoProcedimiento(token, id, {
          procedimiento: values.procedimiento.trim(),
        }),
      renderItem: (item: unknown) => (item as TipoProcedimiento).nombreTipoProcedimiento,
    },
    {
      id: 'operativo',
      title: 'Operativo',
      description: 'Alta de operativos.',
      items: operativos,
      emptyLabel: 'Sin operativos registrados.',
      fields: [
        {
          name: 'nombreOperativo',
          label: 'nombreOperativo',
          type: 'text',
          required: true,
        },
      ],
      initialValues: { nombreOperativo: '' },
      getItemId: (item: unknown) => (item as Operativo).idOperativo,
      getItemFormValues: (item: unknown) => {
        const operativo = item as Operativo;

        return {
          nombreOperativo: operativo.nombreOperativo,
        };
      },
      onCreate: (values: Record<string, string>) =>
        createOperativo(token, { nombreOperativo: values.nombreOperativo.trim() }),
      onUpdate: (id: number, values: Record<string, string>) =>
        updateOperativo(token, id, { nombreOperativo: values.nombreOperativo.trim() }),
      renderItem: (item: unknown) => (item as Operativo).nombreOperativo,
    },
    {
      id: 'motivo',
      title: 'Motivo',
      description: 'Alta de motivos con clave y descripcion persistidas en la tabla.',
      items: motivos,
      emptyLabel: 'Sin motivos registrados.',
      fields: [
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
      ],
      initialValues: { claveMotivo: '', descripcionMotivo: '' },
      getItemId: (item: unknown) => (item as Motivo).idMotivo,
      getItemFormValues: (item: unknown) => {
        const motivo = item as Motivo;

        return {
          claveMotivo: motivo.nombreMotivo,
          descripcionMotivo: motivo.descripcionMotivo,
        };
      },
      onCreate: (values: Record<string, string>) =>
        createMotivo(token, {
          claveMotivo: values.claveMotivo.trim(),
          descripcionMotivo: values.descripcionMotivo.trim() || undefined,
        }),
      onUpdate: (id: number, values: Record<string, string>) =>
        updateMotivo(token, id, {
          claveMotivo: values.claveMotivo.trim(),
          descripcionMotivo: values.descripcionMotivo.trim() || undefined,
        }),
      renderItem: (item: unknown) => {
        const motivo = item as Motivo;
        return `${motivo.nombreMotivo} - ${motivo.descripcionMotivo}`;
      },
    },
    {
      id: 'encierro',
      title: 'Encierro',
      description: 'Alta de encierros.',
      items: encierros,
      emptyLabel: 'Sin encierros registrados.',
      fields: [
        {
          name: 'nombreEncierro',
          label: 'nombreEncierro',
          type: 'text',
          required: true,
        },
      ],
      initialValues: { nombreEncierro: '' },
      getItemId: (item: unknown) => (item as Encierro).idEncierro,
      getItemFormValues: (item: unknown) => {
        const encierro = item as Encierro;

        return {
          nombreEncierro: encierro.nombreEncierro,
        };
      },
      onCreate: (values: Record<string, string>) =>
        createEncierro(token, { nombreEncierro: values.nombreEncierro.trim() }),
      onUpdate: (id: number, values: Record<string, string>) =>
        updateEncierro(token, id, { nombreEncierro: values.nombreEncierro.trim() }),
      renderItem: (item: unknown) => (item as Encierro).nombreEncierro,
    },
    {
      id: 'estatus-infraccion',
      title: 'Estatus infraccion',
      description: 'Alta de estatus de infraccion.',
      items: estatusInfraccion,
      emptyLabel: 'Sin estatus registrados.',
      fields: [
        {
          name: 'nombreEstatus',
          label: 'nombreEstatus',
          type: 'text',
          required: true,
        },
      ],
      initialValues: { nombreEstatus: '' },
      getItemId: (item: unknown) => (item as EstatusInfraccion).idEstatusInfraccion,
      getItemFormValues: (item: unknown) => {
        const estatus = item as EstatusInfraccion;

        return {
          nombreEstatus: estatus.nombreEstatus,
        };
      },
      onCreate: (values: Record<string, string>) =>
        createEstatusInfraccion(token, {
          nombreEstatus: values.nombreEstatus.trim(),
        }),
      onUpdate: (id: number, values: Record<string, string>) =>
        updateEstatusInfraccion(token, id, {
          nombreEstatus: values.nombreEstatus.trim(),
        }),
      renderItem: (item: unknown) => (item as EstatusInfraccion).nombreEstatus,
    },
  ];

  const [selectedCatalogId, setSelectedCatalogId] = useState<CatalogId>('region');
  const activeCatalog =
    catalogConfigs.find((item) => item.id === selectedCatalogId) ?? catalogConfigs[0];
  const totalCatalogs = catalogConfigs.reduce((total, item) => total + item.items.length, 0);

  return (
    <section className="catalogos-page">
      <Header
        eyebrow="Administracion"
        title="Catalogos"
        description="Alta manual de catalogos operativos y referencia para probar el flujo completo."
        action={
          <Button type="button" variant="secondary" onClick={() => void onRefreshCatalogs()}>
            Refrescar todo
          </Button>
        }
      />

      {loading ? <LoadingMessage message="Cargando catalogos..." /> : null}
      <ErrorMessage message={error} />

      <div className="catalogos-header">
        <div className="catalogos-header-card">
          <h3>Catalogos operativos</h3>
          <p>Panel administrativo con la misma composicion visual del repositorio de referencia.</p>
        </div>
        <div className="catalogos-header-card">
          <span>Catalogos visibles</span>
          <strong>{catalogConfigs.length}</strong>
        </div>
        <div className="catalogos-header-card">
          <span>Registros cargados</span>
          <strong>{totalCatalogs}</strong>
        </div>
      </div>

      <div className="catalogos-layout">
        <aside className="catalogos-tabs" aria-label="Catalogos">
          {catalogConfigs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`catalogos-tab ${selectedCatalogId === tab.id ? 'active' : ''}`}
              onClick={() => setSelectedCatalogId(tab.id)}
            >
              <span className="catalogos-tab-main">
                <strong>{tab.title}</strong>
                <small>Ver catalogo</small>
              </span>
              <span className="catalogos-count">{tab.items.length}</span>
            </button>
          ))}
        </aside>

        <div className="catalogos-stack">
          {activeCatalog ? (
            <CatalogSection
              key={activeCatalog.id}
              id={activeCatalog.id}
              title={activeCatalog.title}
              description={activeCatalog.description}
              items={activeCatalog.items}
              emptyLabel={activeCatalog.emptyLabel}
              fields={activeCatalog.fields}
              initialValues={activeCatalog.initialValues}
              getItemId={activeCatalog.getItemId}
              getItemFormValues={activeCatalog.getItemFormValues}
              onCreate={activeCatalog.onCreate}
              onUpdate={activeCatalog.onUpdate}
              onRefresh={onRefreshCatalogs}
              renderItem={activeCatalog.renderItem}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default CatalogosPage;
