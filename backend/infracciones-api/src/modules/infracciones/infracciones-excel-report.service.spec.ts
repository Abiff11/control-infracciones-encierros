import { BadRequestException } from '@nestjs/common';
import { PassThrough } from 'node:stream';
import * as XLSX from 'xlsx';

import { InfraccionesExcelReportService } from './infracciones-excel-report.service';

jest.setTimeout(30_000);

function createRow(idInfraccion: number, observaciones = 'Observacion'): object {
  return {
    idInfraccion,
    folioInfraccion: `INF-${idInfraccion}`,
    fechaInfraccion: '2026-08-28',
    horaInfraccion: '08:30:00',
    observaciones,
    clavePolicia: null,
    numParteInformativo: null,
    infractor: { nombre: 'Nombre', apellidoPaterno: 'Paterno', apellidoMaterno: null, licencia: null },
    vehiculo: { placas: 'ABC-123', estadoPlacas: null, serie: null, motor: null, color: null, marca: 'Marca', linea: 'Linea', clase: 'Clase' },
    region: { idRegion: 1, nombreRegion: 'Region' },
    delegacion: { idDelegacion: 1, nombreDelegacion: 'Delegacion' },
    estatusInfraccion: { idEstatusInfraccion: 1, nombreEstatus: 'CAPTURADA' },
    tipoProcedimiento: { idTipoProcedimiento: 1, nombreTipoProcedimiento: 'INFRACCION' },
    motivos: [],
    retencion: null,
    pago: { tienePago: false, idPagoInfraccion: null, fechaUltimoPago: null, montoPagado: null, clavesConcepto: null },
    liberacion: { tieneLiberacion: false, idLiberacionVehiculo: null, fechaLiberacion: null },
    salida: { tieneSalida: false, fechaSalida: null },
    estadoOperativoCalculado: 'SIN_RETENCION',
  };
}

function createService(total: number) {
  const infraccionesListService = {
    countForPdfReport: jest.fn().mockResolvedValue(total),
    findForReportExportBlock: jest.fn().mockImplementation(
      (_query: unknown, offset: number, limit: number) =>
        Promise.resolve(
          Array.from(
            { length: Math.max(Math.min(limit, total - offset), 0) },
            (_, index) => createRow(offset + index + 1),
          ),
        ),
    ),
  };

  return {
    service: new InfraccionesExcelReportService(infraccionesListService as never),
    infraccionesListService,
  };
}

async function writeToBuffer(
  service: InfraccionesExcelReportService,
  campos = ['folioInfraccion', 'observaciones'],
) {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<void>((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  const result = await service.write({ campos }, stream);
  await completed;
  return { buffer: Buffer.concat(chunks), result };
}

describe('InfraccionesExcelReportService', () => {
  it.each([30, 500])('genera XLSX real para %i registros', async (total) => {
    const { service, infraccionesListService } = createService(total);
    const { buffer, result } = await writeToBuffer(service);

    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(result).toEqual({ total, rowsWritten: total });
    expect(infraccionesListService.countForPdfReport).toHaveBeenCalledWith({
      campos: ['folioInfraccion', 'observaciones'],
    });
    expect(infraccionesListService.findForReportExportBlock).toHaveBeenCalledTimes(
      Math.ceil(total / 2_000),
    );

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets.Infracciones, {
      header: 1,
    });
    expect(rows).toHaveLength(total + 1);
    expect(rows[0]).toEqual(['Folio infraccion', 'Observaciones infraccion']);
  });

  it('protege valores que Excel interpretaria como formula', async () => {
    const { service, infraccionesListService } = createService(1);
    infraccionesListService.findForReportExportBlock.mockResolvedValue([
      createRow(1, '=HYPERLINK("https://invalid.example")'),
    ]);
    const { buffer } = await writeToBuffer(service);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets.Infracciones, {
      header: 1,
    });

    expect(rows[1]?.[1]).toBe('\'=HYPERLINK("https://invalid.example")');
  });

  it('rechaza campos no incluidos en la lista permitida', async () => {
    const { service, infraccionesListService } = createService(1);
    const stream = new PassThrough();

    await expect(service.write({ campos: ['campoNoPermitido'] }, stream)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(infraccionesListService.countForPdfReport).not.toHaveBeenCalled();
  });

  it('procesa 24,000 registros en doce bloques sin acumularlos en memoria', async () => {
    const { service, infraccionesListService } = createService(24_000);
    const startedAt = performance.now();
    const { buffer, result } = await writeToBuffer(service, ['folioInfraccion']);
    const elapsedMs = performance.now() - startedAt;

    expect(result.rowsWritten).toBe(24_000);
    expect(infraccionesListService.findForReportExportBlock).toHaveBeenCalledTimes(12);
    expect(buffer.length).toBeGreaterThan(1_000);
    expect(elapsedMs).toBeGreaterThan(0);
  });
});
