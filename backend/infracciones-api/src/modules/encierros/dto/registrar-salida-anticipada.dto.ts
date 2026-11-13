import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class DatosVehiculoCotejadosDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  linea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  clase?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  anioModelo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  estadoPlacas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  motor?: string;
}

export class DiscrepanciaMenorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  motivo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  referenciaEvidencia!: string;
}

export class RegistrarSalidaAnticipadaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idRetencionVehiculo!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  folioLiberacionPresentado!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  placasCotejadas!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => DatosVehiculoCotejadosDto)
  datosVehiculoCotejados!: DatosVehiculoCotejadosDto;

  @IsBoolean()
  @Equals(true)
  autorizacionDocumentalVerificada!: true;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombrePropietarioDeclarado!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  validadoPor!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  personaRecibeVehiculo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacionesSalida?: string;

  /**
   * Obligatorio si el cotejo reporta una diferencia menor en color o año.
   * No concede acceso para editar directamente el vehiculo del expediente.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => DiscrepanciaMenorDto)
  discrepanciaMenor?: DiscrepanciaMenorDto;
}
