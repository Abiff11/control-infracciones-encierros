import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Encierro } from './entities/encierro.entity';
import { RetencionVehiculo } from './entities/retencion-vehiculo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Encierro, RetencionVehiculo])],
})
export class EncierrosModule {}
