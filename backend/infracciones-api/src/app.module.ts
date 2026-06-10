import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import { DatabaseModule } from './database/database.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    DatabaseModule,
    RolesModule,
    UsuariosModule,
    CatalogosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
