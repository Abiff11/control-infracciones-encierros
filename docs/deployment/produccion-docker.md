# Despliegue en produccion con Docker

## Prerrequisitos

- Docker y Docker Compose instalados.
- Acceso al repositorio.
- Variables de entorno definidas para produccion.
- Migraciones definitivas aplicadas antes del primer despliegue productivo.
- Carga inicial de catalogos ejecutada con `npm run seed:initial`.

## Preparar variables

1. Copiar `.env.production.example` a `.env.production`.
2. Ajustar credenciales y dominios reales.
3. Mantener `DB_SYNCHRONIZE=false` en produccion.

## Build

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build
```

## Migraciones y seed

Antes del primer despliegue:

```bash
./scripts/migrate.sh
```

El seed inicial carga:

- plazas del repositorio `Control_de_personal_PVE` como regiones
- una delegacion `CENTRO` por region
- motivos oficiales de infraccion
- catalogos base para pruebas y produccion

## Levantar servicios

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

## Estado

```bash
docker compose -f docker-compose.prod.yml ps
```

## Logs

```bash
docker compose -f docker-compose.prod.yml logs -f infracciones_api
```

## Health check basico

- Backend: desde la red de Docker, `GET /health` responde JSON con `status: ok`.
- Frontend/Nginx: abrir `http://127.0.0.1:${WEB_PORT:-8088}/healthz` y confirmar `ok`.
- SPA: abrir `http://127.0.0.1:${WEB_PORT:-8088}/`.

## Rollback basico

1. Detener el stack actual.
2. Regresar al tag o commit anterior.
3. Rebuild con la version anterior.
4. Levantar nuevamente con el mismo `.env.production`.

## Notas

- PostgreSQL no se expone publicamente.
- El frontend se sirve por Nginx no privilegiado en el puerto interno `8080`; el host usa `WEB_BIND_ADDRESS` y `WEB_PORT`.
- Produccion usa el `Dockerfile` raiz multi-stage. Los Dockerfiles internos de backend/frontend no forman parte de la estrategia productiva.
- Los secretos no deben quedar versionados.
- `descripcion_motivo` esta persistido para guardar la descripcion real del catalogo oficial.
