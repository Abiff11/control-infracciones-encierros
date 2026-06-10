import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegistrarSalidaDto {
  @IsInt()
  idRetencionVehiculo!: number;

  @IsInt()
  idLiberacionVehiculo!: number;

  @IsInt()
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
  @IsDate()
  fechaSalida?: Date;

  @IsOptional()
  @IsString()
  observacionesSalida?: string | null;
}
