import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegistrarNoAplicaPagoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idInfraccion!: number;

  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(1000)
  motivo!: string;
}
