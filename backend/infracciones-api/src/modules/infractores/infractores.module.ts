import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Infractor } from './entities/infractor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Infractor])],
})
export class InfractoresModule {}
