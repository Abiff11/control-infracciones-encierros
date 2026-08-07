import {
  ESTADO_OPERATIVO_VEHICULO,
  type EstadoOperativoVehiculo,
} from '../constants/estado-operativo-vehiculo.constants';

interface ResolveEstadoOperativoParams {
  permiteRetencion: boolean;
  hasRetencion: boolean;
  hasPago: boolean;
  hasLiberacion: boolean;
  hasSalida: boolean;
}

export function resolveEstadoOperativoVehiculo(
  params: ResolveEstadoOperativoParams,
): EstadoOperativoVehiculo {
  if (params.hasSalida) {
    return ESTADO_OPERATIVO_VEHICULO.VEHICULO_ENTREGADO;
  }

  if (!params.permiteRetencion) {
    return params.hasPago
      ? ESTADO_OPERATIVO_VEHICULO.PAGADA_SIN_RETENCION
      : ESTADO_OPERATIVO_VEHICULO.SIN_RETENCION;
  }

  if (!params.hasRetencion) {
    return ESTADO_OPERATIVO_VEHICULO.SIN_RETENCION;
  }

  if (params.hasLiberacion) {
    return ESTADO_OPERATIVO_VEHICULO.LIBERADO_PENDIENTE_SALIDA;
  }

  if (params.hasPago) {
    return ESTADO_OPERATIVO_VEHICULO.PAGADO_PENDIENTE_LIBERACION;
  }

  return ESTADO_OPERATIVO_VEHICULO.EN_ENCIERRO_SIN_PAGO;
}
