export class RegistrarMovimientoDto {
  idInfraccion!: number;
  idEstatusInfraccion!: number;
  idUsuario!: number;
  accion!: string;
  observaciones?: string | null;
  fechaMovimiento?: Date;
}
