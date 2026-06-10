export class RegistrarSalidaDto {
  idRetencionVehiculo!: number;
  idLiberacionVehiculo!: number;
  idUsuarioValidaSalida!: number;
  validadoPor!: string;
  personaRecibeVehiculo!: string;
  estadoSalida!: string;
  fechaSalida?: Date;
  observacionesSalida?: string | null;
}
