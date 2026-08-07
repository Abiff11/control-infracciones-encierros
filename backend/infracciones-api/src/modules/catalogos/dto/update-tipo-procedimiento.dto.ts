import { PartialType, OmitType } from '@nestjs/swagger';

import { CreateTipoProcedimientoDto } from './create-tipo-procedimiento.dto';

export class UpdateTipoProcedimientoDto extends PartialType(
  OmitType(CreateTipoProcedimientoDto, ['claveTipoProcedimiento'] as const),
) {}
