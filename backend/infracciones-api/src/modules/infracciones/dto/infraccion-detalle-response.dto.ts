import { EstadoOperativoVehiculo } from '../constants/estado-operativo-vehiculo.constants';

export interface InfraccionDetalleMotivoDto {
  idMotivo: number;
  nombreMotivo: string;
  descripcionMotivo: string;
}

export interface InfraccionDetalleRetencionDto {
  idRetencionVehiculo: number;
  encierro: {
    idEncierro: number;
    nombreEncierro: string;
  };
  fechaIngreso: string;
  recibidoPor: string;
  folioResguardo: string | null;
  estadoIngreso: string | null;
  observacionesIngreso: string | null;
}

export interface InfraccionDetallePagoDto {
  idPagoInfraccion: number;
  folioPago: string;
  monto: string;
  fechaPago: string;
  observaciones: string | null;
}

export interface InfraccionDetalleLiberacionDto {
  idLiberacionVehiculo: number;
  folioLiberacion: string;
  fechaLiberacion: string;
  liberadoPor: string;
  nombreRecibeLiberacion: string | null;
  observacion: string | null;
}

export interface InfraccionDetalleSalidaDto {
  idSalidaVehiculo: number;
  fechaSalida: string;
  validadoPor: string;
  personaRecibeVehiculo: string;
  observacionesSalida: string | null;
  estadoSalida: string;
}

export interface InfraccionDetalleMovimientoDto {
  idInfraccionMovimiento: number;
  fechaMovimiento: string;
  estatus: string;
  usuario: string;
  observaciones: string | null;
  accion: string;
}

export interface InfraccionDetalleResponseDto {
  infraccion: {
    idInfraccion: number;
    folioInfraccion: string;
    fechaInfraccion: string;
    horaInfraccion: string;
    observaciones: string | null;
    clavePolicia: string | null;
    numParteInformativo: string | null;
  };
  estatusInfraccion: {
    idEstatusInfraccion: number;
    nombreEstatus: string;
  };
  tipoProcedimiento: {
    idTipoProcedimiento: number;
    claveTipoProcedimiento: string;
    nombreTipoProcedimiento: string;
    esTipoExpediente: boolean;
    requiereFolioInfraccion: boolean;
    requiereNumParteInformativo: boolean;
    requiereMotivos: boolean;
    permiteRetencion: boolean;
    activo: boolean;
  };
  region: {
    idRegion: number;
    nombreRegion: string;
  };
  delegacion: {
    idDelegacion: number;
    nombreDelegacion: string;
  };
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
  motivos: InfraccionDetalleMotivoDto[];
  retencionVehiculo: InfraccionDetalleRetencionDto | null;
  pagos: InfraccionDetallePagoDto[];
  liberaciones: InfraccionDetalleLiberacionDto[];
  salidas: InfraccionDetalleSalidaDto[];
  movimientos: InfraccionDetalleMovimientoDto[];
  estadoOperativoCalculado: EstadoOperativoVehiculo;
}
