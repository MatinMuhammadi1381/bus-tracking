import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import express, { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { AppModule } from './app.module';

async function bootstrap() {
  // Long routes may contain a detailed GeoJSON line, so the default 100 KB
  // request limit is too small for otherwise valid route definitions.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  mkdirSync(join(process.cwd(), 'uploads', 'drivers'), { recursive: true });
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  const configService = app.get(ConfigService);
  const logger = new Logger('HTTP');
  const isProduction = configService.get('NODE_ENV') === 'production';
  const jwtSecret = configService.get<string>('JWT_SECRET');
  const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');

  if (
    isProduction &&
    (!jwtSecret || jwtSecret.length < 32 || !refreshSecret || refreshSecret.length < 32)
  ) {
    throw new Error(
      'JWT_SECRET and JWT_REFRESH_SECRET must each be at least 32 characters in production'
    );
  }

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = request.header('x-request-id') || randomUUID();
    const startedAt = process.hrtime.bigint();
    response.setHeader('x-request-id', requestId);
    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.log(
        `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs.toFixed(1)}ms requestId=${requestId}`
      );
    });
    next();
  });

  const configuredOrigins = configService.get<string>('CORS_ORIGIN');
  const corsOrigin = configuredOrigins
    ? configuredOrigins
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
    : isProduction
      ? []
      : true;

  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (
        !requestOrigin ||
        corsOrigin === true ||
        (Array.isArray(corsOrigin) && corsOrigin.includes(requestOrigin)) ||
        /^http:\/\/94\.183\.30\.202(?::\d+)?$/.test(requestOrigin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin not allowed: ${requestOrigin}`));
    },
    credentials: false,
  });

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`API server running on http://0.0.0.0:${port}/api/v1`);
}

bootstrap();
