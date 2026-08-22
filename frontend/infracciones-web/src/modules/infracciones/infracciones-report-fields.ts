import type { InfraccionListItem } from '../../types/infracciones.types';
import {
  formatCurrencyMxn,
  formatDate,
  formatDateTime,
  formatEmptyValue,
  formatFullName,
  formatTimeOfDay,
} from '../../utils/formatters';

export type InfraccionesReportFieldGroup =
  | 'Infraccion'
  | 'Infractor'
  | 'Vehiculo'
  | 'Ubicacion'
  | 'Motivos'
  | 'Pago'
  | 'Encierro'
  | 'Liberacion'
  | 'Salida'
  | 'Control';

export interface InfraccionesReportFieldDefinition {
  id: string;
  label: string;
  group: InfraccionesReportFieldGroup;
  getValue: (item: InfraccionListItem) => string;
}

const EMPTY_VALUE = 'Sin informacion registrada';

function value(input: unknown): string {
  if (input === null || input === undefined) {
    return EMPTY_VALUE;
  }

  const normalized = String(input).trim();
  return normalized || EMPTY_VALUE;
}

function booleanLabel(input: boolean | null | undefined, yes: string, no: string): string {
  return input ? yes : no;
}

function getInfractorFullName(item: InfraccionListItem): string {
  return formatFullName([
    item.infractor.nombre,
    item.infractor.apellidoPaterno,
    item.infractor.apellidoMaterno,
  ]);
}

function getVehicleSummary(item: InfraccionListItem): string {
  return [item.vehiculo.marca, item.vehiculo.linea, item.vehiculo.clase]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' - ') || EMPTY_VALUE;
}

function getMotivos(item: InfraccionListItem): string {
  return item.motivos
    .map((motivo) => motivo.nombreMotivo || motivo.descripcionMotivo)
    .filter(Boolean)
    .join(', ') || EMPTY_VALUE;
}

function getPagoResumen(item: InfraccionListItem): string {
  if (!item.pago?.tienePago) {
    return 'Sin pago';
  }

  return [
    formatCurrencyMxn(item.pago.montoPagado),
    formatDateTime(item.pago.fechaUltimoPago),
  ].join(' | ');
}

function getLiberacionResumen(item: InfraccionListItem): string {
  if (!item.liberacion?.tieneLiberacion) {
    return 'Sin liberacion';
  }

  return formatDateTime(item.liberacion.fechaLiberacion);
}

function getSalidaResumen(item: InfraccionListItem): string {
  if (!item.salida?.tieneSalida) {
    return 'Sin salida';
  }

  return formatDateTime(item.salida.fechaSalida);
}

export const INFRACCIONES_FIELD_GROUPS: InfraccionesReportFieldGroup[] = [
  'Infraccion',
  'Infractor',
  'Vehiculo',
  'Ubicacion',
  'Motivos',
  'Pago',
  'Encierro',
  'Liberacion',
  'Salida',
  'Control',
];

export const INFRACCIONES_REPORT_FIELDS = [
  { id: 'idInfraccion', label: 'ID infraccion', group: 'Control', getValue: (item) => value(item.idInfraccion) },
  { id: 'folioInfraccion', label: 'Folio infraccion', group: 'Infraccion', getValue: (item) => value(item.folioInfraccion) },
  { id: 'fechaInfraccion', label: 'Fecha infraccion', group: 'Infraccion', getValue: (item) => formatDate(item.fechaInfraccion) },
  { id: 'horaInfraccion', label: 'Hora infraccion', group: 'Infraccion', getValue: (item) => formatTimeOfDay(item.horaInfraccion) },
  { id: 'fechaHora', label: 'Fecha y hora', group: 'Infraccion', getValue: (item) => `${formatDate(item.fechaInfraccion)} ${formatTimeOfDay(item.horaInfraccion)}` },
  { id: 'observaciones', label: 'Observaciones infraccion', group: 'Infraccion', getValue: (item) => formatEmptyValue(item.observaciones) },
  { id: 'clavePolicia', label: 'Clave policia', group: 'Infraccion', getValue: (item) => formatEmptyValue(item.clavePolicia) },
  { id: 'numParteInformativo', label: 'Parte informativo', group: 'Infraccion', getValue: (item) => formatEmptyValue(item.numParteInformativo) },
  { id: 'estatusInfraccionId', label: 'ID estatus infraccion', group: 'Infraccion', getValue: (item) => value(item.estatusInfraccion?.idEstatusInfraccion) },
  { id: 'estatusInfraccionNombre', label: 'Estatus infraccion', group: 'Infraccion', getValue: (item) => value(item.estatusInfraccion?.nombreEstatus) },
  { id: 'tipoProcedimientoId', label: 'ID tipo procedimiento', group: 'Infraccion', getValue: (item) => value(item.tipoProcedimiento?.idTipoProcedimiento) },
  { id: 'tipoProcedimientoNombre', label: 'Tipo procedimiento', group: 'Infraccion', getValue: (item) => value(item.tipoProcedimiento?.nombreTipoProcedimiento) },

  { id: 'infractorNombreCompleto', label: 'Nombre completo infractor', group: 'Infractor', getValue: getInfractorFullName },
  { id: 'infractorNombre', label: 'Nombre infractor', group: 'Infractor', getValue: (item) => value(item.infractor.nombre) },
  { id: 'infractorApellidoPaterno', label: 'Apellido paterno', group: 'Infractor', getValue: (item) => formatEmptyValue(item.infractor.apellidoPaterno) },
  { id: 'infractorApellidoMaterno', label: 'Apellido materno', group: 'Infractor', getValue: (item) => formatEmptyValue(item.infractor.apellidoMaterno) },
  { id: 'licencia', label: 'Licencia', group: 'Infractor', getValue: (item) => formatEmptyValue(item.infractor.licencia) },

  { id: 'vehiculoResumen', label: 'Vehiculo', group: 'Vehiculo', getValue: getVehicleSummary },
  { id: 'placas', label: 'Placas', group: 'Vehiculo', getValue: (item) => formatEmptyValue(item.vehiculo.placas) },
  { id: 'estadoPlacas', label: 'Estado placas', group: 'Vehiculo', getValue: (item) => formatEmptyValue(item.vehiculo.estadoPlacas) },
  { id: 'marca', label: 'Marca', group: 'Vehiculo', getValue: (item) => formatEmptyValue(item.vehiculo.marca) },
  { id: 'linea', label: 'Linea', group: 'Vehiculo', getValue: (item) => formatEmptyValue(item.vehiculo.linea) },
  { id: 'clase', label: 'Clase', group: 'Vehiculo', getValue: (item) => formatEmptyValue(item.vehiculo.clase) },
  { id: 'color', label: 'Color', group: 'Vehiculo', getValue: (item) => formatEmptyValue(item.vehiculo.color) },
  { id: 'serie', label: 'Serie', group: 'Vehiculo', getValue: (item) => formatEmptyValue(item.vehiculo.serie) },
  { id: 'motor', label: 'Motor', group: 'Vehiculo', getValue: (item) => formatEmptyValue(item.vehiculo.motor) },

  { id: 'idRegion', label: 'ID region', group: 'Ubicacion', getValue: (item) => value(item.region?.idRegion) },
  { id: 'nombreRegion', label: 'Region', group: 'Ubicacion', getValue: (item) => value(item.region?.nombreRegion) },
  { id: 'idDelegacion', label: 'ID delegacion', group: 'Ubicacion', getValue: (item) => value(item.delegacion?.idDelegacion) },
  { id: 'nombreDelegacion', label: 'Delegacion', group: 'Ubicacion', getValue: (item) => value(item.delegacion?.nombreDelegacion) },

  { id: 'motivosResumen', label: 'Motivos', group: 'Motivos', getValue: getMotivos },
  { id: 'motivosCantidad', label: 'Cantidad motivos', group: 'Motivos', getValue: (item) => value(item.motivos.length) },
  { id: 'primerMotivo', label: 'Primer motivo', group: 'Motivos', getValue: (item) => value(item.motivos[0]?.nombreMotivo || item.motivos[0]?.descripcionMotivo) },

  { id: 'pagoAccion', label: 'Pago / accion', group: 'Pago', getValue: getPagoResumen },
  { id: 'tienePago', label: 'Tiene pago', group: 'Pago', getValue: (item) => booleanLabel(item.pago?.tienePago, 'Pagada', 'Sin pago') },
  { id: 'idPagoInfraccion', label: 'ID pago', group: 'Pago', getValue: (item) => value(item.pago?.idPagoInfraccion) },
  { id: 'clavesPago', label: 'Claves de pago', group: 'Pago', getValue: (item) => formatEmptyValue(item.pago?.clavesConcepto) },
  { id: 'fechaUltimoPago', label: 'Fecha ultimo pago', group: 'Pago', getValue: (item) => formatDateTime(item.pago?.fechaUltimoPago) },
  { id: 'montoPagado', label: 'Monto pagado', group: 'Pago', getValue: (item) => formatCurrencyMxn(item.pago?.montoPagado) },
  { id: 'pagoResumen', label: 'Resumen pago', group: 'Pago', getValue: getPagoResumen },

  { id: 'encierroAccion', label: 'Encierro / accion', group: 'Encierro', getValue: (item) => item.retencion ? value(item.retencion.encierro) : 'Sin encierro' },
  { id: 'ingresoAccion', label: 'Ingreso encierro', group: 'Encierro', getValue: (item) => item.retencion ? formatDateTime(item.retencion.fechaIngreso) : 'Pendiente de retencion' },
  { id: 'tieneRetencion', label: 'Tiene retencion', group: 'Encierro', getValue: (item) => booleanLabel(Boolean(item.retencion), 'Con retencion', 'Sin retencion') },
  { id: 'idRetencionVehiculo', label: 'ID retencion', group: 'Encierro', getValue: (item) => value(item.retencion?.idRetencionVehiculo) },
  { id: 'encierroNombre', label: 'Nombre encierro', group: 'Encierro', getValue: (item) => formatEmptyValue(item.retencion?.encierro) },
  { id: 'fechaIngreso', label: 'Fecha ingreso encierro', group: 'Encierro', getValue: (item) => formatDateTime(item.retencion?.fechaIngreso) },
  { id: 'folioResguardo', label: 'Folio resguardo', group: 'Encierro', getValue: (item) => formatEmptyValue(item.retencion?.folioResguardo) },
  { id: 'estadoIngreso', label: 'Estado ingreso', group: 'Encierro', getValue: (item) => formatEmptyValue(item.retencion?.estadoIngreso) },

  { id: 'liberacionAccion', label: 'Liberacion / accion', group: 'Liberacion', getValue: getLiberacionResumen },
  { id: 'tieneLiberacion', label: 'Tiene liberacion', group: 'Liberacion', getValue: (item) => booleanLabel(item.liberacion?.tieneLiberacion, 'Liberada', 'Sin liberacion') },
  { id: 'idLiberacionVehiculo', label: 'ID liberacion', group: 'Liberacion', getValue: (item) => value(item.liberacion?.idLiberacionVehiculo) },
  { id: 'fechaLiberacion', label: 'Fecha liberacion', group: 'Liberacion', getValue: (item) => formatDateTime(item.liberacion?.fechaLiberacion) },
  { id: 'liberacionResumen', label: 'Resumen liberacion', group: 'Liberacion', getValue: getLiberacionResumen },

  { id: 'salidaAccion', label: 'Salida / accion', group: 'Salida', getValue: getSalidaResumen },
  { id: 'tieneSalida', label: 'Tiene salida', group: 'Salida', getValue: (item) => booleanLabel(item.salida?.tieneSalida, 'Con salida', 'Sin salida') },
  { id: 'fechaSalida', label: 'Fecha salida', group: 'Salida', getValue: (item) => formatDateTime(item.salida?.fechaSalida) },
  { id: 'salidaResumen', label: 'Resumen salida', group: 'Salida', getValue: getSalidaResumen },

  { id: 'estadoOperativo', label: 'Estado operativo', group: 'Control', getValue: (item) => value(item.estadoOperativoCalculado) },
  { id: 'estadoVehiculoEncierro', label: 'Estado vehiculo en encierro', group: 'Control', getValue: (item) => item.salida?.tieneSalida ? 'Ya salio' : item.retencion ? 'Permanece en encierro' : 'Sin retencion' },
  { id: 'validacionPagoEncierro', label: 'Validacion pago/encierro', group: 'Control', getValue: (item) => `${item.pago?.tienePago ? 'Pago confirmado' : 'Pago pendiente'} | ${item.salida?.tieneSalida ? 'Vehiculo entregado' : item.retencion ? 'Vehiculo en encierro' : 'Sin encierro'}` },
  { id: 'expedienteResumen', label: 'Resumen expediente', group: 'Control', getValue: (item) => `${item.folioInfraccion} | ${getInfractorFullName(item)} | ${formatEmptyValue(item.vehiculo.placas)}` },
] satisfies InfraccionesReportFieldDefinition[];

export type InfraccionesReportFieldId = (typeof INFRACCIONES_REPORT_FIELDS)[number]['id'];

export const DEFAULT_INFRACCIONES_FIELD_IDS: InfraccionesReportFieldId[] = [
  'folioInfraccion',
  'fechaHora',
  'infractorNombreCompleto',
  'placas',
  'vehiculoResumen',
  'encierroAccion',
  'ingresoAccion',
  'pagoAccion',
  'liberacionAccion',
  'salidaAccion',
  'estadoOperativo',
];

export const OPERATIONAL_INFRACCIONES_FIELD_IDS: InfraccionesReportFieldId[] = [
  'folioInfraccion',
  'fechaHora',
  'infractorNombreCompleto',
  'placas',
  'vehiculoResumen',
  'pagoAccion',
  'encierroAccion',
  'salidaAccion',
  'estadoOperativo',
  'validacionPagoEncierro',
];

export function getInfraccionesFieldsByIds(fieldIds: string[]) {
  const selectedIds = new Set(fieldIds);
  return INFRACCIONES_REPORT_FIELDS.filter((field) => selectedIds.has(field.id));
}
