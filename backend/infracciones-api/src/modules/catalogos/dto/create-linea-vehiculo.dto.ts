import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateLineaVehiculoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idMarcaVehiculo!: number;

  @IsString()
  @IsNotEmpty()
  nombreLinea!: string;
}
