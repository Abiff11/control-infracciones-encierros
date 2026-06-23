import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
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
      load: [appConfig],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const getLimit = (key: string, fallback: number): number =>
          Number(configService.get<string>(key, String(fallback)));

        const getTtl = (key: string, fallback: number): number =>
          Number(configService.get<string>(key, String(fallback)));

        return {
          throttlers: [
            {
              name: 'default',
              ttl: getTtl('THROTTLE_DEFAULT_TTL_MS', 60_000),
              limit: getLimit('THROTTLE_DEFAULT_LIMIT', 120),
            },
          ],
        };
      },
    }),
    DatabaseModule,
    AuthModule,
    AuditoriaModule,
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
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
