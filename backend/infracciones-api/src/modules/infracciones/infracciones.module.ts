import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EstatusInfraccion } from '../catalogos/entities/estatus-infraccion.entity';
import { LugarInfraccion } from '../catalogos/entities/lugar-infraccion.entity';
import { Motivo } from '../motivos/entities/motivo.entity';
import { Infractor } from '../infractores/entities/infractor.entity';
import { RetencionVehiculo } from '../encierros/entities/retencion-vehiculo.entity';
import { SalidaVehiculo } from '../encierros/entities/salida-vehiculo.entity';
import { LiberacionVehiculo } from '../liberaciones/entities/liberacion-vehiculo.entity';
import { PagoInfraccion } from '../pagos/entities/pago-infraccion.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { InfraccionMotivo } from './entities/infraccion-motivo.entity';
import { InfraccionMovimiento } from './entities/infraccion-movimiento.entity';
import { Infraccion } from './entities/infraccion.entity';
import { InfraccionesAdminOperacionesService } from './infracciones-admin-operaciones.service';
import { InfraccionesAdminService } from './infracciones-admin.service';
import { InfraccionesController } from './infracciones.controller';
import { InfraccionesExcelReportService } from './infracciones-excel-report.service';
import { InfraccionesListService } from './infracciones-list.service';
import { InfraccionesReportesService } from './infracciones-reportes.service';
import { InfraccionesService } from './infracciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Infraccion,
      InfraccionMotivo,
      InfraccionMovimiento,
      EstatusInfraccion,
      Infractor,
      Vehiculo,
      LugarInfraccion,
      Motivo,
      Usuario,
      PagoInfraccion,
      LiberacionVehiculo,
      RetencionVehiculo,
      SalidaVehiculo,
    ]),
  ],
  controllers: [InfraccionesController],
  providers: [
    InfraccionesService,
    InfraccionesListService,
    InfraccionesExcelReportService,
    InfraccionesReportesService,
    InfraccionesAdminService,
    InfraccionesAdminOperacionesService,
  ],
  exports: [InfraccionesService],
})
export class InfraccionesModule {}
