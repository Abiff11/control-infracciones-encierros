import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LiberacionVehiculo } from './entities/liberacion-vehiculo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LiberacionVehiculo])],
})
export class LiberacionesModule {}
