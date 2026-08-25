import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditoriaModule } from '../auditoria/auditoria.module';
import { RetencionVehiculo } from '../encierros/entities/retencion-vehiculo.entity';
import { InfraccionesModule } from '../infracciones/infracciones.module';
import { PagoInfraccion } from '../pagos/entities/pago-infraccion.entity';
import { SolventacionSinPago } from '../pagos/entities/solventacion-sin-pago.entity';
import { LiberacionVehiculo } from './entities/liberacion-vehiculo.entity';
import { LiberacionesController } from './liberaciones.controller';
import { LiberacionesService } from './liberaciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LiberacionVehiculo,
      RetencionVehiculo,
      PagoInfraccion,
      SolventacionSinPago,
    ]),
    InfraccionesModule,
    AuditoriaModule,
  ],
  controllers: [LiberacionesController],
  providers: [LiberacionesService],
  exports: [LiberacionesService],
})
export class LiberacionesModule {}
