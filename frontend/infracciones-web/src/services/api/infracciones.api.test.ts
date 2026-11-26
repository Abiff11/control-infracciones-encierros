import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { InfraccionListItem } from '../../types/infracciones.types';
import { exportInfraccionesExcel, getAllInfracciones, getReportAvailability } from './infracciones.api';

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

describe('getReportAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta disponibilidad general mediante GET sin paginacion', async () => {
    apiMocks.request.mockResolvedValueOnce({ total: 13_827 });

    await expect(getReportAvailability('token-test', { page: 2, limit: 30 }))
      .resolves.toEqual({ total: 13_827 });

    expect(apiMocks.request).toHaveBeenCalledExactlyOnceWith(
      '/infracciones/reportes/disponibilidad',
      {},
      'token-test',
    );
  });

  it('conserva fechas y filtros en GET sin page ni limit', async () => {
    apiMocks.request.mockResolvedValueOnce({ total: 6 });

    await expect(getReportAvailability('token-test', {
      fechaInicio: '2026-11-01',
      fechaFin: '2026-11-30',
      idRegion: 10,
      idDelegacion: 1,
      idEstatusInfraccion: 1,
      idTipoProcedimiento: 1,
      search: '1234567896',
      page: 3,
      limit: 30,
    })).resolves.toEqual({ total: 6 });

    expect(apiMocks.request).toHaveBeenCalledTimes(1);
    const [url, options, token] = apiMocks.request.mock.calls[0] ?? [];
    const parsed = new URL(String(url), 'http://localhost');
    expect(parsed.pathname).toBe('/infracciones/reportes/disponibilidad');
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      fechaInicio: '2026-11-01',
      fechaFin: '2026-11-30',
      idRegion: '10',
      idDelegacion: '1',
      idEstatusInfraccion: '1',
      idTipoProcedimiento: '1',
      search: '1234567896',
    });
    expect(options).toEqual({});
    expect(token).toBe('token-test');
  });

  it.each([[10], [10, 11]].map((ids) => ({ ids })))(
    'consulta por POST conservando los identificadores $ids y filtros',
    async ({ ids }) => {
      apiMocks.request.mockResolvedValueOnce({ total: ids.length });
      const filters = {
        idInfracciones: ids,
        idEstatusInfraccion: 1,
        idRegion: 10,
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-30',
      };

      await expect(getReportAvailability('token-test', {
        ...filters,
        page: 2,
        limit: 30,
      })).resolves.toEqual({ total: ids.length });

      expect(apiMocks.request).toHaveBeenCalledExactlyOnceWith(
        '/infracciones/reportes/disponibilidad',
        { method: 'POST', body: JSON.stringify(filters) },
        'token-test',
      );
    },
  );

  it('propaga errores sin recurrir al contrato anterior', async () => {
    const error = new Error('Disponibilidad no disponible.');
    apiMocks.request.mockRejectedValueOnce(error);

    await expect(getReportAvailability('token-test')).rejects.toBe(error);

    expect(apiMocks.request).toHaveBeenCalledExactlyOnceWith(
      '/infracciones/reportes/disponibilidad',
      {},
      'token-test',
    );
  });
});
