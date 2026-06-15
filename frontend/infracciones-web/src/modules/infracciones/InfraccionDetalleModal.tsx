import { useMemo, useState, type ReactNode } from 'react';

import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Timeline } from '../../components/ui/Timeline';
import {
  formatCurrencyMxn,
  formatDate,
  formatDateTime,
  formatEmptyValue,
  formatFullName,
  formatTimeOfDay,
} from '../../lib/formatters';
import type { InfraccionDetalleResponse } from '../../types/infracciones.types';
import './InfraccionDetalleModal.css';

interface InfraccionDetalleModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  data: InfraccionDetalleResponse | null;
  onClose: () => void;
}

type DetailTab =
  | 'resumen'
  | 'infractor'
  | 'vehiculo'
  | 'motivos'
  | 'encierro'
  | 'pagos'
  | 'liberacion'
  | 'salida'
  | 'movimientos';

interface TabDefinition {
  id: DetailTab;
  label: string;
}

interface FieldItem {
  label: string;
  value: ReactNode;
  span?: 2 | 3;
}

function getMotivoLabel(
  motivo: InfraccionDetalleResponse['motivos'][number],
): string {
  const descripcion = formatEmptyValue(motivo.descripcionMotivo);

  if (descripcion === motivo.nombreMotivo) {
    return motivo.nombreMotivo;
  }

  return `${motivo.nombreMotivo} - ${descripcion}`;
}

function getAvailableTabs(data: InfraccionDetalleResponse): TabDefinition[] {
  const tabs: TabDefinition[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'infractor', label: 'Infractor' },
    { id: 'vehiculo', label: 'Vehiculo' },
    { id: 'motivos', label: 'Motivos' },
  ];

  if (data.retencionVehiculo) {
    tabs.push({ id: 'encierro', label: 'Encierro' });
  }

  if (data.pagos.length > 0) {
    tabs.push({ id: 'pagos', label: 'Pagos' });
  }

  if (data.liberaciones.length > 0) {
    tabs.push({ id: 'liberacion', label: 'Liberacion' });
  }

  if (data.salidas.length > 0) {
    tabs.push({ id: 'salida', label: 'Salida' });
  }

  if (data.movimientos.length > 0) {
    tabs.push({ id: 'movimientos', label: 'Movimientos' });
  }

  return tabs;
}

function getVehiculoPrincipal(data: InfraccionDetalleResponse): string {
  return [
    data.vehiculo.marcaVehiculo.nombreMarcaVehiculo,
    data.vehiculo.lineaVehiculo.nombreLineaVehiculo,
    data.vehiculo.claseVehiculo.nombreClaseVehiculo,
  ]
    .filter(Boolean)
    .join(' - ');
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? 'modal-tab modal-tab-active' : 'modal-tab'}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DetailSection({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <Card className="detail-section-card detail-section-card-clean">
      <div className="page-stack">
        <div>
          <p className="section-label">Detalle</p>
          <h3 className="detail-section-title">{title}</h3>
          {description ? <p className="page-description">{description}</p> : null}
        </div>
        {children}
      </div>
    </Card>
  );
}

function DetailFieldGrid({ columns = 3, items }: { columns?: 2 | 3; items: FieldItem[] }) {
  return (
    <div className={`detail-field-grid detail-field-grid-${columns}`}>
      {items.map((item) => (
        <article
          key={item.label}
          className={[
            'detail-field-card',
            item.span ? `detail-field-span-${item.span}` : null,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <p className="detail-field-label">{item.label}</p>
          <div className="detail-field-value">{item.value}</div>
        </article>
      ))}
    </div>
  );
}

function HeroMeta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <article className="detail-hero-meta-item">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function RenderCardList({
  emptyLabel = 'Sin informacion registrada.',
  items,
}: {
  emptyLabel?: string;
  items: Array<{
    key: string | number;
    header: ReactNode;
    meta?: ReactNode;
    children: ReactNode;
  }>;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyLabel} />;
  }

  return (
    <div className="detail-card-list">
      {items.map((item) => (
        <Card key={item.key} className="detail-mini-card detail-mini-card-clean">
          <div className="detail-mini-header">
            <div>{item.header}</div>
            {item.meta ? <div className="detail-mini-meta">{item.meta}</div> : null}
          </div>
          {item.children}
        </Card>
      ))}
    </div>
  );
}

export function InfraccionDetalleModal({
  data,
  error,
  loading,
  onClose,
  open,
}: InfraccionDetalleModalProps) {
  const tabs = useMemo(() => (data ? getAvailableTabs(data) : []), [data]);
  const [activeTab, setActiveTab] = useState<DetailTab>('resumen');

  const safeActiveTab =
    tabs.some((tab) => tab.id === activeTab) || tabs.length === 0 ? activeTab : 'resumen';

  return (
    <Modal
      open={open}
      title={data?.infraccion.folioInfraccion ?? 'Detalle de infraccion'}
      description="Expediente operativo de la infraccion."
      onClose={onClose}
    >
      {loading ? <div className="notice">Cargando detalle...</div> : null}
      {error ? <div className="notice notice-error">{error}</div> : null}

      {!loading && !error && data ? (
        <div className="detail-shell detail-shell-clean">
          <Card className="detail-hero detail-hero-clean">
            <div className="detail-hero-main">
              <div className="detail-hero-copy">
                <p className="section-label">Expediente operativo</p>
                <h3>{data.infraccion.folioInfraccion}</h3>
                <p className="detail-hero-name">
                  {formatFullName([
                    data.infractor.nombre,
                    data.infractor.apellidoPaterno,
                    data.infractor.apellidoMaterno,
                  ])}
                </p>
              </div>

              <div className="detail-hero-status detail-hero-status-card">
                <p className="detail-hero-status-label">Estado operativo</p>
                <StatusBadge value={data.estadoOperativoCalculado} />
              </div>
            </div>

            <div className="detail-hero-meta-grid">
              <HeroMeta label="Fecha" value={formatDate(data.infraccion.fechaInfraccion)} />
              <HeroMeta label="Hora" value={formatTimeOfDay(data.infraccion.horaInfraccion)} />
              <HeroMeta label="Placas" value={formatEmptyValue(data.vehiculo.placas)} />
              <HeroMeta label="Vehiculo" value={getVehiculoPrincipal(data)} />
              {data.retencionVehiculo ? (
                <>
                  <HeroMeta
                    label="Encierro"
                    value={data.retencionVehiculo.encierro.nombreEncierro}
                  />
                  <HeroMeta
                    label="Ingreso"
                    value={formatDateTime(data.retencionVehiculo.fechaIngreso)}
                  />
                </>
              ) : null}
            </div>

            <div className="detail-hero-summary-row">
              <span>{data.estatusInfraccion.nombreEstatus}</span>
              <span>{data.region.nombreRegion}</span>
              <span>{data.delegacion.nombreDelegacion}</span>
            </div>
          </Card>

          <div className="modal-tabs modal-tabs-clean" role="tablist" aria-label="Detalle de infraccion">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                active={safeActiveTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </TabButton>
            ))}
          </div>

          {safeActiveTab === 'resumen' ? (
            <DetailSection title="Resumen" description="Datos principales del expediente.">
              <DetailFieldGrid
                columns={3}
                items={[
                  { label: 'Folio', value: data.infraccion.folioInfraccion },
                  { label: 'Estatus', value: data.estatusInfraccion.nombreEstatus },
                  {
                    label: 'Tipo procedimiento',
                    value: data.tipoProcedimiento.nombreTipoProcedimiento,
                  },
                  { label: 'Region', value: data.region.nombreRegion },
                  { label: 'Delegacion', value: data.delegacion.nombreDelegacion },
                  {
                    label: 'Clave policia',
                    value: formatEmptyValue(data.infraccion.clavePolicia),
                  },
                  {
                    label: 'Numero de parte',
                    value: formatEmptyValue(data.infraccion.numParteInformativo),
                  },
                  {
                    label: 'Observaciones',
                    value: formatEmptyValue(data.infraccion.observaciones),
                    span: 2,
                  },
                ]}
              />
            </DetailSection>
          ) : null}

          {safeActiveTab === 'infractor' ? (
            <DetailSection title="Infractor" description="Identificacion del conductor o propietario.">
              <DetailFieldGrid
                columns={2}
                items={[
                  {
                    label: 'Nombre completo',
                    value: formatFullName([
                      data.infractor.nombre,
                      data.infractor.apellidoPaterno,
                      data.infractor.apellidoMaterno,
                    ]),
                    span: 2,
                  },
                  {
                    label: 'Licencia',
                    value: formatEmptyValue(data.infractor.licencia),
                  },
                  {
                    label: 'Sexo',
                    value: data.infractor.sexo?.nombreSexo ?? 'Sin informacion registrada',
                  },
                ]}
              />
            </DetailSection>
          ) : null}

          {safeActiveTab === 'vehiculo' ? (
            <DetailSection title="Vehiculo" description="Ficha tecnica del vehiculo infraccionado.">
              <DetailFieldGrid
                columns={3}
                items={[
                  { label: 'Placas', value: formatEmptyValue(data.vehiculo.placas) },
                  {
                    label: 'Estado placas',
                    value: formatEmptyValue(data.vehiculo.estadoPlacas),
                  },
                  { label: 'Marca', value: data.vehiculo.marcaVehiculo.nombreMarcaVehiculo },
                  { label: 'Linea', value: data.vehiculo.lineaVehiculo.nombreLineaVehiculo },
                  {
                    label: 'Clase',
                    value: data.vehiculo.claseVehiculo.nombreClaseVehiculo,
                  },
                  { label: 'Servicio', value: data.vehiculo.servicio.nombreServicio },
                  { label: 'Color', value: formatEmptyValue(data.vehiculo.color) },
                  {
                    label: 'Modelo',
                    value: data.vehiculo.anioModelo ?? 'Sin informacion registrada',
                  },
                  { label: 'Serie', value: formatEmptyValue(data.vehiculo.serie) },
                  { label: 'Motor', value: formatEmptyValue(data.vehiculo.motor) },
                  {
                    label: 'Sitio servicio publico',
                    value: formatEmptyValue(data.vehiculo.sitioServicioPublico),
                    span: 2,
                  },
                ]}
              />
            </DetailSection>
          ) : null}

          {safeActiveTab === 'motivos' ? (
            <DetailSection title="Motivos" description="Motivos capturados para la infraccion.">
              {data.motivos.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="motivo-grid motivo-grid-clean">
                  {data.motivos.map((motivo) => (
                    <article key={motivo.idMotivo} className="motivo-card motivo-card-clean">
                      <strong>{motivo.nombreMotivo}</strong>
                      <span>{getMotivoLabel(motivo)}</span>
                    </article>
                  ))}
                </div>
              )}
            </DetailSection>
          ) : null}

          {safeActiveTab === 'encierro' && data.retencionVehiculo ? (
            <DetailSection title="Encierro" description="Ingreso y resguardo vehicular.">
              <DetailFieldGrid
                columns={2}
                items={[
                  { label: 'Encierro', value: data.retencionVehiculo.encierro.nombreEncierro },
                  {
                    label: 'Fecha ingreso',
                    value: formatDateTime(data.retencionVehiculo.fechaIngreso),
                  },
                  {
                    label: 'Folio resguardo',
                    value: formatEmptyValue(data.retencionVehiculo.folioResguardo),
                  },
                  {
                    label: 'Recibido por',
                    value: formatEmptyValue(data.retencionVehiculo.recibidoPor),
                  },
                  {
                    label: 'Estado ingreso',
                    value: formatEmptyValue(data.retencionVehiculo.estadoIngreso),
                  },
                  {
                    label: 'Observaciones ingreso',
                    value: formatEmptyValue(data.retencionVehiculo.observacionesIngreso),
                    span: 2,
                  },
                ]}
              />
            </DetailSection>
          ) : null}

          {safeActiveTab === 'pagos' ? (
            <DetailSection title="Pagos" description="Historial de pagos registrados.">
              <RenderCardList
                emptyLabel="Sin pagos registrados."
                items={data.pagos.map((pago, index) => ({
                  key: pago.folioPago || index,
                  header: (
                    <div>
                      <p className="card-label">Folio pago</p>
                      <h4>{pago.folioPago}</h4>
                    </div>
                  ),
                  meta: <strong>{formatCurrencyMxn(pago.monto)}</strong>,
                  children: (
                    <DetailFieldGrid
                      columns={2}
                      items={[
                        { label: 'Fecha', value: formatDateTime(pago.fechaPago) },
                        {
                          label: 'Observaciones',
                          value: formatEmptyValue(pago.observaciones),
                          span: 2,
                        },
                      ]}
                    />
                  ),
                }))}
              />
            </DetailSection>
          ) : null}

          {safeActiveTab === 'liberacion' ? (
            <DetailSection title="Liberacion" description="Liberaciones asociadas a la infraccion.">
              <RenderCardList
                emptyLabel="Sin liberaciones registradas."
                items={data.liberaciones.map((liberacion, index) => ({
                  key: liberacion.folioLiberacion || index,
                  header: (
                    <div>
                      <p className="card-label">Folio liberacion</p>
                      <h4>{liberacion.folioLiberacion}</h4>
                    </div>
                  ),
                  meta: <span>{formatDateTime(liberacion.fechaLiberacion)}</span>,
                  children: (
                    <DetailFieldGrid
                      columns={2}
                      items={[
                        { label: 'Liberado por', value: formatEmptyValue(liberacion.liberadoPor) },
                        {
                          label: 'Persona que recibe liberacion',
                          value: formatEmptyValue(liberacion.nombreRecibeLiberacion),
                          span: 2,
                        },
                        {
                          label: 'Observaciones',
                          value: formatEmptyValue(liberacion.observacion),
                          span: 2,
                        },
                      ]}
                    />
                  ),
                }))}
              />
            </DetailSection>
          ) : null}

          {safeActiveTab === 'salida' ? (
            <DetailSection title="Salida" description="Salida del vehiculo del encierro.">
              <RenderCardList
                emptyLabel="Sin salidas registradas."
                items={data.salidas.map((salida, index) => ({
                  key: `${salida.fechaSalida}-${index}`,
                  header: (
                    <div>
                      <p className="card-label">Fecha salida</p>
                      <h4>{formatDateTime(salida.fechaSalida)}</h4>
                    </div>
                  ),
                  meta: <StatusBadge value={salida.estadoSalida} compact />,
                  children: (
                    <DetailFieldGrid
                      columns={2}
                      items={[
                        { label: 'Validado por', value: formatEmptyValue(salida.validadoPor) },
                        {
                          label: 'Persona que recibe vehiculo',
                          value: formatEmptyValue(salida.personaRecibeVehiculo),
                          span: 2,
                        },
                        {
                          label: 'Observaciones',
                          value: formatEmptyValue(salida.observacionesSalida),
                          span: 2,
                        },
                      ]}
                    />
                  ),
                }))}
              />
            </DetailSection>
          ) : null}

          {safeActiveTab === 'movimientos' ? (
            <DetailSection title="Movimientos" description="Linea de tiempo del expediente.">
              <Timeline
                items={data.movimientos.map((movimiento, index) => ({
                  id: `${movimiento.fechaMovimiento}-${index}`,
                  title: formatDateTime(movimiento.fechaMovimiento),
                  meta: <StatusBadge value={movimiento.estatus} compact />,
                  description: (
                    <DetailFieldGrid
                      columns={3}
                      items={[
                        { label: 'Accion', value: formatEmptyValue(movimiento.accion) },
                        { label: 'Usuario', value: formatEmptyValue(movimiento.usuario) },
                        {
                          label: 'Observaciones',
                          value: formatEmptyValue(movimiento.observaciones),
                        },
                      ]}
                    />
                  ),
                }))}
              />
            </DetailSection>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
