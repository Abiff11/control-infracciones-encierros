import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RegistrarSalidaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idRetencionVehiculo!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idLiberacionVehiculo!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idUsuarioValidaSalida!: number;

  @IsString()
  @IsNotEmpty()
  validadoPor!: string;

  @IsString()
  @IsNotEmpty()
  personaRecibeVehiculo!: string;

  @IsString()
  @IsNotEmpty()
  estadoSalida!: string;

  @IsOptional()
  @IsDateString()
  fechaSalida?: string;

  @IsOptional()
  @IsString()
  observacionesSalida?: string | null;
}
