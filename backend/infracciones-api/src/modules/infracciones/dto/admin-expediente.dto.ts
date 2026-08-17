import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

function trimNullable(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function nullablePositiveInt(value: unknown): unknown {
  if (value === null || value === undefined || value === '') {
    return value === undefined ? undefined : null;
  }

  return Number(value);
}

export class EliminarInfraccionAdminDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  versionExpediente!: string;

  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  folioConfirmacion!: string;

  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  motivoEliminacion!: string;
}

export class AdminActualizarInfractorDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idSexo?: number;

  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  @MaxLength(100)
  apellidoPaterno?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  @MaxLength(100)
  apellidoMaterno?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  @MaxLength(30)
  licencia?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  @MaxLength(18)
  curp?: string | null;
}

export class AdminActualizarVehiculoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idClaseVehiculo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idLineaVehiculo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idServicio?: number;

  @IsOptional()
  @Transform(({ value }) => nullablePositiveInt(value))
  @IsInt()
  @Min(1)
  anioModelo?: number | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  sitioServicioPublico?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  color?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  placas?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  estadoPlacas?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  serie?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  motor?: string | null;
}

export class AdminActualizarLugarDto {
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombreLugarInfraccion!: string;
}

export class AdminActualizarInfraccionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idDelegacion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTipoProcedimiento?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEstatusInfraccion?: number;

  @IsOptional()
  @Transform(({ value }) => nullablePositiveInt(value))
  @IsInt()
  @Min(1)
  idOperativo?: number | null;

  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  folioInfraccion?: string;

  @IsOptional()
  @IsDateString()
  fechaInfraccion?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  horaInfraccion?: string;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  observaciones?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  @MaxLength(50)
  clavePolicia?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  @MaxLength(50)
  numParteInformativo?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  motivos?: number[];
}

export class AdminActualizarRetencionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idRetencionVehiculo!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEncierro?: number;

  @IsOptional()
  @IsDateString()
  fechaIngreso?: string;

  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  recibidoPor?: string;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  @MaxLength(30)
  folioResguardo?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  observacionesIngreso?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  @MaxLength(50)
  estadoIngreso?: string | null;
}

export class AdminActualizarPagoConceptoDto {
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  claveConcepto!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  monto!: string;
}

export class AdminActualizarPagoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idPagoInfraccion!: number;

  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  folioLineaCaptura?: string;

  @IsOptional()
  @IsDateString()
  fechaPago?: string;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  observaciones?: string | null;

  @Transform(({ value }): unknown =>
    Array.isArray(value) && value.length === 0 ? undefined : value,
  )
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdminActualizarPagoConceptoDto)
  conceptos?: AdminActualizarPagoConceptoDto[];
}

export class AdminActualizarLiberacionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idLiberacionVehiculo!: number;

  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  folioLiberacion?: string;

  @IsOptional()
  @IsDateString()
  fechaLiberacion?: string;

  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  liberadoPor?: string;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  @MaxLength(100)
  nombreRecibeLiberacion?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  observacion?: string | null;
}

export class AdminActualizarSalidaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idSalidaVehiculo!: number;

  @IsOptional()
  @IsDateString()
  fechaSalida?: string;

  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  validadoPor?: string;

  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  personaRecibeVehiculo?: string;

  @IsOptional()
  @Transform(({ value }) => trimNullable(value))
  @IsString()
  observacionesSalida?: string | null;

  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  estadoSalida?: string;
}

export class AdminActualizarExpedienteDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  versionExpediente!: string;

  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  motivoEdicion!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminActualizarInfraccionDto)
  infraccion?: AdminActualizarInfraccionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminActualizarInfractorDto)
  infractor?: AdminActualizarInfractorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminActualizarVehiculoDto)
  vehiculo?: AdminActualizarVehiculoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminActualizarLugarDto)
  lugarInfraccion?: AdminActualizarLugarDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminActualizarRetencionDto)
  retencion?: AdminActualizarRetencionDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminActualizarPagoDto)
  pagos?: AdminActualizarPagoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminActualizarLiberacionDto)
  liberaciones?: AdminActualizarLiberacionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminActualizarSalidaDto)
  salidas?: AdminActualizarSalidaDto[];
}
