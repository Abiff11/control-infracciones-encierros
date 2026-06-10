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
- Durante desarrollo, las entidades se modelan en codigo fuente y las migraciones definitivas se generan o consolidan al final
- Ejecutar migraciones con `DB_SYNCHRONIZE=false` cuando corresponda a una etapa formal de persistencia
- Comando util:

```bash
npm run migration:show
```

## Catalogos operativos

- Los catalogos operativos y vehiculares se modelan por migraciones
- La carga de datos se deja para seed o interfaz administrativa posterior

## Vehiculo

- La entidad `vehiculo` depende de `servicio`, `clase_vehiculo` y `linea_vehiculo`
- La marca se resuelve por `linea_vehiculo`

## Infracciones base

- La captura inicial arranca con `infractor` e `infracciones`
- `clave_policia` queda como texto por ahora, no como FK
- Los motivos se integraran despues con la tabla puente `infraccion_motivo`

## Motivos de infraccion

- Una infraccion puede tener uno o varios motivos
- La relacion se modela con la tabla puente `infraccion_motivo`

## Retencion vehicular

- `retencion_vehiculo` registra la entrada fisica del vehiculo al encierro
- El vehiculo se obtiene mediante la infraccion asociada

## Pago de infraccion

- `pago_infraccion` registra el pago asociado a una infraccion
- El cambio de estatus a `PAGADA` se implementara despues en la logica de servicio
