import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';

export class RegistrarPagoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idInfraccion!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idUsuarioRegistraPago!: number;

  @IsString()
  @IsNotEmpty()
  folioPago!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  monto!: string;

  @IsOptional()
  @IsDateString()
  fechaPago?: string;

  @IsOptional()
  @IsString()
  observaciones?: string | null;
}
