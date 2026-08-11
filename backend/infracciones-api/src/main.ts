import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import type { Express, NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module';
import {
  assertValidCsrfRequest,
  getCsrfCookieOptions,
  isSafeHttpMethod,
  issueCsrfCookie,
} from './common/csrf.util';
import { SafeExceptionFilter } from './common/filters/safe-exception.filter';
import { performanceGuardMiddleware } from './common/middleware/performance-guard.middleware';
import { getClientIp } from './common/security/client-ip.util';
import { resolveTrustProxySetting } from './common/security/trusted-proxy.util';
import {
  SecurityObservabilityService,
  type SecurityEventAction,
} from './modules/auditoria/security-observability.service';

const DEV_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const SECURITY_STATUS_CODES = new Set([401, 403, 429]);

type AuthenticatedRequest = Request & {
  user?: {
    idUsuario?: number;
  };
};

function parseCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveAllowedOrigins(configService: ConfigService): string[] {
  const frontendOrigins = parseCsv(
    configService.get<string>('FRONTEND_ORIGINS'),
  );
  const corsOrigin = parseCsv(configService.get<string>('CORS_ORIGIN'));
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const configuredOrigins = [...frontendOrigins, ...corsOrigin];

  if (configuredOrigins.some((origin) => origin === '*')) {
    throw new Error('CORS no puede usar * como origen permitido.');
  }

  if (configuredOrigins.length > 0) {
    return Array.from(new Set(configuredOrigins));
  }

  if (nodeEnv === 'production') {
    throw new Error(
      'FRONTEND_ORIGINS o CORS_ORIGIN es obligatorio en produccion.',
    );
  }

  return DEV_CORS_ORIGINS;
}

function isSwaggerEnabled(configService: ConfigService): boolean {
  const explicitValue = configService.get<string>('ENABLE_SWAGGER');

  return explicitValue?.trim().toLowerCase() === 'true';
}

function readSingleHeader(request: Request, name: string): string | null {
  const value = request.headers[name];

  if (typeof value === 'string') {
    return value.slice(0, 512);
  }

  if (Array.isArray(value) && value[0]) {
    return value[0].slice(0, 512);
  }

  return null;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const configService = app.get(ConfigService);
  const securityObservability = app.get(SecurityObservabilityService);
  const allowedOrigins = resolveAllowedOrigins(configService);
  const httpAdapter = app.getHttpAdapter().getInstance() as Express;
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const trustProxy = resolveTrustProxySetting({
    nodeEnv,
    trustProxy: configService.get<string>('TRUST_PROXY'),
  });
  const csrfSecret =
    configService.get<string>('CSRF_SECRET') ??
    configService.get<string>('JWT_SECRET') ??
    'local_dev_csrf_secret_change_me';
  const csrfCookieOptions = getCsrfCookieOptions({
    nodeEnv,
    cookieSecure: configService.get<string>('COOKIE_SECURE'),
    cookieSameSite: configService.get<string>('COOKIE_SAME_SITE'),
  });

  httpAdapter.set('trust proxy', trustProxy);
  httpAdapter.disable('x-powered-by');
  app.setGlobalPrefix('api');

  app.use((request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    const requestId = randomUUID();
    response.locals.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    response.once('finish', () => {
      if (!SECURITY_STATUS_CODES.has(response.statusCode)) {
        return;
      }

      const explicitAction = response.locals.securityEventAction;
      const securityEventAction =
        typeof explicitAction === 'string'
          ? (explicitAction as SecurityEventAction)
          : null;

      void securityObservability.recordHttpRejection({
        statusCode: response.statusCode,
        explicitAction: securityEventAction,
        requestId,
        idUsuario: request.user?.idUsuario ?? null,
        ip: getClientIp(request),
        httpMethod: request.method,
        requestPath: request.path,
        userAgent: readSingleHeader(request, 'user-agent'),
        cfRay: readSingleHeader(request, 'cf-ray'),
      });
    });

    next();
  });

  app.use(performanceGuardMiddleware);
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'x-csrf-token'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
    maxAge: 600,
  });

  app.use((request: Request, response: Response, next: NextFunction) => {
    if (isSafeHttpMethod(request.method)) {
      issueCsrfCookie(response, csrfSecret, csrfCookieOptions);
      next();
      return;
    }

    try {
      assertValidCsrfRequest(request, csrfSecret);
      next();
    } catch {
      response.locals.securityEventAction = 'CSRF_REJECTED';
      response.status(403).json({
        statusCode: 403,
        message: 'Token CSRF invalido',
        error: 'Forbidden',
      });
    }
  });

  app.useGlobalFilters(new SafeExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (isSwaggerEnabled(configService)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Control de infracciones y encierros API')
      .setDescription(
        'API para control de infracciones, pagos, liberaciones, encierros y catalogos.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Ingresar token JWT con formato: Bearer <token>',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: false,
      },
    });
  }

  const port = configService.get<number>('app.port', 3000);

  await app.listen(port);
  console.log(`Servidor escuchando en el puerto ${port}`);
}
bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
