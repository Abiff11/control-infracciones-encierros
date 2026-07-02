import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class GenerarLiberacionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idInfraccion!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idPagoInfraccion!: number;

  @IsString()
  @IsNotEmpty()
  folioLiberacion!: string;

  @IsString()
  @IsNotEmpty()
  liberadoPor!: string;

  @IsOptional()
  @IsString()
  nombreRecibeLiberacion?: string | null;

  @IsOptional()
  @IsDateString()
  fechaLiberacion?: string;

  @IsOptional()
  @IsString()
  observacion?: string | null;
}
