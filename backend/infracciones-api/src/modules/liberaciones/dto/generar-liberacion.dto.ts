export class GenerarLiberacionDto {
  idInfraccion!: number;
  idPagoInfraccion!: number;
  idUsuarioLibera!: number;
  folioLiberacion!: string;
  liberadoPor!: string;
  nombreRecibeLiberacion!: string;
  fechaLiberacion?: Date;
  observacion?: string | null;
}
