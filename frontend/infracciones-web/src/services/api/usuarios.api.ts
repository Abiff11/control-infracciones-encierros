import { buildQuery, request } from './apiClient';
import type {
  CreateUsuarioPayload,
  UpdateUsuarioPayload,
  UsuarioListResponse,
  UsuarioResponse,
  UsuariosQueryParams,
} from '../../types/usuarios.types';

export function getUsuarios(
  token: string,
  params?: UsuariosQueryParams,
): Promise<UsuarioListResponse> {
  return request<UsuarioListResponse>(`/usuarios${buildQuery(params)}`, {}, token);
}

export function getUsuarioById(
  token: string,
  idUsuario: number,
): Promise<UsuarioResponse> {
  return request<UsuarioResponse>(`/usuarios/${idUsuario}`, {}, token);
}

export function createUsuario(
  token: string,
  payload: CreateUsuarioPayload,
): Promise<UsuarioResponse> {
  return request<UsuarioResponse>(
    '/usuarios',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateUsuario(
  token: string,
  idUsuario: number,
  payload: UpdateUsuarioPayload,
): Promise<UsuarioResponse> {
  return request<UsuarioResponse>(
    `/usuarios/${idUsuario}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteUsuario(
  token: string,
  idUsuario: number,
): Promise<UsuarioResponse> {
  return request<UsuarioResponse>(
    `/usuarios/${idUsuario}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export const deactivateUsuario = deleteUsuario;
