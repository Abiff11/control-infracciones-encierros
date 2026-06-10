# Infracciones API

Backend NestJS para el sistema Control de infracciones y encierros.

## Instalacion

```bash
npm install
```

## Ejecucion local

```bash
npm run start:dev
```

## Validacion

```bash
npm run build
npm run test
npm run migration:show
```

## Reglas del scaffold

- La configuracion se centraliza en `src/config`
- Los modulos viven en `src/modules`
- Las migraciones viven en `src/database/migrations`
- Los seeds viven en `src/database/seeds`
- No usar `synchronize: true` fijo en codigo
- `DB_SYNCHRONIZE` se controla por variable de entorno
- No usar credenciales reales en archivos versionados

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

- `servicio`
- `clase_vehiculo`
- `marca_vehiculo`
- `linea_vehiculo`
- `tipo_procedimiento`
- `operativo`
- `lugar_infraccion`
- `motivo`

## Vehiculos

- `vehiculo` depende de `clase_vehiculo`, `linea_vehiculo` y `servicio`
- La marca del vehiculo se obtiene por medio de `linea_vehiculo`

## Captura base

- La captura inicial arranca con `infractor` e `infracciones`
- `clave_policia` queda como texto por ahora, no como FK
- Los motivos se integran con la tabla puente `infraccion_motivo`

## Motivos de infraccion

- Una infraccion puede tener uno o varios motivos
- La relacion se modela con la tabla puente `infraccion_motivo`

## Retencion vehicular

- `retencion_vehiculo` registra la entrada fisica del vehiculo al encierro
- El vehiculo se obtiene mediante la infraccion asociada

## Pago de infraccion

- `pago_infraccion` registra el pago asociado a una infraccion
- El cambio de estatus a `PAGADA` ya se ejecuta automaticamente al registrar el pago
- El catalogo `estatus_infraccion` debe contener `PAGADA`, `LIBERACION_GENERADA` y `VEHICULO_ENTREGADO`
- No se agregan migraciones en este bloque

## Liberacion vehicular

- `liberacion_vehiculo` registra la liberacion posterior al pago de una infraccion
- La liberacion queda ligada a la infraccion, al pago y al usuario que libera
- El cambio de estatus a `LIBERACION_GENERADA` ya se ejecuta automaticamente al generar la liberacion
- El catalogo `estatus_infraccion` debe contener `PAGADA`, `LIBERACION_GENERADA` y `VEHICULO_ENTREGADO`
- No se agregan migraciones en este bloque

## Salida vehicular

- `salida_vehiculo` registra la entrega fisica del vehiculo en el encierro
- La salida queda ligada a la retencion vehicular, a la liberacion y al usuario que valida la salida
- El cambio de estatus a `VEHICULO_ENTREGADO` ya se ejecuta automaticamente al registrar la salida
- El catalogo `estatus_infraccion` debe contener `PAGADA`, `LIBERACION_GENERADA` y `VEHICULO_ENTREGADO`
- No se agregan migraciones en este bloque
