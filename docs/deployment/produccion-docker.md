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
cd backend/infracciones-api
DB_SYNCHRONIZE=false npm run migration:run
npm run seed:initial
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

- Backend: abrir `http://localhost:3000/health` y confirmar respuesta JSON con `status: ok`.
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
- `descripcion_motivo` esta persistido para guardar la descripcion real del catalogo oficial.
