import type { RolResponse } from './roles.types';

export interface UsuarioResponse {
  idUsuario: number;
  nombreUsuario: string;
  email: string;
  activo: boolean;
  rol: RolResponse;
}

export interface UsuarioListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UsuarioListResponse {
  data: UsuarioResponse[];
  meta: UsuarioListMeta;
}

export interface CreateUsuarioPayload {
  nombreUsuario: string;
  email: string;
  password: string;
  idRol: number;
  activo?: boolean;
}

export interface UpdateUsuarioPayload {
  nombreUsuario?: string;
  email?: string;
  password?: string;
  idRol?: number;
  activo?: boolean;
}

export interface UsuariosQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  rol?: number;
  activo?: boolean;
}
