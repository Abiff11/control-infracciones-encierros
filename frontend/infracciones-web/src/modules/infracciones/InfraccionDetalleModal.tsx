import type { ReactNode } from 'react';

import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { InfraccionDetalleResponse } from '../../types/infracciones.types';

interface InfraccionDetalleModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  data: InfraccionDetalleResponse | null;
  onClose: () => void;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Sin información registrada';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function formatText(value: string | null | undefined): string {
  return value?.trim() || 'Sin información registrada';
}

function renderEmptyState() {
  return <div className="notice">Sin información registrada.</div>;
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="detail-block">
      <div className="page-stack">
        <div className="panel-header">
          <div>
            <p className="section-label">Detalle</p>
            <h3>{title}</h3>
          </div>
        </div>
        {children}
      </div>
    </Card>
  );
}

export function InfraccionDetalleModal({
  data,
  error,
  loading,
  onClose,
  open,
}: InfraccionDetalleModalProps) {
  return (
    <Modal
      open={open}
      title={data?.infraccion.folioInfraccion ?? 'Detalle de infracción'}
      description="Vista completa del expediente operativo."
      onClose={onClose}
    >
      {loading ? <div className="notice">Cargando detalle...</div> : null}
      {error ? <div className="notice notice-error">{error}</div> : null}
      {!loading && !error && data ? (
        <div className="detail-grid">
          <Card className="detail-hero">
            <div className="page-stack">
              <div className="panel-header">
                <div>
                  <p className="section-label">Resumen</p>
                  <h3>{data.infraccion.folioInfraccion}</h3>
                  <p className="page-description">
                    {formatText(data.infractor.nombre)}{' '}
                    {formatText(data.infractor.apellidoPaterno)}{' '}
                    {formatText(data.infractor.apellidoMaterno)}
                  </p>
                </div>

                <StatusBadge value={data.estadoOperativoCalculado} />
              </div>

              <dl className="result-summary">
                <div className="result-summary-item">
                  <dt>Fecha</dt>
                  <dd>{formatDateTime(data.infraccion.fechaInfraccion)}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Hora</dt>
                  <dd>{data.infraccion.horaInfraccion}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Estatus</dt>
                  <dd>{data.estatusInfraccion.nombreEstatus}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Tipo procedimiento</dt>
                  <dd>{data.tipoProcedimiento.nombreTipoProcedimiento}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Region</dt>
                  <dd>{data.region.nombreRegion}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Delegacion</dt>
                  <dd>{data.delegacion.nombreDelegacion}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <DetailBlock title="Infractor">
            <dl className="detail-dl">
              <div>
                <dt>Nombre</dt>
                <dd>{formatText(data.infractor.nombre)}</dd>
              </div>
              <div>
                <dt>Apellido paterno</dt>
                <dd>{formatText(data.infractor.apellidoPaterno)}</dd>
              </div>
              <div>
                <dt>Apellido materno</dt>
                <dd>{formatText(data.infractor.apellidoMaterno)}</dd>
              </div>
              <div>
                <dt>Licencia</dt>
                <dd>{formatText(data.infractor.licencia)}</dd>
              </div>
              <div>
                <dt>Sexo</dt>
                <dd>{data.infractor.sexo?.nombreSexo ?? 'Sin información registrada'}</dd>
              </div>
            </dl>
          </DetailBlock>

          <DetailBlock title="Vehiculo">
            <dl className="detail-dl detail-dl-wide">
              <div>
                <dt>Placas</dt>
                <dd>{formatText(data.vehiculo.placas)}</dd>
              </div>
              <div>
                <dt>Estado placas</dt>
                <dd>{formatText(data.vehiculo.estadoPlacas)}</dd>
              </div>
              <div>
                <dt>Serie</dt>
                <dd>{formatText(data.vehiculo.serie)}</dd>
              </div>
              <div>
                <dt>Motor</dt>
                <dd>{formatText(data.vehiculo.motor)}</dd>
              </div>
              <div>
                <dt>Modelo</dt>
                <dd>{data.vehiculo.anioModelo ?? 'Sin información registrada'}</dd>
              </div>
              <div>
                <dt>Color</dt>
                <dd>{formatText(data.vehiculo.color)}</dd>
              </div>
              <div>
                <dt>Clase</dt>
                <dd>{data.vehiculo.claseVehiculo.nombreClaseVehiculo}</dd>
              </div>
              <div>
                <dt>Marca</dt>
                <dd>{data.vehiculo.marcaVehiculo.nombreMarcaVehiculo}</dd>
              </div>
              <div>
                <dt>Linea</dt>
                <dd>{data.vehiculo.lineaVehiculo.nombreLineaVehiculo}</dd>
              </div>
              <div>
                <dt>Servicio</dt>
                <dd>{data.vehiculo.servicio.nombreServicio}</dd>
              </div>
              <div className="detail-span-2">
                <dt>Sitio servicio publico</dt>
                <dd>{formatText(data.vehiculo.sitioServicioPublico)}</dd>
              </div>
            </dl>
          </DetailBlock>

          <DetailBlock title="Lugar">
            <dl className="detail-dl">
              <div className="detail-span-2">
                <dt>Lugar de infraccion</dt>
                <dd>{data.lugarInfraccion.nombreLugarInfraccion}</dd>
              </div>
              <div>
                <dt>Clave policia</dt>
                <dd>{formatText(data.infraccion.clavePolicia)}</dd>
              </div>
              <div>
                <dt>Parte informativo</dt>
                <dd>{formatText(data.infraccion.numParteInformativo)}</dd>
              </div>
              <div className="detail-span-2">
                <dt>Observaciones</dt>
                <dd>{formatText(data.infraccion.observaciones)}</dd>
              </div>
            </dl>
          </DetailBlock>

          <DetailBlock title="Motivos">
            {data.motivos.length === 0 ? (
              renderEmptyState()
            ) : (
              <ul className="tag-list">
                {data.motivos.map((motivo) => (
                  <li key={motivo.idMotivo} className="tag-item">
                    <strong>{motivo.nombreMotivo}</strong>
                    <span>{formatText(motivo.descripcionMotivo)}</span>
                  </li>
                ))}
              </ul>
            )}
          </DetailBlock>

          <DetailBlock title="Encierro">
            {data.retencionVehiculo ? (
              <dl className="detail-dl">
                <div>
                  <dt>Encierro</dt>
                  <dd>{data.retencionVehiculo.encierro.nombreEncierro}</dd>
                </div>
                <div>
                  <dt>Fecha ingreso</dt>
                  <dd>{formatDateTime(data.retencionVehiculo.fechaIngreso)}</dd>
                </div>
                <div>
                  <dt>Recibido por</dt>
                  <dd>{formatText(data.retencionVehiculo.recibidoPor)}</dd>
                </div>
                <div>
                  <dt>Folio resguardo</dt>
                  <dd>{formatText(data.retencionVehiculo.folioResguardo)}</dd>
                </div>
                <div>
                  <dt>Estado ingreso</dt>
                  <dd>{formatText(data.retencionVehiculo.estadoIngreso)}</dd>
                </div>
                <div className="detail-span-2">
                  <dt>Observaciones ingreso</dt>
                  <dd>{formatText(data.retencionVehiculo.observacionesIngreso)}</dd>
                </div>
              </dl>
            ) : (
              renderEmptyState()
            )}
          </DetailBlock>

          <DetailBlock title="Pagos">
            {data.pagos.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Fecha</th>
                      <th>Monto</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pagos.map((pago) => (
                      <tr key={pago.idPagoInfraccion}>
                        <td>{pago.folioPago}</td>
                        <td>{formatDateTime(pago.fechaPago)}</td>
                        <td>{pago.monto}</td>
                        <td>{formatText(pago.observaciones)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailBlock>

          <DetailBlock title="Liberacion">
            {data.liberaciones.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Fecha</th>
                      <th>Liberado por</th>
                      <th>Recibe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.liberaciones.map((liberacion) => (
                      <tr key={liberacion.idLiberacionVehiculo}>
                        <td>{liberacion.folioLiberacion}</td>
                        <td>{formatDateTime(liberacion.fechaLiberacion)}</td>
                        <td>{formatText(liberacion.liberadoPor)}</td>
                        <td>{formatText(liberacion.nombreRecibeLiberacion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailBlock>

          <DetailBlock title="Salida">
            {data.salidas.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Validado por</th>
                      <th>Recibe</th>
                      <th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.salidas.map((salida) => (
                      <tr key={salida.idSalidaVehiculo}>
                        <td>{formatDateTime(salida.fechaSalida)}</td>
                        <td>{formatText(salida.validadoPor)}</td>
                        <td>{formatText(salida.personaRecibeVehiculo)}</td>
                        <td>{formatText(salida.estadoSalida)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailBlock>

          <DetailBlock title="Movimientos">
            {data.movimientos.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Estatus</th>
                      <th>Usuario</th>
                      <th>Accion</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.movimientos.map((movimiento) => (
                      <tr key={movimiento.idInfraccionMovimiento}>
                        <td>{formatDateTime(movimiento.fechaMovimiento)}</td>
                        <td>{movimiento.estatus}</td>
                        <td>{movimiento.usuario}</td>
                        <td>{movimiento.accion}</td>
                        <td>{formatText(movimiento.observaciones)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailBlock>
        </div>
      ) : null}
    </Modal>
  );
}
