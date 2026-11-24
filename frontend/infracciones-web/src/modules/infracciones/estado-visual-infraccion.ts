import type {
  EstadoOperativoVehiculo,
  InfraccionDetalleResponse,
  InfraccionListItem,
} from "../../types/infracciones.types";

export interface EstadoVisualInfraccion {
  value: EstadoOperativoVehiculo;
  label?: string;
}

interface EstadoVisualDatos {
  estadoOperativoCalculado: EstadoOperativoVehiculo;
  estatusInfraccion: string;
  permiteRetencion: boolean;
  tienePagoReal: boolean;
  tieneRetencion: boolean;
  tieneLiberacion: boolean;
  tieneSalida: boolean;
}

function resolverEstadoVisual({
  estadoOperativoCalculado,
  estatusInfraccion,
  permiteRetencion,
  tienePagoReal,
  tieneRetencion,
  tieneLiberacion,
  tieneSalida,
}: EstadoVisualDatos): EstadoVisualInfraccion {
  // La entrega fisica prevalece, aun si falta regularizacion administrativa.
  if (tieneSalida) {
    return { value: "VEHICULO_ENTREGADO" };
  }

  // Una solventacion nunca se presenta como pago real.
  if (estatusInfraccion !== "SOLVENTADA_SIN_PAGO" || tienePagoReal) {
    return { value: estadoOperativoCalculado };
  }

  if (!tieneRetencion) {
    return {
      value: permiteRetencion ? estadoOperativoCalculado : "PAGADA_SIN_RETENCION",
      label: "Solventada sin pago",
    };
  }

  if (!tieneLiberacion) {
    return {
      value: "PAGADO_PENDIENTE_LIBERACION",
      label: "Solventada, pendiente de liberacion",
    };
  }

  return { value: "LIBERADO_PENDIENTE_SALIDA" };
}

export function getEstadoVisualListado(
  item: InfraccionListItem,
): EstadoVisualInfraccion {
  return resolverEstadoVisual({
    estadoOperativoCalculado: item.estadoOperativoCalculado,
    estatusInfraccion: item.estatusInfraccion.nombreEstatus,
    permiteRetencion: item.tipoProcedimiento.permiteRetencion,
    tienePagoReal: item.pago?.tienePago === true,
    tieneRetencion: Boolean(item.retencion),
    tieneLiberacion: item.liberacion?.tieneLiberacion === true,
    tieneSalida: item.salida?.tieneSalida === true,
  });
}

export function getEstadoVisualDetalle(
  data: InfraccionDetalleResponse,
): EstadoVisualInfraccion {
  return resolverEstadoVisual({
    estadoOperativoCalculado: data.estadoOperativoCalculado,
    estatusInfraccion: data.estatusInfraccion.nombreEstatus,
    permiteRetencion: data.tipoProcedimiento.permiteRetencion,
    tienePagoReal: data.pagos.length > 0,
    tieneRetencion: data.retencionVehiculo !== null,
    tieneLiberacion: data.liberaciones.length > 0,
    tieneSalida: data.salidas.length > 0,
  });
}
