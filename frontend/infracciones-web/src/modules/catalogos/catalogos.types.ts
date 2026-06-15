export interface RolCatalogo {
  idRol: number;
  nombreRol: string;
}

export interface Region {
  idRegion: number;
  nombreRegion: string;
}

export interface Delegacion {
  idDelegacion: number;
  nombreDelegacion: string;
  region?: Region;
}

export interface Sexo {
  idSexo: number;
  nombreSexo: string;
}

export interface Servicio {
  idServicio: number;
  nombreServicio: string;
}

export interface ClaseVehiculo {
  idClaseVehiculo: number;
  nombreClaseVehiculo: string;
}

export interface MarcaVehiculo {
  idMarcaVehiculo: number;
  nombreMarcaVehiculo: string;
}

export interface LineaVehiculo {
  idLineaVehiculo: number;
  nombreLineaVehiculo: string;
  marcaVehiculo?: MarcaVehiculo;
}

export interface TipoProcedimiento {
  idTipoProcedimiento: number;
  nombreTipoProcedimiento: string;
}

export interface Operativo {
  idOperativo: number;
  nombreOperativo: string;
}

export interface EstatusInfraccion {
  idEstatusInfraccion: number;
  nombreEstatus: string;
}

export interface Motivo {
  idMotivo: number;
  nombreMotivo: string;
  descripcionMotivo: string;
}

export interface Encierro {
  idEncierro: number;
  nombreEncierro: string;
}

export interface CatalogosBundle {
  roles: RolCatalogo[];
  regiones: Region[];
  delegaciones: Delegacion[];
  sexos: Sexo[];
  servicios: Servicio[];
  clasesVehiculo: ClaseVehiculo[];
  marcasVehiculo: MarcaVehiculo[];
  lineasVehiculo: LineaVehiculo[];
  tiposProcedimiento: TipoProcedimiento[];
  operativos: Operativo[];
  estatusInfraccion: EstatusInfraccion[];
  motivos: Motivo[];
  encierros: Encierro[];
}
