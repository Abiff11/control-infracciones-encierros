import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditoriaModule } from '../auditoria/auditoria.module';
import { InfraccionesModule } from '../infracciones/infracciones.module';
import { ConceptoPago } from './entities/concepto-pago.entity';
import { PagoConcepto } from './entities/pago-concepto.entity';
import { PagoInfraccion } from './entities/pago-infraccion.entity';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PagoInfraccion, ConceptoPago, PagoConcepto]),
    InfraccionesModule,
    AuditoriaModule,
  ],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
