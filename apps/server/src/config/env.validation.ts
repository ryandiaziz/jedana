import { z } from 'zod';

const baseSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

const productionSchema = baseSchema.extend({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url().startsWith('https://'),
  FRONTEND_URL: z.string().url().startsWith('https://'),
});

/** Throws (and therefore stops the Nest bootstrap) on invalid configuration. */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const schema =
    config.NODE_ENV === 'production' ? productionSchema : baseSchema;
  const parsed = schema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return { ...config, ...parsed.data };
}
