import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class PreviewInfraccionesExcelDto {
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  anio!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idRegion!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idDelegacionDefault?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @Type(() => Boolean)
  @IsBoolean()
  crearCatalogosFaltantes = false;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @Type(() => Boolean)
  @IsBoolean()
  crearDelegacionesFaltantes = false;
}
