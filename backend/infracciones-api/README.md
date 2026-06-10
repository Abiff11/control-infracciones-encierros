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
npm run migration:show
npm run migration:run
npm run migration:revert
```

## Reglas del scaffold

- `ConfigModule` se carga de forma global.
- `DatabaseModule` vive separado de `AppModule`.
- `TypeORM` lee `synchronize` desde `DB_SYNCHRONIZE`.
- Para trabajo formal, dejar `DB_SYNCHRONIZE=false`.
- No se agrega logica de negocio en este bloque.
- No se toca la base de datos de Personal.

## Migraciones

- Las migraciones viven en `src/database/migrations`
- El CLI usa `typeorm-ts-node-commonjs` para correr archivos TypeScript con el module resolution actual del backend
- Comandos utiles:

```bash
npm run migration:show
npm run migration:run
npm run migration:revert
```
