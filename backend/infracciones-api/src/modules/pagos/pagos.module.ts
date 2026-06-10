import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PagoInfraccion } from './entities/pago-infraccion.entity';
import { PagosService } from './pagos.service';

@Module({
  imports: [TypeOrmModule.forFeature([PagoInfraccion])],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
