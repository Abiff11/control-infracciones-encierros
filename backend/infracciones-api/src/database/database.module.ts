import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { createDatabaseOptions } from './database.options';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...createDatabaseOptions(),
      autoLoadEntities: true,
    }),
  ],
})
export class DatabaseModule {}
