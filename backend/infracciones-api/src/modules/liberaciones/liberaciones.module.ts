import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LiberacionVehiculo } from './entities/liberacion-vehiculo.entity';
import { LiberacionesService } from './liberaciones.service';

@Module({
  imports: [TypeOrmModule.forFeature([LiberacionVehiculo])],
  providers: [LiberacionesService],
  exports: [LiberacionesService],
})
export class LiberacionesModule {}
