# Reporte de errores de importación 2025

## Resultado base

La validación completa del informe anual 2025 en base limpia dejó estos resultados:

- Infracciones importadas: 10,360
- Incidencias registradas: 1,118
- Estado del lote: `IMPORTADA_CON_ERRORES`
- Movimientos de infracción creados: 10,360
- Pagos creados: 0
- Liberaciones creadas: 0
- Salidas creadas: 0
- `GET /infracciones?anio=2025`: total 10,360
- `GET /infracciones?anio=2024`: total 0

## Endpoints de revisión

- `GET /importaciones/infracciones/:idImportacionInfracciones/resumen`
- `GET /importaciones/infracciones/:idImportacionInfracciones/lista-errores?page=1&limit=100`

## Uso recomendado

1. Consultar el resumen del lote.
2. Revisar los errores agrupados por campo, mensaje y valor.
3. Exportar o consultar el listado paginado de incidencias.
4. Decidir si la corrección corresponde al catálogo, al Excel origen o a una regla de importación.

## Criterio de corrección

No se deben crear motivos desconocidos de forma automática. Los motivos fuera del catálogo oficial deben revisarse antes de corregirse.

## Próxima decisión

Con el resumen de errores se debe decidir si las 1,118 incidencias se corrigen por:

- ajuste de catálogo,
- normalización segura,
- corrección del Excel origen,
- o aceptación de omisión.
