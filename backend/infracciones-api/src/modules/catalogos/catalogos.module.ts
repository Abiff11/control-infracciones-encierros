import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Delegacion } from './entities/delegacion.entity';
import { EstatusInfraccion } from './entities/estatus-infraccion.entity';
import { Region } from './entities/region.entity';
import { Sexo } from './entities/sexo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EstatusInfraccion, Sexo, Region, Delegacion])],
})
export class CatalogosModule {}
