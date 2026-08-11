import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { sanitizeAuditPayload } from '../../common/redact-sensitive-data';
import { Auditoria } from './entities/auditoria.entity';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

function truncate(value: string | null | undefined, maxLength: number) {
  if (!value) {
    return null;
  }

  return value.slice(0, maxLength);
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

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
    severity?: AuditSeverity | null;
    requestId?: string | null;
    httpMethod?: string | null;
    requestPath?: string | null;
    userAgent?: string | null;
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
      ip: truncate(params.ip, 80),
      severity: params.severity ?? null,
      requestId: truncate(params.requestId, 64),
      httpMethod: truncate(params.httpMethod?.toUpperCase(), 10),
      requestPath: truncate(params.requestPath, 512),
      userAgent: truncate(params.userAgent, 512),
    });

    const saved = await this.auditoriaRepository.save(item);

    if (saved.severity === 'CRITICAL') {
      this.logger.error(this.toSecurityLog(saved));
    } else if (saved.severity === 'HIGH') {
      this.logger.warn(this.toSecurityLog(saved));
    }

    return saved;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    accion?: string;
    entidad?: string;
    idUsuario?: number;
    severity?: string;
    requestId?: string;
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

    if (query.severity?.trim()) {
      builder.andWhere('auditoria.severity = :severity', {
        severity: query.severity.trim().toUpperCase(),
      });
    }

    if (query.requestId?.trim()) {
      builder.andWhere('auditoria.requestId = :requestId', {
        requestId: query.requestId.trim(),
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

  private toSecurityLog(item: Auditoria): string {
    return JSON.stringify({
      event: 'SECURITY_AUDIT',
      severity: item.severity,
      accion: item.accion,
      requestId: item.requestId,
      idUsuario: item.idUsuario,
      ip: item.ip,
      method: item.httpMethod,
      path: item.requestPath,
      createdAt: item.createdAt,
    });
  }
}
