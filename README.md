# control-infracciones-encierros

Base del sistema de control de infracciones y encierros.

## Stack

- Backend: NestJS, TypeScript, PostgreSQL, TypeORM
- Frontend: Vite, React, TypeScript
- Infraestructura local: Docker Compose

## Versiones recomendadas

- Node: `>=22.13`
- npm: `>=10`

## Estructura

```text
control-infracciones-encierros/
|-- backend/
|   `-- infracciones-api/
|-- frontend/
|   `-- infracciones-web/
|-- docs/
|   |-- DER/
|   |-- diccionario-datos/
|   `-- flujo-operativo/
|-- database/
|   |-- sql/
|   `-- backups/
|-- docker-compose.yml
|-- .env.example
|-- .gitignore
`-- README.md
```

## Comandos

Backend:

```bash
cd backend/infracciones-api
npm install
npm run build
npm run test
```

Frontend:

```bash
cd frontend/infracciones-web
npm install
npm run build
```

Estado del repositorio:

```bash
git status
```

## Reglas del scaffold

- No implementar CRUD, auth, entidades completas ni pantallas funcionales en este bloque.
- `DB_SYNCHRONIZE` debe venir de variables de entorno.
- `AppModule` no debe concentrar logica de negocio.
- El frontend se organiza por features, shared, services y routes.
- No usar URLs ni credenciales reales en el repositorio.

## Base de datos

- Las migraciones del backend viven en `backend/infracciones-api/src/database/migrations`
- Los scripts SQL generales viven en `database/sql`
- `DB_SYNCHRONIZE` debe permanecer en `false` para trabajo formal
- Los catalogos vehiculares y operativos se modelan por migraciones
- El modelo vehicular se construye por migraciones
- El nucleo de captura inicia con `infractor` e `infracciones`
- Los motivos se conectan a las infracciones mediante `infraccion_motivo`
