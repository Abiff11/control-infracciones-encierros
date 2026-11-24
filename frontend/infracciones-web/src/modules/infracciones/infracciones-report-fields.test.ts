import { describe, expect, it } from 'vitest';

import type { InfraccionListItem } from '../../types/infracciones.types';
import { buildInfraccionesReportTable } from './infracciones-report-export';
import { getInfraccionesFieldsByIds } from './infracciones-report-fields';

function createItem(overrides: Partial<InfraccionListItem> = {}): InfraccionListItem {
  return {
    idInfraccion: 10,
    folioInfraccion: 'INF-10',
    fechaInfraccion: '2026-11-24',
    horaInfraccion: '08:30:00',
    observaciones: null,
    clavePolicia: null,
    numParteInformativo: null,
    infractor: {
      nombre: 'Persona',
      apellidoPaterno: 'Prueba',
      apellidoMaterno: null,
      licencia: null,
    },
    vehiculo: {
      placas: 'ABC123',
      estadoPlacas: 'OAXACA',
      serie: null,
      motor: null,
      color: 'BLANCO',
      marca: 'SUZUKI',
      linea: 'SWIFT',
      clase: 'AUTOMOVIL',
    },
    region: { idRegion: 1, nombreRegion: 'Valles Centrales' },
    delegacion: { idDelegacion: 1, nombreDelegacion: 'Oaxaca' },
    estatusInfraccion: { idEstatusInfraccion: 1, nombreEstatus: 'CAPTURADA' },
    tipoProcedimiento: {
      idTipoProcedimiento: 1,
      claveTipoProcedimiento: 'INFRACCION',
      nombreTipoProcedimiento: 'INFRACCION',
      esTipoExpediente: true,
      requiereFolioInfraccion: true,
      requiereNumParteInformativo: false,
      requiereMotivos: true,
      permiteRetencion: false,
      activo: true,
    },
    motivos: [],
    retencion: null,
    pago: {
      tienePago: false,
      idPagoInfraccion: null,
      fechaUltimoPago: null,
      montoPagado: null,
      clavesConcepto: null,
    },
    liberacion: {
      tieneLiberacion: false,
      idLiberacionVehiculo: null,
      fechaLiberacion: null,
    },
    salida: { tieneSalida: false, fechaSalida: null },
    estadoOperativoCalculado: 'SIN_RETENCION',
    ...overrides,
  };
}

function getSelectedValues(item: InfraccionListItem): Record<string, string> {
  const ids = [
    'pagoAccion',
    'tienePago',
    'idPagoInfraccion',
    'pagoResumen',
    'estadoOperativo',
    'validacionPagoEncierro',
  ] as const;
  const fields = getInfraccionesFieldsByIds([...ids]);
  const table = buildInfraccionesReportTable([item], [...ids]);
  expect(table.columns.map((column) => column.id)).toEqual(fields.map((field) => field.id));
  expect(table.rows).toHaveLength(1);
  return Object.fromEntries(
    table.columns.map((column, index) => [column.id, table.rows[0].cells[index]]),
  );
}

describe('Campos de reportes y PDF: solventacion sin pago', () => {
  it('sin retencion distingue solventacion y mantiene el dato real sin pago', () => {
    const values = getSelectedValues(createItem({
      estatusInfraccion: { idEstatusInfraccion: 99, nombreEstatus: 'SOLVENTADA_SIN_PAGO' },
    }));

    expect(values).toEqual(expect.objectContaining({
      pagoAccion: 'Solventada sin pago',
      tienePago: 'Sin pago',
      idPagoInfraccion: 'Sin informacion registrada',
      pagoResumen: 'Solventada sin pago',
      estadoOperativo: 'Solventada sin pago',
      validacionPagoEncierro: 'Solventada sin pago | Sin encierro',
    }));
  });

  it('con retencion muestra solventacion y liberacion pendientes', () => {
    const values = getSelectedValues(createItem({
      estatusInfraccion: { idEstatusInfraccion: 99, nombreEstatus: 'SOLVENTADA_SIN_PAGO' },
      tipoProcedimiento: { ...createItem().tipoProcedimiento, permiteRetencion: true },
      retencion: {
        idRetencionVehiculo: 20,
        encierro: 'Encierro Central',
        fechaIngreso: '2026-11-24T09:00:00.000Z',
        folioResguardo: 'RES-1',
        estadoIngreso: 'CAPTURADO',
      },
      estadoOperativoCalculado: 'EN_ENCIERRO_SIN_PAGO',
    }));

    expect(values).toEqual(expect.objectContaining({
      pagoAccion: 'Solventada sin pago',
      tienePago: 'Sin pago',
      estadoOperativo: 'Solventada, pendiente de liberacion',
      validacionPagoEncierro: 'Solventada sin pago | Vehiculo en encierro',
    }));
  });

  it('prioriza una entrega fisica incluso con liberacion administrativa pendiente', () => {
    const values = getSelectedValues(createItem({
      estatusInfraccion: { idEstatusInfraccion: 99, nombreEstatus: 'SOLVENTADA_SIN_PAGO' },
      retencion: {
        idRetencionVehiculo: 20,
        encierro: 'Encierro Central',
        fechaIngreso: '2026-11-24T09:00:00.000Z',
        folioResguardo: 'RES-1',
        estadoIngreso: 'CAPTURADO',
      },
      salida: { tieneSalida: true, fechaSalida: '2026-11-24T10:00:00.000Z' },
      estadoOperativoCalculado: 'EN_ENCIERRO_SIN_PAGO',
    }));

    expect(values).toEqual(expect.objectContaining({
      pagoAccion: 'Solventada sin pago',
      tienePago: 'Sin pago',
      estadoOperativo: 'VEHICULO_ENTREGADO',
      validacionPagoEncierro: 'Solventada sin pago | Vehiculo entregado',
    }));
  });

  it('con pago real conserva pago confirmado y el estado operativo original', () => {
    const values = getSelectedValues(createItem({
      estatusInfraccion: { idEstatusInfraccion: 2, nombreEstatus: 'PAGADA' },
      pago: {
        tienePago: true,
        idPagoInfraccion: 44,
        fechaUltimoPago: '2026-11-24T11:00:00.000Z',
        montoPagado: '1200.00',
        clavesConcepto: '1EAAA002',
      },
      estadoOperativoCalculado: 'PAGADA_SIN_RETENCION',
    }));

    expect(values.tienePago).toBe('Pagada');
    expect(values.idPagoInfraccion).toBe('44');
    expect(values.pagoAccion).toContain('1,200');
    expect(values.estadoOperativo).toBe('PAGADA_SIN_RETENCION');
    expect(values.validacionPagoEncierro).toBe('Pago confirmado | Sin encierro');
  });

  it('sin pago ni solventacion sigue informando pago pendiente', () => {
    const values = getSelectedValues(createItem());
    expect(values).toEqual(expect.objectContaining({
      pagoAccion: 'Sin pago',
      tienePago: 'Sin pago',
      estadoOperativo: 'SIN_RETENCION',
      validacionPagoEncierro: 'Pago pendiente | Sin encierro',
    }));
  });

  it('si existe un pago real prevalece sobre un estatus de solventacion antiguo', () => {
    const values = getSelectedValues(createItem({
      estatusInfraccion: { idEstatusInfraccion: 99, nombreEstatus: 'SOLVENTADA_SIN_PAGO' },
      pago: {
        tienePago: true,
        idPagoInfraccion: 44,
        fechaUltimoPago: '2026-11-24T11:00:00.000Z',
        montoPagado: '1200.00',
        clavesConcepto: '1EAAA002',
      },
      estadoOperativoCalculado: 'PAGADA_SIN_RETENCION',
    }));
    expect(values.tienePago).toBe('Pagada');
    expect(values.estadoOperativo).toBe('PAGADA_SIN_RETENCION');
    expect(values.validacionPagoEncierro).toBe('Pago confirmado | Sin encierro');
  });

  it('conserva solventacion en tabla/PDF despues de generar liberacion', () => {
    const base = createItem();
    const values = getSelectedValues(createItem({
      estatusInfraccion: { idEstatusInfraccion: 88, nombreEstatus: 'LIBERACION_GENERADA' },
      tipoProcedimiento: { ...base.tipoProcedimiento, permiteRetencion: true },
      retencion: {
        idRetencionVehiculo: 20,
        encierro: 'Encierro Central',
        fechaIngreso: '2026-11-24T09:00:00.000Z',
        folioResguardo: 'RES-1',
        estadoIngreso: 'CAPTURADO',
      },
      pago: {
        tienePago: false,
        tieneSolventacionSinPago: true,
        idPagoInfraccion: null,
        fechaUltimoPago: null,
        montoPagado: null,
        clavesConcepto: null,
      },
      liberacion: {
        tieneLiberacion: true,
        idLiberacionVehiculo: 33,
        fechaLiberacion: '2026-11-24T11:00:00.000Z',
      },
      estadoOperativoCalculado: 'LIBERADO_PENDIENTE_SALIDA',
    }));

    expect(values).toEqual(expect.objectContaining({
      pagoAccion: 'Solventada sin pago',
      tienePago: 'Sin pago',
      idPagoInfraccion: 'Sin informacion registrada',
      pagoResumen: 'Solventada sin pago',
      estadoOperativo: 'LIBERADO_PENDIENTE_SALIDA',
      validacionPagoEncierro: 'Solventada sin pago | Vehiculo en encierro',
    }));
  });

  it('conserva solventacion en tabla/PDF despues de entregar el vehiculo', () => {
    const values = getSelectedValues(createItem({
      estatusInfraccion: { idEstatusInfraccion: 89, nombreEstatus: 'VEHICULO_ENTREGADO' },
      pago: {
        tienePago: false,
        tieneSolventacionSinPago: true,
        idPagoInfraccion: null,
        fechaUltimoPago: null,
        montoPagado: null,
        clavesConcepto: null,
      },
      retencion: {
        idRetencionVehiculo: 20,
        encierro: 'Encierro Central',
        fechaIngreso: '2026-11-24T09:00:00.000Z',
        folioResguardo: 'RES-1',
        estadoIngreso: 'CAPTURADO',
      },
      salida: { tieneSalida: true, fechaSalida: '2026-11-24T12:00:00.000Z' },
      estadoOperativoCalculado: 'VEHICULO_ENTREGADO',
    }));

    expect(values).toEqual(expect.objectContaining({
      pagoAccion: 'Solventada sin pago',
      tienePago: 'Sin pago',
      pagoResumen: 'Solventada sin pago',
      estadoOperativo: 'VEHICULO_ENTREGADO',
      validacionPagoEncierro: 'Solventada sin pago | Vehiculo entregado',
    }));
  });

  it('da prioridad al pago real aun con bandera de solventacion y salida', () => {
    const values = getSelectedValues(createItem({
      estatusInfraccion: { idEstatusInfraccion: 89, nombreEstatus: 'VEHICULO_ENTREGADO' },
      pago: {
        tienePago: true,
        tieneSolventacionSinPago: true,
        idPagoInfraccion: 44,
        fechaUltimoPago: '2026-11-24T11:00:00.000Z',
        montoPagado: '1200.00',
        clavesConcepto: '1EAAA002',
      },
      salida: { tieneSalida: true, fechaSalida: '2026-11-24T12:00:00.000Z' },
      estadoOperativoCalculado: 'VEHICULO_ENTREGADO',
    }));

    expect(values.tienePago).toBe('Pagada');
    expect(values.idPagoInfraccion).toBe('44');
    expect(values.pagoAccion).toContain('1,200');
    expect(values.estadoOperativo).toBe('VEHICULO_ENTREGADO');
    expect(values.validacionPagoEncierro).toBe('Pago confirmado | Vehiculo entregado');
  });

});
