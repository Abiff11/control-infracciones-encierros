import { buildQuery, request } from "./apiClient";
import type {
  CatalogosBundle,
  ClaseVehiculo,
  CreateClaseVehiculoPayload,
  CreateDelegacionPayload,
  CreateEncierroPayload,
  CreateEstatusInfraccionPayload,
  CreateLineaVehiculoPayload,
  CreateMarcaVehiculoPayload,
  CreateMotivoPayload,
  CreateOperativoPayload,
  CreateRegionPayload,
  CreateServicioPayload,
  CreateSexoPayload,
  CreateTipoProcedimientoPayload,
  Delegacion,
  Encierro,
  EstatusInfraccion,
  LineaVehiculo,
  MarcaVehiculo,
  Motivo,
  Operativo,
  Region,
  RolCatalogo,
  Servicio,
  Sexo,
  TipoProcedimiento,
  UpdateTipoProcedimientoPayload,
} from "../../types/catalogos.types";

export function getRoles(): Promise<RolCatalogo[]> {
  return request<RolCatalogo[]>("/catalogos/roles");
}

export function getRegiones(): Promise<Region[]> {
  return request<Region[]>("/catalogos/regiones");
}

export function createRegion(
  token: string,
  payload: CreateRegionPayload,
): Promise<Region> {
  return request<Region>(
    "/catalogos/regiones",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateRegion(
  token: string,
  idRegion: number,
  payload: CreateRegionPayload,
): Promise<Region> {
  return request<Region>(
    `/catalogos/regiones/${idRegion}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function getDelegaciones(idRegion?: number): Promise<Delegacion[]> {
  return request<Delegacion[]>(
    `/catalogos/delegaciones${buildQuery({ idRegion })}`,
  );
}

export function createDelegacion(
  token: string,
  payload: CreateDelegacionPayload,
): Promise<Delegacion> {
  return request<Delegacion>(
    "/catalogos/delegaciones",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateDelegacion(
  token: string,
  idDelegacion: number,
  payload: CreateDelegacionPayload,
): Promise<Delegacion> {
  return request<Delegacion>(
    `/catalogos/delegaciones/${idDelegacion}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function getSexos(): Promise<Sexo[]> {
  return request<Sexo[]>("/catalogos/sexos");
}

export function createSexo(
  token: string,
  payload: CreateSexoPayload,
): Promise<Sexo> {
  return request<Sexo>(
    "/catalogos/sexos",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateSexo(
  token: string,
  idSexo: number,
  payload: CreateSexoPayload,
): Promise<Sexo> {
  return request<Sexo>(
    `/catalogos/sexos/${idSexo}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function getServicios(): Promise<Servicio[]> {
  return request<Servicio[]>("/catalogos/servicios");
}

export function createServicio(
  token: string,
  payload: CreateServicioPayload,
): Promise<Servicio> {
  return request<Servicio>(
    "/catalogos/servicios",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateServicio(
  token: string,
  idServicio: number,
  payload: CreateServicioPayload,
): Promise<Servicio> {
  return request<Servicio>(
    `/catalogos/servicios/${idServicio}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function getClasesVehiculo(): Promise<ClaseVehiculo[]> {
  return request<ClaseVehiculo[]>("/catalogos/clases-vehiculo");
}

export function createClaseVehiculo(
  token: string,
  payload: CreateClaseVehiculoPayload,
): Promise<ClaseVehiculo> {
  return request<ClaseVehiculo>(
    "/catalogos/clases-vehiculo",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateClaseVehiculo(
  token: string,
  idClaseVehiculo: number,
  payload: CreateClaseVehiculoPayload,
): Promise<ClaseVehiculo> {
  return request<ClaseVehiculo>(
    `/catalogos/clases-vehiculo/${idClaseVehiculo}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function getMarcasVehiculo(): Promise<MarcaVehiculo[]> {
  return request<MarcaVehiculo[]>("/catalogos/marcas-vehiculo");
}

export function createMarcaVehiculo(
  token: string,
  payload: CreateMarcaVehiculoPayload,
): Promise<MarcaVehiculo> {
  return request<MarcaVehiculo>(
    "/catalogos/marcas-vehiculo",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateMarcaVehiculo(
  token: string,
  idMarcaVehiculo: number,
  payload: CreateMarcaVehiculoPayload,
): Promise<MarcaVehiculo> {
  return request<MarcaVehiculo>(
    `/catalogos/marcas-vehiculo/${idMarcaVehiculo}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function getLineasVehiculo(
  idMarcaVehiculo?: number,
): Promise<LineaVehiculo[]> {
  return request<LineaVehiculo[]>(
    `/catalogos/lineas-vehiculo${buildQuery({ idMarcaVehiculo })}`,
  );
}

export function createLineaVehiculo(
  token: string,
  payload: CreateLineaVehiculoPayload,
): Promise<LineaVehiculo> {
  return request<LineaVehiculo>(
    "/catalogos/lineas-vehiculo",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateLineaVehiculo(
  token: string,
  idLineaVehiculo: number,
  payload: CreateLineaVehiculoPayload,
): Promise<LineaVehiculo> {
  return request<LineaVehiculo>(
    `/catalogos/lineas-vehiculo/${idLineaVehiculo}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function getTiposProcedimiento(): Promise<TipoProcedimiento[]> {
  return request<TipoProcedimiento[]>("/catalogos/tipos-procedimiento");
}

export function createTipoProcedimiento(
  token: string,
  payload: CreateTipoProcedimientoPayload,
): Promise<TipoProcedimiento> {
  return request<TipoProcedimiento>(
    "/catalogos/tipos-procedimiento",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateTipoProcedimiento(
  token: string,
  idTipoProcedimiento: number,
  payload: UpdateTipoProcedimientoPayload,
): Promise<TipoProcedimiento> {
  return request<TipoProcedimiento>(
    `/catalogos/tipos-procedimiento/${idTipoProcedimiento}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function getOperativos(): Promise<Operativo[]> {
  return request<Operativo[]>("/catalogos/operativos");
}

export function createOperativo(
  token: string,
  payload: CreateOperativoPayload,
): Promise<Operativo> {
  return request<Operativo>(
    "/catalogos/operativos",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateOperativo(
  token: string,
  idOperativo: number,
  payload: CreateOperativoPayload,
): Promise<Operativo> {
  return request<Operativo>(
    `/catalogos/operativos/${idOperativo}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function getEstatusInfraccion(): Promise<EstatusInfraccion[]> {
  return request<EstatusInfraccion[]>("/catalogos/estatus-infraccion");
}

export function createEstatusInfraccion(
  token: string,
  payload: CreateEstatusInfraccionPayload,
): Promise<EstatusInfraccion> {
  return request<EstatusInfraccion>(
    "/catalogos/estatus-infraccion",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateEstatusInfraccion(
  token: string,
  idEstatusInfraccion: number,
  payload: CreateEstatusInfraccionPayload,
): Promise<EstatusInfraccion> {
  return request<EstatusInfraccion>(
    `/catalogos/estatus-infraccion/${idEstatusInfraccion}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function getMotivos(): Promise<Motivo[]> {
  return request<Motivo[]>("/catalogos/motivos");
}

export function createMotivo(
  token: string,
  payload: CreateMotivoPayload,
): Promise<Motivo> {
  return request<Motivo>(
    "/catalogos/motivos",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateMotivo(
  token: string,
  idMotivo: number,
  payload: CreateMotivoPayload,
): Promise<Motivo> {
  return request<Motivo>(
    `/catalogos/motivos/${idMotivo}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function getEncierros(): Promise<Encierro[]> {
  return request<Encierro[]>("/catalogos/encierros");
}

export function createEncierro(
  token: string,
  payload: CreateEncierroPayload,
): Promise<Encierro> {
  return request<Encierro>(
    "/catalogos/encierros",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateEncierro(
  token: string,
  idEncierro: number,
  payload: CreateEncierroPayload,
): Promise<Encierro> {
  return request<Encierro>(
    `/catalogos/encierros/${idEncierro}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function getCatalogosBundle(): Promise<CatalogosBundle> {
  const [
    roles,
    regiones,
    delegaciones,
    sexos,
    servicios,
    clasesVehiculo,
    marcasVehiculo,
    lineasVehiculo,
    tiposProcedimiento,
    operativos,
    estatusInfraccion,
    motivos,
    encierros,
  ] = await Promise.all([
    getRoles(),
    getRegiones(),
    getDelegaciones(),
    getSexos(),
    getServicios(),
    getClasesVehiculo(),
    getMarcasVehiculo(),
    getLineasVehiculo(),
    getTiposProcedimiento(),
    getOperativos(),
    getEstatusInfraccion(),
    getMotivos(),
    getEncierros(),
  ]);

  return {
    roles,
    regiones,
    delegaciones,
    sexos,
    servicios,
    clasesVehiculo,
    marcasVehiculo,
    lineasVehiculo,
    tiposProcedimiento,
    operativos,
    estatusInfraccion,
    motivos,
    encierros,
  };
}
