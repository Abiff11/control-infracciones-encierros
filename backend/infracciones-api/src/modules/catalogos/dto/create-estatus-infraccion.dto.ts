import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEstatusInfraccionDto {
  @IsString()
  @IsNotEmpty()
  nombreEstatus!: string;
}
