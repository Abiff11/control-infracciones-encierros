import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { WRITE_ROLES } from '../auth/constants/roles.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LoginResponseUsuarioDto } from '../auth/dto/login-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { RegistrarRetencionDto } from './dto/registrar-retencion.dto';
import { RegistrarSalidaDto } from './dto/registrar-salida.dto';
import { EncierrosService } from './encierros.service';

@ApiTags('encierros')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Controller('encierros')
export class EncierrosController {
  constructor(private readonly encierrosService: EncierrosService) {}

  @Get('retenciones/:idRetencionVehiculo')
  @ApiOperation({ summary: 'Obtener retención vehicular por id' })
  findRetencionById(
    @Param('idRetencionVehiculo', ParseIntPipe) idRetencionVehiculo: number,
  ) {
    return this.encierrosService.findRetencionByIdOrFail(idRetencionVehiculo);
  }

  @Get(':idEncierro')
  @ApiOperation({ summary: 'Obtener encierro por id' })
  findEncierroById(@Param('idEncierro', ParseIntPipe) idEncierro: number) {
    return this.encierrosService.findEncierroByIdOrFail(idEncierro);
  }

  @Roles(...WRITE_ROLES)
  @Post('retenciones')
  @ApiOperation({ summary: 'Registrar retención vehicular' })
  registrarRetencion(@Body() registrarRetencionDto: RegistrarRetencionDto) {
    return this.encierrosService.registrarRetencion(registrarRetencionDto);
  }

  @Roles(...WRITE_ROLES)
  @Post('salidas')
  @ApiOperation({ summary: 'Registrar salida vehicular' })
  registrarSalida(
    @Body() registrarSalidaDto: RegistrarSalidaDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ) {
    return this.encierrosService.registrarSalida({
      ...registrarSalidaDto,
      idUsuarioValidaSalida: currentUser.idUsuario,
    });
  }
}
