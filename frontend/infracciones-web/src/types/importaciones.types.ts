import type { Delegacion, Region } from './catalogos.types';

export const ImportacionInfraccionesEstado = {
  PREVIEW: 'PREVIEW',
  IMPORTADA: 'IMPORTADA',
  IMPORTADA_CON_ERRORES: 'IMPORTADA_CON_ERRORES',
  FALLIDA: 'FALLIDA',
} as const;

export type ImportacionInfraccionesEstado =
  (typeof ImportacionInfraccionesEstado)[keyof typeof ImportacionInfraccionesEstado];

export const ImportacionInfraccionesModoDuplicados = {
  OMITIR: 'OMITIR',
  ERROR: 'ERROR',
} as const;

export type ImportacionInfraccionesModoDuplicados =
  (typeof ImportacionInfraccionesModoDuplicados)[keyof typeof ImportacionInfraccionesModoDuplicados];

export const ImportacionInfraccionErrorTipo = {
  ERROR: 'ERROR',
  ADVERTENCIA: 'ADVERTENCIA',
} as const;

export type ImportacionInfraccionErrorTipo =
  (typeof ImportacionInfraccionErrorTipo)[keyof typeof ImportacionInfraccionErrorTipo];

export const ImportacionFilaIssueTipo = {
  ERROR: 'ERROR',
  ADVERTENCIA: 'ADVERTENCIA',
} as const;

export type ImportacionFilaIssueTipo =
  (typeof ImportacionFilaIssueTipo)[keyof typeof ImportacionFilaIssueTipo];

export interface ImportacionUsuarioResumen {
  idUsuario: number;
  nombreUsuario: string;
}

export interface ImportacionInfraccionError {
  idImportacionInfraccionError: number;
  numeroFila: number;
  tipo: ImportacionInfraccionErrorTipo;
  campo: string;
  valor: string | null;
  mensaje: string;
  fechaCreacion?: string;
}

export interface ImportacionFilaIssue {
  tipo: ImportacionFilaIssueTipo;
  campo: string;
  valor: string | null;
  mensaje: string;
}

export interface ImportacionPreviewRow {
  numeroFila: number;
  delegacion: string | null;
  folioInfraccion: string | null;
  fechaInfraccion: string | null;
  horaInfraccion: string;
  sexo: string | null;
  servicio: string | null;
  clase: string | null;
  marca: string | null;
  linea: string | null;
  encierro: string | null;
  operativo: string | null;
  motivos: string[];
  soloInfraccionOVehiculoDetenido: string | null;
  issues: ImportacionFilaIssue[];
}

export interface ImportacionPreviewConteos {
  delegacionesDetectadas: number;
  serviciosDetectados: number;
  clasesDetectadas: number;
  sexosDetectados: number;
  encierrosDetectados: number;
  motivosDetectados: number;
  motivosDesconocidos: number;
}

export interface ImportacionPreviewResponse {
  nombreArchivo: string;
  nombreHoja: string;
  totalFilas: number;
  columnasDetectadas: string[];
  primeras10Filas: ImportacionPreviewRow[];
  conteos: ImportacionPreviewConteos;
  erroresPreliminares: Array<ImportacionFilaIssue & { numeroFila: number }>;
}

export interface ImportacionInfraccionesResumen {
  idImportacionInfracciones: number;
  anio: number;
  nombreArchivo: string;
  nombreHoja: string;
  totalFilas: number;
  filasValidas: number;
  filasImportadas: number;
  filasConError: number;
  filasOmitidas: number;
  estado: ImportacionInfraccionesEstado;
  modoDuplicados: ImportacionInfraccionesModoDuplicados;
  crearCatalogosFaltantes: boolean;
  crearDelegacionesFaltantes: boolean;
  fechaCreacion?: string;
  fechaImportacion?: string | null;
  observaciones?: string | null;
  region?: Region;
  delegacionDefault?: Delegacion | null;
  creadoPorUsuario?: ImportacionUsuarioResumen;
}

export interface ImportacionDetalleResponse {
  importacion: ImportacionInfraccionesResumen & {
    errores?: ImportacionInfraccionError[];
  };
  errores: ImportacionInfraccionError[];
}

export interface ImportacionInfraccionesQuery {
  anio?: number;
  idRegion?: number;
  idDelegacion?: number;
  estado?: ImportacionInfraccionesEstado;
}

export interface ImportacionInfraccionesPreviewPayload {
  file: File;
  anio: number;
  idRegion: number;
  idDelegacionDefault?: number;
  crearCatalogosFaltantes?: boolean;
  crearDelegacionesFaltantes?: boolean;
}

export interface ImportacionInfraccionesConfirmarPayload {
  file: File;
  anio: number;
  idRegion: number;
  idDelegacionDefault?: number;
  modoDuplicados: ImportacionInfraccionesModoDuplicados;
  crearCatalogosFaltantes: boolean;
  crearDelegacionesFaltantes: boolean;
  observaciones?: string;
}
