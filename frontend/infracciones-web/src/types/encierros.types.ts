import type { EstadoOperativoVehiculo } from './infracciones.types';

export interface VehiculoEncierroItem {
  idInfraccion: number;
  idRetencionVehiculo: number;
  folioInfraccion: string;
  fechaInfraccion: string;
  horaInfraccion: string;
  infractorNombreCompleto: string;
  licencia: string | null;
  vehiculo: {
    placas: string | null;
    marca: string | null;
    linea: string | null;
    clase: string | null;
    color: string | null;
    serie: string | null;
    motor: string | null;
  };
  region: string | null;
  delegacion: string | null;
  retencion: {
    idRetencionVehiculo: number;
    encierro: string | null;
    fechaIngreso: string;
    folioResguardo: string | null;
    estadoIngreso: string | null;
  };
  pago: {
    tienePago: boolean;
    fechaUltimoPago: string | null;
    montoPagado: string | null;
  };
  liberacion: {
    tieneLiberacion: boolean;
    fechaLiberacion: string | null;
  };
  salida: {
    tieneSalida: boolean;
    fechaSalida: string | null;
  };
  estadoOperativo: EstadoOperativoVehiculo;
}

export interface VehiculosEncierroMeta {
  page: number;
  limit: number;
  total: number;
}

export interface VehiculosEncierroResponse {
  data: VehiculoEncierroItem[];
  meta: VehiculosEncierroMeta;
}

export interface VehiculosEncierroResumenPorEncierro {
  encierro: string;
  total: number;
  sinPago: number;
  pagadosPendienteLiberacion: number;
  liberadosPendienteSalida: number;
  entregados: number;
}

export interface VehiculosEncierroResumen {
  totalVehiculosRetenidos: number;
  totalSinPago: number;
  totalPagadosPendienteLiberacion: number;
  totalLiberadosPendienteSalida: number;
  totalEntregados: number;
  porEncierro: VehiculosEncierroResumenPorEncierro[];
}

export interface VehiculosEncierroQuery {
  search?: string;
  idEncierro?: number;
  idRegion?: number;
  idDelegacion?: number;
  anio?: number;
  folioInfraccion?: string;
  placas?: string;
  serie?: string;
  motor?: string;
  nombreInfractor?: string;
  licencia?: string;
  estadoOperativo?: EstadoOperativoVehiculo;
  fechaIngresoDesde?: string;
  fechaIngresoHasta?: string;
  fechaInfraccionDesde?: string;
  fechaInfraccionHasta?: string;
  conPago?: boolean;
  conLiberacion?: boolean;
  conSalida?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}
