import type {
  CatalogosBundle,
  ClaseVehiculo,
  Delegacion,
  Encierro,
  EstatusInfraccion,
  LineaVehiculo,
  MarcaVehiculo,
  Motivo,
  Operativo,
  Region,
  Servicio,
  Sexo,
  TipoProcedimiento,
} from '../modules/catalogos/catalogos.types';
import type {
  CreateInfraccionCompletaPayload,
  GenerarLiberacionPayload,
  InfraccionesResponse,
  InfraccionFlujoResponse,
  RegistrarPagoPayload,
  RegistrarRetencionPayload,
  RegistrarSalidaPayload,
} from '../modules/infracciones/infracciones.types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseUsuario {
  idUsuario: number;
  nombreUsuario: string;
  email: string;
  activo: boolean;
  rol?: LoginResponseRol;
}

export interface LoginResponseRol {
  idRol: number;
  nombreRol: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  usuario: LoginResponseUsuario;
}

export interface InfraccionesQuery {
  folioInfraccion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  idEstatusInfraccion?: number;
  idDelegacion?: number;
  placas?: string;
  nombreInfractor?: string;
  page?: number;
  limit?: number;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

type QueryValue = string | number | boolean | null | undefined;

function buildQuery<T extends object>(params?: T): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(
    params as Record<string, QueryValue>,
  )) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function extractErrorMessage(payload: string): string {
  try {
    const parsed = JSON.parse(payload) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }

    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }

    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // No-op. The response is plain text or HTML.
  }

  return payload;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.text();
    const message = extractErrorMessage(payload) || `HTTP ${response.status}`;
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Error desconocido';
}

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getProfile(token: string): Promise<LoginResponseUsuario> {
  return request<LoginResponseUsuario>('/auth/profile', {}, token);
}

export function getRoles(): Promise<LoginResponseRol[]> {
  return request<LoginResponseRol[]>('/catalogos/roles');
}

export function getRegiones(): Promise<Region[]> {
  return request<Region[]>('/catalogos/regiones');
}

export function getDelegaciones(idRegion?: number): Promise<Delegacion[]> {
  return request<Delegacion[]>(`/catalogos/delegaciones${buildQuery({ idRegion })}`);
}

export function getSexos(): Promise<Sexo[]> {
  return request<Sexo[]>('/catalogos/sexos');
}

export function getServicios(): Promise<Servicio[]> {
  return request<Servicio[]>('/catalogos/servicios');
}

export function getClasesVehiculo(): Promise<ClaseVehiculo[]> {
  return request<ClaseVehiculo[]>('/catalogos/clases-vehiculo');
}

export function getMarcasVehiculo(): Promise<MarcaVehiculo[]> {
  return request<MarcaVehiculo[]>('/catalogos/marcas-vehiculo');
}

export function getLineasVehiculo(idMarcaVehiculo?: number): Promise<LineaVehiculo[]> {
  return request<LineaVehiculo[]>(
    `/catalogos/lineas-vehiculo${buildQuery({ idMarcaVehiculo })}`,
  );
}

export function getTiposProcedimiento(): Promise<TipoProcedimiento[]> {
  return request<TipoProcedimiento[]>('/catalogos/tipos-procedimiento');
}

export function getOperativos(): Promise<Operativo[]> {
  return request<Operativo[]>('/catalogos/operativos');
}

export function getEstatusInfraccion(): Promise<EstatusInfraccion[]> {
  return request<EstatusInfraccion[]>('/catalogos/estatus-infraccion');
}

export function getMotivos(): Promise<Motivo[]> {
  return request<Motivo[]>('/catalogos/motivos');
}

export function getEncierros(): Promise<Encierro[]> {
  return request<Encierro[]>('/catalogos/encierros');
}

export async function getCatalogosBundle(): Promise<CatalogosBundle> {
  const [
    roles,
    regiones,
    delegaciones,
    sexos,
    servicios,
    clasesVehiculo,
    marcasVehiculo,
    lineasVehiculo,
    tiposProcedimiento,
    operativos,
    estatusInfraccion,
    motivos,
    encierros,
  ] = await Promise.all([
    getRoles(),
    getRegiones(),
    getDelegaciones(),
    getSexos(),
    getServicios(),
    getClasesVehiculo(),
    getMarcasVehiculo(),
    getLineasVehiculo(),
    getTiposProcedimiento(),
    getOperativos(),
    getEstatusInfraccion(),
    getMotivos(),
    getEncierros(),
  ]);

  return {
    roles,
    regiones,
    delegaciones,
    sexos,
    servicios,
    clasesVehiculo,
    marcasVehiculo,
    lineasVehiculo,
    tiposProcedimiento,
    operativos,
    estatusInfraccion,
    motivos,
    encierros,
  };
}

export function getInfracciones(
  token: string,
  query?: InfraccionesQuery,
): Promise<InfraccionesResponse> {
  return request<InfraccionesResponse>(
    `/infracciones${buildQuery(query)}`,
    {},
    token,
  );
}

export function getInfraccionFlujo(
  token: string,
  idInfraccion: number,
): Promise<InfraccionFlujoResponse> {
  return request<InfraccionFlujoResponse>(
    `/infracciones/${idInfraccion}/flujo`,
    {},
    token,
  );
}

export function createInfraccion(
  token: string,
  payload: CreateInfraccionCompletaPayload,
): Promise<InfraccionFlujoResponse> {
  return request<InfraccionFlujoResponse>('/infracciones', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function createPago(
  token: string,
  payload: RegistrarPagoPayload,
): Promise<unknown> {
  return request<unknown>('/pagos', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function createLiberacion(
  token: string,
  payload: GenerarLiberacionPayload,
): Promise<unknown> {
  return request<unknown>('/liberaciones', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function createRetencion(
  token: string,
  payload: RegistrarRetencionPayload,
): Promise<unknown> {
  return request<unknown>('/encierros/retenciones', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function createSalida(
  token: string,
  payload: RegistrarSalidaPayload,
): Promise<unknown> {
  return request<unknown>('/encierros/salidas', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export const swaggerUrl = `${API_URL}/docs`;
