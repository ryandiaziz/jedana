import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule, mcpStrategy } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded, type Express } from 'express';
import { ApiKeyService } from './auth/api-key.service';
import { createMcpAuthMiddleware, type McpAuthedRequest } from './mcp/mcp-auth';
import { createMcpRateLimiter } from './mcp/mcp-rate-limit';
import { getClientIp } from './common/client-ip';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Security Headers — must be mounted before MCP and other routes so that
  // all responses (including MCP 401/429) pass through helmet and X-Powered-By is stripped.
  app.use(helmet());

  // Reject compressed request bodies (inflate: false -> HTTP 415 on any
  // Content-Encoding other than identity). Jedana clients always send plain
  // JSON; refusing compressed bodies keeps untrusted bytes away from Node's
  // brotli/zlib decoders (CVE-2026-111497) and caps per-request memory.
  app.use(json({ limit: '5mb', inflate: false }));
  app.use(urlencoded({ extended: true, limit: '5mb', inflate: false }));

  // ── MCP Rate Limiting & Auth (level Express) ───────────────────────────
  // Transport MCP dari @rekog/mcp-nest melakukan self-mount route `/mcp`
  // langsung ke instance Express saat `startAllMicroservices()` di bawah —
  // request MCP TIDAK melewati pipeline middleware NestJS, jadi middleware
  // Nest (consumer.apply(...).forRoutes('mcp')) tidak akan pernah jalan.
  // Auth API key dan rate limiter dipasang sebagai middleware Express di sini.
  // Wajib didaftarkan SEBELUM `startAllMicroservices()` agar posisinya di depan
  // handler MCP di stack Express.
  const apiKeyService = app.get(ApiKeyService);
  const expressApp = app.getHttpAdapter().getInstance() as Express;

  // Stage 1: limit per real client IP before auth (240 req/min)
  expressApp.use(
    '/mcp',
    createMcpRateLimiter({
      limit: 240,
      windowMs: 60_000,
      keyOf: (req) => `ip:${getClientIp(req)}`,
    }),
  );

  // Authentication: validates Bearer token and sets req.user
  expressApp.use('/mcp', createMcpAuthMiddleware(apiKeyService));

  // Stage 2: limit per authenticated user after auth (120 req/min)
  expressApp.use(
    '/mcp',
    createMcpRateLimiter({
      limit: 120,
      windowMs: 60_000,
      keyOf: (req) => `user:${(req as McpAuthedRequest).user?.id ?? 'anon'}`,
    }),
  );

  app.setGlobalPrefix('api');

  // Cookie parser
  app.use(cookieParser());

  // Dynamic CORS configuration
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? [frontendUrl]
        : [frontendUrl, ...devOrigins],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Sync-Cursor'],
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
