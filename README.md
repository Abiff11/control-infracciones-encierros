# control-infracciones-encierros

Base del sistema de control de infracciones y encierros.

## Stack

- Backend: NestJS, TypeScript, PostgreSQL, TypeORM
- Frontend: Vite, React, TypeScript
- Infraestructura local: Docker Compose

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
