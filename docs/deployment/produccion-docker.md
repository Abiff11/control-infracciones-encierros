# Despliegue en produccion con Docker

## Prerrequisitos

- Docker y Docker Compose instalados.
- Acceso al repositorio.
- Variables de entorno definidas para produccion.
- Migraciones definitivas aplicadas antes del primer despliegue productivo.

## Preparar variables

1. Copiar `.env.production.example` a `.env.production`.
2. Ajustar credenciales y dominios reales.
3. Mantener `DB_SYNCHRONIZE=false` en produccion.

## Build

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build
```

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

- Backend: abrir `http://localhost:3000/` y confirmar respuesta `Hello World!`.
- Frontend: abrir `http://localhost:8080/` y confirmar carga de la SPA.

## Rollback basico

1. Detener el stack actual.
2. Regresar al tag o commit anterior.
3. Rebuild con la version anterior.
4. Levantar nuevamente con el mismo `.env.production`.

## Notas

- PostgreSQL no se expone publicamente.
- El frontend se sirve por Nginx en el puerto `8080`.
- Los secretos no deben quedar versionados.
