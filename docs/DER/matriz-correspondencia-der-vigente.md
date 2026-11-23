# Matriz de correspondencia — DER histórico vs. modelo vigente (bloque 4B.1)

**Estado:** revisión documental previa al rediseño del DER (bloque 4B.2). Este archivo **no reemplaza** el diagrama histórico ni el diccionario vigente.

**Corte de repositorio:** `main` en `c8ba798da7b969d83e89c43ce91485c36563b0bf` (22 de noviembre de 2026).

**Referencia de modelado:** `ecab15095b896cc8c5f056a41b4532256b407d8c`. Se verificó que entre esta referencia y el corte actual no cambiaron las entidades `*.entity.ts` ni las migraciones.

## 1. Fuentes y método

1. [DER histórico](./INFRACCIONES.pdf), una página, blob Git `01dacab5c7c336111767e26a85d0170f306980aa`.
2. [Diccionario vigente](../diccionario-datos/diccionario_datos_infracciones_vigente.xlsx), seis hojas; blob Git `a360de4f2cefcd21a88c114df4d84dad0e3d1eff`.
3. Archivos de entidades TypeORM enlazados por cada tabla en las matrices siguientes. Las hojas **Diccionario**, **Relaciones** y **Restricciones** determinan el detalle del modelo que deberá dibujarse.

Se leyeron los nombres y las filas **visibles** del PDF y se cotejaron por nombre con las columnas documentadas en el Excel. Las equivalencias de nombres se señalan como diferencias a revisar, **no** como evidencia de que se ejecutó un `RENAME COLUMN`. Las cardinalidades de la sección 4 son las documentadas en la hoja `Relaciones`; no se dedujeron de las líneas gráficas del PDF.

## 2. Resumen cuantitativo

| Indicador | PDF histórico | Diccionario vigente | Diferencia |
| --- | ---: | ---: | ---: |
| Entidades / tablas | 24 | 32 | +8 |
| Filas de campos visibles / campos documentados | 116 | 218 | +102 |
| FK rotuladas / relaciones FK documentadas | 30 | 44 | +14 |
| Restricciones y recomendaciones documentadas | No inventariadas de forma comparable | 34 | Requieren revisión independiente |

De los **218 campos vigentes**, **141** pertenecen a las 24 entidades ya dibujadas y **77** a las ocho entidades que faltan. La cifra **116** es el recuento de renglones de atributos visibles en el PDF; uno de ellos corresponde a la PK de `INFRACCION_MOTIVO`, **sin nombre legible**. Por tanto, no deben interpretarse los conteos como una auditoría física del esquema PostgreSQL.

> **Corrección del diagnóstico preliminar:** el recuento directo del PDF arroja **116**, no 118, filas de campo. El recuento de FK rotuladas sí es **30**.

## 3. Correspondencia entidad por entidad

### 3.1 Entidades presentes en ambos modelos (24)

**Convención:** los conteos PDF y vigente son renglones/campos, no cantidad de relaciones. “Sin diferencia de nombres” **no** asegura igualdad de tipos PostgreSQL, nulabilidad, unicidad ni restricciones.

| Entidad / entidad TypeORM | Campos PDF | Campos vigentes | Diferencias identificadas |
| --- | ---: | ---: | --- |
| [`INFRACCIONES`](../../backend/infracciones-api/src/modules/infracciones/entities/infraccion.entity.ts) | 15 | 18 | Agregar `id_encierro`, `tipo_documento_referencia`, `folio_documento_referencia`. Revisar tipos: `folio_infraccion` 30→50; `clave_policia` y `num_parte_informativo` 15→50. |
| [`INFRACTOR`](../../backend/infracciones-api/src/modules/infractores/entities/infractor.entity.ts) | 7 | 7 | Sin diferencia de nombres de campos. |
| [`REGION`](../../backend/infracciones-api/src/modules/catalogos/entities/region.entity.ts) | 2 | 2 | Sin diferencia de nombres de campos. |
| [`DELEGACION`](../../backend/infracciones-api/src/modules/catalogos/entities/delegacion.entity.ts) | 3 | 3 | Sin diferencia de nombres de campos. |
| [`SEXO`](../../backend/infracciones-api/src/modules/catalogos/entities/sexo.entity.ts) | 2 | 2 | PDF: `clave_sexo`; vigente: `nombre_sexo`. |
| [`SERVICIO`](../../backend/infracciones-api/src/modules/catalogos/entities/servicio.entity.ts) | 2 | 2 | Sin diferencia de nombres de campos. |
| [`VEHICULO`](../../backend/infracciones-api/src/modules/vehiculos/entities/vehiculo.entity.ts) | 11 | 11 | PDF: `año_modelo`; vigente: `anio_modelo`. |
| [`CLASE_VEHICULO`](../../backend/infracciones-api/src/modules/catalogos/entities/clase-vehiculo.entity.ts) | 2 | 2 | PDF: `nombre_clase`; vigente: `nombre_clase_vehiculo`. |
| [`MARCA_VEHICULO`](../../backend/infracciones-api/src/modules/catalogos/entities/marca-vehiculo.entity.ts) | 2 | 2 | PDF: `nombre_marca`; vigente: `nombre_marca_vehiculo`. |
| [`LINEA_VEHICULO`](../../backend/infracciones-api/src/modules/catalogos/entities/linea-vehiculo.entity.ts) | 3 | 3 | PDF: `nombre_linea`; vigente: `nombre_linea_vehiculo`. |
| [`LUGAR_INFRACCION`](../../backend/infracciones-api/src/modules/catalogos/entities/lugar-infraccion.entity.ts) | 5 | 2 | PDF: `municipio`, `colonia`, `calle`, `numero`; vigente: `nombre_lugar_infraccion`. No asumir conversión directa de datos. |
| [`MOTIVO`](../../backend/infracciones-api/src/modules/motivos/entities/motivo.entity.ts) | 3 | 3 | PDF: `clave_motivo`; vigente: `nombre_motivo`. |
| [`INFRACCION_MOTIVO`](../../backend/infracciones-api/src/modules/infracciones/entities/infraccion-motivo.entity.ts) | 3 | 3 | La fila PK del PDF no tiene nombre; vigente: `id_infraccion_motivo`. No contabilizar como cambio probado de llave. |
| [`TIPO_PROCEDIMIENTO`](../../backend/infracciones-api/src/modules/catalogos/entities/tipo-procedimiento.entity.ts) | 2 | 9 | PDF: `procedimiento`; vigente: `nombre_tipo_procedimiento`. Agregar `clave_tipo_procedimiento`, `es_tipo_expediente`, `requiere_folio_infraccion`, `requiere_num_parte_informativo`, `requiere_motivos`, `permite_retencion`, `activo`. |
| [`ENCIERRO`](../../backend/infracciones-api/src/modules/encierros/entities/encierro.entity.ts) | 2 | 2 | Sin diferencia de nombres de campos. |
| [`OPERATIVO`](../../backend/infracciones-api/src/modules/catalogos/entities/operativo.entity.ts) | 2 | 2 | Sin diferencia de nombres de campos. |
| [`RETENCION_VEHICULO`](../../backend/infracciones-api/src/modules/encierros/entities/retencion-vehiculo.entity.ts) | 8 | 8 | Sin diferencia de nombres de campos. |
| [`PAGO_INFRACCION`](../../backend/infracciones-api/src/modules/pagos/entities/pago-infraccion.entity.ts) | 7 | 10 | PDF: `folio_pago`; vigente: `folio_linea_captura`. Agregar `monto_infraccion`, `dias_piso_cobrados`, `monto_dias_piso`. |
| [`LIBERACION_VEHICULO`](../../backend/infracciones-api/src/modules/liberaciones/entities/liberacion-vehiculo.entity.ts) | 9 | 10 | Agregar FK `id_solventacion_sin_pago`. |
| [`SALIDA_VEHICULO`](../../backend/infracciones-api/src/modules/encierros/entities/salida-vehiculo.entity.ts) | 9 | 16 | Agregar `modalidad_salida`, `folio_liberacion_presentado`, `placas_cotejadas`, `datos_vehiculo_cotejados`, `nombre_propietario_declarado`, `autorizacion_documental_verificada`, `referencia_documento_liberacion`. |
| [`ESTATUS_INFRACCION`](../../backend/infracciones-api/src/modules/catalogos/entities/estatus-infraccion.entity.ts) | 2 | 2 | Sin diferencia de nombres de campos. |
| [`USUARIOS`](../../backend/infracciones-api/src/modules/usuarios/entities/usuario.entity.ts) | 6 | 13 | Agregar `auth_session_version`, `refresh_token_hash`, `refresh_token_expires_at`, `failed_login_attempts`, `locked_until`, `last_login_at`, `password_changed_at`. PDF: `email` varchar(50); vigente: varchar(100). |
| [`ROL`](../../backend/infracciones-api/src/modules/roles/entities/rol.entity.ts) | 2 | 2 | Sin diferencia de nombres de campos. |
| [`INFRACCION_MOVIMIENTO`](../../backend/infracciones-api/src/modules/infracciones/entities/infraccion-movimiento.entity.ts) | 7 | 7 | Sin diferencia de nombres de campos. |

### 3.2 Entidades ausentes del PDF (8)

Todas requieren cuadro propio en el nuevo DER. Sus campos completos (77 en total) se encuentran en la hoja `Diccionario`.

| Entidad / entidad TypeORM | Campos vigentes | Propósito / precaución |
| --- | ---: | --- |
| [`AUDITORIA`](../../backend/infracciones-api/src/modules/auditoria/entities/auditoria.entity.ts) | 14 | Bitácora de operaciones, contexto HTTP y estados antes/después; `id_usuario` no está marcado FK en el diccionario. |
| [`AUTH_LOGIN_ATTEMPTS`](../../backend/infracciones-api/src/modules/auth/entities/auth-login-attempt.entity.ts) | 8 | Intentos de autenticación; `id_usuario` no está marcado FK en el diccionario. |
| [`OBSERVACION_EXPEDIENTE`](../../backend/infracciones-api/src/modules/encierros/entities/observacion-expediente.entity.ts) | 14 | Observaciones sobre infracción y salida, reporte y resolución. |
| [`IMPORTACION_INFRACCION_ERROR`](../../backend/infracciones-api/src/modules/importaciones/entities/importacion-infraccion-error.entity.ts) | 9 | Errores por fila/campo de un proceso de importación. |
| [`IMPORTACION_INFRACCIONES`](../../backend/infracciones-api/src/modules/importaciones/entities/importacion-infracciones.entity.ts) | 19 | Metadatos, opciones y resultados de importación. |
| [`CONCEPTO_PAGO`](../../backend/infracciones-api/src/modules/pagos/entities/concepto-pago.entity.ts) | 3 | Catálogo de conceptos de pago. |
| [`PAGO_CONCEPTO`](../../backend/infracciones-api/src/modules/pagos/entities/pago-concepto.entity.ts) | 5 | Detalle de concepto e importe asociado a un pago. |
| [`SOLVENTACION_SIN_PAGO`](../../backend/infracciones-api/src/modules/pagos/entities/solventacion-sin-pago.entity.ts) | 5 | Solventación documental sin registrar un pago. |

## 4. Relaciones FK nuevas que deben agregarse (14)

Se obtuvieron al comparar las **30 FK rotuladas** en el PDF con las **44 FK** de la hoja `Relaciones`. Las otras 30 coinciden por **tabla hija y nombre de FK**; ello **no** verifica que las cardinalidades antiguas estén correctamente dibujadas.

La cardinalidad se expresa **padre / hija**, exactamente como aparece en el Excel. “FK obligatoria” reproduce la columna homónima del diccionario.

| FK en tabla hija → PK de tabla padre | Cardinalidad padre / hija | FK obligatoria |
| --- | --- | --- |
| `INFRACCIONES.id_encierro` → `ENCIERRO.id_encierro` | 0..1 / 0..N | No |
| `LIBERACION_VEHICULO.id_solventacion_sin_pago` → `SOLVENTACION_SIN_PAGO.id_solventacion_sin_pago` | 0..1 / 0..N | No |
| `OBSERVACION_EXPEDIENTE.id_infraccion` → `INFRACCIONES.id_infraccion` | 1 / 0..N | Sí |
| `OBSERVACION_EXPEDIENTE.id_salida_vehiculo` → `SALIDA_VEHICULO.id_salida_vehiculo` | 1 / 0..N | Sí |
| `OBSERVACION_EXPEDIENTE.id_usuario_reporta` → `USUARIOS.id_usuario` | 1 / 0..N | Sí |
| `OBSERVACION_EXPEDIENTE.id_usuario_resuelve` → `USUARIOS.id_usuario` | 0..1 / 0..N | No |
| `IMPORTACION_INFRACCION_ERROR.id_importacion_infracciones` → `IMPORTACION_INFRACCIONES.id_importacion_infracciones` | 1 / 0..N | Sí |
| `IMPORTACION_INFRACCIONES.id_region` → `REGION.id_region` | 1 / 0..N | Sí |
| `IMPORTACION_INFRACCIONES.id_delegacion_default` → `DELEGACION.id_delegacion` | 0..1 / 0..N | No |
| `IMPORTACION_INFRACCIONES.creado_por_usuario_id` → `USUARIOS.id_usuario` | 1 / 0..N | Sí |
| `PAGO_CONCEPTO.id_pago_infraccion` → `PAGO_INFRACCION.id_pago_infraccion` | 1 / 0..N | Sí |
| `PAGO_CONCEPTO.id_concepto_pago` → `CONCEPTO_PAGO.id_concepto_pago` | 1 / 0..N | Sí |
| `SOLVENTACION_SIN_PAGO.id_infraccion` → `INFRACCIONES.id_infraccion` | 1 / 0..N | Sí |
| `SOLVENTACION_SIN_PAGO.id_usuario_registra` → `USUARIOS.id_usuario` | 1 / 0..N | Sí |

**Advertencia:** no dibujar enlaces adicionales solo por la presencia de campos llamados `id_usuario`. Por ejemplo, `AUDITORIA.id_usuario` y `AUTH_LOGIN_ATTEMPTS.id_usuario` no están identificados como FK en la hoja `Diccionario` ni en las 44 relaciones documentadas. Primero habría que verificar una FK real en entidades/migraciones.

## 5. Aspectos del dibujo por corregir en 4B.2

1. **Cobertura:** representar las 32 entidades y los 218 campos con PK y FK según el diccionario, incluyendo ocho entidades ausentes y las 14 nuevas relaciones.
2. **Nombres de columnas:** utilizar los nombres vigentes, no los del PDF; revisar especialmente `LUGAR_INFRACCION`, `TIPO_PROCEDIMIENTO`, `PAGO_INFRACCION`, `SEXO` y la PK sin nombre de `INFRACCION_MOTIVO`.
3. **Tipos:** tomar el tipo PostgreSQL del Excel, no copiar automáticamente `datetime` o longitudes `varchar` históricas. Ejemplos verificables: `INFRACCIONES.folio_infraccion` pasa de `varchar(30)` en PDF a `varchar(50)` documentado; `USUARIOS.email` de `varchar(50)` a `varchar(100)`.
4. **Cardinalidades / opcionalidad:** transcribir y revisar las 44 relaciones de la hoja `Relaciones`, diferenciando claramente las FK obligatorias de las opcionales.
5. **Restricciones:** consultar las **34** entradas de la hoja `Restricciones` para señalar unicidades, índices y condiciones relevantes. No reinterpretarlas como 34 restricciones físicas verificadas en PostgreSQL.
6. **Legibilidad:** preparar vista general por módulos y vistas de detalle; evitar superponer 44 enlaces en un solo plano.
7. **Trazabilidad:** conservar `docs/DER/INFRACCIONES.pdf` como histórico. Crear nuevo fuente editable y PDF **solo** tras aprobar el bloque 4B.2.

## 6. Criterios de aceptación y límites de este bloque

- **4B.1:** una matriz versionada con 24 entidades existentes, 8 nuevas, cambios nominales, 14 FK adicionales y referencias rastreables al código y Excel.
- **No realizado aquí:** un DER nuevo, cambios en entidades TypeORM, ajustes de migración, pruebas con datos productivos o verificaciones de llaves en un PostgreSQL real.
- **Pendiente de revisión humana:** correspondencia de tipos y nombres, criterio de agrupación por módulo y conveniencia del formato editable para el nuevo DER.

**Siguiente bloque propuesto, sujeto a autorización:** 4B.2, generar el diagrama actualizado sin reemplazar el PDF histórico.
