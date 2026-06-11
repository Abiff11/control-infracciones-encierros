import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { WRITE_ROLES } from '../auth/constants/roles.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LoginResponseUsuarioDto } from '../auth/dto/login-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { PagosService } from './pagos.service';

@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get('infraccion/:idInfraccion')
  findByInfraccion(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.pagosService.findByInfraccion(idInfraccion);
  }

  @Get(':idPagoInfraccion')
  findById(@Param('idPagoInfraccion', ParseIntPipe) idPagoInfraccion: number) {
    return this.pagosService.findByIdOrFail(idPagoInfraccion);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  registrarPago(
    @Body() registrarPagoDto: RegistrarPagoDto,
    @CurrentUser() currentUser: LoginResponseUsuarioDto,
  ) {
    return this.pagosService.registrarPago({
      ...registrarPagoDto,
      idUsuarioRegistraPago: currentUser.idUsuario,
    });
  }
}
