import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { ESTADOS_OPERATIVOS_VEHICULO } from '../constants/estado-operativo-vehiculo.constants';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_RANGE_ERROR =
  'La fecha inicial no puede ser posterior a la fecha final.';

@ValidatorConstraint({ name: 'validDateRange', async: false })
class ValidDateRangeConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const query = args.object as FindInfraccionesQueryDto;
    const initialDates = [query.fechaInicio, query.fechaDesde].filter(
      this.isCalendarDate,
    );
    const finalDates = [query.fechaFin, query.fechaHasta].filter(
      this.isCalendarDate,
    );

    if (initialDates.length === 0 || finalDates.length === 0) {
      return true;
    }

    const effectiveInitialDate = initialDates.reduce((latest, current) =>
      current > latest ? current : latest,
    );
    const effectiveFinalDate = finalDates.reduce((earliest, current) =>
      current < earliest ? current : earliest,
    );

    return effectiveInitialDate <= effectiveFinalDate;
  }

  defaultMessage(): string {
    return DATE_RANGE_ERROR;
  }

  private isCalendarDate(this: void, value: unknown): value is string {
    return typeof value === 'string' && CALENDAR_DATE_PATTERN.test(value);
  }
}

export class FindInfraccionesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  folioInfraccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rfc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  claveOficial?: string;

  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(50)
  claveConcepto?: string;

  @IsOptional()
  @Matches(CALENDAR_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  fechaInicio?: string;

  @IsOptional()
  @Matches(CALENDAR_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  fechaFin?: string;

  @IsOptional()
  @Matches(CALENDAR_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  fechaDesde?: string;

  @IsOptional()
  @Matches(CALENDAR_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  fechaHasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEstatusInfraccion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idDelegacion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idRegion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTipoProcedimiento?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @Type(() => Number)
  @Transform(({ value }: { value: unknown }): unknown =>
    value === null || value === undefined || Array.isArray(value)
      ? value
      : [value],
  )
  @IsInt({ each: true })
  @Min(1, { each: true })
  idInfracciones?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idMotivo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEncierro?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  placas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  serie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  motor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombreInfractor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  licencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  clavePolicia?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  anio?: number;

  @IsOptional()
  @IsIn(ESTADOS_OPERATIVOS_VEHICULO)
  estadoOperativo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  sortBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  sortOrder?: string;

  @Type(() => Number)
  @Validate(ValidDateRangeConstraint)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}
