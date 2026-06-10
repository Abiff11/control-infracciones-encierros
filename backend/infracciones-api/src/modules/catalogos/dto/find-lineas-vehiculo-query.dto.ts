import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FindLineasVehiculoQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idMarcaVehiculo?: number;
}
