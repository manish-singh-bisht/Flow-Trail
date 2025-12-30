import { z } from 'zod';
import 'dotenv/config';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.url(),

  REDIS_URL: z.url(),

  S3_ENDPOINT: z.url(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET: z.string(),
  S3_REGION: z.string(),
  S3_FORCE_PATH_STYLE: z.string(),
});

export const env = EnvSchema.parse(process.env);
