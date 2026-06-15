import 'dotenv/config';

import * as bcrypt from 'bcryptjs';

import dataSource from '../data-source';
import { Rol } from '../../modules/roles/entities/rol.entity';
import { Usuario } from '../../modules/usuarios/entities/usuario.entity';

const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';
const DEFAULT_ADMIN_NAME = 'Administrador';
const DEFAULT_ADMIN_ROLE = 'ADMIN';
const PASSWORD_SALT_ROUNDS = 10;

function getRequiredSeedConfig() {
  const email = (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  const nombreUsuario = (process.env.ADMIN_NOMBRE ?? DEFAULT_ADMIN_NAME).trim();
  const nombreRol = (process.env.ADMIN_ROL ?? DEFAULT_ADMIN_ROLE).trim();

  if (!email) {
    throw new Error('ADMIN_EMAIL no puede estar vacio.');
  }

  if (!password || password.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres.');
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

    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

    const existingUsuario = await usuariosRepository.findOne({
      where: { email },
      relations: {
        rol: true,
      },
    });

    if (existingUsuario) {
      existingUsuario.nombreUsuario = nombreUsuario;
      existingUsuario.passwordHash = passwordHash;
      existingUsuario.activo = true;
      existingUsuario.rol = rol;

      await usuariosRepository.save(existingUsuario);
      console.log(`Usuario administrador actualizado: ${email}`);
      return;
    }

    await usuariosRepository.save(
      usuariosRepository.create({
        nombreUsuario,
        email,
        passwordHash,
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
