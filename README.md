# Control de infracciones y encierros

Sistema para registrar, consultar y controlar infracciones de tránsito, retención vehicular, encierros, pagos, liberaciones y salida de vehículos.

## Estructura

```text
control-infracciones-encierros/
├── backend/
│   └── infracciones-api/
├── frontend/
│   └── infracciones-web/
├── docs/
│   ├── DER/
│   ├── diccionario-datos/
│   ├── deployment/
│   └── importaciones/
├── nginx/
├── scripts/
├── Dockerfile
├── docker-compose.yml
└── docker-compose.prod.yml
```

## Stack previsto

- Backend: NestJS
- Frontend: React
- Base de datos: PostgreSQL
- ORM: TypeORM
- Contenedores: Docker Compose

## Backend

Ruta:

```bash
backend/infracciones-api
```

Comandos base:

```bash
npm install
npm run build
npm run test
```

## Frontend

Ruta:

```bash
frontend/infracciones-web
```

Comandos base:

```bash
npm install
npm run dev
```

## Docker local

Servicio actual:

- `postgres_infracciones`

Base de datos local:

- `control_infracciones_db`

Puerto local:

- `5434`

## Reglas de desarrollo

- No usar credenciales reales en el repositorio.
- No tocar la base de datos del sistema de Personal.
- No usar `synchronize: true` fijo en código.
- `DB_SYNCHRONIZE` debe controlarse por variable de entorno.
- Durante desarrollo, las entidades se modelan en codigo fuente y las migraciones definitivas se generan o consolidan al final.
- No agregar migraciones nuevas por cada bloque de entidad mientras el modelo siga en construcción.

## Base de datos

- Las migraciones del backend viven en `backend/infracciones-api/src/database/migrations`.
- `DB_SYNCHRONIZE` debe permanecer en `false` para trabajo formal.
- Las migraciones ya existentes se conservarán por ahora y podrán consolidarse al cierre del modelo.
- Los catalogos vehiculares y operativos ya están modelados.
- El modelo vehicular ya está modelado.
- El nucleo de captura inicia con `infractor` e `infracciones`.
- Los motivos se conectan a las infracciones mediante `infraccion_motivo`.
- `motivo` persiste `nombre_motivo` como clave y `descripcion_motivo` como descripcion real.
- El seed inicial de produccion/pruebas se ejecuta con `npm run seed:initial`.
- La entrada a encierro se modela con `retencion_vehiculo`.
- Los pagos se modelan con `pago_infraccion`.
- Las liberaciones se modelan con `liberacion_vehiculo`.
- La salida del vehículo se modela con `salida_vehiculo`.
- El historial del flujo se modela con `infraccion_movimiento`.

## Importaciones

- Flujo anual 2025: [docs/importaciones/informe-anual-infracciones-2025.md](docs/importaciones/informe-anual-infracciones-2025.md)

## B39

- Detalle completo de infraccion desde listado y desde encierros.
- Vista operativa de vehiculos en encierro con filtros, resumen y acciones.
- Filtros ampliados por seccion para consulta y control operativo.
- Importacion fiel de motivos multiples por infraccion.

## Despliegue

- Revisa `docs/deployment/produccion-docker.md`.
- Desarrollo usa `docker-compose.yml` solo para PostgreSQL local.
- Produccion usa `Dockerfile` raiz y `docker-compose.prod.yml`.
- Usa `GET /health` para la verificacion basica del backend.
