import { Injectable } from '@nestjs/common';

import { FindInfraccionesQueryDto } from './dto/find-infracciones-query.dto';
import { InfraccionesListService } from './infracciones-list.service';

export interface ReportAvailability {
  total: number;
}

@Injectable()
export class InfraccionesReportesService {
  constructor(
    private readonly infraccionesListService: InfraccionesListService,
  ) {}

  async getReportAvailability(
    query: FindInfraccionesQueryDto,
  ): Promise<ReportAvailability> {
    const total = await this.infraccionesListService.countForReport(query);

    return { total };
  }
}
