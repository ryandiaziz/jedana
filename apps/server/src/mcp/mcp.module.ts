import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { McpDataService } from './mcp-data.service';
import { TransactionTool } from './tools/transaction.tool';
import { WalletTool } from './tools/wallet.tool';
import { TagTool } from './tools/tag.tool';
import { SummaryTool } from './tools/summary.tool';
import { McpAuthMiddleware } from './mcp-auth.middleware';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TransactionTool, WalletTool, TagTool, SummaryTool],
  providers: [McpDataService],
})
export class McpModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply API key auth middleware to MCP endpoint
    consumer.apply(McpAuthMiddleware).forRoutes('mcp');
  }
}
