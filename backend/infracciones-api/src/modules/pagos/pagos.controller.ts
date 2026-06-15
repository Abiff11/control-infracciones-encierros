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

import { READ_ROLES, WRITE_ROLES } from '../auth/constants/roles.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LoginResponseUsuarioDto } from '../auth/dto/login-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { PagosService } from './pagos.service';

@ApiTags('pagos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Roles(...READ_ROLES)
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get('infraccion/:idInfraccion')
  @ApiOperation({ summary: 'Listar pagos por infracción' })
  findByInfraccion(@Param('idInfraccion', ParseIntPipe) idInfraccion: number) {
    return this.pagosService.findByInfraccion(idInfraccion);
  }

  @Get(':idPagoInfraccion')
  @ApiOperation({ summary: 'Obtener pago por id' })
  findById(@Param('idPagoInfraccion', ParseIntPipe) idPagoInfraccion: number) {
    return this.pagosService.findByIdOrFail(idPagoInfraccion);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  @ApiOperation({ summary: 'Registrar pago de infracción' })
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
