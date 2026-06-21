import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import {
  LoginResponseDto,
  LoginResponseUsuarioDto,
} from './dto/login-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LoginRateLimitGuard)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión y obtener token JWT' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos de inicio de sesion' })
  @ApiUnauthorizedResponse({
    description: 'Credenciales inválidas o usuario inactivo',
  })
  login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiOkResponse({ type: LoginResponseUsuarioDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  profile(@CurrentUser() usuario: LoginResponseUsuarioDto) {
    return usuario;
  }
}
