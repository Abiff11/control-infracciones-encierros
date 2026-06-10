import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegistrarMovimientoDto {
  @IsInt()
  idInfraccion!: number;

  @IsInt()
  idEstatusInfraccion!: number;

  @IsInt()
  idUsuario!: number;

  @IsString()
  @IsNotEmpty()
  accion!: string;

  @IsOptional()
  @IsString()
  observaciones?: string | null;

  @IsOptional()
  @IsDate()
  fechaMovimiento?: Date;
}
