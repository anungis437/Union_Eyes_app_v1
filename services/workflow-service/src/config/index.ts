import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  port: z.number().default(3006),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  
  supabase: z.object({
    url: z.string().url(),
    serviceRoleKey: z.string().min(1),
  }),
  
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
  }),
  
  jwt: z.object({
    secret: z.string().min(32),
  }),
  
  aiService: z.object({
    url: z.string().url(),
  }),
  
  notifications: z.object({
    enableEmail: z.boolean().default(true),
    enableSlack: z.boolean().default(false),
    slackWebhookUrl: z.string().url().optional(),
  }),
  
  workflow: z.object({
    maxExecutionTime: z.number().default(3600000), // 1 hour
    maxRetryAttempts: z.number().default(3),
    cleanupInterval: z.number().default(86400000), // 24 hours
  }),
  
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'simple']).default('json'),
  }),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  port: parseInt(process.env.PORT || '3006', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET!,
  },
  
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:3005',
  },
  
  notifications: {
    enableEmail: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
    enableSlack: process.env.ENABLE_SLACK_NOTIFICATIONS === 'true',
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  },
  
  workflow: {
    maxExecutionTime: parseInt(process.env.MAX_WORKFLOW_EXECUTION_TIME || '3600000', 10),
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
    cleanupInterval: parseInt(process.env.WORKFLOW_CLEANUP_INTERVAL || '86400000', 10),
  },
  
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    format: (process.env.LOG_FORMAT as any) || 'json',
  },
});
