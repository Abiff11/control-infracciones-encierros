import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppService } from './app.service';
import { Public } from './modules/auth/decorators/public.decorator';

type HealthResponse = {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
  database: 'ok' | 'error';
};

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  async health(): Promise<HealthResponse> {
    const timestamp = new Date().toISOString();

    try {
      await this.dataSource.query('SELECT 1');

      return {
        status: 'ok',
        service: 'control-infracciones-api',
        timestamp,
        database: 'ok',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'control-infracciones-api',
        timestamp,
        database: 'error',
      });
    }
  }
}
