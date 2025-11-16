import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * AI Provider Types
 */
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

export enum AIModel {
  GPT4_TURBO = 'gpt-4-turbo-preview',
  GPT4 = 'gpt-4',
  GPT35_TURBO = 'gpt-3.5-turbo',
  CLAUDE_3_OPUS = 'claude-3-opus-20240229',
  CLAUDE_3_SONNET = 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU = 'claude-3-haiku-20240307',
}

/**
 * AI Orchestration Service
 * Manages multiple AI providers and models with intelligent routing
 */
export class AIOrchestrator {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private pinecone: Pinecone;
  private defaultProvider: AIProvider;
  private fallbackProvider: AIProvider;

  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });

    // Initialize Anthropic
    this.anthropic = new Anthropic({
      apiKey: config.anthropicApiKey,
    });

    // Initialize Pinecone
    this.pinecone = new Pinecone({
      apiKey: config.pineconeApiKey,
      environment: config.pineconeEnvironment,
    });

    // Set default and fallback providers
    this.defaultProvider = this.getProviderFromModel(config.defaultAiModel);
    this.fallbackProvider = this.getProviderFromModel(config.fallbackAiModel);

    logger.info('AI Orchestrator initialized', {
      defaultModel: config.defaultAiModel,
      fallbackModel: config.fallbackAiModel,
    });
  }

  /**
   * Get provider from model name
   */
  private getProviderFromModel(model: string): AIProvider {
    if (model.startsWith('gpt')) return AIProvider.OPENAI;
    if (model.startsWith('claude')) return AIProvider.ANTHROPIC;
    return AIProvider.OPENAI; // default
  }

  /**
   * Generate chat completion with automatic fallback
   */
  async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      provider?: AIProvider;
    } = {}
  ): Promise<{
    content: string;
    model: string;
    provider: AIProvider;
    tokensUsed: number;
  }> {
    const model = options.model || config.defaultAiModel;
    const provider = options.provider || this.getProviderFromModel(model);

    try {
      logger.debug('Generating chat completion', { model, provider });

      if (provider === AIProvider.OPENAI) {
        return await this.chatOpenAI(messages, { ...options, model });
      } else {
        return await this.chatAnthropic(messages, { ...options, model });
      }
    } catch (error) {
      logger.error('Primary AI provider failed, using fallback', {
        primaryProvider: provider,
        fallbackProvider: this.fallbackProvider,
        error,
      });

      // Try fallback provider
      if (this.fallbackProvider === AIProvider.OPENAI) {
        return await this.chatOpenAI(messages, {
          ...options,
          model: config.fallbackAiModel,
        });
      } else {
        return await this.chatAnthropic(messages, {
          ...options,
          model: config.fallbackAiModel,
        });
      }
    }
  }

  /**
   * OpenAI chat completion
   */
  private async chatOpenAI(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) {
    const response = await this.openai.chat.completions.create({
      model: options.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? config.maxTokensPerRequest,
    });

    return {
      content: response.choices[0].message.content || '',
      model: options.model,
      provider: AIProvider.OPENAI,
      tokensUsed: response.usage?.total_tokens || 0,
    };
  }

  /**
   * Anthropic chat completion
   */
  private async chatAnthropic(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) {
    // Separate system message
    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await this.anthropic.messages.create({
      model: options.model,
      system: systemMessage,
      messages: conversationMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? config.maxTokensPerRequest,
    });

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content,
      model: options.model,
      provider: AIProvider.ANTHROPIC,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: config.embeddingModel,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', { error });
      throw error;
    }
  }

  /**
   * Store document embeddings in Pinecone
   */
  async storeDocumentEmbedding(
    documentId: string,
    text: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(text);
      const index = this.pinecone.Index(config.pineconeIndexName);

      await index.upsert([
        {
          id: documentId,
          values: embedding,
          metadata: {
            ...metadata,
            text: text.substring(0, 1000), // Store first 1000 chars
          },
        },
      ]);

      logger.info('Document embedding stored', { documentId });
    } catch (error) {
      logger.error('Failed to store document embedding', { documentId, error });
      throw error;
    }
  }

  /**
   * Search similar documents using vector similarity
   */
  async searchSimilarDocuments(
    query: string,
    topK: number = 5,
    filter?: Record<string, any>
  ): Promise<
    Array<{
      id: string;
      score: number;
      metadata: Record<string, any>;
    }>
  > {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const index = this.pinecone.Index(config.pineconeIndexName);

      const results = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter,
      });

      return results.matches.map((match) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata || {},
      }));
    } catch (error) {
      logger.error('Failed to search similar documents', { error });
      throw error;
    }
  }

  /**
   * Get LangChain-compatible model instance
   */
  getLangChainModel(model?: string, temperature?: number) {
    const targetModel = model || config.defaultAiModel;
    const provider = this.getProviderFromModel(targetModel);

    if (provider === AIProvider.OPENAI) {
      return new ChatOpenAI({
        modelName: targetModel,
        temperature: temperature ?? 0.7,
        maxTokens: config.maxTokensPerRequest,
        openAIApiKey: config.openaiApiKey,
      });
    } else {
      return new ChatAnthropic({
        modelName: targetModel,
        temperature: temperature ?? 0.7,
        maxTokens: config.maxTokensPerRequest,
        anthropicApiKey: config.anthropicApiKey,
      });
    }
  }

  /**
   * Health check for AI services
   */
  async healthCheck(): Promise<{
    openai: boolean;
    anthropic: boolean;
    pinecone: boolean;
  }> {
    const results = {
      openai: false,
      anthropic: false,
      pinecone: false,
    };

    // Check OpenAI
    try {
      await this.openai.models.list();
      results.openai = true;
    } catch (error) {
      logger.warn('OpenAI health check failed', { error });
    }

    // Check Anthropic
    try {
      await this.anthropic.messages.create({
        model: AIModel.CLAUDE_3_HAIKU,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 10,
      });
      results.anthropic = true;
    } catch (error) {
      logger.warn('Anthropic health check failed', { error });
    }

    // Check Pinecone
    try {
      await this.pinecone.listIndexes();
      results.pinecone = true;
    } catch (error) {
      logger.warn('Pinecone health check failed', { error });
    }

    return results;
  }
}

// Singleton instance
export const aiOrchestrator = new AIOrchestrator();
