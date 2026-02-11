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
 * 7. Full observability with Langfuse for production monitoring
 *
 * See RESPONSIBLE_AI.md for full documentation.
 */
// Types
export * from './types/document';
export * from './types/query';
// Client utilities (server-side only)
export * from './client/openai';
export * from './client/embeddings';
// Observability (LLMOps)
export * from './client/observability';
// Prompts and constraints
export * from './prompts/constraints';
export * from './prompts/search';
export * from './prompts/summarize';
//# sourceMappingURL=index.js.map