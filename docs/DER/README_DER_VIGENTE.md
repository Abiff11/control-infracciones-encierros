# DER vigente — infracciones y encierros (bloque 4B.2)

**Estado:** propuesta documental pendiente de revisión, PR y merge. El DER histórico `INFRACCIONES.pdf` permanece intacto.

## Archivos del nuevo modelo

| Archivo | Uso |
| --- | --- |
| [DER_INFRACCIONES_VIGENTE.drawio](./DER_INFRACCIONES_VIGENTE.drawio) | **Fuente gráfica editable** en [diagrams.net](https://app.diagrams.net/) (Archivo → Abrir desde → Dispositivo). |
| [DER_INFRACCIONES_VIGENTE.pdf](./DER_INFRACCIONES_VIGENTE.pdf) | Documento de consulta, ocho páginas: mapa de cobertura, seis vistas por dominio e índice de 44 relaciones. |
| [der-vigente.schema.json](./der-vigente.schema.json) | Instantánea estructurada y auditable que se utilizó como dato común para los dos entregables. |
| [matriz-correspondencia-der-vigente.md](./matriz-correspondencia-der-vigente.md) | Justificación del cambio respecto al DER histórico, bloque 4B.1. |

## Cobertura del modelo

- **32** entidades TypeORM, **218** columnas, **44** relaciones foráneas.
- **6 dominios:** registro y seguimiento, vehículos y catálogos, encierros y salidas, pagos y liberaciones, importaciones, usuarios y auditoría.
- En `.drawio` hay **8 páginas editables**: mapa general (sin conexiones cruzadas), una por dominio con tablas, tipos, PK/FK y enlaces numerados, y un índice final de relaciones con cardinalidad padre/hija.
- Una entidad aparece **completa una sola vez** en el detalle de su dominio. Las referencias a padres de otro dominio se presentan como **nodos resumidos** y no suman entidades adicionales.
- El PDF muestra los campos de cada tabla y, a la derecha de cada dominio, sus FKs con identificador `R01`–`R44`, cardinalidades y obligatoriedad. La última página consolida todas las relaciones.
- En los campos del diagrama, `!` identifica `NOT NULL`; sin `!` indica nulabilidad según el diccionario. Las filas `PK` y `FK` están señalizadas.
- La lista completa de **34** restricciones/recomendaciones (incluida la verificación de `UNIQUE`) se mantiene en la hoja `Restricciones` del diccionario. No debe deducirse una restricción física solo de la presentación gráfica.

## Fuentes de verdad

- [Diccionario vigente](../diccionario-datos/diccionario_datos_infracciones_vigente.xlsx), con las hojas `Diccionario`, `Relaciones` y `Restricciones`. Blob de Git `a360de4f2cefcd21a88c114df4d84dad0e3d1eff`.
- [Entidades TypeORM y migraciones](../../backend/infracciones-api/src/), comparadas con el modelo en `ecab15095b896cc8c5f056a41b4532256b407d8c`.
- Base del bloque 4B.2: `main` en `d65ad6c8547df5e943513d8abfdc5f95329d0d94`.
- [DER histórico](./INFRACCIONES.pdf), conservado **sin reemplazo**.

**Criterio importante:** `AUDITORIA.id_usuario` y `AUTH_LOGIN_ATTEMPTS.id_usuario` son columnas documentadas, pero **no** figuran entre las 44 FK declaradas en la fuente; el nuevo DER no crea enlaces no respaldados.

## Revisión y límites

La correspondencia de campos y relaciones se cotejó contra el Excel fuente (32/218/44); el PDF y el `.drawio` se verificaron estructuralmente con ocho páginas y 44 referencias numeradas. El PDF usa páginas amplias para visualizar atributos; para impresión en papel reducido puede ser necesario ampliar el detalle en el visor.

Este bloque es **solo documental**. No modifica entidades, migraciones, datos ni la estructura física de PostgreSQL. El diagrama **no certifica** que una base de datos desplegada coincida con el modelo versionado.

**Pendiente:** revisión humana visual del PR, GitHub Actions, validación local y aprobación explícita antes de merge. No se inicia automáticamente el bloque 4B.3.
