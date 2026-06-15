import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import {
  ImportacionInfraccionError,
  ImportacionInfraccionErrorTipo,
} from './entities/importacion-infraccion-error.entity';
import { ImportacionInfracciones } from './entities/importacion-infracciones.entity';

export interface ImportacionErroresQuery {
  tipo?: ImportacionInfraccionErrorTipo;
  campo?: string;
  page?: number;
  limit?: number;
}

export interface ImportacionErroresResumenResponse {
  idImportacionInfracciones: number;
  totalErrores: number;
  porTipo: Array<{ clave: string; total: number }>;
  porCampo: Array<{ clave: string; total: number }>;
  porMensaje: Array<{ clave: string; total: number }>;
  topErrores: Array<{
    campo: string;
    valor: string | null;
    mensaje: string;
    total: number;
  }>;
  topValores: Array<{
    campo: string;
    valor: string | null;
    mensaje: string;
    total: number;
  }>;
}

export interface ImportacionErroresJsonResponse {
  data: ImportacionInfraccionError[];
  page: number;
  limit: number;
  total: number;
}

@Injectable()
export class ImportacionesReportesService {
  constructor(
    @InjectRepository(ImportacionInfracciones)
    private readonly importacionesRepository: Repository<ImportacionInfracciones>,
    @InjectRepository(ImportacionInfraccionError)
    private readonly erroresRepository: Repository<ImportacionInfraccionError>,
  ) {}

  async getResumenErrores(
    idImportacionInfracciones: number,
  ): Promise<ImportacionErroresResumenResponse> {
    await this.ensureImportacionExists(idImportacionInfracciones);

    const errores = await this.erroresRepository.find({
      where: this.buildWhere(idImportacionInfracciones),
    });

    const topErrores = this.groupErrors(errores);

    return {
      idImportacionInfracciones,
      totalErrores: errores.length,
      porTipo: this.groupByKey(errores, (item) => item.tipo),
      porCampo: this.groupByKey(errores, (item) => item.campo),
      porMensaje: this.groupByKey(errores, (item) => item.mensaje),
      topErrores,
      topValores: topErrores,
    };
  }

  async getErroresJson(
    idImportacionInfracciones: number,
    query: ImportacionErroresQuery,
  ): Promise<ImportacionErroresJsonResponse> {
    await this.ensureImportacionExists(idImportacionInfracciones);

    const page = this.normalizePositiveInteger(query.page, 1);
    const limit = Math.min(this.normalizePositiveInteger(query.limit, 100), 1000);
    const where = this.buildWhere(idImportacionInfracciones, query);

    const [data, total] = await this.erroresRepository.findAndCount({
      where,
      order: {
        numeroFila: 'ASC',
        idImportacionInfraccionError: 'ASC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, page, limit, total };
  }

  private buildWhere(
    idImportacionInfracciones: number,
    query?: ImportacionErroresQuery,
  ): FindOptionsWhere<ImportacionInfraccionError> {
    const where: FindOptionsWhere<ImportacionInfraccionError> = {
      importacionInfracciones: { idImportacionInfracciones },
    };

    if (query?.tipo) {
      where.tipo = query.tipo;
    }

    if (query?.campo) {
      where.campo = query.campo;
    }

    return where;
  }

  private async ensureImportacionExists(
    idImportacionInfracciones: number,
  ): Promise<void> {
    const importacion = await this.importacionesRepository.findOne({
      where: { idImportacionInfracciones },
      select: { idImportacionInfracciones: true },
    });

    if (!importacion) {
      throw new NotFoundException(
        `Importacion ${idImportacionInfracciones} no encontrada`,
      );
    }
  }

  private groupByKey(
    errores: ImportacionInfraccionError[],
    getKey: (item: ImportacionInfraccionError) => string,
  ): Array<{ clave: string; total: number }> {
    const grouped = new Map<string, number>();

    for (const item of errores) {
      const key = getKey(item) || 'SIN_VALOR';
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }

    return [...grouped.entries()]
      .map(([clave, total]) => ({ clave, total }))
      .sort((left, right) => right.total - left.total);
  }

  private groupErrors(errores: ImportacionInfraccionError[]): Array<{
    campo: string;
    valor: string | null;
    mensaje: string;
    total: number;
  }> {
    const grouped = new Map<
      string,
      { campo: string; valor: string | null; mensaje: string; total: number }
    >();

    for (const item of errores) {
      const key = `${item.campo}|${item.valor ?? ''}|${item.mensaje}`;
      const current = grouped.get(key) ?? {
        campo: item.campo,
        valor: item.valor,
        mensaje: item.mensaje,
        total: 0,
      };
      current.total += 1;
      grouped.set(key, current);
    }

    return [...grouped.values()]
      .sort((left, right) => right.total - left.total)
      .slice(0, 100);
  }

  private normalizePositiveInteger(
    value: number | string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
