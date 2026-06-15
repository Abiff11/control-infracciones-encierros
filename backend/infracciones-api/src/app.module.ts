import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { ImportacionesModule } from './modules/importaciones/importaciones.module';
import { EncierrosModule } from './modules/encierros/encierros.module';
import { InfraccionesModule } from './modules/infracciones/infracciones.module';
import { InfractoresModule } from './modules/infractores/infractores.module';
import { LiberacionesModule } from './modules/liberaciones/liberaciones.module';
import { MotivosModule } from './modules/motivos/motivos.module';
import { MovimientosModule } from './modules/movimientos/movimientos.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { VehiculosModule } from './modules/vehiculos/vehiculos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),
    DatabaseModule,
    AuthModule,
    UsuariosModule,
    RolesModule,
    InfraccionesModule,
    InfractoresModule,
    VehiculosModule,
    MotivosModule,
    PagosModule,
    LiberacionesModule,
    EncierrosModule,
    MovimientosModule,
    CatalogosModule,
    ImportacionesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
