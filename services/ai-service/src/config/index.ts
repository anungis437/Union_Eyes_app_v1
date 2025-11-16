import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  // Server
  port: z.coerce.number().default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  databaseUrl: z.string().url(),

  // Supabase
  supabaseUrl: z.string().url(),
  supabaseServiceKey: z.string().min(1),

  // AI Providers
  openaiApiKey: z.string().min(1),
  anthropicApiKey: z.string().min(1),

  // Vector Database
  pineconeApiKey: z.string().min(1),
  pineconeEnvironment: z.string().min(1),
  pineconeIndexName: z.string().default('unioneyes-legal-docs'),

  // Redis
  redisUrl: z.string().url(),

  // Model Configuration
  defaultAiModel: z.string().default('gpt-4-turbo-preview'),
  fallbackAiModel: z.string().default('claude-3-opus-20240229'),
  embeddingModel: z.string().default('text-embedding-3-large'),

  // Rate Limits
  maxTokensPerRequest: z.coerce.number().default(4096),
  maxRequestsPerMinute: z.coerce.number().default(60),
  maxRequestsPerDay: z.coerce.number().default(10000),

  // Feature Flags
  enableDocumentAnalysis: z.coerce.boolean().default(true),
  enablePredictions: z.coerce.boolean().default(true),
  enableNlpQueries: z.coerce.boolean().default(true),
  enableAutoLearning: z.coerce.boolean().default(true),

  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Config = z.infer<typeof configSchema>;

const parseConfig = (): Config => {
  try {
    return configSchema.parse({
      // Server
      port: process.env.PORT,
      nodeEnv: process.env.NODE_ENV,

      // Database
      databaseUrl: process.env.DATABASE_URL,

      // Supabase
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

      // AI Providers
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,

      // Vector Database
      pineconeApiKey: process.env.PINECONE_API_KEY,
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
      pineconeIndexName: process.env.PINECONE_INDEX_NAME,

      // Redis
      redisUrl: process.env.REDIS_URL,

      // Model Configuration
      defaultAiModel: process.env.DEFAULT_AI_MODEL,
      fallbackAiModel: process.env.FALLBACK_AI_MODEL,
      embeddingModel: process.env.EMBEDDING_MODEL,

      // Rate Limits
      maxTokensPerRequest: process.env.MAX_TOKENS_PER_REQUEST,
      maxRequestsPerMinute: process.env.MAX_REQUESTS_PER_MINUTE,
      maxRequestsPerDay: process.env.MAX_REQUESTS_PER_DAY,

      // Feature Flags
      enableDocumentAnalysis: process.env.ENABLE_DOCUMENT_ANALYSIS,
      enablePredictions: process.env.ENABLE_PREDICTIONS,
      enableNlpQueries: process.env.ENABLE_NLP_QUERIES,
      enableAutoLearning: process.env.ENABLE_AUTO_LEARNING,

      // Logging
      logLevel: process.env.LOG_LEVEL,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => err.path.join('.')).join(', ');
      throw new Error(`Invalid configuration. Missing or invalid: ${missingVars}`);
    }
    throw error;
  }
};

export const config = parseConfig();
