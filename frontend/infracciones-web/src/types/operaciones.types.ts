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
