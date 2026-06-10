import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class RegistrarPagoDto {
  @IsInt()
  idInfraccion!: number;

  @IsInt()
  idUsuarioRegistraPago!: number;

  @IsString()
  @IsNotEmpty()
  folioPago!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  monto!: string;

  @IsOptional()
  @IsDate()
  fechaPago?: Date;

  @IsOptional()
  @IsString()
  observaciones?: string | null;
}
