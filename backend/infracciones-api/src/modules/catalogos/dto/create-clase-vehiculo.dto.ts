import { IsNotEmpty, IsString } from 'class-validator';

export class CreateClaseVehiculoDto {
  @IsString()
  @IsNotEmpty()
  nombreClase!: string;
}
