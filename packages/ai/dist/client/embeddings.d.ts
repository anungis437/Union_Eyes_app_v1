/**
 * Text chunking utilities for document ingestion
 *
 * These utilities split large documents into smaller chunks suitable for
 * embedding generation and retrieval.
 */
export interface ChunkOptions {
    chunkSize?: number;
    chunkOverlap?: number;
    preserveParagraphs?: boolean;
}
/**
 * Split text into chunks with optional overlap
 */
export declare function chunkText(text: string, options?: ChunkOptions): string[];
/**
 * Extract metadata from chunk context
 */
export declare function extractChunkMetadata(chunk: string, documentMetadata: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=embeddings.d.ts.map