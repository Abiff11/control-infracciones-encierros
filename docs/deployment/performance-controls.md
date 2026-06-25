# Controles de rendimiento

## Pool de PostgreSQL

El backend usa un pool explicito mediante `extra` de TypeORM/pg.

Variables:

```env
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
```

## Cache de consultas

La cache de query de TypeORM queda disponible pero apagada por defecto para evitar cachear datos sensibles.

Variables:

```env
CACHE_QUERY_ENABLED=false
CACHE_QUERY_DURATION_MS=30000
```

## Limite de concurrencia / rate limit

El backend usa `@nestjs/throttler` con politicas nombradas:

- `default`
- `read`
- `write`
- `auth`
- `refresh`
- `report`
- `import`
- `upload`
- `search`

El guard selectivo aplica el limite `default` globalmente y solo aplica politicas nombradas cuando una ruta/controlador las declara.

## Produccion Docker

`docker-compose.prod.yml` ahora pasa al contenedor API las variables de pool, cache, autenticacion y throttling necesarias para produccion.

## Nota operativa

No se habilito cache por defecto porque el sistema maneja informacion institucional sensible. Para usar cache, habilitar solo en consultas seguras, de catalogo o lectura no sensible.
