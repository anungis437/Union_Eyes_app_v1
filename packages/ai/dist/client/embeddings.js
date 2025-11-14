/**
 * Text chunking utilities for document ingestion
 *
 * These utilities split large documents into smaller chunks suitable for
 * embedding generation and retrieval.
 */
/**
 * Split text into chunks with optional overlap
 */
export function chunkText(text, options = {}) {
    const { chunkSize = 1000, chunkOverlap = 200, preserveParagraphs = true, } = options;
    if (preserveParagraphs) {
        return chunkByParagraph(text, chunkSize, chunkOverlap);
    }
    return chunkByCharacter(text, chunkSize, chunkOverlap);
}
/**
 * Chunk by character count with overlap
 */
function chunkByCharacter(text, chunkSize, chunkOverlap) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        start += chunkSize - chunkOverlap;
    }
    return chunks;
}
/**
 * Chunk by paragraph boundaries while respecting max chunk size
 */
function chunkByParagraph(text, maxChunkSize, chunkOverlap) {
    const paragraphs = text.split(/\n\n+/);
    const chunks = [];
    let currentChunk = '';
    for (const paragraph of paragraphs) {
        const trimmed = paragraph.trim();
        if (!trimmed)
            continue;
        // If adding this paragraph would exceed max size, finalize current chunk
        if (currentChunk && (currentChunk.length + trimmed.length + 2 > maxChunkSize)) {
            chunks.push(currentChunk);
            // Start new chunk with overlap from previous chunk
            const overlapText = currentChunk.slice(-chunkOverlap);
            currentChunk = overlapText + '\n\n' + trimmed;
        }
        else {
            // Add paragraph to current chunk
            currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
        }
    }
    // Add final chunk if it exists
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    return chunks;
}
/**
 * Extract metadata from chunk context
 */
export function extractChunkMetadata(chunk, documentMetadata) {
    return {
        ...documentMetadata,
        chunk_length: chunk.length,
        has_legal_citation: /\b\d{4}\s+\w+\s+\d+\b/.test(chunk), // Basic pattern for case citations
        has_date: /\b\d{4}-\d{2}-\d{2}\b/.test(chunk),
    };
}
//# sourceMappingURL=embeddings.js.map