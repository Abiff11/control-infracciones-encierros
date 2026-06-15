# Checklist de produccion

## Antes de desplegar

- [ ] Copiar `.env.production.example` a `.env.production`.
- [ ] Revisar secretos, dominios y credenciales reales.
- [ ] Confirmar `DB_SYNCHRONIZE=false`.
- [ ] Ejecutar migraciones contra la base destino.
- [ ] Ejecutar `npm run seed:initial`.
- [ ] Verificar que `/health` responde `status: ok`.

## Build

- [ ] `docker compose -f docker-compose.prod.yml --env-file .env.production build`
- [ ] Confirmar que la imagen del backend termina en `node dist/main.js`.
- [ ] Confirmar que el frontend se sirve con Nginx.

## Arranque

- [ ] `docker compose -f docker-compose.prod.yml --env-file .env.production up -d`
- [ ] `docker compose -f docker-compose.prod.yml ps`
- [ ] `docker compose -f docker-compose.prod.yml logs -f infracciones_api`

## Verificacion funcional

- [ ] Abrir `GET /health`.
- [ ] Abrir la SPA en el puerto publicado.
- [ ] Confirmar acceso a catálogos.
- [ ] Confirmar que existen regiones, delegaciones `CENTRO` y motivos oficiales.

## Cierre

- [ ] Registrar versión o tag desplegado.
- [ ] Guardar evidencias de migraciones y seed.
- [ ] Dejar nota de rollback con el commit anterior.
