const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseRol {
  idRol: number;
  nombreRol: string;
}

export interface LoginResponseUsuario {
  idUsuario: number;
  nombreUsuario: string;
  email: string;
  activo: boolean;
  rol?: LoginResponseRol;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  usuario: LoginResponseUsuario;
}

export interface InfraccionesResponse {
  data: unknown[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
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

export function getRoles(): Promise<unknown[]> {
  return request<unknown[]>('/catalogos/roles');
}

export function getInfracciones(token: string): Promise<InfraccionesResponse> {
  return request<InfraccionesResponse>('/infracciones', {}, token);
}

export const swaggerUrl = `${API_URL}/docs`;
