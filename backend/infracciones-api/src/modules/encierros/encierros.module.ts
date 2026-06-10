import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EncierrosService } from './encierros.service';
import { Encierro } from './entities/encierro.entity';
import { RetencionVehiculo } from './entities/retencion-vehiculo.entity';
import { SalidaVehiculo } from './entities/salida-vehiculo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Encierro, RetencionVehiculo, SalidaVehiculo])],
  providers: [EncierrosService],
  exports: [EncierrosService],
})
export class EncierrosModule {}
