import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { sanitizeAuditPayload } from '../../common/redact-sensitive-data';
import { hashPassword } from '../../common/security/password-hasher';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ROLES } from '../auth/constants/roles.constants';
import { Rol } from '../roles/entities/rol.entity';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { FindUsuariosQueryDto } from './dto/find-usuarios-query.dto';
import {
  UsuarioListResponseDto,
  UsuarioResponseDto,
} from './dto/usuario-response.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(query: FindUsuariosQueryDto): Promise<UsuarioListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const builder = this.usuariosRepository
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.rol', 'rol');

    const search = query.search?.trim();
    if (search) {
      const searchValue = `%${search}%`;
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('usuario.nombreUsuario ILIKE :searchValue', { searchValue })
            .orWhere('usuario.email ILIKE :searchValue', { searchValue })
            .orWhere('rol.nombreRol ILIKE :searchValue', { searchValue });
        }),
      );
    }

    if (query.rol) {
      builder.andWhere('rol.idRol = :idRol', { idRol: query.rol });
    }

    if (query.activo !== undefined) {
      builder.andWhere('usuario.activo = :activo', { activo: query.activo });
    }

    const [usuarios, total] = await Promise.all([
      builder
        .orderBy('usuario.activo', 'DESC')
        .addOrderBy('usuario.nombreUsuario', 'ASC')
        .addOrderBy('usuario.idUsuario', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany(),
      builder.clone().getCount(),
    ]);

    return {
      data: usuarios.map((usuario) => this.toResponseDto(usuario)),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(idUsuario: number): Promise<UsuarioResponseDto> {
    const usuario = await this.findByIdOrFail(idUsuario);
    return this.toResponseDto(usuario);
  }

  async create(dto: CreateUsuarioDto): Promise<UsuarioResponseDto> {
    const nombreUsuario = this.normalizeText(dto.nombreUsuario);
    const email = this.normalizeEmail(dto.email);
    const rol = await this.findRolOrFail(dto.idRol);

    await this.ensureEmailAvailable(email);

    const usuario = this.usuariosRepository.create({
      nombreUsuario,
      email,
      passwordHash: await hashPassword(dto.password),
      passwordChangedAt: new Date(),
      activo: dto.activo ?? true,
      rol,
    });

    const saved = await this.usuariosRepository.save(usuario);
    await this.auditoriaService.registrar({
      accion: 'CREAR_USUARIO',
      entidad: 'usuarios',
      entidadId: saved.idUsuario,
      antesJson: null,
      despuesJson: sanitizeAuditPayload(
        this.toResponseDto(await this.findByIdOrFail(saved.idUsuario)),
      ),
    });
    return this.findOne(saved.idUsuario);
  }

  async update(
    idUsuario: number,
    dto: UpdateUsuarioDto,
  ): Promise<UsuarioResponseDto> {
    const usuario = await this.findByIdOrFail(idUsuario);

    const before = sanitizeAuditPayload(this.toResponseDto(usuario));

    const nextNombreUsuario =
      dto.nombreUsuario !== undefined
        ? this.normalizeText(dto.nombreUsuario)
        : usuario.nombreUsuario;
    const nextEmail =
      dto.email !== undefined ? this.normalizeEmail(dto.email) : usuario.email;
    const nextRol =
      dto.idRol !== undefined
        ? await this.findRolOrFail(dto.idRol)
        : usuario.rol;
    const nextActivo = dto.activo !== undefined ? dto.activo : usuario.activo;
    const passwordWillChange =
      dto.password !== undefined && dto.password.trim() !== '';
    const securityContextChanged =
      passwordWillChange ||
      nextEmail !== usuario.email ||
      nextRol.idRol !== usuario.rol.idRol ||
      nextActivo !== usuario.activo;

    await this.assertAdminSafety({
      targetUsuario: usuario,
      nextRol,
      nextActivo,
    });

    if (nextEmail !== usuario.email) {
      await this.ensureEmailAvailable(nextEmail, usuario.idUsuario);
    }

    usuario.nombreUsuario = nextNombreUsuario;
    usuario.email = nextEmail;
    usuario.rol = nextRol;
    usuario.activo = nextActivo;

    if (passwordWillChange) {
      usuario.passwordHash = await hashPassword(dto.password as string);
      usuario.passwordChangedAt = new Date();
    }

    if (securityContextChanged) {
      this.invalidateSession(usuario);
    }

    const saved = await this.usuariosRepository.save(usuario);
    await this.auditoriaService.registrar({
      accion: 'EDITAR_USUARIO',
      entidad: 'usuarios',
      entidadId: saved.idUsuario,
      antesJson: before,
      despuesJson: sanitizeAuditPayload(
        this.toResponseDto(await this.findByIdOrFail(saved.idUsuario)),
      ),
    });
    return this.findOne(saved.idUsuario);
  }

  async deactivate(
    idUsuario: number,
    currentUserId?: number,
  ): Promise<UsuarioResponseDto> {
    const usuario = await this.findByIdOrFail(idUsuario);
    const before = sanitizeAuditPayload(this.toResponseDto(usuario));

    if (currentUserId !== undefined && currentUserId === usuario.idUsuario) {
      throw new ForbiddenException('No puedes desactivar tu propio usuario.');
    }

    await this.assertAdminSafety({
      targetUsuario: usuario,
      nextRol: usuario.rol,
      nextActivo: false,
    });

    usuario.activo = false;
    this.invalidateSession(usuario);
    const saved = await this.usuariosRepository.save(usuario);
    await this.auditoriaService.registrar({
      accion: 'DESACTIVAR_USUARIO',
      entidad: 'usuarios',
      entidadId: saved.idUsuario,
      antesJson: before,
      despuesJson: sanitizeAuditPayload(
        this.toResponseDto(await this.findByIdOrFail(saved.idUsuario)),
      ),
    });
    return this.findOne(saved.idUsuario);
  }

  private async findByIdOrFail(idUsuario: number): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { idUsuario },
      relations: { rol: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return usuario;
  }

  private async findRolOrFail(idRol: number): Promise<Rol> {
    const rol = await this.rolesRepository.findOne({ where: { idRol } });

    if (!rol) {
      throw new BadRequestException('El rol seleccionado no existe.');
    }

    return rol;
  }

  private async ensureEmailAvailable(
    email: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.usuariosRepository.findOne({
      where: { email },
      relations: { rol: true },
    });

    if (existing && existing.idUsuario !== excludeId) {
      throw new ConflictException('El email ya está registrado.');
    }
  }

  private normalizeText(value: string): string {
    return value.trim();
  }

  private normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  private invalidateSession(usuario: Usuario): void {
    usuario.authSessionVersion = (usuario.authSessionVersion ?? 0) + 1;
    usuario.refreshTokenHash = null;
    usuario.refreshTokenExpiresAt = null;
  }

  private async assertAdminSafety(params: {
    targetUsuario: Usuario;
    nextRol: Rol;
    nextActivo: boolean;
  }): Promise<void> {
    const isTargetAdmin = params.targetUsuario.rol?.nombreRol === ROLES.ADMIN;
    const willRemainAdmin =
      params.nextActivo && params.nextRol.nombreRol === ROLES.ADMIN;

    if (!isTargetAdmin || willRemainAdmin) {
      return;
    }

    const activeAdminCount = await this.usuariosRepository
      .createQueryBuilder('usuario')
      .innerJoin('usuario.rol', 'rol')
      .where('usuario.activo = :activo', { activo: true })
      .andWhere('rol.nombreRol = :adminRole', { adminRole: ROLES.ADMIN })
      .andWhere('usuario.idUsuario != :idUsuario', {
        idUsuario: params.targetUsuario.idUsuario,
      })
      .getCount();

    if (activeAdminCount === 0) {
      throw new ForbiddenException(
        'No se puede dejar el sistema sin un usuario ADMIN activo.',
      );
    }
  }

  private toResponseDto(usuario: Usuario): UsuarioResponseDto {
    return {
      idUsuario: usuario.idUsuario,
      nombreUsuario: usuario.nombreUsuario,
      email: usuario.email,
      activo: usuario.activo,
      rol: {
        idRol: usuario.rol.idRol,
        nombreRol: usuario.rol.nombreRol,
      },
    };
  }
}
