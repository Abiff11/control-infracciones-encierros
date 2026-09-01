import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import {
  buildPdfLimitMessage,
  PDF_MAX_REGISTROS,
} from './constants/reporte-pdf.constants';
import { FindInfraccionesQueryDto } from './dto/find-infracciones-query.dto';
import { InfraccionesListService } from './infracciones-list.service';

export interface PdfReportAvailability {
  total: number;
  limitePdf: number;
  permitido: boolean;
}

@Injectable()
export class InfraccionesReportesService {
  constructor(
    private readonly infraccionesListService: InfraccionesListService,
  ) {}

  async getPdfAvailability(
    query: FindInfraccionesQueryDto,
  ): Promise<PdfReportAvailability> {
    const total = await this.infraccionesListService.countForPdfReport(query);

    return {
      total,
      limitePdf: PDF_MAX_REGISTROS,
      permitido: total <= PDF_MAX_REGISTROS,
    };
  }

  async assertPdfAllowed(
    query: FindInfraccionesQueryDto,
  ): Promise<PdfReportAvailability> {
    const availability = await this.getPdfAvailability(query);

    if (!availability.permitido) {
      throw new UnprocessableEntityException({
        message: buildPdfLimitMessage(availability.total),
        total: availability.total,
        limitePdf: availability.limitePdf,
      });
    }

    return availability;
  }
}
