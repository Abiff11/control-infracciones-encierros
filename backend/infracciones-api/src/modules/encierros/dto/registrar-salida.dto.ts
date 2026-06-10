import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

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
  validadoPor!: string;

  @IsString()
  personaRecibeVehiculo!: string;

  @IsString()
  estadoSalida!: string;

  @IsOptional()
  @IsDateString()
  fechaSalida?: string;

  @IsOptional()
  @IsString()
  observacionesSalida?: string | null;
}
