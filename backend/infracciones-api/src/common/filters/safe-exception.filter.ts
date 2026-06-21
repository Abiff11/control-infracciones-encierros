import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorPayload {
  statusCode: number;
  message: string | string[];
  error?: string;
}

function normalizeMessage(message: unknown): string | string[] {
  if (Array.isArray(message)) {
    return message.map((item) => String(item));
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return 'Error interno del servidor';
}

function getExceptionPayload(exception: unknown): ErrorPayload {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'object' && response !== null) {
      const payload = response as Partial<ErrorPayload>;
      return {
        statusCode,
        message: normalizeMessage(payload.message ?? exception.message),
        error: payload.error,
      };
    }

    return {
      statusCode,
      message: normalizeMessage(response),
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Error interno del servidor',
  };
}

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SafeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const payload = getExceptionPayload(exception);

    if (payload.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({
        statusCode: payload.statusCode,
        method: request.method,
        path: request.originalUrl,
      });
    }

    response.status(payload.statusCode).json({
      statusCode: payload.statusCode,
      message: payload.message,
      error: payload.error,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
