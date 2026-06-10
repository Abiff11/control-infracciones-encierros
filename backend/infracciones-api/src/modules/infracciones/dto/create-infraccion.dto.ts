import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateInfraccionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idInfractor!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idDelegacion!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idVehiculo!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idLugarInfraccion!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTipoProcedimiento!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEstatusInfraccion!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idUsuarioCaptura!: number;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  idOperativo?: number | null;

  @IsString()
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
  @Type(() => Number)
  @IsInt({ each: true })
  motivos?: number[];
}
