import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN;

  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((value) => value.trim()).filter(Boolean)
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:4173',
          'http://127.0.0.1:4173',
        ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

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
      persistAuthorization: true,
    },
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);

  await app.listen(port);
}
bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
