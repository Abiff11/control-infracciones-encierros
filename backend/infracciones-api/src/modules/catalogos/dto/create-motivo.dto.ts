import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMotivoDto {
  @IsString()
  @IsNotEmpty()
  claveMotivo!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  descripcionMotivo?: string;
}
