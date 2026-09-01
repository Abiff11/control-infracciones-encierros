import type { InfraccionesListService } from './infracciones-list.service';

type InfraccionExportRow = Awaited<
  ReturnType<InfraccionesListService['findForReportExportBlock']>
>[number];
type ExcelCellValue = string | number | null;

interface ExcelFieldDefinition {
  label: string;
  getValue: (row: InfraccionExportRow) => ExcelCellValue;
}

const EMPTY_VALUE = 'Sin informacion registrada';

function value(input: unknown): string {
  if (
    input === null ||
    input === undefined ||
    (typeof input !== 'string' && typeof input !== 'number')
  ) {
    return EMPTY_VALUE;
  }

  const normalized = String(input).trim();
  return normalized || EMPTY_VALUE;
}

function nullableValue(input: unknown): string {
  return input === null ||
    input === undefined ||
    (typeof input !== 'string' && typeof input !== 'number') ||
    String(input).trim() === ''
    ? EMPTY_VALUE
    : String(input);
}

function booleanLabel(input: boolean | undefined, yes: string, no: string): string {
  return input ? yes : no;
}

function fullName(row: InfraccionExportRow): string {
  return [
    row.infractor.nombre,
    row.infractor.apellidoPaterno,
    row.infractor.apellidoMaterno,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ') || EMPTY_VALUE;
}

function vehiculoResumen(row: InfraccionExportRow): string {
  return [row.vehiculo.marca, row.vehiculo.linea, row.vehiculo.clase]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' - ') || EMPTY_VALUE;
}

function motivosResumen(row: InfraccionExportRow): string {
  return row.motivos
    .map((motivo) => motivo.nombreMotivo || motivo.descripcionMotivo)
    .filter(Boolean)
    .join(', ') || EMPTY_VALUE;
}

function pagoResumen(row: InfraccionExportRow): string {
  if (!row.pago.tienePago) {
    return 'Sin pago';
  }

  return [nullableValue(row.pago.montoPagado), nullableValue(row.pago.fechaUltimoPago)].join(' | ');
}

function liberacionResumen(row: InfraccionExportRow): string {
  return row.liberacion.tieneLiberacion
    ? nullableValue(row.liberacion.fechaLiberacion)
    : 'Sin liberacion';
}

function salidaResumen(row: InfraccionExportRow): string {
  return row.salida.tieneSalida ? nullableValue(row.salida.fechaSalida) : 'Sin salida';
}

export const INFRACCIONES_EXCEL_FIELDS: Record<string, ExcelFieldDefinition> = {
  idInfraccion: { label: 'ID infraccion', getValue: (row) => row.idInfraccion },
  folioInfraccion: { label: 'Folio infraccion', getValue: (row) => row.folioInfraccion },
  fechaInfraccion: { label: 'Fecha infraccion', getValue: (row) => row.fechaInfraccion },
  horaInfraccion: { label: 'Hora infraccion', getValue: (row) => row.horaInfraccion },
  fechaHora: { label: 'Fecha y hora', getValue: (row) => `${row.fechaInfraccion} ${row.horaInfraccion}` },
  observaciones: { label: 'Observaciones infraccion', getValue: (row) => nullableValue(row.observaciones) },
  clavePolicia: { label: 'Clave policia', getValue: (row) => nullableValue(row.clavePolicia) },
  numParteInformativo: { label: 'Parte informativo', getValue: (row) => nullableValue(row.numParteInformativo) },
  estatusInfraccionId: { label: 'ID estatus infraccion', getValue: (row) => row.estatusInfraccion.idEstatusInfraccion },
  estatusInfraccionNombre: { label: 'Estatus infraccion', getValue: (row) => value(row.estatusInfraccion.nombreEstatus) },
  tipoProcedimientoId: { label: 'ID tipo procedimiento', getValue: (row) => row.tipoProcedimiento.idTipoProcedimiento },
  tipoProcedimientoNombre: { label: 'Tipo procedimiento', getValue: (row) => value(row.tipoProcedimiento.nombreTipoProcedimiento) },
  infractorNombreCompleto: { label: 'Nombre completo infractor', getValue: fullName },
  infractorNombre: { label: 'Nombre infractor', getValue: (row) => value(row.infractor.nombre) },
  infractorApellidoPaterno: { label: 'Apellido paterno', getValue: (row) => nullableValue(row.infractor.apellidoPaterno) },
  infractorApellidoMaterno: { label: 'Apellido materno', getValue: (row) => nullableValue(row.infractor.apellidoMaterno) },
  licencia: { label: 'Licencia', getValue: (row) => nullableValue(row.infractor.licencia) },
  vehiculoResumen: { label: 'Vehiculo', getValue: vehiculoResumen },
  placas: { label: 'Placas', getValue: (row) => nullableValue(row.vehiculo.placas) },
  estadoPlacas: { label: 'Estado placas', getValue: (row) => nullableValue(row.vehiculo.estadoPlacas) },
  marca: { label: 'Marca', getValue: (row) => nullableValue(row.vehiculo.marca) },
  linea: { label: 'Linea', getValue: (row) => nullableValue(row.vehiculo.linea) },
  clase: { label: 'Clase', getValue: (row) => nullableValue(row.vehiculo.clase) },
  color: { label: 'Color', getValue: (row) => nullableValue(row.vehiculo.color) },
  serie: { label: 'Serie', getValue: (row) => nullableValue(row.vehiculo.serie) },
  motor: { label: 'Motor', getValue: (row) => nullableValue(row.vehiculo.motor) },
  idRegion: { label: 'ID region', getValue: (row) => row.region.idRegion },
  nombreRegion: { label: 'Region', getValue: (row) => value(row.region.nombreRegion) },
  idDelegacion: { label: 'ID delegacion', getValue: (row) => row.delegacion.idDelegacion },
  nombreDelegacion: { label: 'Delegacion', getValue: (row) => value(row.delegacion.nombreDelegacion) },
  motivosResumen: { label: 'Motivos', getValue: motivosResumen },
  motivosCantidad: { label: 'Cantidad motivos', getValue: (row) => row.motivos.length },
  primerMotivo: { label: 'Primer motivo', getValue: (row) => value(row.motivos[0]?.nombreMotivo || row.motivos[0]?.descripcionMotivo) },
  pagoAccion: { label: 'Pago / accion', getValue: pagoResumen },
  tienePago: { label: 'Tiene pago', getValue: (row) => booleanLabel(row.pago.tienePago, 'Pagada', 'Sin pago') },
  idPagoInfraccion: { label: 'ID pago', getValue: (row) => row.pago.idPagoInfraccion ?? EMPTY_VALUE },
  clavesPago: { label: 'Claves de pago', getValue: (row) => nullableValue(row.pago.clavesConcepto) },
  fechaUltimoPago: { label: 'Fecha ultimo pago', getValue: (row) => nullableValue(row.pago.fechaUltimoPago) },
  montoPagado: { label: 'Monto pagado', getValue: (row) => nullableValue(row.pago.montoPagado) },
  pagoResumen: { label: 'Resumen pago', getValue: pagoResumen },
  encierroAccion: { label: 'Encierro / accion', getValue: (row) => row.retencion ? value(row.retencion.encierro) : 'Sin encierro' },
  ingresoAccion: { label: 'Ingreso encierro', getValue: (row) => row.retencion ? nullableValue(row.retencion.fechaIngreso) : 'Pendiente de retencion' },
  tieneRetencion: { label: 'Tiene retencion', getValue: (row) => booleanLabel(Boolean(row.retencion), 'Con retencion', 'Sin retencion') },
  idRetencionVehiculo: { label: 'ID retencion', getValue: (row) => row.retencion?.idRetencionVehiculo ?? EMPTY_VALUE },
  encierroNombre: { label: 'Nombre encierro', getValue: (row) => nullableValue(row.retencion?.encierro) },
  fechaIngreso: { label: 'Fecha ingreso encierro', getValue: (row) => nullableValue(row.retencion?.fechaIngreso) },
  folioResguardo: { label: 'Folio resguardo', getValue: (row) => nullableValue(row.retencion?.folioResguardo) },
  estadoIngreso: { label: 'Estado ingreso', getValue: (row) => nullableValue(row.retencion?.estadoIngreso) },
  liberacionAccion: { label: 'Liberacion / accion', getValue: liberacionResumen },
  tieneLiberacion: { label: 'Tiene liberacion', getValue: (row) => booleanLabel(row.liberacion.tieneLiberacion, 'Liberada', 'Sin liberacion') },
  idLiberacionVehiculo: { label: 'ID liberacion', getValue: (row) => row.liberacion.idLiberacionVehiculo ?? EMPTY_VALUE },
  fechaLiberacion: { label: 'Fecha liberacion', getValue: (row) => nullableValue(row.liberacion.fechaLiberacion) },
  liberacionResumen: { label: 'Resumen liberacion', getValue: liberacionResumen },
  salidaAccion: { label: 'Salida / accion', getValue: salidaResumen },
  tieneSalida: { label: 'Tiene salida', getValue: (row) => booleanLabel(row.salida.tieneSalida, 'Con salida', 'Sin salida') },
  fechaSalida: { label: 'Fecha salida', getValue: (row) => nullableValue(row.salida.fechaSalida) },
  salidaResumen: { label: 'Resumen salida', getValue: salidaResumen },
  estadoOperativo: { label: 'Estado operativo', getValue: (row) => row.estadoOperativoCalculado },
  estadoVehiculoEncierro: { label: 'Estado vehiculo en encierro', getValue: (row) => row.salida.tieneSalida ? 'Ya salio' : row.retencion ? 'Permanece en encierro' : 'Sin retencion' },
  validacionPagoEncierro: { label: 'Validacion pago/encierro', getValue: (row) => `${row.pago.tienePago ? 'Pago confirmado' : 'Pago pendiente'} | ${row.salida.tieneSalida ? 'Vehiculo entregado' : row.retencion ? 'Vehiculo en encierro' : 'Sin encierro'}` },
  expedienteResumen: { label: 'Resumen expediente', getValue: (row) => `${row.folioInfraccion} | ${fullName(row)} | ${nullableValue(row.vehiculo.placas)}` },
};

export function resolveInfraccionesExcelFields(fieldIds: string[]): ExcelFieldDefinition[] {
  const fields = fieldIds.map((fieldId) => INFRACCIONES_EXCEL_FIELDS[fieldId]);

  if (fields.some((field) => !field)) {
    throw new Error('Se solicitaron campos no permitidos para el reporte Excel.');
  }

  return fields;
}
