import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsString } from 'class-validator';

import { FindInfraccionesQueryDto } from './find-infracciones-query.dto';

export class ExportInfraccionesExcelDto extends FindInfraccionesQueryDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(60)
  @ArrayUnique()
  @IsString({ each: true })
  campos: string[];
}
