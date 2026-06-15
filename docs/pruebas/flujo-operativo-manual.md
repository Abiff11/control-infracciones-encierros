# Prueba manual: flujo operativo

## Objetivo

Validar la captura y consulta del flujo completo:
infraccion, retencion, pago, liberacion y salida.

## Carga minima previa

1. Crear catalogos base:
   - `Sexo`: `MASCULINO`, `FEMENINO`
   - `Region`: `OAXACA`
   - `Delegacion`: `OAXACA DE JUAREZ`
   - `Servicio`: `PARTICULAR`
   - `Clase vehiculo`: `AUTOMOVIL`
   - `Marca vehiculo`: `NISSAN`
   - `Linea vehiculo`: `TSURU`
   - `Tipo procedimiento`: `INFRACCION`
   - `Motivo`: `ESTACIONARSE EN LUGAR PROHIBIDO`
   - `Encierro`: `ENCIERRO MUNICIPAL`
   - `Estatus`: `CAPTURADA`, `PAGADA`, `LIBERACION_GENERADA`, `VEHICULO_ENTREGADO`
2. Confirmar que `motivo` solo guarda `nombreMotivo`.

## Secuencia de prueba

1. Entrar a `Nueva infraccion`.
2. Capturar una infraccion completa y guardar.
3. Registrar una retencion usando el `idInfraccion` devuelto.
4. Registrar un pago usando el `idInfraccion` devuelto.
5. Registrar una liberacion usando `idInfraccion` e `idPagoInfraccion`.
6. Registrar una salida usando `idRetencionVehiculo` e `idLiberacionVehiculo`.
7. Abrir `Flujo operativo`.
8. Consultar el mismo `idInfraccion`.

## Resultado esperado

- La infraccion muestra su `idInfraccion`, folio y estatus.
- La retencion muestra `idRetencionVehiculo`.
- El pago muestra `idPagoInfraccion`.
- La liberacion muestra `idLiberacionVehiculo`.
- La salida muestra `idSalidaVehiculo`.
- El flujo operativo muestra infraccion, motivos, pagos, liberaciones,
  retenciones, salidas y movimientos.
