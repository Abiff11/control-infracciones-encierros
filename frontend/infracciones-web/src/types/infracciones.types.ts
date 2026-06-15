import type { EstatusInfraccion } from './catalogos.types';

export interface InfractorSummary {
  nombre: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
}

export interface VehiculoSummary {
  placas: string | null;
}

export interface InfraccionListItem {
  idInfraccion: number;
  folioInfraccion: string;
  fechaInfraccion: string;
  horaInfraccion: string;
  infractor: InfractorSummary;
  vehiculo: VehiculoSummary;
  estatusInfraccion: EstatusInfraccion;
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
  folioInfraccion: string;
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
  folioInfraccion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  idEstatusInfraccion?: number;
  idDelegacion?: number;
  placas?: string;
  nombreInfractor?: string;
  anio?: number;
  page?: number;
  limit?: number;
}
