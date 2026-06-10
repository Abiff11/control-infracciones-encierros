import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerarLiberacionDto {
  @IsInt()
  idInfraccion!: number;

  @IsInt()
  idPagoInfraccion!: number;

  @IsInt()
  idUsuarioLibera!: number;

  @IsString()
  @IsNotEmpty()
  folioLiberacion!: string;

  @IsString()
  @IsNotEmpty()
  liberadoPor!: string;

  @IsString()
  @IsNotEmpty()
  nombreRecibeLiberacion!: string;

  @IsOptional()
  @IsDate()
  fechaLiberacion?: Date;

  @IsOptional()
  @IsString()
  observacion?: string | null;
}
