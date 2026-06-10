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

## Catalogos

Endpoints disponibles:

- GET /catalogos/regiones
- GET /catalogos/delegaciones
- GET /catalogos/delegaciones?idRegion=1
- GET /catalogos/sexos
- GET /catalogos/servicios
- GET /catalogos/clases-vehiculo
- GET /catalogos/marcas-vehiculo
- GET /catalogos/lineas-vehiculo
- GET /catalogos/lineas-vehiculo?idMarcaVehiculo=1
- GET /catalogos/tipos-procedimiento
- GET /catalogos/operativos
- GET /catalogos/estatus-infraccion
- GET /catalogos/motivos
- GET /catalogos/encierros
- GET /catalogos/roles

Estos endpoints alimentan formularios, filtros y pantallas del frontend.
No crean registros, solo exponen consultas de lectura.
No modifican estructura de base de datos.

## Autenticacion JWT

Variables necesarias:

```env
JWT_SECRET=change_me_in_local_dev
JWT_EXPIRES_IN=8h
```

### Login

POST /auth/login

Body:

```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

Respuesta:

```json
{
  "accessToken": "jwt",
  "tokenType": "Bearer",
  "expiresIn": "8h",
  "usuario": {
    "idUsuario": 1,
    "nombreUsuario": "Administrador",
    "email": "admin@example.com",
    "activo": true,
    "rol": {
      "idRol": 1,
      "nombreRol": "ADMIN"
    }
  }
}
```

### Perfil autenticado

GET /auth/profile

Header:

```txt
Authorization: Bearer <token>
```

No se devuelve `passwordHash`.

## Proteccion de endpoints

A partir de este bloque, los endpoints operativos requieren JWT.

Enviar header:

```txt
Authorization: Bearer <token>
```

Endpoints publicos:

- POST /auth/login
- GET /catalogos/*

Endpoints protegidos:

- GET /auth/profile
- /infracciones/*
- /pagos/*
- /liberaciones/*
- /encierros/*

En este bloque todavia no se validan permisos por rol; solo se exige un token JWT valido.

## Seeds de catalogos

- Para que el flujo automatico funcione, `estatus_infraccion` debe contener `PAGADA`, `LIBERACION_GENERADA` y `VEHICULO_ENTREGADO`
- Ejecutar con:

```bash
npm run seed:estatus
```

- El seed es idempotente
- No crea tablas ni modifica la estructura
- Solo inserta los registros faltantes del catalogo

## Vehiculos

- `vehiculo` depende de `clase_vehiculo`, `linea_vehiculo` y `servicio`
- La marca del vehiculo se obtiene por medio de `linea_vehiculo`

## Captura base

- La captura inicial arranca con `infractor` e `infracciones`
- `clave_policia` queda como texto por ahora, no como FK
- Los motivos se integran con la tabla puente `infraccion_motivo`

## Captura completa de infraccion

- Endpoint: `POST /infracciones`
- Crea en una sola transaccion `infractor`, `vehiculo`, `lugar_infraccion`, `infraccion`, `infraccion_motivo` y el movimiento inicial
- `fecha_infraccion` debe llegar como string ISO
- Los IDs numericos se validan y transforman desde el payload
- El flujo de estatus queda preparado para bloques posteriores

Payload de ejemplo:

```json
{
  "infractor": {
    "idSexo": 1,
    "nombre": "Juan",
    "apellidoPaterno": "Perez",
    "apellidoMaterno": "Lopez",
    "licencia": "ABC123",
    "curp": "PEPJ800101HDFXXX01"
  },
  "vehiculo": {
    "idClaseVehiculo": 1,
    "idLineaVehiculo": 1,
    "idServicio": 1,
    "anioModelo": 2020,
    "sitioServicioPublico": null,
    "color": "Blanco",
    "placas": "ABC123A",
    "estadoPlacas": "Oaxaca",
    "serie": "1HGCM82633A123456",
    "motor": "D4BA1234567"
  },
  "lugarInfraccion": {
    "municipio": "Oaxaca de Juarez",
    "colonia": "Centro",
    "calle": "Macedonio Alcala",
    "numero": "100"
  },
  "infraccion": {
    "idDelegacion": 1,
    "idTipoProcedimiento": 1,
    "idEstatusInfraccion": 1,
    "idUsuarioCaptura": 1,
    "idOperativo": null,
    "folioInfraccion": "INF-2026-0001",
    "fechaInfraccion": "2026-06-10",
    "horaInfraccion": "10:30",
    "observaciones": "Captura inicial",
    "clavePolicia": "P-123",
    "numParteInformativo": "PARTE-01",
    "motivos": [1, 2]
  }
}
```

## Consultas operativas

### Listado de infracciones

GET /infracciones

Filtros disponibles:
- folioInfraccion
- fechaInicio
- fechaFin
- idEstatusInfraccion
- idDelegacion
- placas
- nombreInfractor
- page
- limit

### Flujo operativo

GET /infracciones/:idInfraccion/flujo

Devuelve:
- infraccion
- motivos
- pagos
- liberaciones
- retenciones
- salidas
- movimientos

### Movimientos

GET /infracciones/:idInfraccion/movimientos

### Resumen por estatus

GET /infracciones/resumen/estatus

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
