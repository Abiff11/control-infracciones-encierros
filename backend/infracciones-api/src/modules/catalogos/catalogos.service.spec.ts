import { BadRequestException, ConflictException } from '@nestjs/common';

import { CatalogosService } from './catalogos.service';

type RepositoryMock<T extends object = Record<string, unknown>> = {
  find: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
} & Partial<T>;

function createRepositoryMock(): RepositoryMock {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((value: Record<string, unknown>) => value),
    save: jest.fn((value: Record<string, unknown>) => Promise.resolve(value)),
  };
}

function createService(tiposProcedimientoRepository: RepositoryMock) {
  const stubRepository = createRepositoryMock();

  return new CatalogosService(
    stubRepository as never,
    stubRepository as never,
    stubRepository as never,
    stubRepository as never,
    stubRepository as never,
    stubRepository as never,
    stubRepository as never,
    tiposProcedimientoRepository as never,
    stubRepository as never,
    stubRepository as never,
    stubRepository as never,
    stubRepository as never,
    stubRepository as never,
  );
}

describe('CatalogosService tipo procedimiento', () => {
  it('crea un tipo de procedimiento con clave normalizada', async () => {
    const repository = createRepositoryMock();
    repository.findOne.mockResolvedValue(null);
    const service = createService(repository);

    const result = await service.createTipoProcedimiento({
      claveTipoProcedimiento: 'infraccion sin retencion',
      nombreTipoProcedimiento: 'Infraccion sin retencion',
      esTipoExpediente: true,
      requiereFolioInfraccion: true,
      requiereNumParteInformativo: false,
      requiereMotivos: true,
      permiteRetencion: false,
      activo: true,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        claveTipoProcedimiento: 'INFRACCION_SIN_RETENCION',
        nombreTipoProcedimiento: 'INFRACCION SIN RETENCION',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        claveTipoProcedimiento: 'INFRACCION_SIN_RETENCION',
      }),
    );
  });

  it('rechaza duplicado por clave', async () => {
    const repository = createRepositoryMock();
    repository.findOne.mockResolvedValueOnce({
      idTipoProcedimiento: 1,
    });
    const service = createService(repository);

    await expect(
      service.createTipoProcedimiento({
        claveTipoProcedimiento: 'INFRACCION',
        nombreTipoProcedimiento: 'Infraccion nueva',
        esTipoExpediente: true,
        requiereFolioInfraccion: true,
        requiereNumParteInformativo: false,
        requiereMotivos: true,
        permiteRetencion: true,
        activo: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza duplicado por nombre', async () => {
    const repository = createRepositoryMock();
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ idTipoProcedimiento: 2 });
    const service = createService(repository);

    await expect(
      service.createTipoProcedimiento({
        claveTipoProcedimiento: 'INFRACCION_NUEVA',
        nombreTipoProcedimiento: 'Infraccion',
        esTipoExpediente: true,
        requiereFolioInfraccion: true,
        requiereNumParteInformativo: false,
        requiereMotivos: true,
        permiteRetencion: true,
        activo: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('actualiza sin modificar la clave tecnica', async () => {
    const repository = createRepositoryMock();
    repository.findOne.mockImplementation(({ where }: { where: object }) => {
      if (
        'idTipoProcedimiento' in where &&
        !('nombreTipoProcedimiento' in where)
      ) {
        return {
          idTipoProcedimiento: 3,
          claveTipoProcedimiento: 'INFRACCION',
          nombreTipoProcedimiento: 'INFRACCION',
          esTipoExpediente: true,
          requiereFolioInfraccion: true,
          requiereNumParteInformativo: false,
          requiereMotivos: true,
          permiteRetencion: true,
          activo: true,
        };
      }

      return null;
    });
    const service = createService(repository);

    const result = await service.updateTipoProcedimiento(3, {
      nombreTipoProcedimiento: 'Infraccion actualizada',
      permiteRetencion: false,
    });

    expect(result).toEqual(
      expect.objectContaining({
        claveTipoProcedimiento: 'INFRACCION',
        nombreTipoProcedimiento: 'INFRACCION ACTUALIZADA',
        permiteRetencion: false,
      }),
    );
  });

  it('rechaza un tipo de expediente sin forma de generar folio', async () => {
    const repository = createRepositoryMock();
    const service = createService(repository);

    await expect(
      service.createTipoProcedimiento({
        claveTipoProcedimiento: 'SIN_FOLIO',
        nombreTipoProcedimiento: 'Sin folio',
        esTipoExpediente: true,
        requiereFolioInfraccion: false,
        requiereNumParteInformativo: false,
        requiereMotivos: false,
        permiteRetencion: false,
        activo: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
