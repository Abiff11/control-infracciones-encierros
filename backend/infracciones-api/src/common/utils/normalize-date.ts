import { BadRequestException } from '@nestjs/common';

export function normalizeDate(value?: string | Date | null): Date {
  if (!value) {
    return new Date();
  }

  const normalizedDate = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(normalizedDate.getTime())) {
    throw new BadRequestException('La fecha proporcionada no es valida');
  }

  return normalizedDate;
}
