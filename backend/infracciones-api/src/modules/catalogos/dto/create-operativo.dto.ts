import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOperativoDto {
  @IsString()
  @IsNotEmpty()
  nombreOperativo!: string;
}
