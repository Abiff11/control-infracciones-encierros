export class CreateInfraccionDto {
  idInfractor!: number;
  idDelegacion!: number;
  idVehiculo!: number;
  idLugarInfraccion!: number;
  idTipoProcedimiento!: number;
  idEstatusInfraccion!: number;
  idUsuarioCaptura!: number;
  idOperativo?: number | null;
  folioInfraccion!: string;
  fechaInfraccion!: string;
  horaInfraccion!: string;
  observaciones?: string | null;
  clavePolicia?: string | null;
  numParteInformativo?: string | null;
  motivos?: number[];
}
