import { Injectable } from '@nestjs/common';
import { McpController, Tool, McpContext } from '@rekog/mcp-nest';
import { Ctx, Payload } from '@nestjs/microservices';
import { z } from 'zod';
import { McpDataService } from '../mcp-data.service';

@Injectable()
@McpController()
export class TagTool {
  constructor(private readonly mcpData: McpDataService) {}

  @Tool({
    name: 'list_tags',
    description:
      'Melihat daftar semua tag yang tersedia untuk mengklasifikasikan transaksi. ' +
      'Satu transaksi bisa memiliki beberapa tag.',
    parameters: z.object({
      includeArchived: z
        .boolean()
        .optional()
        .describe(
          'Jika true, tampilkan juga tag yang sudah diarsipkan. Default: false.',
        ),
    }),
  })
  async listTags(
    @Payload() params: { includeArchived?: boolean },
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
      const tags = await this.mcpData.listTags(userId, params.includeArchived);

      if (tags.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Belum ada tag. Gunakan tool "create_tag" untuk membuat tag baru.',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ count: tags.length, tags }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error mengambil tags: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  @Tool({
    name: 'create_tag',
    description:
      'Membuat tag baru untuk mengklasifikasikan transaksi. ' +
      'Contoh tag: "Makanan", "Transportasi", "Belanja", "Gaji".',
    parameters: z.object({
      name: z.string().min(1).max(50).describe('Nama tag, misal: "Makanan"'),
    }),
  })
  async createTag(@Payload() params: { name: string }, @Ctx() ctx: McpContext) {
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
      const tag = await this.mcpData.createTag(userId, params.name);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              { message: `Tag "${params.name}" berhasil dibuat.`, tag },
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
            text: `Error membuat tag: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
}
