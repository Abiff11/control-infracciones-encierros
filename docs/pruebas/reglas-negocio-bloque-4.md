# Matriz de reglas de negocio — bloques 4A y 4B

## Alcance

Auditoría del flujo infracción → retención → pago o solventación → liberación → salida. Este bloque documenta y prueba reglas ya implementadas; no modifica contratos ni comportamiento productivo.

| Área | Caso y regla implementada | Función | Entrada negativa | Resultado esperado | HTTP | Cobertura | Resultado |
|---|---|---|---|---|---:|---|---|
| Infracciones | El folio debe ser único | `crearInfraccionCompleta` y `infracciones.folio_infraccion` | Folio existente | El servicio rechaza previamente con `ConflictException`; una colisión posterior del índice revierte la transacción | 409 en ambos caminos observados | Servicio y colisión PostgreSQL/HTTP real en 4B | Aprobada |
| Infracciones | El tipo debe estar activo | Validación de `tipoProcedimiento.activo` dentro de `crearInfraccionCompleta` | Tipo inactivo | Rechazo antes de guardar | 400 | Existente | Aprobada |
| Infracciones | El tipo debe permitir expedientes | Validación de `tipoProcedimiento.esTipoExpediente` dentro de `crearInfraccionCompleta` | `esExpediente=false` | Rechazo antes de guardar | 400 | Existente | Aprobada |
| Infracciones | Los campos dependen del tipo | Validaciones de folio, documento y encierro dentro de `crearInfraccionCompleta` | Infracción sin folio; vehículo sin parte, documento o encierro | Rechazo antes de guardar | 400 | Existente | Aprobada |
| Infracciones | Los motivos son obligatorios cuando el tipo los requiere | Validación de `tipoProcedimiento.requiereMotivos` dentro de `crearInfraccionCompleta` | Lista vacía | Rechazo antes de guardar | 400 | Existente | Aprobada |
| Infracciones | Los motivos deben existir en catálogo | `crearInfraccionCompleta`, `findMotivosByIdsOrFail` y FK de `infraccion_motivo` | ID inexistente | Rechazo sin expediente parcial | 404 observado | HTTP/PostgreSQL real en 4B | Aprobada |
| Retenciones | El tipo debe permitir retención | `registrarRetencion` | Expediente sin retención permitida | Rechazo sin insertar | 400 | Existente | Aprobada |
| Retenciones | Solo puede existir una retención por infracción | `registrarRetencion` | Segunda retención | Rechazo sin insertar | 400 | Nueva | Aprobada |
| Retenciones | Las referencias deben existir | `registrarRetencion` y FK de `retencion_vehiculo` | Encierro o infracción inexistente | Rechazo de servicio sin fila huérfana; la FK directa devuelve SQLSTATE `23503` | 404 en validación de servicio; HTTP de la FK directa no aplica | HTTP/PostgreSQL real en 4B | Aprobada |
| Retenciones | Dos solicitudes concurrentes no deben duplicar la retención | Índice `uq_retencion_vehiculo_id_infraccion` | Dos altas simultáneas | Una alta y un rechazo | 201/400 | Existente en `concurrency-smoke.mjs` | Aprobada |
| Pagos | No se paga una infracción solventada sin pago | `registrarPago` | Solventación existente | Rechazo antes de transacción | 400 | Existente | Aprobada |
| Pagos | Las claves no se repiten en una línea | `normalizeConceptos` | Claves equivalentes repetidas | Rechazo antes de transacción | 400 | Existente | Aprobada |
| Pagos | El monto debe ser mayor a cero | `normalizeConceptos` | Cero o negativo | Rechazo antes de transacción | 400 | Existente para cero; nueva para negativo | Aprobada |
| Pagos | El formato monetario se valida en el DTO | `RegistrarPagoConceptoDto` y `normalizeConceptos` | Texto, negativo, cero, más de dos decimales o formato inválido | Rechazo sin pago, conceptos, movimientos ni auditoría | 400 observado | HTTP/PostgreSQL real en 4B | Aprobada |
| Pagos | El folio de línea de captura debe ser único | Índice `uq_pago_infraccion_folio_linea_captura` | Folio existente | Rechazo sin pago duplicado | 409 | Existente en PostgreSQL/concurrencia | Aprobada |
| Pagos | Las operaciones concurrentes son atómicas | `registrarPago` | Dos pagos simultáneos | Una operación válida; sin movimientos o auditorías parciales | 201/409 | Existente en `concurrency-smoke.mjs` | Aprobada |
| Pagos | Un pago posterior a la entrega conserva el estatus | `actualizarEstatusYRegistrarMovimiento` | Pago después de salida | Conserva `VEHICULO_ENTREGADO` | 201 | Existente | Aprobada |
| Solventación | No aplica pago se rechaza si ya existe pago | `registrarNoAplicaPago` | Pago existente | Rechazo sin solventación | 400 | Existente | Aprobada |
| Solventación | Solo puede existir una solventación por infracción | `registrarNoAplicaPago` | Segunda solventación | Rechazo antes de transacción | 400 | Nueva | Aprobada |
| Solventación | El motivo debe tener al menos tres caracteres útiles | `registrarNoAplicaPago` y DTO | Motivo vacío o insuficiente | Rechazo antes de consultar persistencia | 400 | Nueva | Aprobada |
| Liberaciones | El expediente debe permitir retención y tener una | `generarLiberacion` | Tipo incompatible o sin retención | Rechazo sin guardar | 400 | Existente | Aprobada |
| Liberaciones | Debe existir exactamente un respaldo | `generarLiberacion` | Sin pago/solventación o con ambos | Rechazo sin guardar | 400 | Existente sin respaldo; nueva con respaldo doble | Aprobada |
| Liberaciones | El pago debe pertenecer a la infracción | `generarLiberacion` | Pago de otro expediente | Rechazo sin guardar | 400 | Nueva | Aprobada |
| Liberaciones | La solventación debe pertenecer a la infracción | `generarLiberacion` | Solventación de otro expediente | Rechazo sin guardar | 400 | Nueva | Aprobada |
| Liberaciones | El folio debe coincidir con la salida anticipada | `generarLiberacion` | Folio discordante | Rechazo antes de guardar | 400 | Existente | Aprobada |
| Liberaciones | La conciliación es única y atómica | `generarLiberacion` | Salida ya vinculada o actualización concurrente | Rechazo y rollback | 400/409 | Existente unitario y concurrencia | Aprobada |
| Salidas | La liberación debe corresponder a la retención | `registrarSalida` | Liberación de otro expediente | Rechazo sin salida | 400 | Existente | Aprobada |
| Salidas | La liberación debe existir | `registrarSalida` | ID inexistente | Rechazo sin salida | 404 | Nueva | Aprobada |
| Salidas | Solo puede existir una salida por retención | `registrarSalidaAnticipada` e índice único | Segunda salida | Rechazo sin duplicado | 400 | Existente unitario y concurrencia | Aprobada |
| Salidas | La salida anticipada requiere documentación | DTO y `registrarSalidaAnticipada` | Falta folio, placas, propietario o autorización | Rechazo antes de transacción | 400 | Existente | Aprobada |
| Salidas | Toda discrepancia requiere motivo y evidencia | `registrarSalidaAnticipada` | Cotejo distinto sin evidencia | Rechazo y rollback | 400 | Existente | Aprobada |
| Salidas | La entrega no se revierte por operaciones administrativas posteriores | `actualizarEstatusYRegistrarMovimiento` | Pago posterior | Conserva `VEHICULO_ENTREGADO` | 201 | Existente | Aprobada |

## Tablas y riesgo

- `infracciones`, `infraccion_motivo`: un rechazo incompleto puede crear expedientes duplicados o sin fundamento.
- `retencion_vehiculo`: una duplicación altera inventario y permite flujos físicos incompatibles.
- `pago_infraccion`, `pago_concepto`, `solventacion_sin_pago`: respaldos contradictorios pueden producir cobros o solventaciones dobles.
- `liberacion_vehiculo`: un respaldo ajeno puede autorizar la entrega de otro expediente.
- `salida_vehiculo`, `infraccion_movimiento`, `auditoria`: una salida duplicada o parcial rompe trazabilidad y estatus.

## Evidencia integrada del bloque 4B

La prueba `scripts/reglas-negocio-integration.mjs` inicia la aplicación compilada en un puerto aleatorio y crea una base local desechable con prefijo `control_infracciones_reglas_test_`. Aplica las migraciones, revierte y reaplica la última, verifica autenticación y CSRF reales, y elimina exclusivamente esa base al terminar.

| Escenario | HTTP observado | SQLSTATE observado | Persistencia |
|---|---:|---:|---|
| Folio duplicado detectado previamente por el servicio | 409 | No aplica | Sin cambios |
| Colisión concurrente del índice único de folio | 409 | `23505` | Una transacción completa; la otra se revierte |
| Motivo inexistente | 404 | No aplica | Sin expediente parcial |
| Encierro inexistente | 404 | No aplica | Sin expediente parcial |
| Infracción inexistente al registrar retención | 404 | No aplica | Sin retención huérfana |
| Montos texto, negativo, cero, con tres decimales o formato inválido | 400 | No aplica | Sin pago, conceptos, movimientos ni auditoría |
| Duplicado directo de folio de pago | No aplica | `23505` | Sentencia revertida |
| Referencia directa inexistente en retención | No aplica | `23503` | Sentencia revertida |

La respuesta 409 de la colisión única corresponde al filtro HTTP actual para SQLSTATE `23505`. La violación FK `23503` se comprobó directamente en PostgreSQL; no se le atribuye una respuesta HTTP porque las validaciones de servicio la evitan en los casos ejercitados.
