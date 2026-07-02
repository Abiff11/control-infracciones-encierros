import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class RegistrarPagoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idInfraccion!: number;

  @IsString()
  @IsNotEmpty()
  folioPago!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  monto?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  montoInfraccion?: string;

  @IsOptional()
  @Transform(({ value }): number | undefined => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    return Number(value);
  })
  @IsInt()
  @Min(0)
  diasPisoCobrados?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  montoDiasPiso?: string;

  @IsOptional()
  @IsDateString()
  fechaPago?: string;

  @IsOptional()
  @IsString()
  observaciones?: string | null;
}
