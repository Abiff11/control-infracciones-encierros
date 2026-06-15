import { request } from './apiClient';
import type { LoginRequest, LoginResponse, LoginResponseUsuario } from '../../types/auth.types';

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getProfile(token: string): Promise<LoginResponseUsuario> {
  return request<LoginResponseUsuario>('/auth/profile', {}, token);
}
