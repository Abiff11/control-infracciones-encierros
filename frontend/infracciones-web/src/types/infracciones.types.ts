import type {
  EstatusInfraccion,
  Region,
  Delegacion,
  TipoProcedimiento,
  Encierro,
} from "./catalogos.types";

export type EstadoOperativoVehiculo =
  | "SIN_RETENCION"
  | "PAGADA_SIN_RETENCION"
  | "EN_ENCIERRO_SIN_PAGO"
  | "PAGADO_PENDIENTE_LIBERACION"
  | "LIBERADO_PENDIENTE_SALIDA"
  | "VEHICULO_ENTREGADO";

export interface InfractorSummary {
  nombre: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  licencia: string | null;
}

export interface VehiculoSummary {
  placas: string | null;
  estadoPlacas: string | null;
  serie: string | null;
  motor: string | null;
  color: string | null;
  marca?: string | null;
  linea?: string | null;
  clase?: string | null;
}

export interface InfraccionListRetencionSummary {
  idRetencionVehiculo: number;
  encierro: string | null;
  fechaIngreso: string | null;
  folioResguardo: string | null;
  estadoIngreso: string | null;
}

export interface InfraccionListPagoSummary {
  tienePago: boolean;
  idPagoInfraccion: number | null;
  fechaUltimoPago: string | null;
  montoPagado: string | null;
  clavesConcepto: string | null;
}

export interface InfraccionListLiberacionSummary {
  tieneLiberacion: boolean;
  idLiberacionVehiculo: number | null;
  fechaLiberacion: string | null;
}

export interface InfraccionListSalidaSummary {
  tieneSalida: boolean;
  fechaSalida: string | null;
}

export interface InfraccionListItem {
  idInfraccion: number;
  folioInfraccion: string;
  fechaInfraccion: string;
  horaInfraccion: string;
  observaciones: string | null;
  clavePolicia: string | null;
  numParteInformativo: string | null;
  infractor: InfractorSummary;
  vehiculo: VehiculoSummary;
  region: Region;
  delegacion: Delegacion;
  encierro?: Encierro | null;
  estatusInfraccion: EstatusInfraccion;
  tipoProcedimiento: TipoProcedimiento;
  motivos: InfraccionMotivoDetalle[];
  retencion?: InfraccionListRetencionSummary | null;
  pago?: InfraccionListPagoSummary;
  liberacion?: InfraccionListLiberacionSummary;
  salida?: InfraccionListSalidaSummary;
  estadoOperativoCalculado: EstadoOperativoVehiculo;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InfraccionesResponse {
  data: InfraccionListItem[];
  meta?: PaginationMeta;
}

export interface InfraccionMotivoDetalle {
  idMotivo: number;
  nombreMotivo: string;
  descripcionMotivo: string;
}

export interface InfraccionDetalleRetencion {
  idRetencionVehiculo: number;
  encierro: Encierro;
  fechaIngreso: string;
  recibidoPor: string;
  folioResguardo: string | null;
  estadoIngreso: string | null;
  observacionesIngreso: string | null;
}

export interface InfraccionDetallePago {
  idPagoInfraccion: number;
  folioPago: string;
  monto: string;
  fechaPago: string;
  observaciones: string | null;
}

export interface InfraccionDetalleLiberacion {
  idLiberacionVehiculo: number;
  folioLiberacion: string;
  fechaLiberacion: string;
  liberadoPor: string;
  nombreRecibeLiberacion: string;
  observacion: string | null;
}

export interface InfraccionDetalleSalida {
  idSalidaVehiculo: number;
  fechaSalida: string;
  validadoPor: string;
  personaRecibeVehiculo: string;
  observacionesSalida: string | null;
  estadoSalida: string;
}

export interface InfraccionDetalleMovimiento {
  idInfraccionMovimiento: number;
  fechaMovimiento: string;
  estatus: string;
  usuario: string;
  observaciones: string | null;
  accion: string;
}

export interface InfraccionDetalleResponse {
  infraccion: {
    idInfraccion: number;
    folioInfraccion: string;
    fechaInfraccion: string;
    horaInfraccion: string;
    observaciones: string | null;
    clavePolicia: string | null;
    numParteInformativo: string | null;
  };
  estatusInfraccion: EstatusInfraccion;
  tipoProcedimiento: TipoProcedimiento;
  region: Region;
  delegacion: Delegacion;
  usuarioCaptura: {
    idUsuario: number;
    nombreUsuario: string;
  };
  infractor: {
    nombre: string;
    apellidoPaterno: string | null;
    apellidoMaterno: string | null;
    licencia: string | null;
    sexo: {
      idSexo: number;
      nombreSexo: string;
    } | null;
  };
  vehiculo: {
    placas: string | null;
    estadoPlacas: string | null;
    serie: string | null;
    motor: string | null;
    anioModelo: number | null;
    color: string | null;
    sitioServicioPublico: string | null;
    claseVehiculo: {
      idClaseVehiculo: number;
      nombreClaseVehiculo: string;
    };
    marcaVehiculo: {
      idMarcaVehiculo: number;
      nombreMarcaVehiculo: string;
    };
    lineaVehiculo: {
      idLineaVehiculo: number;
      nombreLineaVehiculo: string;
    };
    servicio: {
      idServicio: number;
      nombreServicio: string;
    };
  };
  lugarInfraccion: {
    idLugarInfraccion: number;
    nombreLugarInfraccion: string;
  };
  motivos: InfraccionMotivoDetalle[];
  retencionVehiculo: InfraccionDetalleRetencion | null;
  pagos: InfraccionDetallePago[];
  liberaciones: InfraccionDetalleLiberacion[];
  salidas: InfraccionDetalleSalida[];
  movimientos: InfraccionDetalleMovimiento[];
  estadoOperativoCalculado: EstadoOperativoVehiculo;
}

export interface InfraccionFlujoResponse {
  infraccion: InfraccionListItem;
  motivos: unknown[];
  pagos: unknown[];
  liberaciones: unknown[];
  retenciones: unknown[];
  salidas: unknown[];
  movimientos: unknown[];
}

export interface CreateInfractorCaptura {
  idSexo: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  licencia?: string | null;
  curp?: string | null;
}

export interface CreateVehiculoCaptura {
  idClaseVehiculo: number;
  idLineaVehiculo: number;
  idServicio: number;
  anioModelo?: number | null;
  sitioServicioPublico?: string | null;
  color?: string | null;
  placas?: string | null;
  estadoPlacas?: string | null;
  serie?: string | null;
  motor?: string | null;
}

export interface CreateLugarInfraccionCaptura {
  municipio: string;
  colonia?: string | null;
  calle?: string | null;
  numero?: string | null;
}

export interface CreateInfraccionCaptura {
  idDelegacion: number;
  idTipoProcedimiento: number;
  idEstatusInfraccion: number;
  idOperativo?: number | null;
  idEncierro?: number | null;
  folioInfraccion?: string;
  tipoDocumentoReferencia?: string;
  fechaInfraccion: string;
  horaInfraccion: string;
  observaciones?: string | null;
  clavePolicia?: string | null;
  numParteInformativo?: string | null;
  motivos: number[];
}

export interface CreateInfraccionCompletaPayload {
  infractor: CreateInfractorCaptura;
  vehiculo: CreateVehiculoCaptura;
  lugarInfraccion: CreateLugarInfraccionCaptura;
  infraccion: CreateInfraccionCaptura;
}

export interface InfraccionesQuery {
  search?: string;
  folioInfraccion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  idEstatusInfraccion?: number;
  idDelegacion?: number;
  idRegion?: number;
  idTipoProcedimiento?: number;
  idMotivo?: number;
  idEncierro?: number;
  rfc?: string;
  claveOficial?: string;
  placas?: string;
  serie?: string;
  motor?: string;
  nombreInfractor?: string;
  licencia?: string;
  clavePolicia?: string;
  anio?: number;
  estadoOperativo?: EstadoOperativoVehiculo;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export interface RegistrarPagoPayload {
  idInfraccion: number;
  folioPago: string;
  monto: string;
  fechaPago?: string;
  observaciones?: string | null;
}

export interface GenerarLiberacionPayload {
  idInfraccion: number;
  idPagoInfraccion: number;
  folioLiberacion: string;
  liberadoPor: string;
  nombreRecibeLiberacion: string;
  fechaLiberacion?: string;
  observacion?: string | null;
}

export interface RegistrarRetencionPayload {
  idInfraccion: number;
  idEncierro: number;
  recibidoPor: string;
  fechaIngreso?: string;
  folioResguardo?: string | null;
  observacionesIngreso?: string | null;
  estadoIngreso?: string | null;
}

export interface RegistrarSalidaPayload {
  idRetencionVehiculo: number;
  idLiberacionVehiculo: number;
  validadoPor: string;
  personaRecibeVehiculo: string;
  fechaSalida?: string;
  observacionesSalida?: string | null;
  estadoSalida: string;
}
