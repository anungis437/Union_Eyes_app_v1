import { z } from 'zod';
/**
 * AI Document schema - represents a document ingested for AI search
 */
export const AiDocumentSchema = z.object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    claim_id: z.string().uuid().nullable(),
    title: z.string(),
    content: z.string(),
    source_type: z.enum(['internal', 'licensed', 'public']),
    license_notes: z.string().nullable(),
    metadata: z.record(z.unknown()).default({}),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});
/**
 * AI Chunk schema - represents a chunked piece of text with embeddings
 */
export const AiChunkSchema = z.object({
    id: z.string().uuid(),
    document_id: z.string().uuid(),
    organization_id: z.string().uuid(),
    chunk_index: z.number().int(),
    content: z.string(),
    embedding: z.array(z.number()).nullable(), // Vector representation
    metadata: z.record(z.unknown()).default({}),
    created_at: z.string().datetime(),
});
/**
 * Document input for ingestion
 */
export const DocumentInputSchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    source_type: z.enum(['internal', 'licensed', 'public']),
    license_notes: z.string().optional(),
    claim_id: z.string().uuid().optional(),
    metadata: z.record(z.unknown()).optional(),
});
//# sourceMappingURL=document.js.map