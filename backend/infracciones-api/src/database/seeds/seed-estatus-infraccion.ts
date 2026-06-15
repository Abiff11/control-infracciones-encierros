import 'dotenv/config';

import dataSource from '../data-source';
import { EstatusInfraccion } from '../../modules/catalogos/entities/estatus-infraccion.entity';

const ESTATUS_REQUERIDOS = [
  'PAGADA',
  'LIBERACION_GENERADA',
  'VEHICULO_ENTREGADO',
] as const;

async function seedEstatusInfraccion(): Promise<void> {
  await dataSource.initialize();

  try {
    const repository = dataSource.getRepository(EstatusInfraccion);

    for (const nombreEstatus of ESTATUS_REQUERIDOS) {
      const existingEstatus = await repository.findOne({
        where: { nombreEstatus },
      });

      if (existingEstatus) {
        console.log(`Estatus existente: ${nombreEstatus}`);
        continue;
      }

      await repository.save(
        repository.create({
          nombreEstatus,
        }),
      );

      console.log(`Estatus creado: ${nombreEstatus}`);
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

seedEstatusInfraccion().catch((error: unknown) => {
  console.error('Error ejecutando seed de estatus_infraccion:', error);
  process.exitCode = 1;
});
