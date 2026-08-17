import { buildQuery, request } from './apiClient';
import { getPagosByInfraccion } from './pagos.api';
import type {
  AdminActualizarExpedientePayload,
  AdminEliminarInfraccionPayload,
  AdminEliminarInfraccionResponse,
  AdminEliminarOperacionPayload,
  AdminExpedienteSnapshot,
  AdminOperacionTipo,
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
const adminExpedienteVersions = new Map<number, string>();

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

function resolveAdminVersion(
  idInfraccion: number,
  explicitVersion?: string,
): string {
  const version = explicitVersion ?? adminExpedienteVersions.get(idInfraccion);
  if (!version) {
    throw new Error(
      'El expediente debe recargarse antes de editarlo o eliminarlo.',
    );
  }

  return version;
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

export async function getAdminExpediente(
  token: string,
  idInfraccion: number,
): Promise<AdminExpedienteSnapshot> {
  const response = await request<AdminExpedienteSnapshot>(
    `/infracciones/${idInfraccion}/admin`,
    {},
    token,
  );
  adminExpedienteVersions.set(idInfraccion, response.versionExpediente);
  return response;
}

export async function updateAdminExpediente(
  token: string,
  idInfraccion: number,
  payload: AdminActualizarExpedientePayload,
): Promise<AdminExpedienteSnapshot> {
  const versionExpediente = resolveAdminVersion(
    idInfraccion,
    payload.versionExpediente,
  );
  const response = await request<AdminExpedienteSnapshot>(
    `/infracciones/${idInfraccion}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ ...payload, versionExpediente }),
    },
    token,
  );
  adminExpedienteVersions.set(idInfraccion, response.versionExpediente);
  return response;
}

export async function deleteAdminOperacion(
  token: string,
  idInfraccion: number,
  tipo: AdminOperacionTipo,
  idOperacion: number,
  payload: AdminEliminarOperacionPayload,
): Promise<AdminExpedienteSnapshot> {
  const versionExpediente = resolveAdminVersion(
    idInfraccion,
    payload.versionExpediente,
  );
  const response = await request<AdminExpedienteSnapshot>(
    `/infracciones/${idInfraccion}/admin/operaciones/${tipo}/${idOperacion}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ ...payload, versionExpediente }),
    },
    token,
  );
  adminExpedienteVersions.set(idInfraccion, response.versionExpediente);
  return response;
}

export async function deleteAdminExpediente(
  token: string,
  idInfraccion: number,
  payload: AdminEliminarInfraccionPayload,
): Promise<AdminEliminarInfraccionResponse> {
  const versionExpediente = resolveAdminVersion(
    idInfraccion,
    payload.versionExpediente,
  );
  const response = await request<AdminEliminarInfraccionResponse>(
    `/infracciones/${idInfraccion}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ ...payload, versionExpediente }),
    },
    token,
  );
  adminExpedienteVersions.delete(idInfraccion);
  return response;
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
