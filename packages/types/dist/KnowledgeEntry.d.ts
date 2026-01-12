export interface KnowledgeEntry {
    id: string;
    title: string;
    content: string;
    entry_type: 'Legal Principle' | 'Case Strategy' | 'Research Note' | 'Other';
    tags: string[];
    legal_topics: string[];
    source_document_ids: string[];
    source_query_ids: string[];
    created_at: string;
    updated_at: string;
}
//# sourceMappingURL=KnowledgeEntry.d.ts.map