import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"] as readonly string[],
        connectSrc: ["'self'"] as readonly string[],
        fontSrc: ["'self'"] as readonly string[],
        objectSrc: ["'none'"] as readonly string[],
        frameAncestors: ["'none'"] as readonly string[],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
    crossOriginEmbedderPolicy: false,
  } as any));
  app.use(compression());

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3901'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Travel Operation API')
    .setDescription('SaaS platform for travel agencies, OTAs, visa agencies, and corporate travel teams')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Tenant-Id', in: 'header' }, 'X-Tenant-Id')
    .addApiKey({ type: 'apiKey', name: 'X-Branch-Id', in: 'header' }, 'X-Branch-Id')
    .build();

  // Swagger is exposed only outside production, unless explicitly enabled via
  // ENABLE_SWAGGER=true (e.g. for a protected staging environment).
  const isProduction = process.env.NODE_ENV === 'production';
  const swaggerEnabled = !isProduction || process.env.ENABLE_SWAGGER === 'true';
  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/v1/docs', app, document);
  }

  const port = process.env.PORT || 3900;
  await app.listen(port);
  console.log(`Travel Operation API running on http://localhost:${port}`);
  if (swaggerEnabled) {
    console.log(`Swagger docs at http://localhost:${port}/api/v1/docs`);
  }
}

bootstrap();
