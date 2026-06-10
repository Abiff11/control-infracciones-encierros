import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PagoInfraccion } from './entities/pago-infraccion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PagoInfraccion])],
})
export class PagosModule {}
