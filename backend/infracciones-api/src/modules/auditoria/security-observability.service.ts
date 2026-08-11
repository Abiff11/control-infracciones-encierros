import { Injectable, Logger } from '@nestjs/common';

import { AuditoriaService, type AuditSeverity } from './auditoria.service';

export type SecurityEventAction =
  | 'AUTHENTICATION_REJECTED'
  | 'AUTHORIZATION_REJECTED'
  | 'CSRF_REJECTED'
  | 'RATE_LIMIT_REJECTED';

function resolveAction(statusCode: number): SecurityEventAction | null {
  if (statusCode === 401) {
    return 'AUTHENTICATION_REJECTED';
  }

  if (statusCode === 403) {
    return 'AUTHORIZATION_REJECTED';
  }

  if (statusCode === 429) {
    return 'RATE_LIMIT_REJECTED';
  }

  return null;
}

function resolveSeverity(action: SecurityEventAction): AuditSeverity {
  if (action === 'CSRF_REJECTED' || action === 'RATE_LIMIT_REJECTED') {
    return 'HIGH';
  }

  return 'MEDIUM';
}

@Injectable()
export class SecurityObservabilityService {
  private readonly logger = new Logger(SecurityObservabilityService.name);

  constructor(private readonly auditoriaService: AuditoriaService) {}

  async recordHttpRejection(params: {
    statusCode: number;
    explicitAction?: SecurityEventAction | null;
    requestId: string;
    idUsuario?: number | null;
    ip?: string | null;
    httpMethod?: string | null;
    requestPath?: string | null;
    userAgent?: string | null;
    cfRay?: string | null;
  }): Promise<void> {
    const action = params.explicitAction ?? resolveAction(params.statusCode);

    if (!action) {
      return;
    }

    try {
      await this.auditoriaService.registrar({
        idUsuario: params.idUsuario ?? null,
        accion: action,
        entidad: 'SEGURIDAD',
        severity: resolveSeverity(action),
        requestId: params.requestId,
        ip: params.ip ?? null,
        httpMethod: params.httpMethod ?? null,
        requestPath: params.requestPath ?? null,
        userAgent: params.userAgent ?? null,
        despuesJson: {
          statusCode: params.statusCode,
          cfRay: params.cfRay ?? null,
        },
      });
    } catch (error: unknown) {
      this.logger.error(
        JSON.stringify({
          event: 'SECURITY_AUDIT_PERSIST_FAILED',
          requestId: params.requestId,
          action,
          message: error instanceof Error ? error.message : 'unknown error',
        }),
      );
    }
  }
}
