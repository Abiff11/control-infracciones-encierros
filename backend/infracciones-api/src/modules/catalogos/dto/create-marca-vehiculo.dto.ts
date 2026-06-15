import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMarcaVehiculoDto {
  @IsString()
  @IsNotEmpty()
  nombreMarca!: string;
}
