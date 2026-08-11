import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import type { StringValue } from 'ms';
import { MoreThan, Repository } from 'typeorm';

import {
  hashPassword,
  passwordHashCanBeSafelyUpgraded,
  passwordHashNeedsUpgrade,
  verifyPassword,
} from '../../common/security/password-hasher';
import { sanitizeAuditPayload } from '../../common/redact-sensitive-data';
import { AuthLoginAttempt } from './entities/auth-login-attempt.entity';
import { LoginDto } from './dto/login.dto';
import {
  LoginResponseDto,
  LoginResponseUsuarioDto,
} from './dto/login-response.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';

type JwtPayload = {
  sub: number;
  email: string;
  rol?: string;
  sv: number;
};

export interface AuthSessionBundle extends LoginResponseDto {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly jwtExpiresIn: StringValue;

  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(AuthLoginAttempt)
    private readonly loginAttemptsRepository: Repository<AuthLoginAttempt>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtExpiresIn = (this.configService.get<string>(
      'ACCESS_TOKEN_EXPIRES_IN',
    ) ??
      this.configService.get<string>('JWT_EXPIRES_IN') ??
      '15m') as StringValue;
  }

  async login(
    loginDto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthSessionBundle> {
    const usuario = await this.validateUsuario(
      loginDto.email,
      loginDto.password,
      ip,
      userAgent,
    );

    usuario.authSessionVersion = (usuario.authSessionVersion ?? 0) + 1;
    return this.buildSessionBundle(usuario);
  }

  async refreshSession(
    refreshToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthSessionBundle> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const usuario = await this.usuariosRepository.findOne({
      where: {
        refreshTokenHash: tokenHash,
        refreshTokenExpiresAt: MoreThan(new Date()),
      },
      relations: { rol: true },
    });

    if (usuario) {
      if (!usuario.activo || this.isUserLocked(usuario)) {
        await this.revokeSession(usuario.idUsuario);
        throw new UnauthorizedException('Credenciales invalidas');
      }

      return this.rotateSession(usuario);
    }

    const staleUsuario = await this.usuariosRepository.findOne({
      where: { refreshTokenHash: tokenHash },
      relations: { rol: true },
    });

    if (staleUsuario) {
      await this.revokeSession(staleUsuario.idUsuario);
    }

    await this.registerLoginAttempt(
      staleUsuario?.email ?? 'unknown',
      staleUsuario?.idUsuario ?? null,
      false,
      'REFRESH_INVALID',
      ip,
      userAgent,
    );
    throw new UnauthorizedException('Credenciales invalidas');
  }

  async logoutByUserId(idUsuario: number): Promise<void> {
    await this.revokeSession(idUsuario);
  }

  async logoutByRefreshToken(refreshToken: string): Promise<void> {
    const usuario = await this.findUsuarioByRefreshToken(refreshToken);

    if (!usuario) {
      return;
    }

    await this.revokeSession(usuario.idUsuario);
  }

  async validateUsuario(
    email: string,
    password: string,
    ip?: string,
    userAgent?: string,
  ): Promise<Usuario> {
    const normalizedEmail = email.trim().toLowerCase();
    const usuario = await this.findUsuarioByEmailOrFail(
      normalizedEmail,
      ip,
      userAgent,
    );

    if (!usuario.activo || this.isUserLocked(usuario)) {
      await this.registerLoginAttempt(
        normalizedEmail,
        usuario.idUsuario,
        false,
        'USER_INACTIVE_OR_LOCKED',
        ip,
        userAgent,
      );
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const passwordMatches = await verifyPassword(usuario.passwordHash, password);

    if (!passwordMatches) {
      usuario.failedLoginAttempts = (usuario.failedLoginAttempts ?? 0) + 1;

      if (usuario.failedLoginAttempts >= this.getAuthMaxFailedAttempts()) {
        usuario.lockedUntil = new Date(
          Date.now() + this.getAuthLockMinutes() * 60 * 1000,
        );
      }

      await this.usuariosRepository.save(usuario);
      await this.registerLoginAttempt(
        normalizedEmail,
        usuario.idUsuario,
        false,
        'PASSWORD_INVALID',
        ip,
        userAgent,
      );
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (
      passwordHashNeedsUpgrade(usuario.passwordHash) &&
      passwordHashCanBeSafelyUpgraded(usuario.passwordHash, password)
    ) {
      usuario.passwordHash = await hashPassword(password);
    }

    usuario.failedLoginAttempts = 0;
    usuario.lockedUntil = null;
    usuario.lastLoginAt = new Date();
    await this.usuariosRepository.save(usuario);
    await this.registerLoginAttempt(
      normalizedEmail,
      usuario.idUsuario,
      true,
      'LOGIN_OK',
      ip,
      userAgent,
    );

    return usuario;
  }

  async findActiveUsuarioByIdOrFail(
    idUsuario: number,
    expectedSessionVersion: number,
  ): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { idUsuario },
      relations: { rol: true },
    });

    if (
      !usuario ||
      !usuario.activo ||
      this.isUserLocked(usuario) ||
      !Number.isInteger(expectedSessionVersion) ||
      usuario.authSessionVersion !== expectedSessionVersion
    ) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return usuario;
  }

  buildJwtPayload(usuario: Usuario): JwtPayload {
    return {
      sub: usuario.idUsuario,
      email: usuario.email,
      rol: usuario.rol?.nombreRol,
      sv: usuario.authSessionVersion ?? 0,
    };
  }

  sanitizeUsuario(usuario: Usuario): LoginResponseUsuarioDto {
    return {
      idUsuario: usuario.idUsuario,
      nombreUsuario: usuario.nombreUsuario,
      email: usuario.email,
      activo: usuario.activo,
      rol: usuario.rol
        ? {
            idRol: usuario.rol.idRol,
            nombreRol: usuario.rol.nombreRol,
          }
        : undefined,
    };
  }

  private async buildSessionBundle(
    usuario: Usuario,
  ): Promise<AuthSessionBundle> {
    const accessToken = await this.jwtService.signAsync(
      this.buildJwtPayload(usuario),
      {
        expiresIn: this.jwtExpiresIn,
      },
    );

    const refreshToken = this.createRefreshToken();
    const refreshTokenExpiresAt = this.resolveRefreshTokenExpiry();

    usuario.refreshTokenHash = this.hashRefreshToken(refreshToken);
    usuario.refreshTokenExpiresAt = refreshTokenExpiresAt;
    await this.usuariosRepository.save(usuario);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.jwtExpiresIn,
      usuario: this.sanitizeUsuario(usuario),
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  private async rotateSession(usuario: Usuario): Promise<AuthSessionBundle> {
    return this.buildSessionBundle(usuario);
  }

  private async findUsuarioByEmailOrFail(
    email: string,
    ip?: string,
    userAgent?: string,
  ): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { email: email.trim().toLowerCase() },
      relations: { rol: true },
    });

    if (!usuario) {
      await this.registerLoginAttempt(
        email,
        null,
        false,
        'USER_NOT_FOUND',
        ip,
        userAgent,
      );
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return usuario;
  }

  private async findUsuarioByRefreshToken(
    refreshToken: string,
  ): Promise<Usuario | null> {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    return this.usuariosRepository.findOne({
      where: {
        refreshTokenHash,
      },
      relations: { rol: true },
    });
  }

  private async revokeSession(idUsuario: number): Promise<void> {
    await this.usuariosRepository
      .createQueryBuilder()
      .update(Usuario)
      .set({
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        authSessionVersion: () => '"auth_session_version" + 1',
      })
      .where('id_usuario = :idUsuario', { idUsuario })
      .execute();
  }

  private createRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private isUserLocked(usuario: Usuario): boolean {
    return Boolean(
      usuario.lockedUntil && usuario.lockedUntil.getTime() > Date.now(),
    );
  }

  private getAuthMaxFailedAttempts(): number {
    const value = Number(
      this.configService.get<string>('AUTH_MAX_FAILED_ATTEMPTS', '5'),
    );

    return Number.isFinite(value) && value > 0 ? value : 5;
  }

  private getAuthLockMinutes(): number {
    const value = Number(
      this.configService.get<string>('AUTH_LOCK_MINUTES', '15'),
    );

    return Number.isFinite(value) && value > 0 ? value : 15;
  }

  private resolveRefreshTokenExpiry(): Date {
    const minutes = Number(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN_MINUTES', '60'),
    );
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 60;

    return new Date(Date.now() + safeMinutes * 60 * 1000);
  }

  private async registerLoginAttempt(
    email: string,
    idUsuario: number | null,
    success: boolean,
    reason: string | null,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    const attempt = this.loginAttemptsRepository.create(
      sanitizeAuditPayload({
        email: email.trim().toLowerCase(),
        idUsuario,
        success,
        reason,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      }),
    );

    await this.loginAttemptsRepository.save(attempt);
  }
}
