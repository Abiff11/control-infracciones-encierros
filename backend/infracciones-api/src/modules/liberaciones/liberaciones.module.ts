import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InfraccionesModule } from '../infracciones/infracciones.module';
import { LiberacionVehiculo } from './entities/liberacion-vehiculo.entity';
import { LiberacionesController } from './liberaciones.controller';
import { LiberacionesService } from './liberaciones.service';

@Module({
  imports: [TypeOrmModule.forFeature([LiberacionVehiculo]), InfraccionesModule],
  controllers: [LiberacionesController],
  providers: [LiberacionesService],
  exports: [LiberacionesService],
})
export class LiberacionesModule {}
