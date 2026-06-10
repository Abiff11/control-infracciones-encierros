import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import type { StringValue } from 'ms';
import { Repository } from 'typeorm';

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
};

@Injectable()
export class AuthService {
  private readonly jwtExpiresIn: StringValue;

  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.jwtExpiresIn = (configService.get<string>('JWT_EXPIRES_IN') ??
      '8h') as StringValue;
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const usuario = await this.validateUsuario(
      loginDto.email,
      loginDto.password,
    );

    const accessToken = await this.jwtService.signAsync(
      this.buildJwtPayload(usuario),
      {
        expiresIn: this.jwtExpiresIn,
      },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.jwtExpiresIn,
      usuario: this.sanitizeUsuario(usuario),
    };
  }

  async validateUsuario(email: string, password: string): Promise<Usuario> {
    const usuario = await this.findUsuarioByEmailOrFail(email);

    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const passwordMatches = await bcrypt.compare(
      password,
      usuario.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return usuario;
  }

  async findActiveUsuarioByIdOrFail(idUsuario: number): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { idUsuario },
      relations: {
        rol: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    return usuario;
  }

  buildJwtPayload(usuario: Usuario): JwtPayload {
    return {
      sub: usuario.idUsuario,
      email: usuario.email,
      rol: usuario.rol?.nombreRol,
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

  private async findUsuarioByEmailOrFail(email: string): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { email: email.trim().toLowerCase() },
      relations: {
        rol: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return usuario;
  }
}
