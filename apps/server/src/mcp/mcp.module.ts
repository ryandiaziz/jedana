import { Module } from '@nestjs/common';
import { McpDataService } from './mcp-data.service';
import { TransactionTool } from './tools/transaction.tool';
import { WalletTool } from './tools/wallet.tool';
import { TagTool } from './tools/tag.tool';
import { SummaryTool } from './tools/summary.tool';

@Module({
  controllers: [TransactionTool, WalletTool, TagTool, SummaryTool],
  providers: [McpDataService],
})
export class McpModule {}
