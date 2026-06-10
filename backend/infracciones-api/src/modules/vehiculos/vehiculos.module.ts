import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Vehiculo } from './entities/vehiculo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vehiculo])],
})
export class VehiculosModule {}
