/**
 * Union Eyes AI Package
 *
 * This package provides AI capabilities for Union Eyes following responsible AI principles:
 *
 * 1. Never expose LLM API keys client-side
 * 2. All AI routes are server-side and authenticated
 * 3. Use RAG over curated documents only - never fabricate sources
 * 4. Every AI answer includes citations and logs
 * 5. Treat outputs as assistive - never automate final legal decisions
 * 6. Respect privacy - minimize PII in prompts
 *
 * See RESPONSIBLE_AI.md for full documentation.
 */
export * from './types/document';
export * from './types/query';
export * from './client/openai';
export * from './client/embeddings';
export * from './prompts/constraints';
export * from './prompts/search';
export * from './prompts/summarize';
//# sourceMappingURL=index.d.ts.map