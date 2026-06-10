import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PagoInfraccion } from './entities/pago-infraccion.entity';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [TypeOrmModule.forFeature([PagoInfraccion])],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
