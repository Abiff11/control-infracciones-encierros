import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegistrarRetencionDto {
  @IsInt()
  idInfraccion!: number;

  @IsInt()
  idEncierro!: number;

  @IsString()
  @IsNotEmpty()
  recibidoPor!: string;

  @IsOptional()
  @IsDate()
  fechaIngreso?: Date;

  @IsOptional()
  @IsString()
  folioResguardo?: string | null;

  @IsOptional()
  @IsString()
  observacionesIngreso?: string | null;

  @IsOptional()
  @IsString()
  estadoIngreso?: string | null;
}
