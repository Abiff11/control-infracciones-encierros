import { IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export type DecisionObservacion = 'CORREGIR' | 'RECHAZAR';

export class ResolverObservacionDto {
  @IsIn(['CORREGIR', 'RECHAZAR'])
  decision!: DecisionObservacion;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  resolucion!: string;
}
