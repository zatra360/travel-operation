import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

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

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = process.env.PORT || 3900;
  await app.listen(port);
  console.log(`🚀 Travel Operation API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/v1/docs`);
}

bootstrap();
