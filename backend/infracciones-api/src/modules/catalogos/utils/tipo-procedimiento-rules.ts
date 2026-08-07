import { BadRequestException } from '@nestjs/common';

interface TipoProcedimientoRulesInput {
  esTipoExpediente: boolean;
  requiereFolioInfraccion: boolean;
  requiereNumParteInformativo: boolean;
}

export function normalizeTipoProcedimientoClave(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .toUpperCase();
}

export function normalizeTipoProcedimientoNombre(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function normalizeParteInformativoFolio(value: string): string {
  return value.trim().replace(/\s+/g, '-').toUpperCase();
}

export function ensureTipoProcedimientoRuleConsistency(
  params: TipoProcedimientoRulesInput,
): void {
  if (
    params.esTipoExpediente &&
    !params.requiereFolioInfraccion &&
    !params.requiereNumParteInformativo
  ) {
    throw new BadRequestException(
      'Un tipo de expediente debe poder generar folio por infraccion o numero de parte informativo',
    );
  }
}
