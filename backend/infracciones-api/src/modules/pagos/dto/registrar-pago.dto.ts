import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class RegistrarPagoConceptoDto {
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

export class RegistrarPagoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idInfraccion!: number;

  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  folioLineaCaptura!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RegistrarPagoConceptoDto)
  conceptos!: RegistrarPagoConceptoDto[];

  @IsOptional()
  @IsDateString()
  fechaPago?: string;

  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  @IsString()
  observaciones?: string | null;
}
