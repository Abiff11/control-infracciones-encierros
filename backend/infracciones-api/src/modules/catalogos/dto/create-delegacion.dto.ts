import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateDelegacionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idRegion!: number;

  @IsString()
  @IsNotEmpty()
  nombreDelegacion!: string;
}
