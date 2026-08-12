import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthService } from '../auth.service';
import { JwtStrategy } from './jwt.strategy';
import { Usuario } from '../../usuarios/entities/usuario.entity';

describe('JwtStrategy', () => {
  const authServiceMock = {
    findActiveUsuarioByIdOrFail: jest.fn(),
    sanitizeUsuario: jest.fn(),
  };
  const configServiceMock = {
    get: jest.fn((key: string) =>
      key === 'JWT_SECRET'
        ? 'unit-test-secret-with-at-least-32-chars'
        : undefined,
    ),
  };

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      configServiceMock as unknown as ConfigService,
      authServiceMock as unknown as AuthService,
    );
  });

  it('rechaza JWT heredados o manipulados sin version de sesion', async () => {
    await expect(strategy.validate({ sub: 1 })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authServiceMock.findActiveUsuarioByIdOrFail).not.toHaveBeenCalled();
  });

  it('valida usuario y version de sesion antes de autenticar', async () => {
    const usuario = {
      idUsuario: 1,
      authSessionVersion: 3,
      activo: true,
    } as Usuario;
    const sanitized = {
      idUsuario: 1,
      nombreUsuario: 'Admin',
      email: 'admin@example.com',
      activo: true,
    };

    authServiceMock.findActiveUsuarioByIdOrFail.mockResolvedValue(usuario);
    authServiceMock.sanitizeUsuario.mockReturnValue(sanitized);

    await expect(strategy.validate({ sub: 1, sv: 3 })).resolves.toBe(sanitized);
    expect(authServiceMock.findActiveUsuarioByIdOrFail).toHaveBeenCalledWith(
      1,
      3,
    );
  });
});
