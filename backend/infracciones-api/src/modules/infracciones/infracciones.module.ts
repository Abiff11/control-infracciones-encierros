import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Infraccion } from './entities/infraccion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Infraccion])],
})
export class InfraccionesModule {}
