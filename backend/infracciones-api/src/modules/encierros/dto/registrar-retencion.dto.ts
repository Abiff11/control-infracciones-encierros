export class RegistrarRetencionDto {
  idInfraccion!: number;
  idEncierro!: number;
  recibidoPor!: string;
  fechaIngreso?: Date;
  folioResguardo?: string | null;
  observacionesIngreso?: string | null;
  estadoIngreso?: string | null;
}
