# infracciones-api

API NestJS del sistema de control de infracciones y encierros.

## Stack

- NestJS
- TypeScript
- PostgreSQL
- TypeORM

## Estructura base

- `src/config`: configuracion centralizada de aplicacion y base de datos
- `src/database`: modulo de conexion, `data-source` y carpetas de migraciones y seeds
- `src/common`: utilidades compartidas para futuras capas transversales
- `src/modules`: modulos funcionales separados por dominio

## Comandos

```bash
npm install
npm run build
npm run test
```

## Reglas del scaffold

- `ConfigModule` se carga de forma global.
- `DatabaseModule` vive separado de `AppModule`.
- `TypeORM` lee `synchronize` desde `DB_SYNCHRONIZE`.
- No se agrega logica de negocio en este bloque.
- No se toca la base de datos de Personal.
