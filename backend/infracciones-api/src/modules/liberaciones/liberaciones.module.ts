import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditoriaModule } from '../auditoria/auditoria.module';
import { RetencionVehiculo } from '../encierros/entities/retencion-vehiculo.entity';
import { InfraccionesModule } from '../infracciones/infracciones.module';
import { LiberacionVehiculo } from './entities/liberacion-vehiculo.entity';
import { LiberacionesController } from './liberaciones.controller';
import { LiberacionesService } from './liberaciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiberacionVehiculo, RetencionVehiculo]),
    InfraccionesModule,
    AuditoriaModule,
  ],
  controllers: [LiberacionesController],
  providers: [LiberacionesService],
  exports: [LiberacionesService],
})
export class LiberacionesModule {}
