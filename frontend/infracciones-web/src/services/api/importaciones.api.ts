import { buildQuery, request } from './apiClient';
import type {
  ImportacionDetalleResponse,
  ImportacionErroresJsonResponse,
  ImportacionErroresQuery,
  ImportacionErroresResumenResponse,
  ImportacionInfraccionesConfirmarPayload,
  ImportacionInfraccionesPreviewPayload,
  ImportacionInfraccionesQuery,
  ImportacionInfraccionesResumen,
  ImportacionPreviewResponse,
} from '../../types/importaciones.types';

function buildImportacionFormData(
  payload:
    | ImportacionInfraccionesPreviewPayload
    | ImportacionInfraccionesConfirmarPayload,
): FormData {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('anio', String(payload.anio));
  formData.append('idRegion', String(payload.idRegion));

  if (payload.idDelegacionDefault) {
    formData.append('idDelegacionDefault', String(payload.idDelegacionDefault));
  }

  if ('modoDuplicados' in payload) {
    formData.append('modoDuplicados', payload.modoDuplicados);
  }

  if (payload.crearCatalogosFaltantes !== undefined) {
    formData.append(
      'crearCatalogosFaltantes',
      String(payload.crearCatalogosFaltantes),
    );
  }

  if (payload.crearDelegacionesFaltantes !== undefined) {
    formData.append(
      'crearDelegacionesFaltantes',
      String(payload.crearDelegacionesFaltantes),
    );
  }

  if ('observaciones' in payload && payload.observaciones) {
    formData.append('observaciones', payload.observaciones);
  }

  return formData;
}

export function previewImportacionInfracciones(
  token: string,
  payload: ImportacionInfraccionesPreviewPayload,
): Promise<ImportacionPreviewResponse> {
  return request<ImportacionPreviewResponse>(
    '/importaciones/infracciones/preview',
    {
      method: 'POST',
      body: buildImportacionFormData(payload),
    },
    token,
  );
}

export function confirmarImportacionInfracciones(
  token: string,
  payload: ImportacionInfraccionesConfirmarPayload,
): Promise<ImportacionDetalleResponse> {
  return request<ImportacionDetalleResponse>(
    '/importaciones/infracciones/confirmar',
    {
      method: 'POST',
      body: buildImportacionFormData(payload),
    },
    token,
  );
}

export function getImportacionesInfracciones(
  token: string,
  query?: ImportacionInfraccionesQuery,
): Promise<ImportacionInfraccionesResumen[]> {
  return request<ImportacionInfraccionesResumen[]>(
    `/importaciones/infracciones${buildQuery(query)}`,
    {},
    token,
  );
}

export function getImportacionInfraccionesDetalle(
  token: string,
  idImportacionInfracciones: number,
): Promise<ImportacionDetalleResponse> {
  return request<ImportacionDetalleResponse>(
    `/importaciones/infracciones/${idImportacionInfracciones}`,
    {},
    token,
  );
}

export function getImportacionErroresResumen(
  token: string,
  idImportacionInfracciones: number,
): Promise<ImportacionErroresResumenResponse> {
  return request<ImportacionErroresResumenResponse>(
    `/importaciones/infracciones/${idImportacionInfracciones}/resumen`,
    {},
    token,
  );
}

export function getImportacionErrores(
  token: string,
  idImportacionInfracciones: number,
  query?: ImportacionErroresQuery,
): Promise<ImportacionErroresJsonResponse> {
  return request<ImportacionErroresJsonResponse>(
    `/importaciones/infracciones/${idImportacionInfracciones}/lista-errores${buildQuery(query)}`,
    {},
    token,
  );
}
