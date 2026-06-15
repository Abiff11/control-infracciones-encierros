import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTipoProcedimientoDto {
  @IsString()
  @IsNotEmpty()
  procedimiento!: string;
}
