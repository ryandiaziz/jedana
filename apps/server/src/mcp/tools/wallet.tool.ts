import { Injectable } from '@nestjs/common';
import { McpController, Tool, McpContext } from '@rekog/mcp-nest';
import { Ctx, Payload } from '@nestjs/microservices';
import { z } from 'zod';
import { McpDataService } from '../mcp-data.service';

@Injectable()
@McpController()
export class WalletTool {
  constructor(private readonly mcpData: McpDataService) {}

  @Tool({
    name: 'list_wallets',
    description:
      'Melihat daftar semua wallet pengguna beserta saldo masing-masing. ' +
      'Wallet di Jedana menggunakan konsep "Envelope Budgeting" (misal: "Dana Harian", "Dana Liburan").',
    parameters: z.object({}),
  })
  async listWallets(@Payload() _params: object, @Ctx() ctx: McpContext) {
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
      const wallets = await this.mcpData.listWallets(userId);

      if (wallets.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Belum ada wallet. Gunakan tool "create_wallet" untuk membuat wallet baru.',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ count: wallets.length, wallets }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error mengambil wallet: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  @Tool({
    name: 'create_wallet',
    description:
      'Membuat wallet baru. Wallet adalah ruang pembukuan berdasarkan konsep "Envelope Budgeting", ' +
      'contoh: "Dana Harian", "Dana Darurat", "Dana Liburan".',
    parameters: z.object({
      name: z
        .string()
        .min(1)
        .max(100)
        .describe('Nama wallet, misal: "Dana Harian"'),
    }),
  })
  async createWallet(
    @Payload() params: { name: string },
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
      const wallet = await this.mcpData.createWallet(userId, params.name);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              { message: `Wallet "${params.name}" berhasil dibuat.`, wallet },
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
            text: `Error membuat wallet: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
}
