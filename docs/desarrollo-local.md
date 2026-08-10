# Desarrollo local

## Arquitectura local

- PostgreSQL en Docker: `localhost:5434`
- Backend NestJS: `backend/infracciones-api` en `http://localhost:3000`
- Frontend Vite: `frontend/infracciones-web` en `http://localhost:5173`

Flujo local:

`http://localhost:5173` -> `/api` -> `http://localhost:3000` -> `localhost:5434` -> contenedor `5432`

## Orden de arranque

1. Levantar PostgreSQL:

```bash
docker compose --env-file backend/infracciones-api/.env up -d postgres_infracciones
```

2. Ejecutar migraciones y backend:

```bash
cd backend/infracciones-api
npm run migration:run
npm run start:dev
```

3. Levantar frontend:

```bash
cd frontend/infracciones-web
npm run dev
```

## Detener base de datos

```bash
docker compose --env-file backend/infracciones-api/.env stop postgres_infracciones
```

No elimines el volumen para un arranque normal.

## Diagnostico rapido

```bash
docker ps --filter name=postgres_infracciones
docker port postgres_infracciones
cd backend/infracciones-api && npm run migration:show
curl http://localhost:3000/api/health
```
