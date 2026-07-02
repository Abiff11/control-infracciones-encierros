import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateInfractorCapturaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idSexo!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  apellidoPaterno!: string;

  @IsOptional()
  @IsString()
  apellidoMaterno?: string | null;

  @IsOptional()
  @IsString()
  licencia?: string | null;

  @IsOptional()
  @IsString()
  curp?: string | null;
}

export class CreateVehiculoCapturaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idClaseVehiculo!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idLineaVehiculo!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idServicio!: number;

  @IsOptional()
  @Transform(({ value }): number | null | undefined => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    return Number(value);
  })
  @IsInt()
  @Min(1)
  anioModelo?: number | null;

  @IsOptional()
  @IsString()
  sitioServicioPublico?: string | null;

  @IsOptional()
  @IsString()
  color?: string | null;

  @IsOptional()
  @IsString()
  placas?: string | null;

  @IsOptional()
  @IsString()
  estadoPlacas?: string | null;

  @IsOptional()
  @IsString()
  serie?: string | null;

  @IsOptional()
  @IsString()
  motor?: string | null;
}

export class CreateLugarInfraccionCapturaDto {
  @IsString()
  @IsNotEmpty()
  municipio!: string;

  @IsOptional()
  @IsString()
  colonia?: string | null;

  @IsOptional()
  @IsString()
  calle?: string | null;

  @IsOptional()
  @IsString()
  numero?: string | null;
}

export class CreateInfraccionCapturaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idDelegacion!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTipoProcedimiento!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEstatusInfraccion!: number;

  @IsOptional()
  @Transform(({ value }): number | null | undefined => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    return Number(value);
  })
  @IsInt()
  @Min(1)
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
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  motivos: number[] = [];
}

export class CreateInfraccionCompletaDto {
  @ValidateNested()
  @Type(() => CreateInfractorCapturaDto)
  infractor!: CreateInfractorCapturaDto;

  @ValidateNested()
  @Type(() => CreateVehiculoCapturaDto)
  vehiculo!: CreateVehiculoCapturaDto;

  @ValidateNested()
  @Type(() => CreateLugarInfraccionCapturaDto)
  lugarInfraccion!: CreateLugarInfraccionCapturaDto;

  @ValidateNested()
  @Type(() => CreateInfraccionCapturaDto)
  infraccion!: CreateInfraccionCapturaDto;
}
