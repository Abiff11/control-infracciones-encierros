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


const CAMPOS_CONTROL_XLSX = [
  'pagoAccion',
  'tienePago',
  'idPagoInfraccion',
  'montoPagado',
  'pagoResumen',
  'estadoOperativo',
  'validacionPagoEncierro',
];

async function exportarFilaXlsx(row: object): Promise<Record<string, string>> {
  const { service, infraccionesListService } = createService(1);
  infraccionesListService.findForReportExportBlock.mockResolvedValue([row]);
  const { buffer } = await writeToBuffer(service, CAMPOS_CONTROL_XLSX);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json<Array<string | number>>(
    workbook.Sheets.Infracciones,
    { header: 1 },
  );
  const values = rows[1] ?? [];
  return Object.fromEntries(
    CAMPOS_CONTROL_XLSX.map((field, index) => [field, String(values[index] ?? '')]),
  );
}

describe('InfraccionesExcelReportService solventacion sin pago', () => {
  const solventada = {
    estatusInfraccion: {
      idEstatusInfraccion: 99,
      nombreEstatus: 'SOLVENTADA_SIN_PAGO',
    },
  };
  const retencion = {
    idRetencionVehiculo: 20,
    encierro: 'Encierro Central',
    fechaIngreso: '2026-11-24T09:00:00.000Z',
    folioResguardo: 'RES-1',
    estadoIngreso: 'CAPTURADO',
  };
  const pagoReal = {
    tienePago: true,
    idPagoInfraccion: 44,
    fechaUltimoPago: '2026-11-24T10:00:00.000Z',
    montoPagado: '1200.00',
    clavesConcepto: '1EAAA002',
  };

  it('sin retencion diferencia solventacion, sin inventar pago ni monto', async () => {
    const cells = await exportarFilaXlsx({ ...createRow(1), ...solventada });
    expect(cells).toEqual(expect.objectContaining({
      pagoAccion: 'Solventada sin pago',
      tienePago: 'Sin pago',
      idPagoInfraccion: 'Sin informacion registrada',
      montoPagado: 'Sin informacion registrada',
      pagoResumen: 'Solventada sin pago',
      estadoOperativo: 'Solventada sin pago',
      validacionPagoEncierro: 'Solventada sin pago | Sin encierro',
    }));
  });

  it('con retencion informa solventacion y liberacion pendiente', async () => {
    const cells = await exportarFilaXlsx({
      ...createRow(2),
      ...solventada,
      retencion,
      estadoOperativoCalculado: 'EN_ENCIERRO_SIN_PAGO',
    });
    expect(cells).toEqual(expect.objectContaining({
      pagoAccion: 'Solventada sin pago',
      tienePago: 'Sin pago',
      estadoOperativo: 'Solventada, pendiente de liberacion',
      validacionPagoEncierro: 'Solventada sin pago | Vehiculo en encierro',
    }));
  });

  it('con liberacion conserva pendiente la salida fisica', async () => {
    const cells = await exportarFilaXlsx({
      ...createRow(3),
      ...solventada,
      retencion,
      liberacion: {
        tieneLiberacion: true,
        idLiberacionVehiculo: 33,
        fechaLiberacion: '2026-11-24T11:00:00.000Z',
      },
      estadoOperativoCalculado: 'LIBERADO_PENDIENTE_SALIDA',
    });
    expect(cells.estadoOperativo).toBe('LIBERADO_PENDIENTE_SALIDA');
    expect(cells.validacionPagoEncierro).toBe('Solventada sin pago | Vehiculo en encierro');
  });

  it('prioriza vehiculo entregado sin ocultar solventacion ni fingir pago', async () => {
    const cells = await exportarFilaXlsx({
      ...createRow(4),
      ...solventada,
      retencion,
      salida: { tieneSalida: true, fechaSalida: '2026-11-24T12:00:00.000Z' },
      estadoOperativoCalculado: 'EN_ENCIERRO_SIN_PAGO',
    });
    expect(cells).toEqual(expect.objectContaining({
      pagoAccion: 'Solventada sin pago',
      tienePago: 'Sin pago',
      estadoOperativo: 'VEHICULO_ENTREGADO',
      validacionPagoEncierro: 'Solventada sin pago | Vehiculo entregado',
    }));
  });

  it('mantiene pago real, ID, monto y respaldo administrativo confirmado', async () => {
    const cells = await exportarFilaXlsx({
      ...createRow(5),
      estatusInfraccion: { idEstatusInfraccion: 2, nombreEstatus: 'PAGADA' },
      pago: pagoReal,
      estadoOperativoCalculado: 'PAGADA_SIN_RETENCION',
    });
    expect(cells).toEqual(expect.objectContaining({
      tienePago: 'Pagada',
      idPagoInfraccion: '44',
      montoPagado: '1200.00',
      estadoOperativo: 'PAGADA_SIN_RETENCION',
      validacionPagoEncierro: 'Pago confirmado | Sin encierro',
    }));
    expect(cells.pagoResumen).toContain('1200.00');
  });

  it('conserva el pago pendiente si no hay pago ni solventacion', async () => {
    const cells = await exportarFilaXlsx(createRow(6));
    expect(cells).toEqual(expect.objectContaining({
      pagoAccion: 'Sin pago',
      tienePago: 'Sin pago',
      estadoOperativo: 'SIN_RETENCION',
      validacionPagoEncierro: 'Pago pendiente | Sin encierro',
    }));
  });

  it('prioriza un pago real aun si el estatus administrativo es solventada', async () => {
    const cells = await exportarFilaXlsx({
      ...createRow(7),
      ...solventada,
      pago: pagoReal,
      estadoOperativoCalculado: 'PAGADA_SIN_RETENCION',
    });
    expect(cells.tienePago).toBe('Pagada');
    expect(cells.montoPagado).toBe('1200.00');
    expect(cells.estadoOperativo).toBe('PAGADA_SIN_RETENCION');
    expect(cells.validacionPagoEncierro).toBe('Pago confirmado | Sin encierro');
  });
});
