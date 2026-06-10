import { IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateInfraccionDto {
  @IsInt()
  idInfractor!: number;

  @IsInt()
  idDelegacion!: number;

  @IsInt()
  idVehiculo!: number;

  @IsInt()
  idLugarInfraccion!: number;

  @IsInt()
  idTipoProcedimiento!: number;

  @IsInt()
  idEstatusInfraccion!: number;

  @IsInt()
  idUsuarioCaptura!: number;

  @IsOptional()
  @IsInt()
  idOperativo?: number | null;

  @IsString()
  @IsNotEmpty()
  folioInfraccion!: string;

  @IsDateString()
  fechaInfraccion!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  horaInfraccion!: string;

  @IsOptional()
  @IsString()
  observaciones?: string | null;

  @IsOptional()
  @IsString()
  clavePolicia?: string | null;

  @IsOptional()
  @IsString()
  numParteInformativo?: string | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  motivos?: number[];
}
