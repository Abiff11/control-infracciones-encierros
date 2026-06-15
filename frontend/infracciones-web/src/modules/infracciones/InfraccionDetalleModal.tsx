import { useMemo, useState, type ReactNode } from 'react';

import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { InfoGrid } from '../../components/ui/InfoGrid';
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

function DetailStack({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <Card className="detail-section-card">
      <div className="page-stack">
        <div className="panel-header">
          <div>
            <p className="section-label">Detalle</p>
            <h3>{title}</h3>
            {description ? <p className="page-description">{description}</p> : null}
          </div>
        </div>
        {children}
      </div>
    </Card>
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
    <div className="detail-stack">
      {items.map((item) => (
        <Card key={item.key} className="detail-mini-card">
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
      description="Vista completa del expediente operativo."
      onClose={onClose}
    >
      {loading ? <div className="notice">Cargando detalle...</div> : null}
      {error ? <div className="notice notice-error">{error}</div> : null}
      {!loading && !error && data ? (
        <div className="detail-shell">
          <Card className="detail-hero">
            <div className="detail-hero-top">
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
                <div className="detail-hero-subline">
                  <span>Fecha: {formatDate(data.infraccion.fechaInfraccion)}</span>
                  <span>Hora: {formatTimeOfDay(data.infraccion.horaInfraccion)}</span>
                  <span>Placas: {formatEmptyValue(data.vehiculo.placas)}</span>
                </div>
                {data.retencionVehiculo ? (
                  <div className="detail-hero-subline">
                    <span>Encierro: {data.retencionVehiculo.encierro.nombreEncierro}</span>
                    <span>Ingreso: {formatDateTime(data.retencionVehiculo.fechaIngreso)}</span>
                  </div>
                ) : null}
              </div>

              <div className="detail-hero-status">
                <StatusBadge value={data.estadoOperativoCalculado} />
                <p className="detail-hero-status-label">Estado operativo</p>
              </div>
            </div>

            <InfoGrid
              columns={3}
              items={[
                {
                  label: 'Estatus',
                  value: data.estatusInfraccion.nombreEstatus,
                },
                {
                  label: 'Region',
                  value: data.region.nombreRegion,
                },
                {
                  label: 'Delegacion',
                  value: data.delegacion.nombreDelegacion,
                },
              ]}
            />
          </Card>

          <div className="modal-tabs" role="tablist" aria-label="Detalle de infraccion">
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
            <DetailStack title="Resumen" description="Datos generales de la infraccion.">
              <InfoGrid
                columns={3}
                items={[
                  { label: 'Folio', value: data.infraccion.folioInfraccion },
                  {
                    label: 'Fecha',
                    value: formatDate(data.infraccion.fechaInfraccion),
                  },
                  {
                    label: 'Hora',
                    value: formatTimeOfDay(data.infraccion.horaInfraccion),
                  },
                  {
                    label: 'Estado operativo',
                    value: <StatusBadge value={data.estadoOperativoCalculado} compact />,
                    span: 2,
                  },
                  {
                    label: 'Estatus de infraccion',
                    value: data.estatusInfraccion.nombreEstatus,
                  },
                  { label: 'Region', value: data.region.nombreRegion },
                  { label: 'Delegacion', value: data.delegacion.nombreDelegacion },
                  {
                    label: 'Tipo procedimiento',
                    value: data.tipoProcedimiento.nombreTipoProcedimiento,
                  },
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
            </DetailStack>
          ) : null}

          {safeActiveTab === 'infractor' ? (
            <DetailStack title="Infractor" description="Identificacion del conductor o propietario.">
              <InfoGrid
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
            </DetailStack>
          ) : null}

          {safeActiveTab === 'vehiculo' ? (
            <DetailStack title="Vehiculo" description="Ficha tecnica del vehiculo infraccionado.">
              <InfoGrid
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
            </DetailStack>
          ) : null}

          {safeActiveTab === 'motivos' ? (
            <DetailStack title="Motivos" description="Motivos capturados para la infraccion.">
              {data.motivos.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="motivo-grid">
                  {data.motivos.map((motivo) => (
                    <article key={motivo.idMotivo} className="motivo-card">
                      <strong>{motivo.nombreMotivo}</strong>
                      <span>{getMotivoLabel(motivo)}</span>
                    </article>
                  ))}
                </div>
              )}
            </DetailStack>
          ) : null}

          {safeActiveTab === 'encierro' && data.retencionVehiculo ? (
              <DetailStack title="Encierro" description="Ingreso y resguardo vehicular.">
                <div className="detail-section-badge">
                  <StatusBadge value={data.estadoOperativoCalculado} />
                </div>
              <InfoGrid
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
            </DetailStack>
          ) : null}

          {safeActiveTab === 'pagos' ? (
            <DetailStack title="Pagos" description="Historial de pagos registrados.">
              <RenderCardList
                items={data.pagos.map((pago) => ({
                  key: pago.idPagoInfraccion,
                  header: (
                    <div>
                      <p className="card-label">Folio pago</p>
                      <h4>{pago.folioPago}</h4>
                    </div>
                  ),
                  meta: <strong>{formatCurrencyMxn(pago.monto)}</strong>,
                  children: (
                    <InfoGrid
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
            </DetailStack>
          ) : null}

          {safeActiveTab === 'liberacion' ? (
            <DetailStack title="Liberacion" description="Liberaciones asociadas a la infraccion.">
              <RenderCardList
                items={data.liberaciones.map((liberacion) => ({
                  key: liberacion.idLiberacionVehiculo,
                  header: (
                    <div>
                      <p className="card-label">Folio liberacion</p>
                      <h4>{liberacion.folioLiberacion}</h4>
                    </div>
                  ),
                  meta: <span>{formatDateTime(liberacion.fechaLiberacion)}</span>,
                  children: (
                    <InfoGrid
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
            </DetailStack>
          ) : null}

          {safeActiveTab === 'salida' ? (
            <DetailStack title="Salida" description="Salida del vehiculo del encierro.">
              <RenderCardList
                items={data.salidas.map((salida) => ({
                  key: salida.idSalidaVehiculo,
                  header: (
                    <div>
                      <p className="card-label">Fecha salida</p>
                      <h4>{formatDateTime(salida.fechaSalida)}</h4>
                    </div>
                  ),
                  meta: <StatusBadge value={salida.estadoSalida} compact />,
                  children: (
                    <InfoGrid
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
            </DetailStack>
          ) : null}

          {safeActiveTab === 'movimientos' ? (
            <DetailStack title="Movimientos" description="Linea de tiempo del expediente.">
              <Timeline
                items={data.movimientos.map((movimiento) => ({
                  id: movimiento.idInfraccionMovimiento,
                  title: formatDateTime(movimiento.fechaMovimiento),
                  meta: <StatusBadge value={movimiento.estatus} compact />,
                  description: (
                    <InfoGrid
                      columns={2}
                      items={[
                        { label: 'Accion', value: formatEmptyValue(movimiento.accion) },
                        { label: 'Usuario', value: formatEmptyValue(movimiento.usuario) },
                        {
                          label: 'Observaciones',
                          value: formatEmptyValue(movimiento.observaciones),
                          span: 2,
                        },
                      ]}
                    />
                  ),
                }))}
              />
            </DetailStack>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
