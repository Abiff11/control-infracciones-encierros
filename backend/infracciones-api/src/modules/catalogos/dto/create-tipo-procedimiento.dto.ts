import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString, Matches } from 'class-validator';

import { normalizeTipoProcedimientoClave } from '../utils/tipo-procedimiento-rules';

export class CreateTipoProcedimientoDto {
  @Transform(({ value }) =>
    normalizeTipoProcedimientoClave(String(value ?? '')),
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  claveTipoProcedimiento!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  nombreTipoProcedimiento!: string;

  @IsBoolean()
  esTipoExpediente!: boolean;

  @IsBoolean()
  requiereFolioInfraccion!: boolean;

  @IsBoolean()
  requiereNumParteInformativo!: boolean;

  @IsBoolean()
  requiereMotivos!: boolean;

  @IsBoolean()
  permiteRetencion!: boolean;

  @IsBoolean()
  activo!: boolean;
}
