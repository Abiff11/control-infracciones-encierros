import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CatalogosModule } from '../catalogos/catalogos.module';
import { ClaseVehiculo } from '../catalogos/entities/clase-vehiculo.entity';
import { Delegacion } from '../catalogos/entities/delegacion.entity';
import { EstatusInfraccion } from '../catalogos/entities/estatus-infraccion.entity';
import { LineaVehiculo } from '../catalogos/entities/linea-vehiculo.entity';
import { MarcaVehiculo } from '../catalogos/entities/marca-vehiculo.entity';
import { Operativo } from '../catalogos/entities/operativo.entity';
import { Region } from '../catalogos/entities/region.entity';
import { Servicio } from '../catalogos/entities/servicio.entity';
import { Sexo } from '../catalogos/entities/sexo.entity';
import { TipoProcedimiento } from '../catalogos/entities/tipo-procedimiento.entity';
import { EncierrosModule } from '../encierros/encierros.module';
import { InfraccionesModule } from '../infracciones/infracciones.module';
import { Infraccion } from '../infracciones/entities/infraccion.entity';
import { Motivo } from '../motivos/entities/motivo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Encierro } from '../encierros/entities/encierro.entity';
import { ImportacionInfraccionError } from './entities/importacion-infraccion-error.entity';
import { ImportacionInfracciones } from './entities/importacion-infracciones.entity';
import { ImportacionesController } from './importaciones.controller';
import { ImportacionesService } from './importaciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportacionInfracciones,
      ImportacionInfraccionError,
      Region,
      Delegacion,
      Sexo,
      Servicio,
      ClaseVehiculo,
      MarcaVehiculo,
      LineaVehiculo,
      TipoProcedimiento,
      Operativo,
      Encierro,
      EstatusInfraccion,
      Motivo,
      Infraccion,
      Usuario,
    ]),
    CatalogosModule,
    InfraccionesModule,
    EncierrosModule,
  ],
  controllers: [ImportacionesController],
  providers: [ImportacionesService],
})
export class ImportacionesModule {}
