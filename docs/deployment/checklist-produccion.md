# Checklist de produccion

## Antes de desplegar

- [ ] Copiar `.env.production.example` a `.env.production`.
- [ ] Revisar secretos, dominios y credenciales reales.
- [ ] Confirmar `DB_SYNCHRONIZE=false`.
- [ ] Identificar SHA, imagen, esquema y migraciones reales de la base destino.
- [ ] Ejecutar el diagnostico territorial de solo lectura y aprobar discrepancias antes de escribir.
- [ ] Verificar respaldo y restauracion en una copia aislada; ensayar migraciones y rollback.
- [ ] Suspender escrituras y aplicar migraciones solo con autorizacion explicita.
- [ ] No ejecutar el seed legado en bases existentes ni nuevas hasta completar Q5.3 y validar la version candidata.
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
- [ ] Confirmar las 46 delegaciones oficiales activas; CENTRO solo en PLAZA como activa.
- [ ] Conservar las delegaciones historicas inactivas y sus relaciones en consultas, reportes y dashboard.
- [ ] Comparar conteos, folios, importes, claves foraneas e historial de importaciones con la evidencia previa.

## Cierre

- [ ] Registrar versión o tag desplegado.
- [ ] Guardar evidencias de migraciones y seed.
- [ ] Dejar nota de rollback con el commit anterior.

## Regularizacion territorial v1 (Q5.2c)

- Migracion 2020000000000: requiere la columna activo de 2010000000000.
- La migracion identifica por nombres, no por IDs de desarrollo. No modifica
  las FK de infracciones o importaciones ni reasigna expedientes de prueba.
- EL RETIRO de PLAZA se convierte en RETIRO de VALLES CENTRALES ZONA NORTE
  conservando su ID. Si existen colisiones, nombres regionales no canonicos,
  asociaciones incompatibles o importaciones contradictorias, detener y
  resolver mediante una decision aprobada antes de repetir.
- Las filas no oficiales se conservan inactivas; las regiones adicionales no se
  eliminan. La cantidad fisica de filas depende del inventario real.
- La tabla tecnica regularizacion_territorial_v1 guarda el estado previo y
  posterior y referencias de delegaciones modificadas. No editarla ni borrarla.
- El down solo procede si el catalogo y las referencias relevantes permanecen
  compatibles con el estado registrado. No usa CASCADE ni reinicia secuencias.
  Si se bloquea, no forzar ni alterar manualmente la bitacora: evaluar rollback
  de codigo compatible y restauracion del respaldo bajo mantenimiento.
- La prueba CI de nueve reversiones conserva la cobertura previa; las
  reversiones de migraciones historicas sin down de datos no sustituyen el backup.
- No desplegar Q5.2c aisladamente: Q5.3 debe corregir el seed y Q5.4 debe
  restringir nuevas operaciones a delegaciones oficiales activas.
- La reasignacion de seis expedientes de prueba es una operacion local
  separada (Q5.2d); no replicarla en produccion.
- Validar efectos regionales historicos de RETIRO y conservar importes y
  referencias. Registrar evidencias y reabrir escrituras solo tras QA y aprobacion.
