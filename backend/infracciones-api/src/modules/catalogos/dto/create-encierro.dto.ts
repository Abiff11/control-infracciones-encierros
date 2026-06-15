import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEncierroDto {
  @IsString()
  @IsNotEmpty()
  nombreEncierro!: string;
}
