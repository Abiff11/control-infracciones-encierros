import {
  UnauthorizedException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import {
  getExpiredRefreshTokenCookieOptions,
  getRefreshTokenCookieOptions,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../../common/auth-cookie.util';
import { readCookie } from '../../common/csrf.util';
import { getClientIp } from '../../common/security/client-ip.util';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import {
  LoginResponseDto,
  LoginResponseUsuarioDto,
} from './dto/login-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

function getUserAgent(request: Request): string | undefined {
  const userAgent = request.headers['user-agent'];
  return typeof userAgent === 'string' ? userAgent : undefined;
}

function parseMinutes(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly refreshCookieOptions: ReturnType<
    typeof getRefreshTokenCookieOptions
  >;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';

    this.refreshCookieOptions = getRefreshTokenCookieOptions({
      nodeEnv,
      cookieSecure: this.configService.get<string>('COOKIE_SECURE'),
      cookieSameSite: this.configService.get<string>('COOKIE_SAME_SITE'),
      refreshCookieMode: this.configService.get<string>('REFRESH_COOKIE_MODE'),
      refreshTokenExpiresInMinutes: parseMinutes(
        this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN_MINUTES'),
        60,
      ),
    });
  }

  @Public()
  @Get('token-check')
  @ApiOperation({ summary: 'Preparar validacion de seguridad del navegador' })
  tokenCheck() {
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesion y obtener token JWT' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiTooManyRequestsResponse({
    description: 'Demasiados intentos de inicio de sesion',
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales invalidas o usuario inactivo',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const session = await this.authService.login(
      loginDto,
      getClientIp(request),
      getUserAgent(request),
    );

    response.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      session.refreshToken,
      this.refreshCookieOptions,
    );

    return {
      accessToken: session.accessToken,
      tokenType: session.tokenType,
      expiresIn: session.expiresIn,
      usuario: session.usuario,
    };
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotar refresh token y renovar access token' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalido o vencido' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const refreshToken = readCookie(request, REFRESH_TOKEN_COOKIE_NAME);

    if (!refreshToken) {
      response.cookie(
        REFRESH_TOKEN_COOKIE_NAME,
        '',
        getExpiredRefreshTokenCookieOptions(this.refreshCookieOptions),
      );
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const session = await this.authService.refreshSession(
      refreshToken,
      getClientIp(request),
      getUserAgent(request),
    );

    response.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      session.refreshToken,
      this.refreshCookieOptions,
    );

    return {
      accessToken: session.accessToken,
      tokenType: session.tokenType,
      expiresIn: session.expiresIn,
      usuario: session.usuario,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cerrar sesion activa' })
  async logout(
    @CurrentUser() usuario: LoginResponseUsuarioDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = readCookie(request, REFRESH_TOKEN_COOKIE_NAME);

    if (refreshToken) {
      await this.authService.logoutByRefreshToken(refreshToken);
    } else {
      await this.authService.logoutByUserId(usuario.idUsuario);
    }

    response.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      '',
      getExpiredRefreshTokenCookieOptions(this.refreshCookieOptions),
    );

    return { ok: true as const };
  }

  @Public()
  @Post('logout-tolerant')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Cerrar sesion limpiando cookie aunque el access token expire',
  })
  async logoutTolerant(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = readCookie(request, REFRESH_TOKEN_COOKIE_NAME);

    if (refreshToken) {
      await this.authService.logoutByRefreshToken(refreshToken);
    }

    response.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      '',
      getExpiredRefreshTokenCookieOptions(this.refreshCookieOptions),
    );

    return { ok: true as const };
  }
}
