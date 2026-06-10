import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Motivo } from './entities/motivo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Motivo])],
})
export class MotivosModule {}
