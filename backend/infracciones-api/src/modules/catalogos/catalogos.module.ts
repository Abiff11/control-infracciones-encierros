import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Delegacion } from './entities/delegacion.entity';
import { EstatusInfraccion } from './entities/estatus-infraccion.entity';
import { ClaseVehiculo } from './entities/clase-vehiculo.entity';
import { LineaVehiculo } from './entities/linea-vehiculo.entity';
import { LugarInfraccion } from './entities/lugar-infraccion.entity';
import { MarcaVehiculo } from './entities/marca-vehiculo.entity';
import { Operativo } from './entities/operativo.entity';
import { Region } from './entities/region.entity';
import { Sexo } from './entities/sexo.entity';
import { Servicio } from './entities/servicio.entity';
import { TipoProcedimiento } from './entities/tipo-procedimiento.entity';
import { Motivo } from '../motivos/entities/motivo.entity';
import { Encierro } from '../encierros/entities/encierro.entity';
import { Rol } from '../roles/entities/rol.entity';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EstatusInfraccion,
      Sexo,
      Region,
      Delegacion,
      Servicio,
      ClaseVehiculo,
      MarcaVehiculo,
      LineaVehiculo,
      TipoProcedimiento,
      Operativo,
      LugarInfraccion,
      Motivo,
      Encierro,
      Rol,
    ]),
  ],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
