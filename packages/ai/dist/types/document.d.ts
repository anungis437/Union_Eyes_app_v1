import { z } from 'zod';
/**
 * AI Document schema - represents a document ingested for AI search
 */
export declare const AiDocumentSchema: z.ZodObject<{
    id: z.ZodString;
    organization_id: z.ZodString;
    claim_id: z.ZodNullable<z.ZodString>;
    title: z.ZodString;
    content: z.ZodString;
    source_type: z.ZodEnum<["internal", "licensed", "public"]>;
    license_notes: z.ZodNullable<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    organization_id: string;
    claim_id: string | null;
    title: string;
    content: string;
    source_type: "internal" | "licensed" | "public";
    license_notes: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}, {
    id: string;
    organization_id: string;
    claim_id: string | null;
    title: string;
    content: string;
    source_type: "internal" | "licensed" | "public";
    license_notes: string | null;
    created_at: string;
    updated_at: string;
    metadata?: Record<string, unknown> | undefined;
}>;
export type AiDocument = z.infer<typeof AiDocumentSchema>;
/**
 * AI Chunk schema - represents a chunked piece of text with embeddings
 */
export declare const AiChunkSchema: z.ZodObject<{
    id: z.ZodString;
    document_id: z.ZodString;
    organization_id: z.ZodString;
    chunk_index: z.ZodNumber;
    content: z.ZodString;
    embedding: z.ZodNullable<z.ZodArray<z.ZodNumber, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    organization_id: string;
    content: string;
    metadata: Record<string, unknown>;
    created_at: string;
    document_id: string;
    chunk_index: number;
    embedding: number[] | null;
}, {
    id: string;
    organization_id: string;
    content: string;
    created_at: string;
    document_id: string;
    chunk_index: number;
    embedding: number[] | null;
    metadata?: Record<string, unknown> | undefined;
}>;
export type AiChunk = z.infer<typeof AiChunkSchema>;
/**
 * Document input for ingestion
 */
export declare const DocumentInputSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    source_type: z.ZodEnum<["internal", "licensed", "public"]>;
    license_notes: z.ZodOptional<z.ZodString>;
    claim_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    content: string;
    source_type: "internal" | "licensed" | "public";
    claim_id?: string | undefined;
    license_notes?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    title: string;
    content: string;
    source_type: "internal" | "licensed" | "public";
    claim_id?: string | undefined;
    license_notes?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type DocumentInput = z.infer<typeof DocumentInputSchema>;
//# sourceMappingURL=document.d.ts.map