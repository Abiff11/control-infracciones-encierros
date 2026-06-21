import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module';
import { SafeExceptionFilter } from './common/filters/safe-exception.filter';

const DEV_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

function parseCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveAllowedOrigins(configService: ConfigService): string[] {
  const frontendOrigins = parseCsv(configService.get<string>('FRONTEND_ORIGINS'));
  const corsOrigin = parseCsv(configService.get<string>('CORS_ORIGIN'));
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const configuredOrigins = [...frontendOrigins, ...corsOrigin];

  if (configuredOrigins.length > 0) {
    return Array.from(new Set(configuredOrigins));
  }

  if (nodeEnv === 'production') {
    throw new Error('FRONTEND_ORIGINS o CORS_ORIGIN es obligatorio en produccion.');
  }

  return DEV_CORS_ORIGINS;
}

function isSwaggerEnabled(configService: ConfigService): boolean {
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const explicitValue = configService.get<string>('ENABLE_SWAGGER');

  if (explicitValue) {
    return explicitValue.trim().toLowerCase() === 'true';
  }

  return nodeEnv !== 'production';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const configService = app.get(ConfigService);
  const allowedOrigins = resolveAllowedOrigins(configService);

  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
    credentials: false,
    maxAge: 600,
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
        'API para control de infracciones, pagos, liberaciones, encierros y catálogos.',
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
    SwaggerModule.setup('docs', app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: false,
      },
    });
  }

  const port = configService.get<number>('app.port', 3000);

  await app.listen(port);
}
bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
