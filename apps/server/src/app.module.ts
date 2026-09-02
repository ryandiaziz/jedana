import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SyncModule } from './sync/sync.module';
import { McpModule } from './mcp/mcp.module';
import { HealthController } from './health/health.controller';
import { McpStrategy, MCP_STRATEGY, StreamableHttpTransport } from '@rekog/mcp-nest';

// MCP Strategy — exported so main.ts can attach the HTTP adapter
export const mcpStrategy = new McpStrategy({
  name: 'jedana-mcp',
  version: '1.0.0',
  description:
    'Jedana MCP Server — Pencatatan keuangan via AI agent. ' +
    'Mendukung pembuatan transaksi, wallet, tag, dan ringkasan keuangan.',
  instructions:
    'Jedana adalah aplikasi pencatatan keuangan. Gunakan tool yang tersedia untuk ' +
    'mencatat transaksi (income/expense), mengelola wallet (envelope budgeting), ' +
    'dan mengkategorikan transaksi dengan tag. Sebelum membuat transaksi, ' +
    'pastikan untuk memeriksa wallet yang tersedia dengan list_wallets.',
  transports: [
    new StreamableHttpTransport({
      endpoint: '/mcp',
    }),
  ],
});

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    AuthModule,
    SyncModule,
    McpModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: MCP_STRATEGY,
      useValue: mcpStrategy,
    },
  ],
})
export class AppModule {}

