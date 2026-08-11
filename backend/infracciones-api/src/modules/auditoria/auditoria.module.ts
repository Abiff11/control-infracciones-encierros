import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
import { Auditoria } from './entities/auditoria.entity';
import { SecurityObservabilityService } from './security-observability.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Auditoria])],
  controllers: [AuditoriaController],
  providers: [AuditoriaService, SecurityObservabilityService],
  exports: [AuditoriaService, SecurityObservabilityService],
})
export class AuditoriaModule {}
