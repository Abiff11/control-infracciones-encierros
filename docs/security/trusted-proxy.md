# Proxy confiable e IP real del cliente

El backend no debe confiar directamente en `CF-Connecting-IP` ni en `X-Forwarded-For` recibidos por una petición. La IP usada para auditoría y rate limiting es `request.ip`, calculada por Express después de aplicar `trust proxy`.

## Producción

`TRUST_PROXY` es obligatorio en producción y debe contener únicamente la IP o el CIDR del proxy inverso que puede conectarse directamente al backend.

Ejemplos válidos:

```env
TRUST_PROXY=172.20.0.10
```

```env
TRUST_PROXY=172.20.0.0/28
```

Si existen varios proxies directos confiables:

```env
TRUST_PROXY=172.20.0.10,172.20.0.11
```

No usar:

```env
TRUST_PROXY=true
TRUST_PROXY=*
TRUST_PROXY=1
TRUST_PROXY=0.0.0.0/0
TRUST_PROXY=::/0
```

Para inspeccionar la red Docker antes de definir el valor:

```bash
docker network inspect intranet_proxy
```

Cuando sea posible, es preferible confiar en la IP fija del proxy antes que en una subred completa.

## Responsabilidad del proxy inverso

El proxy que llega directamente al backend debe controlar los headers reenviados. No debe aceptar ciegamente una cadena `X-Forwarded-For` proporcionada por el cliente.

En la entrada pública protegida por Cloudflare, la IP original debe resolverse únicamente desde tráfico que realmente proviene de la cadena Cloudflare/túnel configurada. El proxy central debe normalizar esa IP antes de enviarla al backend.

Conceptualmente:

```nginx
proxy_set_header X-Forwarded-For $resolved_client_ip;
```

`$resolved_client_ip` representa una IP obtenida por el proxy desde una fuente de confianza. No debe ser una copia directa de un header arbitrario enviado por el cliente.

El backend deliberadamente no interpreta `CF-Connecting-IP` por sí mismo.

## Rate limiting

`LoginRateLimitGuard` y el throttler global utilizan la misma IP resuelta por Express. Cambiar `CF-Connecting-IP` o `X-Forwarded-For` en una petición no genera por sí mismo una identidad nueva para el rate limiter.

La implementación actual usa almacenamiento en memoria. Es adecuada mientras exista una sola réplica del backend. Antes de escalar horizontalmente a varias réplicas se debe migrar el almacenamiento del throttler a un backend compartido, por ejemplo Redis.
