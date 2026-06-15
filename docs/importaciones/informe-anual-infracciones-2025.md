# Importacion anual de infracciones 2025

## Hoja esperada

- `INFRACCIONES`
- Encabezados en la fila 2
- Datos desde la fila 3

## Mapeo de columnas

| Columna | Encabezado | Destino |
| --- | --- | --- |
| A | DELEGACION | `delegacion.nombreDelegacion` dentro de la region seleccionada |
| B | INFRACCION | `infraccion.folioInfraccion` |
| C | DIA | fecha de infraccion, dia |
| D | MES | fecha de infraccion, mes |
| E | ANO | fecha de infraccion, anio y validacion contra `anio` enviado en el body |
| F | APELLIDO PATERNO | `infractor.apellidoPaterno` |
| G | APELLIDO MATERNO | `infractor.apellidoMaterno` |
| H | NOMBRES | `infractor.nombre` |
| I | SEXO | `sexo.claveSexo` |
| J | LICENCIA | `infractor.licencia` |
| K | SERVICIO | `servicio.nombreServicio` normalizado |
| L | CLASE | `claseVehiculo.nombreClase` normalizado |
| M | TIPO | `lineaVehiculo.nombreLinea` |
| N | MARCA | `marcaVehiculo.nombreMarca` |
| O | MODELO | `vehiculo.anioModelo` |
| P | COLOR | `vehiculo.color` |
| Q | PLACAS | `vehiculo.placas` |
| R | ESTADO | `vehiculo.estadoPlacas` |
| S | SERIE | `vehiculo.serie` |
| T | MOTOR | `vehiculo.motor` |
| U | MUNICIPIO | `lugarInfraccion.municipio` |
| V | COLONIA | `lugarInfraccion.colonia` |
| W | CALLE | `lugarInfraccion.calle` |
| X | HORA | `infraccion.horaInfraccion` |
| Y | M1 | motivo clave |
| Z | M2 | motivo clave |
| AA | M3 | motivo clave |
| AB | M4 | motivo clave |
| AC | M5 | motivo clave |
| AD | SOLO INFRACCION O VEHICULO DETENIDO | define retencion |
| AE | ENCIERRO | `encierro.nombreEncierro` |
| AF | OBSERVACIONES | `infraccion.observaciones` |
| AG | CLAVE DEL POLICIA DE TTO. | `infraccion.clavePolicia` |
| AH | NUM. DE PARTE INFORMATIVO | `infraccion.numParteInformativo` |
| AI | NOMBRE DEL OPERATIVO | `operativo.nombreOperativo` |
| AJ | SITIO AL QUE PERTENECE EN CASO DE SER DE SERV. PUB. | `vehiculo.sitioServicioPublico` |

## Normalizaciones

- Servicio:
  - `PART.` -> `PARTICULAR`
  - `PUB.` -> `PUBLICO`
- Clase:
  - `AUT.` -> `AUTOMOVIL`
  - `MOT.` -> `MOTOCICLETA`
  - `CTA.` -> `CAMIONETA`
  - `CAMION` -> `CAMION`
- Sexo:
  - `MASCULINO`
  - `FEMENINO`
  - `SE IGNORA`
- Hora:
  - fraccion Excel, por ejemplo `0.4930555555`
  - textos tipo `21.4`, `19.37`, `11.14`
  - salida en `HH:mm:ss`
- Texto:
  - trim
  - mayusculas para catalogos
  - vacio a `null`

## Asociacion

- La region se selecciona en el formulario de importacion.
- La delegacion se resuelve por fila usando la columna `DELEGACION`.
- El anio de cada fila debe coincidir con el `anio` enviado en el body.

## Que si se importa

- Infracciones
- Infractores
- Vehiculos
- Lugar de infraccion
- Motivos validos
- Retencion vehicular cuando la columna AD indica `VEH. DETENIDO`

## Que no se importa

- Pagos
- Liberaciones
- Salidas

## Motivos

- Se leen desde `M1` a `M5`
- Se buscan por `motivo.claveMotivo`
- Los motivos desconocidos se reportan
- Si no queda ningun motivo valido, la fila no se importa

## Duplicados

- Se valida por `folioInfraccion`
- Modo `OMITIR`: la fila se omite y cuenta en `filasOmitidas`
- Modo `ERROR`: la fila queda con error y no se importa

## Flujo

1. Subir el archivo en `POST /importaciones/infracciones/preview`
2. Revisar columnas detectadas, primeras filas y errores preliminares
3. Confirmar en `POST /importaciones/infracciones/confirmar`
4. Consultar el lote con `GET /importaciones/infracciones`
5. Abrir el detalle con `GET /importaciones/infracciones/:idImportacionInfracciones`

## Consulta posterior

- Para consultar las infracciones importadas por anio:

```http
GET /infracciones?anio=2025
```
