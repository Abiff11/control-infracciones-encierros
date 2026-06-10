import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InfraccionMotivo } from './entities/infraccion-motivo.entity';
import { InfraccionMovimiento } from './entities/infraccion-movimiento.entity';
import { Infraccion } from './entities/infraccion.entity';
import { InfraccionesService } from './infracciones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Infraccion, InfraccionMotivo, InfraccionMovimiento])],
  providers: [InfraccionesService],
  exports: [InfraccionesService],
})
export class InfraccionesModule {}
