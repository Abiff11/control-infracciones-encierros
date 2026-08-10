import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditoriaModule } from '../auditoria/auditoria.module';
import { RetencionVehiculo } from '../encierros/entities/retencion-vehiculo.entity';
import { InfraccionesModule } from '../infracciones/infracciones.module';
import { PagoInfraccion } from './entities/pago-infraccion.entity';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PagoInfraccion, RetencionVehiculo]),
    InfraccionesModule,
    AuditoriaModule,
  ],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
