import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthService } from '../auth.service';
import { LoginResponseUsuarioDto } from '../dto/login-response.dto';

type JwtPayload = {
  sub?: number;
  email?: string;
  rol?: string;
  sv?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ?? 'change_me_in_local_dev',
    });
  }

  async validate(payload: JwtPayload): Promise<LoginResponseUsuarioDto> {
    if (!payload.sub || !Number.isInteger(payload.sv)) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const usuario = await this.authService.findActiveUsuarioByIdOrFail(
      payload.sub,
      payload.sv as number,
    );

    return this.authService.sanitizeUsuario(usuario);
  }
}
