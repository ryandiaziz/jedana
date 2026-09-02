import { Injectable } from '@nestjs/common';
import { McpController, Tool, McpContext } from '@rekog/mcp-nest';
import { Ctx, Payload } from '@nestjs/microservices';
import { z } from 'zod';
import { McpDataService } from '../mcp-data.service';

@Injectable()
@McpController()
export class SummaryTool {
  constructor(private readonly mcpData: McpDataService) {}

  @Tool({
    name: 'get_summary',
    description:
      'Mendapatkan ringkasan keuangan pengguna. Menampilkan total pemasukan, pengeluaran, saldo, ' +
      'dan jumlah transaksi per wallet. Bisa difilter berdasarkan wallet dan rentang tanggal.',
    parameters: z.object({
      walletId: z
        .string()
        .uuid()
        .optional()
        .describe('Filter ringkasan untuk wallet tertentu saja'),
      startDate: z
        .number()
        .optional()
        .describe('Filter mulai tanggal (Unix timestamp ms)'),
      endDate: z
        .number()
        .optional()
        .describe('Filter sampai tanggal (Unix timestamp ms)'),
    }),
  })
  async getSummary(
    @Payload()
    params: { walletId?: string; startDate?: number; endDate?: number },
    @Ctx() ctx: McpContext,
  ) {
    const rawReq = ctx.getRawRequest<{ user?: { id: string } }>();
    const userId = rawReq?.user?.id;
    if (!userId) {
      return {
        content: [
          { type: 'text' as const, text: 'Error: User not authenticated' },
        ],
        isError: true,
      };
    }

    try {
      const summary = await this.mcpData.getSummary(userId, {
        walletId: params.walletId,
        startDate: params.startDate,
        endDate: params.endDate,
      });

      if (summary.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Belum ada data keuangan. Buat wallet dan transaksi terlebih dahulu.',
            },
          ],
        };
      }

      // Calculate grand totals
      const grandTotal = summary.reduce(
        (acc, w) => ({
          totalIncome: acc.totalIncome + w.totalIncome,
          totalExpense: acc.totalExpense + w.totalExpense,
          balance: acc.balance + w.balance,
          transactionCount: acc.transactionCount + w.transactionCount,
        }),
        { totalIncome: 0, totalExpense: 0, balance: 0, transactionCount: 0 },
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ grandTotal, perWallet: summary }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error mengambil ringkasan: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
}
