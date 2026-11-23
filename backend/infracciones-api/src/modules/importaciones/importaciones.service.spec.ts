import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { FindManyOptions } from 'typeorm';

import {
  ImportacionInfracciones,
  ImportacionInfraccionesEstado,
} from './entities/importacion-infracciones.entity';
import { ImportacionesService } from './importaciones.service';

describe('ImportacionesService.findAll', () => {
  it.each([
    { query: {}, expectedWhere: {} },
    { query: { idRegion: 2 }, expectedWhere: { region: { idRegion: 2 } } },
    {
      query: {
        anio: 2026,
        idRegion: 2,
        idDelegacion: 3,
        estado: ImportacionInfraccionesEstado.IMPORTADA,
      },
      expectedWhere: {
        anio: 2026,
        region: { idRegion: 2 },
        delegacionDefault: { idDelegacion: 3 },
        estado: ImportacionInfraccionesEstado.IMPORTADA,
      },
    },
  ])(
    'uses only the requested filters: $query',
    async ({ query, expectedWhere }) => {
      const find = jest
        .fn<
          Promise<ImportacionInfracciones[]>,
          [FindManyOptions<ImportacionInfracciones>]
        >()
        .mockResolvedValue([]);
      const repositoryToken = getRepositoryToken(ImportacionInfracciones);
      const module = await Test.createTestingModule({
        providers: [ImportacionesService],
      })
        .useMocker((token) => (token === repositoryToken ? { find } : {}))
        .compile();

      try {
        const service = module.get(ImportacionesService);
        await expect(service.findAll(query)).resolves.toEqual([]);
        expect(find.mock.calls[0]?.[0].where).toStrictEqual(expectedWhere);
      } finally {
        await module.close();
      }
    },
  );
});
