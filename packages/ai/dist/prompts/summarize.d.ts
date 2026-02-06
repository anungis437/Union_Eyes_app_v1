/**
 * Summary prompt template for case summarization
 */
export declare function buildSummaryPrompt(caseContent: string, caseMetadata?: Record<string, unknown>): string;
/**
 * Build a prompt for brief/talking points generation
 */
export declare function buildBriefDraftPrompt(caseContent: string, purpose: 'arbitration' | 'negotiation' | 'internal'): string;
/**
 * Validation: Check if summary contains required sections
 */
export declare function validateSummaryStructure(summary: string): {
    valid: boolean;
    missingSections: string[];
};
//# sourceMappingURL=summarize.d.ts.map