import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { sanitizeAuditPayload } from '../../common/redact-sensitive-data';
import { Auditoria } from './entities/auditoria.entity';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
  ) {}

  async registrar(params: {
    idUsuario?: number | null;
    accion: string;
    entidad: string;
    entidadId?: string | number | null;
    antesJson?: unknown;
    despuesJson?: unknown;
    ip?: string | null;
  }): Promise<Auditoria> {
    const item = this.auditoriaRepository.create({
      idUsuario: params.idUsuario ?? null,
      accion: params.accion,
      entidad: params.entidad,
      entidadId:
        params.entidadId === undefined || params.entidadId === null
          ? null
          : String(params.entidadId),
      antesJson: sanitizeAuditPayload(params.antesJson ?? null),
      despuesJson: sanitizeAuditPayload(params.despuesJson ?? null),
      ip: params.ip ?? null,
    });

    return this.auditoriaRepository.save(item);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    accion?: string;
    entidad?: string;
    idUsuario?: number;
  }): Promise<{
    items: Auditoria[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
    const builder = this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .orderBy('auditoria.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.accion?.trim()) {
      builder.andWhere('auditoria.accion ILIKE :accion', {
        accion: `%${query.accion.trim()}%`,
      });
    }

    if (query.entidad?.trim()) {
      builder.andWhere('auditoria.entidad ILIKE :entidad', {
        entidad: `%${query.entidad.trim()}%`,
      });
    }

    if (query.idUsuario) {
      builder.andWhere('auditoria.idUsuario = :idUsuario', {
        idUsuario: query.idUsuario,
      });
    }

    const [items, total] = await builder.getManyAndCount();

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }
}
