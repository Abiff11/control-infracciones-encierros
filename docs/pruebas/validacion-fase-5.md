# Validación de la fase 5

La fase 5 parte de `main` en `c929dc9`, que incorpora la matriz HTTP de siete roles del bloque 5A. El bloque 5B añade tres pruebas de regresión para el interceptor de escritura por expediente. El bloque 5C reúne la evidencia de validación.

## Integridad y concurrencia (5B)

| Escenario | Comprobación |
| --- | --- |
| Tiempo de espera agotado | El interceptor reintenta hasta el límite configurado, devuelve un conflicto HTTP 409 y libera la conexión sin ejecutar la escritura. |
| Error de la operación | El interceptor solicita el desbloqueo del expediente antes de devolver la conexión y propaga el error original. |
| Escritura identificada por retención | El interceptor consulta la retención y adquiere y libera el bloqueo con el ID de la infracción asociada. |

Las pruebas unitarias ejecutan el interceptor con un `QueryRunner` simulado. El [smoke de concurrencia](../../backend/infracciones-api/scripts/concurrency-smoke.mjs) complementa esa cobertura con dos usuarios, 50 lecturas simultáneas y escrituras concurrentes sobre retención, pago, liberación y salida. Comprueba que cada par de escrituras deje un solo registro, que el expediente termine en `VEHICULO_ENTREGADO` y que exista un único movimiento por cada acción verificada.

## Resultados locales (5C)

| Comprobación | Backend | Frontend |
| --- | --- | --- |
| Compilación | Aprobada | Aprobada, con aviso de Vite por un paquete de más de 500 kB |
| Lint | 0 errores y 19 advertencias en las pruebas existentes de RBAC y encierros | 0 errores y 0 advertencias |
| Pruebas | 303 aprobadas en 28 suites | 115 aprobadas en 14 archivos |

Para reproducir desde la raíz del repositorio con Node.js 22:

```bash
cd backend/infracciones-api
npm ci
npm run build
npm run lint
npm test -- --runInBand

cd ../../frontend/infracciones-web
npm ci
npm run lint
npm run test
npm run build
```

## Evidencia de GitHub Actions

Para el cierre, revisar los resultados del commit de la rama de validación en el PR.

| Flujo | Evidencia esperada |
| --- | --- |
| [Dashboard feature validation](../../.github/workflows/dashboard-feature-validation.yml) | Compilación, lint y pruebas de ambos proyectos. Migraciones, comprobaciones de esquema, reversión y reaplicación en PostgreSQL desechable. |
| [Concurrency verification](../../.github/workflows/concurrency-verification.yml) | El paso del smoke confirma `CONCURRENCY_SMOKE_OK`. |
| [Security verification](../../.github/workflows/security-verification.yml) | Smoke de seguridad de la API y análisis pasivo de ZAP en entornos desechables. |
| [Supply chain security](../../.github/workflows/supply-chain-security.yml), [Container security](../../.github/workflows/container-security.yml) y [CodeQL](../../.github/workflows/codeql.yml) | Auditoría de dependencias, Trivy y análisis estático con CodeQL. |

La evidencia corresponde a la validación automatizada de la fase 5. Las verificaciones operativas y los pendientes de infraestructura se registran en la [matriz de seguridad](../security/asvs-verification.md). La integración a `main` requiere autorización expresa.
