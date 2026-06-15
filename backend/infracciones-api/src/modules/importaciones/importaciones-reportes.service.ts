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

export interface ImportacionErroresResumenItem {
  clave: string;
  total: number;
}

export interface ImportacionErroresTopItem {
  campo: string;
  valor: string | null;
  mensaje: string;
  total: number;
}

export interface ImportacionErroresResumenResponse {
  idImportacionInfracciones: number;
  totalErrores: number;
  porTipo: ImportacionErroresResumenItem[];
  porCampo: ImportacionErroresResumenItem[];
  porMensaje: ImportacionErroresResumenItem[];
  topErrores: ImportacionErroresTopItem[];
  topValores: ImportacionErroresTopItem[];
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

    const totalErrores = await this.erroresRepository.count({
      where: this.buildWhere(idImportacionInfracciones),
    });

    const [porTipo, porCampo, porMensaje, topErrores, topValores] =
      await Promise.all([
        this.groupBySingleColumn(idImportacionInfracciones, 'error.tipo'),
        this.groupBySingleColumn(idImportacionInfracciones, 'error.campo'),
        this.groupBySingleColumn(idImportacionInfracciones, 'error.mensaje'),
        this.groupByError(idImportacionInfracciones, 30),
        this.groupByError(idImportacionInfracciones, 100),
      ]);

    return {
      idImportacionInfracciones,
      totalErrores,
      porTipo,
      porCampo,
      porMensaje,
      topErrores,
      topValores,
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

    return {
      data,
      page,
      limit,
      total,
    };
  }

  async getErroresCsv(
    idImportacionInfracciones: number,
    query: ImportacionErroresQuery,
  ): Promise<string> {
    await this.ensureImportacionExists(idImportacionInfracciones);

    const where = this.buildWhere(idImportacionInfracciones, query);
    const errores = await this.erroresRepository.find({
      where,
      order: {
        numeroFila: 'ASC',
        idImportacionInfraccionError: 'ASC',
      },
    });

    const header = [
      'numeroFila',
      'tipo',
      'campo',
      'valor',
      'mensaje',
      'rawRow',
    ];

    const rows = errores.map((error) => [
      error.numeroFila,
      error.tipo,
      error.campo,
      error.valor ?? '',
      error.mensaje,
      JSON.stringify(error.rawRow ?? {}),
    ]);

    return [header, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\n');
  }

  private buildWhere(
    idImportacionInfracciones: number,
    query?: ImportacionErroresQuery,
  ): FindOptionsWhere<ImportacionInfraccionError> {
    const where: FindOptionsWhere<ImportacionInfraccionError> = {
      importacionInfracciones: {
        idImportacionInfracciones,
      },
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
    const exists = await this.importacionesRepository.exist({
      where: { idImportacionInfracciones },
    });

    if (!exists) {
      throw new NotFoundException(
        `Importacion ${idImportacionInfracciones} no encontrada`,
      );
    }
  }

  private async groupBySingleColumn(
    idImportacionInfracciones: number,
    column: string,
  ): Promise<ImportacionErroresResumenItem[]> {
    const rows = await this.erroresRepository
      .createQueryBuilder('error')
      .innerJoin('error.importacionInfracciones', 'importacion')
      .select(column, 'clave')
      .addSelect('COUNT(*)', 'total')
      .where('importacion.idImportacionInfracciones = :idImportacionInfracciones', {
        idImportacionInfracciones,
      })
      .groupBy(column)
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{ clave: string; total: string }>();

    return rows.map((row) => ({
      clave: row.clave,
      total: Number(row.total),
    }));
  }

  private async groupByError(
    idImportacionInfracciones: number,
    limit: number,
  ): Promise<ImportacionErroresTopItem[]> {
    const rows = await this.erroresRepository
      .createQueryBuilder('error')
      .innerJoin('error.importacionInfracciones', 'importacion')
      .select('error.campo', 'campo')
      .addSelect('error.valor', 'valor')
      .addSelect('error.mensaje', 'mensaje')
      .addSelect('COUNT(*)', 'total')
      .where('importacion.idImportacionInfracciones = :idImportacionInfracciones', {
        idImportacionInfracciones,
      })
      .groupBy('error.campo')
      .addGroupBy('error.valor')
      .addGroupBy('error.mensaje')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany<{
        campo: string;
        valor: string | null;
        mensaje: string;
        total: string;
      }>();

    return rows.map((row) => ({
      campo: row.campo,
      valor: row.valor,
      mensaje: row.mensaje,
      total: Number(row.total),
    }));
  }

  private normalizePositiveInteger(
    value: number | string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private escapeCsv(value: unknown): string {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }
}
