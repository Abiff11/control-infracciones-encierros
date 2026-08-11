import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

import { AuthService } from './auth.service';
import { AuthLoginAttempt } from './entities/auth-login-attempt.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

function buildUsuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    idUsuario: 1,
    nombreUsuario: 'Admin',
    email: 'admin@example.com',
    passwordHash: 'hash',
    activo: true,
    authSessionVersion: 2,
    refreshTokenHash: null,
    refreshTokenExpiresAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    passwordChangedAt: null,
    rol: {
      idRol: 1,
      nombreRol: 'ADMIN',
    },
    ...overrides,
  } as Usuario;
}

describe('AuthService session revocation', () => {
  const usuariosRepositoryMock = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const loginAttemptsRepositoryMock = {
    create: jest.fn((value) => value),
    save: jest.fn(),
  };
  const jwtServiceMock = {
    signAsync: jest.fn(),
  };
  const configServiceMock = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'ACCESS_TOKEN_EXPIRES_IN') {
        return '15m';
      }
      if (key === 'REFRESH_TOKEN_EXPIRES_IN_MINUTES') {
        return '60';
      }
      return fallback;
    }),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    usuariosRepositoryMock.save.mockImplementation(async (value) => value);
    loginAttemptsRepositoryMock.save.mockImplementation(async (value) => value);
    jwtServiceMock.signAsync.mockResolvedValue('access-token');

    service = new AuthService(
      usuariosRepositoryMock as unknown as Repository<Usuario>,
      loginAttemptsRepositoryMock as unknown as Repository<AuthLoginAttempt>,
      jwtServiceMock as unknown as JwtService,
      configServiceMock as unknown as ConfigService,
    );
  });

  it('inicia un login con una nueva version de sesion incluida en el JWT', async () => {
    const usuario = buildUsuario({ authSessionVersion: 7 });
    jest.spyOn(service, 'validateUsuario').mockResolvedValue(usuario);

    const session = await service.login({
      email: usuario.email,
      password: 'Password123!',
    });

    expect(usuario.authSessionVersion).toBe(8);
    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 1, sv: 8 }),
      expect.objectContaining({ expiresIn: '15m' }),
    );
    expect(session.accessToken).toBe('access-token');
    expect(usuario.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(usuario.refreshTokenExpiresAt).toBeInstanceOf(Date);
  });

  it('rechaza un access token cuya version ya fue revocada', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue(
      buildUsuario({ authSessionVersion: 5 }),
    );

    await expect(service.findActiveUsuarioByIdOrFail(1, 4)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('acepta la version de sesion vigente para un usuario activo', async () => {
    const usuario = buildUsuario({ authSessionVersion: 5 });
    usuariosRepositoryMock.findOne.mockResolvedValue(usuario);

    await expect(service.findActiveUsuarioByIdOrFail(1, 5)).resolves.toBe(usuario);
  });

  it('logout invalida refresh token y aumenta atomicamente la version de sesion', async () => {
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    usuariosRepositoryMock.createQueryBuilder.mockReturnValue(queryBuilder);

    await service.logoutByUserId(1);

    expect(queryBuilder.set).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        authSessionVersion: expect.any(Function),
      }),
    );
    expect(queryBuilder.where).toHaveBeenCalledWith('id_usuario = :idUsuario', {
      idUsuario: 1,
    });
    expect(queryBuilder.execute).toHaveBeenCalledTimes(1);
  });
});
