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
import {
  McpStrategy,
  MCP_STRATEGY,
  StreamableHttpTransport,
} from '@rekog/mcp-nest';

// MCP Strategy — exported so main.ts can attach the HTTP adapter
export const mcpStrategy = new McpStrategy({
  name: 'jedana-mcp',
  version: '1.0.0',
  description:
    'Jedana MCP Server — Remote financial tracking and bookkeeping for personal AI agents.',
  instructions:
    'You are interacting with Jedana (Jejak Dana), an offline-first personal financial management application.\n\n' +
    'CORE DOMAIN CONCEPTS & RULES:\n' +
    '1. Wallets (Envelope Budgeting): A Wallet represents a virtual budgeting envelope/space (e.g., "Dana Harian", "Dana Liburan", "Dana Darurat"), NOT a physical bank account or ATM card.\n' +
    '2. Payee vs Tag Separation:\n' +
    '   - Payee: The second party, merchant, or store name in a transaction (e.g., "Starbucks", "Indomaret", "Kantor").\n' +
    '   - Tag: Classification label or category (e.g., "Makanan", "Transportasi", "Tagihan"). Always keep Payee (where/who) separate from Tag (what category).\n' +
    '3. Transactions:\n' +
    '   - Type: Either "INCOME" (money added) or "EXPENSE" (money deducted).\n' +
    '   - Amount: Always provide positive numbers (e.g. 50000 for Rp50.000), regardless of whether it is INCOME or EXPENSE.\n' +
    '   - Date: Unix timestamp in milliseconds. If user does not specify time, use current timestamp.\n' +
    '4. Voiding: Transactions are cancelled via void_transaction (soft cancellation). They remain in history but do not affect wallet balances.\n\n' +
    'RECOMMENDED AGENT INTERACTION WORKFLOW:\n' +
    '1. When user asks to log a transaction (e.g., "Catat makan siang 50rb"): \n' +
    '   - If you do not have the walletId, call list_wallets first to pick or match the wallet (e.g. "Dana Harian" or default wallet).\n' +
    '   - Check list_tags to attach matching tagId(s) if relevant.\n' +
    '   - Call create_transaction with walletId, type, amount, note, and optional payee/tagIds.\n' +
    '2. When user asks about balances or finances (e.g., "Berapa sisa uang saya?", "Ringkasan bulan ini"): \n' +
    '   - Call get_summary or list_wallets to provide a clear financial breakdown.',
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
