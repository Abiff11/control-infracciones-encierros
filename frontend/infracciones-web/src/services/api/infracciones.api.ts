import { buildQuery, request } from './apiClient';
import { getPagosByInfraccion } from './pagos.api';
import type {
  AdminActualizarExpedientePayload,
  AdminEliminarInfraccionPayload,
  AdminEliminarInfraccionResponse,
  AdminExpedienteSnapshot,
} from '../../types/admin-expediente.types';
import type {
  CreateInfraccionCompletaPayload,
  InfraccionDetalleResponse,
  InfraccionFlujoResponse,
  InfraccionesQuery,
  InfraccionesResponse,
} from '../../types/infracciones.types';

const DEFAULT_INFRACCIONES_LIMIT = 30;
const LEGACY_INFRACCIONES_LIMIT = 10;

function normalizeInfraccionesQuery(query?: InfraccionesQuery): InfraccionesQuery {
  const limit = query?.limit;

  return {
    ...query,
    limit:
      limit === undefined || limit === LEGACY_INFRACCIONES_LIMIT
        ? DEFAULT_INFRACCIONES_LIMIT
        : limit,
  };
}

export function getInfracciones(
  token: string,
  query?: InfraccionesQuery,
): Promise<InfraccionesResponse> {
  return request<InfraccionesResponse>(
    `/infracciones${buildQuery(normalizeInfraccionesQuery(query))}`,
    {},
    token,
  );
}

export function getInfraccionFlujo(
  token: string,
  folioInfraccion: string,
): Promise<InfraccionFlujoResponse> {
  return request<InfraccionFlujoResponse>(
    `/infracciones/${encodeURIComponent(folioInfraccion)}/flujo`,
    {},
    token,
  );
}

export async function getInfraccionDetalle(
  token: string,
  idInfraccion: number,
): Promise<InfraccionDetalleResponse> {
  const [detalle, pagos] = await Promise.all([
    request<InfraccionDetalleResponse>(
      `/infracciones/${idInfraccion}/detalle`,
      {},
      token,
    ),
    getPagosByInfraccion(token, idInfraccion),
  ]);

  return {
    ...detalle,
    pagos: pagos.map((pago) => ({
      idPagoInfraccion: pago.idPagoInfraccion,
      folioPago: pago.folioLineaCaptura,
      folioLineaCaptura: pago.folioLineaCaptura,
      monto: pago.monto,
      fechaPago: pago.fechaPago,
      observaciones: pago.observaciones,
      conceptos: pago.conceptos
        .slice()
        .sort((first, second) => first.orden - second.orden),
    })),
  } as InfraccionDetalleResponse;
}

export function getAdminExpediente(
  token: string,
  idInfraccion: number,
): Promise<AdminExpedienteSnapshot> {
  return request<AdminExpedienteSnapshot>(
    `/infracciones/${idInfraccion}/admin`,
    {},
    token,
  );
}

export function updateAdminExpediente(
  token: string,
  idInfraccion: number,
  payload: AdminActualizarExpedientePayload,
): Promise<AdminExpedienteSnapshot> {
  return request<AdminExpedienteSnapshot>(
    `/infracciones/${idInfraccion}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteAdminExpediente(
  token: string,
  idInfraccion: number,
  payload: AdminEliminarInfraccionPayload,
): Promise<AdminEliminarInfraccionResponse> {
  return request<AdminEliminarInfraccionResponse>(
    `/infracciones/${idInfraccion}`,
    {
      method: 'DELETE',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function createInfraccion(
  token: string,
  payload: CreateInfraccionCompletaPayload,
): Promise<InfraccionFlujoResponse> {
  return request<InfraccionFlujoResponse>(
    '/infracciones',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}
