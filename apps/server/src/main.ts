import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule, mcpStrategy } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Express } from 'express';
import { ApiKeyService } from './auth/api-key.service';
import { createMcpAuthMiddleware } from './mcp/mcp-auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── MCP Auth (level Express) ────────────────────────────────────────────
  // Transport MCP dari @rekog/mcp-nest melakukan self-mount route `/mcp`
  // langsung ke instance Express saat `startAllMicroservices()` di bawah —
  // request MCP TIDAK melewati pipeline middleware NestJS, jadi middleware
  // Nest (consumer.apply(...).forRoutes('mcp')) tidak akan pernah jalan.
  // Auth API key dipasang sebagai middleware Express di sini. Wajib didaftarkan
  // SEBELUM `startAllMicroservices()` agar posisinya di depan handler MCP
  // di stack Express.
  const apiKeyService = app.get(ApiKeyService);
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.use('/mcp', createMcpAuthMiddleware(apiKeyService));

  app.setGlobalPrefix('api');

  // Security Headers
  app.use(helmet());

  // Cookie parser
  app.use(cookieParser());

  // Dynamic CORS configuration
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // MCP Transport — attach HTTP adapter and connect as microservice
  mcpStrategy.setHttpAdapter(app.getHttpAdapter());
  app.connectMicroservice({ strategy: mcpStrategy });

  // Start MCP microservice before HTTP server
  await app.startAllMicroservices();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`[Jedana Server] Running on port ${port}`);
  console.log(`[Jedana MCP] Endpoint available at /mcp`);
}
void bootstrap();

