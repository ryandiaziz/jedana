import { Injectable } from '@nestjs/common';
import { McpController, Tool, McpContext } from '@rekog/mcp-nest';
import { Ctx, Payload } from '@nestjs/microservices';
import { z } from 'zod';
import { McpDataService } from '../mcp-data.service';

@Injectable()
@McpController()
export class TransactionTool {
  constructor(private readonly mcpData: McpDataService) {}

  @Tool({
    name: 'create_transaction',
    description:
      'Membuat transaksi keuangan baru (pemasukan/pengeluaran) di wallet tertentu. ' +
      'Gunakan list_wallets untuk mendapatkan walletId yang tersedia, dan list_tags untuk tagIds.',
    parameters: z.object({
      walletId: z.string().uuid().describe('ID wallet tujuan transaksi'),
      type: z
        .enum(['INCOME', 'EXPENSE'])
        .describe(
          'Jenis transaksi: INCOME (pemasukan) atau EXPENSE (pengeluaran)',
        ),
      amount: z
        .number()
        .positive()
        .describe(
          'Jumlah uang dalam satuan terkecil (misal: 50000 untuk Rp50.000)',
        ),
      note: z
        .string()
        .min(1)
        .describe('Catatan/deskripsi transaksi, misal: "Makan siang"'),
      date: z
        .number()
        .optional()
        .describe(
          'Tanggal transaksi dalam Unix timestamp milliseconds. Jika tidak diisi, gunakan waktu sekarang.',
        ),
      payee: z
        .string()
        .optional()
        .describe(
          'Nama pihak kedua dalam transaksi, misal: nama toko/merchant',
        ),
      tagIds: z
        .array(z.string().uuid())
        .optional()
        .describe('Array ID tag untuk mengkategorikan transaksi'),
    }),
  })
  async createTransaction(
    @Payload()
    params: {
      walletId: string;
      type: 'INCOME' | 'EXPENSE';
      amount: number;
      note: string;
      date?: number;
      payee?: string;
      tagIds?: string[];
    },
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
      const result = await this.mcpData.createTransaction(userId, {
        walletId: params.walletId,
        type: params.type,
        amount: params.amount,
        note: params.note,
        date: params.date,
        payee: params.payee,
        tagIds: params.tagIds,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                message: `Transaksi ${params.type === 'INCOME' ? 'pemasukan' : 'pengeluaran'} sebesar ${params.amount} berhasil dicatat.`,
                transaction: result,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error membuat transaksi: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  @Tool({
    name: 'list_transactions',
    description:
      'Melihat daftar transaksi keuangan. Bisa difilter berdasarkan wallet, rentang tanggal, dan jenis transaksi.',
    parameters: z.object({
      walletId: z
        .string()
        .uuid()
        .optional()
        .describe('Filter berdasarkan wallet ID'),
      startDate: z
        .number()
        .optional()
        .describe('Filter mulai tanggal (Unix timestamp ms)'),
      endDate: z
        .number()
        .optional()
        .describe('Filter sampai tanggal (Unix timestamp ms)'),
      type: z
        .enum(['INCOME', 'EXPENSE'])
        .optional()
        .describe('Filter jenis transaksi'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Jumlah transaksi yang ditampilkan (default: 20, max: 100)'),
    }),
  })
  async listTransactions(
    @Payload()
    params: {
      walletId?: string;
      startDate?: number;
      endDate?: number;
      type?: 'INCOME' | 'EXPENSE';
      limit?: number;
    },
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
      const transactions = await this.mcpData.listTransactions(userId, {
        walletId: params.walletId,
        startDate: params.startDate,
        endDate: params.endDate,
        type: params.type,
        limit: params.limit,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                count: transactions.length,
                transactions,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error mengambil transaksi: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  @Tool({
    name: 'void_transaction',
    description:
      'Membatalkan (void) transaksi. Transaksi yang di-void tidak dihapus, tapi tidak dihitung dalam saldo wallet.',
    parameters: z.object({
      transactionId: z
        .string()
        .uuid()
        .describe('ID transaksi yang akan di-void'),
    }),
  })
  async voidTransaction(
    @Payload() params: { transactionId: string },
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
      const success = await this.mcpData.voidTransaction(
        userId,
        params.transactionId,
      );

      if (!success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Transaksi tidak ditemukan atau sudah di-void sebelumnya.',
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Transaksi ${params.transactionId} berhasil di-void.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error void transaksi: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
}
