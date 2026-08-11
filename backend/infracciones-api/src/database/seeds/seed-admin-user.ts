import 'dotenv/config';

import dataSource from '../data-source';
import {
  hashPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../common/security/password-hasher';
import { Rol } from '../../modules/roles/entities/rol.entity';
import { Usuario } from '../../modules/usuarios/entities/usuario.entity';

const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_NAME = 'Administrador';
const DEFAULT_ADMIN_ROLE = 'ADMIN';

function getRequiredSeedConfig() {
  const email = (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const nombreUsuario = (process.env.ADMIN_NOMBRE ?? DEFAULT_ADMIN_NAME).trim();
  const nombreRol = (process.env.ADMIN_ROL ?? DEFAULT_ADMIN_ROLE).trim();

  if (!email) {
    throw new Error('ADMIN_EMAIL no puede estar vacio.');
  }

  if (!password) {
    throw new Error('ADMIN_PASSWORD es obligatorio para ejecutar este seed.');
  }

  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new Error(
      `ADMIN_PASSWORD debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
    );
  }

  if (!nombreUsuario) {
    throw new Error('ADMIN_NOMBRE no puede estar vacio.');
  }

  if (!nombreRol) {
    throw new Error('ADMIN_ROL no puede estar vacio.');
  }

  return {
    email,
    password,
    nombreUsuario,
    nombreRol,
  };
}

async function seedAdminUser(): Promise<void> {
  await dataSource.initialize();

  try {
    const { email, password, nombreUsuario, nombreRol } =
      getRequiredSeedConfig();
    const rolesRepository = dataSource.getRepository(Rol);
    const usuariosRepository = dataSource.getRepository(Usuario);

    let rol = await rolesRepository.findOne({
      where: { nombreRol },
    });

    if (!rol) {
      rol = await rolesRepository.save(
        rolesRepository.create({
          nombreRol,
        }),
      );
      console.log(`Rol creado: ${nombreRol}`);
    } else {
      console.log(`Rol existente: ${nombreRol}`);
    }

    const passwordHash = await hashPassword(password);
    const passwordChangedAt = new Date();

    const existingUsuario = await usuariosRepository.findOne({
      where: { email },
      relations: {
        rol: true,
      },
    });

    if (existingUsuario) {
      existingUsuario.nombreUsuario = nombreUsuario;
      existingUsuario.passwordHash = passwordHash;
      existingUsuario.passwordChangedAt = passwordChangedAt;
      existingUsuario.activo = true;
      existingUsuario.rol = rol;
      existingUsuario.refreshTokenHash = null;
      existingUsuario.refreshTokenExpiresAt = null;
      existingUsuario.authSessionVersion =
        (existingUsuario.authSessionVersion ?? 0) + 1;

      await usuariosRepository.save(existingUsuario);
      console.log(`Usuario administrador actualizado: ${email}`);
      return;
    }

    await usuariosRepository.save(
      usuariosRepository.create({
        nombreUsuario,
        email,
        passwordHash,
        passwordChangedAt,
        activo: true,
        rol,
      }),
    );

    console.log(`Usuario administrador creado: ${email}`);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

seedAdminUser().catch((error: unknown) => {
  console.error('Error ejecutando seed de usuario administrador:', error);
  process.exitCode = 1;
});
