import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import { AuthService } from './auth.service';
import { AuthLoginAttempt } from './entities/auth-login-attempt.entity';
import { Rol } from '../roles/entities/rol.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

function buildUsuario(overrides: Partial<Usuario> = {}): Usuario {
  const rol = Object.assign(new Rol(), {
    idRol: 1,
    nombreRol: 'ADMIN',
  });

  return Object.assign(new Usuario(), {
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
    rol,
    ...overrides,
  });
}

describe('AuthService session revocation', () => {
  const usuariosRepositoryMock = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const loginAttemptsRepositoryMock = {
    create: jest.fn((value: Partial<AuthLoginAttempt>) => value),
    save: jest.fn(),
  };
  const jwtServiceMock = {
    signAsync: jest.fn(),
  };
  const configServiceMock = {
    get: jest.fn(
      (key: string, fallback?: string): string | undefined => {
        if (key === 'ACCESS_TOKEN_EXPIRES_IN') {
          return '15m';
        }
        if (key === 'REFRESH_TOKEN_EXPIRES_IN_MINUTES') {
          return '60';
        }
        return fallback;
      },
    ),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
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
    usuariosRepositoryMock.save.mockResolvedValue(usuario);

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

  it('rehash de bcrypt a Argon2id tras autenticacion correcta sin cambiar passwordChangedAt', async () => {
    const password = 'contraseña heredada suficientemente larga';
    const passwordChangedAt = new Date('2026-01-01T00:00:00.000Z');
    const usuario = buildUsuario({
      passwordHash: await bcrypt.hash(password, 10),
      passwordChangedAt,
    });
    usuariosRepositoryMock.findOne.mockResolvedValue(usuario);
    usuariosRepositoryMock.save.mockResolvedValue(usuario);
    loginAttemptsRepositoryMock.save.mockResolvedValue({});

    const validated = await service.validateUsuario(usuario.email, password);

    expect(validated.passwordHash).toMatch(/^\$argon2id\$/);
    expect(validated.passwordChangedAt).toBe(passwordChangedAt);
    expect(validated.failedLoginAttempts).toBe(0);
    expect(validated.lockedUntil).toBeNull();
  });

  it('rechaza un access token cuya version ya fue revocada', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue(
      buildUsuario({ authSessionVersion: 5 }),
    );

    await expect(
      service.findActiveUsuarioByIdOrFail(1, 4),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('acepta la version de sesion vigente para un usuario activo', async () => {
    const usuario = buildUsuario({ authSessionVersion: 5 });
    usuariosRepositoryMock.findOne.mockResolvedValue(usuario);

    await expect(service.findActiveUsuarioByIdOrFail(1, 5)).resolves.toBe(
      usuario,
    );
  });

  it('logout ejecuta la revocacion persistente de la sesion', async () => {
    const queryBuilder = {
      update: jest.fn(),
      set: jest.fn(),
      where: jest.fn(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    queryBuilder.update.mockReturnValue(queryBuilder);
    queryBuilder.set.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    usuariosRepositoryMock.createQueryBuilder.mockReturnValue(queryBuilder);

    await service.logoutByUserId(1);

    expect(queryBuilder.update).toHaveBeenCalledWith(Usuario);
    expect(queryBuilder.set).toHaveBeenCalledTimes(1);
    expect(queryBuilder.where).toHaveBeenCalledWith('id_usuario = :idUsuario', {
      idUsuario: 1,
    });
    expect(queryBuilder.execute).toHaveBeenCalledTimes(1);
  });
});
