import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FindDelegacionesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idRegion?: number;
}
