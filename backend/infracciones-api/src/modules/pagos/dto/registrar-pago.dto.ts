export class RegistrarPagoDto {
  idInfraccion!: number;
  idUsuarioRegistraPago!: number;
  folioPago!: string;
  monto!: string;
  fechaPago?: Date;
  observaciones?: string | null;
}
