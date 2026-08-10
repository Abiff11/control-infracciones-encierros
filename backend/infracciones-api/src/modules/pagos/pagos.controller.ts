import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PAYMENT_ROLES, READ_ROLES } from '../auth/constants/roles.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LoginResponseUsuarioDto } from '../auth/dto/login-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { FindConceptosPagoQueryDto } from './dto/find-conceptos-pago-query.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { PagosService } from './pagos.service';

@ApiTags('pagos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleAuthGuard)
@Roles(...READ_ROLES)
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get('conceptos')
  @ApiOperation({ summary: 'Buscar claves de concepto registradas' })
  findConceptos(@Query() query: FindConceptosPagoQueryDto) {
    return this.pagosService.findConceptos(query.q, query.limit);
  }

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

  @Roles(...PAYMENT_ROLES)
  @Post()
  @ApiOperation({ summary: 'Registrar pago por línea de captura' })
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
