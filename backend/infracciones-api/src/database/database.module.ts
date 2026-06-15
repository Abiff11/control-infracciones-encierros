import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host', 'localhost'),
        port: configService.get<number>('database.port', 5432),
        username: configService.get<string>(
          'database.username',
          'infracciones_user',
        ),
        password: configService.get<string>('database.password', ''),
        database: configService.get<string>(
          'database.database',
          'control_infracciones_db',
        ),
        autoLoadEntities: true,
        synchronize: configService.get<boolean>('database.synchronize', false),
        logging: configService.get<boolean>('database.logging', false),
        maxQueryExecutionTime: configService.get<number>(
          'database.maxQueryExecutionTime',
          500,
        ),
      }),
    }),
  ],
})
export class DatabaseModule {}
