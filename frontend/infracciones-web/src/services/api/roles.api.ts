import { request } from './apiClient';
import type { RolResponse } from '../../types/roles.types';

export function getRoles(token?: string): Promise<RolResponse[]> {
  return request<RolResponse[]>('/catalogos/roles', {}, token);
}
