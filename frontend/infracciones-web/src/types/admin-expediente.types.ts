export interface AdminExpedienteInfraccion {
  idInfraccion: number;
  idInfractor: number;
  idVehiculo: number;
  idLugarInfraccion: number;
  idDelegacion: number;
  idTipoProcedimiento: number;
  idEstatusInfraccion: number;
  idOperativo: number | null;
  folioInfraccion: string;
  fechaInfraccion: string;
  horaInfraccion: string;
  observaciones: string | null;
  clavePolicia: string | null;
  numParteInformativo: string | null;
  idSexo: number;
  nombre: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  licencia: string | null;
  curp: string | null;
  idClaseVehiculo: number;
  idLineaVehiculo: number;
  idServicio: number;
  anioModelo: number | null;
  sitioServicioPublico: string | null;
  color: string | null;
  placas: string | null;
  estadoPlacas: string | null;
  serie: string | null;
  motor: string | null;
  nombreLugarInfraccion: string;
}

export interface AdminPagoConceptoSnapshot {
  idPagoConcepto: number;
  claveConcepto: string;
  monto: string;
  orden: number;
}

export interface AdminPagoSnapshot {
  idPagoInfraccion: number;
  folioLineaCaptura: string;
  monto: string;
  montoInfraccion: string;
  diasPisoCobrados: number;
  montoDiasPiso: string;
  fechaPago: string;
  observaciones: string | null;
  conceptos: AdminPagoConceptoSnapshot[];
}

export interface AdminRetencionSnapshot {
  idRetencionVehiculo: number;
  idEncierro: number;
  fechaIngreso: string;
  recibidoPor: string;
  folioResguardo: string | null;
  observacionesIngreso: string | null;
  estadoIngreso: string | null;
}

export interface AdminLiberacionSnapshot {
  idLiberacionVehiculo: number;
  idPagoInfraccion: number;
  folioLiberacion: string;
  fechaLiberacion: string;
  liberadoPor: string;
  nombreRecibeLiberacion: string | null;
  observacion: string | null;
}

export interface AdminSalidaSnapshot {
  idSalidaVehiculo: number;
  idRetencionVehiculo: number;
  idLiberacionVehiculo: number;
  fechaSalida: string;
  validadoPor: string;
  personaRecibeVehiculo: string;
  observacionesSalida: string | null;
  estadoSalida: string;
}

export interface AdminExpedienteSnapshot {
  versionExpediente: string;
  infraccion: AdminExpedienteInfraccion;
  motivos: number[];
  retencion: AdminRetencionSnapshot | null;
  pagos: AdminPagoSnapshot[];
  liberaciones: AdminLiberacionSnapshot[];
  salidas: AdminSalidaSnapshot[];
}

export interface AdminActualizarPagoConceptoPayload {
  claveConcepto: string;
  monto: string;
}

export interface AdminActualizarExpedientePayload {
  versionExpediente: string;
  motivoEdicion: string;
  infraccion?: {
    idDelegacion?: number;
    idTipoProcedimiento?: number;
    idEstatusInfraccion?: number;
    idOperativo?: number | null;
    folioInfraccion?: string;
    fechaInfraccion?: string;
    horaInfraccion?: string;
    observaciones?: string | null;
    clavePolicia?: string | null;
    numParteInformativo?: string | null;
    motivos?: number[];
  };
  infractor?: {
    idSexo?: number;
    nombre?: string;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
    licencia?: string | null;
    curp?: string | null;
  };
  vehiculo?: {
    idClaseVehiculo?: number;
    idLineaVehiculo?: number;
    idServicio?: number;
    anioModelo?: number | null;
    sitioServicioPublico?: string | null;
    color?: string | null;
    placas?: string | null;
    estadoPlacas?: string | null;
    serie?: string | null;
    motor?: string | null;
  };
  lugarInfraccion?: {
    nombreLugarInfraccion: string;
  };
  retencion?: {
    idRetencionVehiculo: number;
    idEncierro?: number;
    fechaIngreso?: string;
    recibidoPor?: string;
    folioResguardo?: string | null;
    observacionesIngreso?: string | null;
    estadoIngreso?: string | null;
  };
  pagos?: Array<{
    idPagoInfraccion: number;
    folioLineaCaptura?: string;
    fechaPago?: string;
    observaciones?: string | null;
    conceptos?: AdminActualizarPagoConceptoPayload[];
  }>;
  liberaciones?: Array<{
    idLiberacionVehiculo: number;
    folioLiberacion?: string;
    fechaLiberacion?: string;
    liberadoPor?: string;
    nombreRecibeLiberacion?: string | null;
    observacion?: string | null;
  }>;
  salidas?: Array<{
    idSalidaVehiculo: number;
    fechaSalida?: string;
    validadoPor?: string;
    personaRecibeVehiculo?: string;
    observacionesSalida?: string | null;
    estadoSalida?: string;
  }>;
}

export interface AdminEliminarInfraccionPayload {
  versionExpediente: string;
  folioConfirmacion: string;
  motivoEliminacion: string;
}

export interface AdminEliminarInfraccionResponse {
  idInfraccion: number;
  folioInfraccion: string;
  eliminado: true;
  relacionesEliminadas: Record<string, number>;
}
