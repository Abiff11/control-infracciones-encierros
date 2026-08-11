# Matriz de verificación de seguridad

Referencia de trabajo: **OWASP Application Security Verification Standard (ASVS) 5.0.0**.

Este documento es una matriz interna de evidencia y pendientes. **No representa una certificación formal de cumplimiento ASVS** ni sustituye un pentest independiente.

## Controles con evidencia automatizada o de código

| Dominio | Estado | Evidencia principal |
|---|---|---|
| Autenticación por defecto | Verificado | `JwtAuthGuard` global; solo excepciones explícitas mediante `@Public()`; smoke test anónimo espera 401 en `/api/usuarios`. |
| Autorización por rol | Verificado | `RoleAuthGuard` + `@Roles`; smoke test autentica un usuario `CONSULTA` y exige 403 en `/api/usuarios`. |
| Gestión de sesión | Verificado | JWT con `auth_session_version`, refresh rotatorio, logout y cambios sensibles revocan sesión; smoke test comprueba que el access token anterior devuelve 401 tras logout. |
| Protección CSRF | Verificado | Cookie firmada HMAC + double submit cookie/header; smoke test exige 403 para login mutante sin token CSRF. |
| Hash de contraseñas | Verificado | Argon2id para hashes nuevos; compatibilidad y rehash progresivo de bcrypt heredado; pruebas unitarias. |
| Fuerza bruta | Verificado en instancia única | Rate limiting de login + bloqueo persistente de cuenta; smoke test fuerza y verifica HTTP 429. |
| Validación de entrada | Verificado parcialmente | `ValidationPipe` global con whitelist/forbidNonWhitelisted; límites de paginación y DTOs. La cobertura depende de DTOs concretos de cada endpoint. |
| Importación de archivos | Verificado | Upload limitado, firma/MIME/extensión, preflight ZIP, límites de expansión/filas/columnas, parser XLSX restringido y tests. |
| Cabeceras HTTP backend | Verificado | Smoke test comprueba `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cache-Control`, `Permissions-Policy` y ausencia de `X-Powered-By`. |
| CSP / anti-clickjacking frontend | Verificado por DAST pasivo | ZAP Baseline contra el contenedor frontend desechable; reglas de CSP, anti-clickjacking, nosniff y X-Powered-By bloquean la verificación. |
| CORS | Verificado por configuración | Allowlist explícita; wildcard rechazado y configuración obligatoria en producción. |
| Proxy / IP cliente | Verificado | `request.ip` mediante `TRUST_PROXY` explícito; valores amplios/saltos rechazados; test evita bypass mediante headers falsos. |
| Auditoría de seguridad | Verificado | 401/403/429, CSRF y rate limit generan eventos correlacionados por `requestId`; smoke test consulta la bitácora y exige los eventos esperados. |
| Manejo de errores | Verificado por código/tests existentes | Filtro seguro para respuestas de error; no se exponen stack traces de aplicación al cliente. |
| Dependencias | Verificado en CI | `npm audit` bloquea HIGH/CRITICAL en runtime y árbol completo; Dependabot configurado. |
| SAST | Verificado en CI | CodeQL JavaScript/TypeScript con consultas de seguridad. |
| Secretos / misconfiguraciones | Verificado en CI | Trivy filesystem sobre secretos y misconfiguraciones HIGH/CRITICAL. |
| Imágenes de contenedor | Verificado en CI | Trivy HIGH/CRITICAL sobre imágenes finales; runtime mínimo del backend. |
| Aislamiento de contenedores | Verificado en CI | usuario no root de imagen, `no-new-privileges`, `cap_drop: ALL`, filesystem read-only, tmpfs y `pids_limit`. |
| Migraciones | Verificado en CI | PostgreSQL desechable, schema assertions, rollback y reaplicación de las migraciones de la feature. |
| Correlación de incidentes | Verificado | `X-Request-Id` generado por servidor, persistido en auditoría y comprobado en security smoke. |

## Pendientes que requieren infraestructura o decisión de producto

| Pendiente | Riesgo / razón | Siguiente acción |
|---|---|---|
| MFA dentro de la aplicación | La aplicación no implementa un segundo factor propio. La protección externa de acceso no sustituye una evaluación de MFA a nivel aplicación cuando el riesgo lo requiera. | Definir si MFA será requisito interno y diseñar TOTP/WebAuthn o integración con IdP. |
| Alertamiento externo / SIEM | Los eventos HIGH/CRITICAL se registran y emiten estructurados, pero no existe entrega a un canal externo. | Integrar el colector institucional, SIEM o canal de alertamiento cuando esté disponible. |
| Rate limiting distribuido | El almacenamiento de throttling es local al proceso. | Antes de ejecutar más de una réplica del backend, migrar el storage del throttler a un backend compartido. |
| Privilegios y TLS de PostgreSQL en producción | No puede certificarse desde CI del repositorio. | Auditar el rol real de BD, permisos mínimos, acceso de red y TLS en el servidor institucional. |
| TLS/HSTS del perímetro público | El DAST de CI es deliberadamente HTTP y local. TLS termina fuera del contenedor frontend. | Verificar Cloudflare/Nginx público después del despliegue autorizado. |
| `TRUST_PROXY` de producción | El código exige un valor, pero la IP/CIDR correcta depende de la red real. | Antes del siguiente deploy, obtener `docker network inspect intranet_proxy` y configurar únicamente el proxy directo confiable. |
| Dependency Review de GitHub | El repositorio tiene Dependency Graph deshabilitado. | Habilitar Dependency Graph en GitHub y reincorporar `dependency-review-action` como barrera adicional. |
| Branch protection / rulesets | No se ha certificado la política administrativa del repositorio. | Revisar ruleset de `main`, required checks y restricción de force push. |
| Límites CPU/RAM de contenedores | No se fijaron valores arbitrarios sin métricas del host/carga. | Medir consumo y establecer límites operativos con margen seguro. |
| Pentest activo independiente | ZAP Baseline es pasivo y las pruebas CI son dirigidas. | Ejecutar pentest activo en un ambiente de staging desechable y autorizado antes de una certificación formal. |

## Criterio de merge de seguridad

Una modificación no debe integrarse a `main` si falla cualquiera de estas barreras aplicables:

1. build, lint o tests;
2. migraciones/schema assertions;
3. `npm audit` HIGH/CRITICAL;
4. CodeQL;
5. Trivy de repositorio o imágenes;
6. security smoke negativo;
7. reglas DAST configuradas como `FAIL`.

Los warnings de ZAP que no están configurados como `FAIL` deben conservarse en el artefacto del workflow y revisarse; no deben convertirse automáticamente en excepciones permanentes sin justificación.
