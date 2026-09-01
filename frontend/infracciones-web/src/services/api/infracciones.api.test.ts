import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { InfraccionListItem } from '../../types/infracciones.types';
import { exportInfraccionesExcel, getAllInfracciones } from './infracciones.api';

const apiMocks = vi.hoisted(() => ({
  request: vi.fn(),
  requestBlob: vi.fn(),
}));

vi.mock('./apiClient', () => ({
  buildQuery: (params?: Record<string, unknown>) => {
    if (!params) {
      return '';
    }

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      searchParams.set(key, String(value));
    }

    const query = searchParams.toString();
    return query ? `?${query}` : '';
  },
  request: apiMocks.request,
  requestBlob: apiMocks.requestBlob,
}));

function createItem(idInfraccion: number): InfraccionListItem {
  return { idInfraccion } as InfraccionListItem;
}

describe('getAllInfracciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recorre todas las paginas de 100 y conserva el rango de fechas', async () => {
    apiMocks.request
      .mockResolvedValueOnce({
        data: [createItem(1), createItem(2)],
        meta: {
          page: 1,
          limit: 100,
          total: 3,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        data: [createItem(3)],
        meta: {
          page: 2,
          limit: 100,
          total: 3,
          totalPages: 2,
        },
      });

    const result = await getAllInfracciones('token-test', {
      fechaInicio: '2026-08-01',
      fechaFin: '2026-08-31',
      page: 7,
      limit: 30,
    });

    expect(result.map((item) => item.idInfraccion)).toEqual([1, 2, 3]);
    expect(apiMocks.request).toHaveBeenCalledTimes(2);

    const firstUrl = String(apiMocks.request.mock.calls[0]?.[0]);
    const secondUrl = String(apiMocks.request.mock.calls[1]?.[0]);

    expect(firstUrl).toContain('fechaInicio=2026-08-01');
    expect(firstUrl).toContain('fechaFin=2026-08-31');
    expect(firstUrl).toContain('page=1');
    expect(firstUrl).toContain('limit=100');
    expect(secondUrl).toContain('page=2');
    expect(secondUrl).toContain('limit=100');
  });

  it('elimina duplicados por id si los datos cambian entre paginas', async () => {
    apiMocks.request
      .mockResolvedValueOnce({
        data: [createItem(1), createItem(2)],
        meta: {
          page: 1,
          limit: 100,
          total: 3,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        data: [createItem(2), createItem(3)],
        meta: {
          page: 2,
          limit: 100,
          total: 3,
          totalPages: 2,
        },
      });

    const result = await getAllInfracciones('token-test');

    expect(result.map((item) => item.idInfraccion)).toEqual([1, 2, 3]);
  });

  it('exporta Excel con una sola solicitud POST sin paginar el listado', async () => {
    apiMocks.requestBlob.mockResolvedValue(new Blob(['xlsx']));

    await exportInfraccionesExcel('token-test', {
      fechaInicio: '2026-08-01',
      fechaFin: '2026-08-31',
      idDelegacion: 3,
      idRegion: 2,
      idEstatusInfraccion: 4,
      idTipoProcedimiento: 5,
      campos: ['folioInfraccion'],
    });

    expect(apiMocks.requestBlob).toHaveBeenCalledTimes(1);
    expect(apiMocks.request).not.toHaveBeenCalled();
    expect(apiMocks.requestBlob).toHaveBeenCalledWith(
      '/infracciones/reportes/excel',
      expect.objectContaining({ method: 'POST' }),
      'token-test',
    );
    const body = String(apiMocks.requestBlob.mock.calls[0]?.[1]?.body);
    expect(JSON.parse(body)).toMatchObject({
      fechaInicio: '2026-08-01',
      fechaFin: '2026-08-31',
      idDelegacion: 3,
      idRegion: 2,
      idEstatusInfraccion: 4,
      idTipoProcedimiento: 5,
      campos: ['folioInfraccion'],
    });
  });
});
