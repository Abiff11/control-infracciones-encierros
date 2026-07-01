import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SelectiveThrottlerGuard } from './common/selective-throttler.guard';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { DashboardController } from './modules/dashboard/dashboard.controller';
import { DashboardService } from './modules/dashboard/dashboard.service';
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
            {
              name: 'read',
              ttl: getTtl('THROTTLE_READ_TTL_MS', 60_000),
              limit: getLimit('THROTTLE_READ_LIMIT', 240),
            },
            {
              name: 'write',
              ttl: getTtl('THROTTLE_WRITE_TTL_MS', 60_000),
              limit: getLimit('THROTTLE_WRITE_LIMIT', 80),
            },
            {
              name: 'auth',
              ttl: getTtl('THROTTLE_AUTH_TTL_MS', 60_000),
              limit: getLimit('THROTTLE_AUTH_LIMIT', 20),
            },
            {
              name: 'refresh',
              ttl: getTtl('THROTTLE_REFRESH_TTL_MS', 60_000),
              limit: getLimit('THROTTLE_REFRESH_LIMIT', 60),
            },
            {
              name: 'report',
              ttl: getTtl('THROTTLE_REPORT_TTL_MS', 60_000),
              limit: getLimit('THROTTLE_REPORT_LIMIT', 20),
            },
            {
              name: 'import',
              ttl: getTtl('THROTTLE_IMPORT_TTL_MS', 60_000),
              limit: getLimit('THROTTLE_IMPORT_LIMIT', 5),
            },
            {
              name: 'upload',
              ttl: getTtl('THROTTLE_UPLOAD_TTL_MS', 60_000),
              limit: getLimit('THROTTLE_UPLOAD_LIMIT', 5),
            },
            {
              name: 'search',
              ttl: getTtl('THROTTLE_SEARCH_TTL_MS', 60_000),
              limit: getLimit('THROTTLE_SEARCH_LIMIT', 60),
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
  controllers: [AppController, DashboardController],
  providers: [
    AppService,
    DashboardService,
    {
      provide: APP_GUARD,
      useClass: SelectiveThrottlerGuard,
    },
  ],
})
export class AppModule {}
