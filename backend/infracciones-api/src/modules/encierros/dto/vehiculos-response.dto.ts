import { EstadoOperativoVehiculo } from '../../infracciones/constants/estado-operativo-vehiculo.constants';

export interface VehiculoEncierroItemDto {
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
  } | null;
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

export interface VehiculosEncierroResumenPorEncierroDto {
  encierro: string | null;
  total: number;
  sinPago: number;
  pagadosPendienteLiberacion: number;
  liberadosPendienteSalida: number;
  entregados: number;
}

export interface VehiculosEncierroResumenDto {
  totalVehiculosRetenidos: number;
  totalSinPago: number;
  totalPagadosPendienteLiberacion: number;
  totalLiberadosPendienteSalida: number;
  totalEntregados: number;
  porEncierro: VehiculosEncierroResumenPorEncierroDto[];
}

export interface VehiculosEncierroResponseDto {
  data: VehiculoEncierroItemDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
