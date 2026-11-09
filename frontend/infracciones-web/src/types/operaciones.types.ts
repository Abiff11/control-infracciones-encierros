export interface RegistrarPagoConceptoPayload {
  claveConcepto: string;
  monto: string;
}

export interface RegistrarPagoPayload {
  idInfraccion: number;
  folioLineaCaptura: string;
  conceptos: RegistrarPagoConceptoPayload[];
  fechaPago?: string;
  observaciones?: string | null;
}

export interface RegistrarNoAplicaPagoPayload {
  idInfraccion: number;
  motivo: string;
}

export interface SolventacionSinPagoApi {
  idSolventacionSinPago: number;
  motivo: string;
  fechaSolventacion: string;
  infraccion?: {
    idInfraccion: number;
  };
  usuarioRegistra?: {
    idUsuario: number;
    nombreUsuario?: string;
  };
}

export interface ConceptoPagoOption {
  idConceptoPago: number;
  claveConcepto: string;
  activo: boolean;
}

export interface PagoConceptoRegistradoApi {
  idPagoConcepto: number;
  monto: string;
  orden: number;
  conceptoPago: ConceptoPagoOption;
}

export interface PagoRegistradoApi {
  idPagoInfraccion: number;
  folioLineaCaptura: string;
  monto: string;
  montoInfraccion: string;
  diasPisoCobrados: number;
  montoDiasPiso: string;
  fechaPago: string;
  observaciones: string | null;
  conceptos: PagoConceptoRegistradoApi[];
}

export interface GenerarLiberacionPayload {
  idInfraccion: number;
  idPagoInfraccion?: number;
  idSolventacionSinPago?: number;
  folioLiberacion: string;
  liberadoPor: string;
  nombreRecibeLiberacion?: string | null;
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
 
export interface RegistrarSalidaAnticipadaPayload {
  idRetencionVehiculo: number;
  folioLiberacionPresentado: string;
  placasCotejadas: string;
  datosVehiculoCotejados: {
    marca?: string;
    linea?: string;
    clase?: string;
    color?: string;
    anioModelo?: number;
    estadoPlacas?: string;
    serie?: string;
    motor?: string;
  };
  autorizacionDocumentalVerificada: true;
  referenciaDocumentoLiberacion: string;
  nombrePropietarioDeclarado: string;
  validadoPor: string;
  personaRecibeVehiculo: string;
  observacionesSalida?: string | null;
  discrepanciaMenor?: {
    motivo: string;
    referenciaEvidencia: string;
  };
}
