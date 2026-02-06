/**
 * AI Constraints for Union Eyes
 *
 * These constraints MUST be followed by all AI features to ensure
 * responsible, secure, and privacy-respecting AI implementation.
 */
/**
 * Core constraint applied to all search prompts
 */
export const MUST_CITE_SOURCES = `
CRITICAL CONSTRAINT: Never invent a case citation, arbitrator name, or legal outcome.
Only reference documents explicitly provided in the CONTEXT section.
If you cannot find high-confidence evidence for a claim, respond with:
"I don't have enough information to answer this confidently. Please refine your search or review the documents manually."
`.trim();
/**
 * Neutrality constraint for legal research
 */
export const REMAIN_NEUTRAL = `
Remain neutral in your analysis.
Present arguments and precedents from both union and employer perspectives where relevant.
Do not advocate for one side over the other.
Your role is to assist research, not to make strategic decisions.
`.trim();
/**
 * Privacy constraint - always mask PII before sending to LLM
 */
export const PROTECT_PRIVACY = `
Before processing any document content, ensure:
- Personal names are masked as [NAME]
- Social Insurance Numbers are masked as [SIN]
- Addresses are masked as [ADDRESS]
- Health information is masked as [HEALTH INFO]
- Other personal identifiers are minimized or masked

This is a CRITICAL requirement for PIPEDA and Law 25 compliance.
`.trim();
/**
 * Assistive-only constraint - never automate final decisions
 */
export const ASSISTIVE_ONLY = `
IMPORTANT: Your output is an "AI Assistant Suggestion" only.
Do NOT:
- Decide whether to file, settle, or drop a case
- Make final strategic recommendations
- Sign off on legal documents

All outputs must be reviewed and approved by human union representatives or lawyers.
`.trim();
/**
 * Combine all constraints into a single system message
 */
export function buildSystemConstraints() {
    return [
        MUST_CITE_SOURCES,
        REMAIN_NEUTRAL,
        PROTECT_PRIVACY,
        ASSISTIVE_ONLY,
    ].join('\n\n');
}
/**
 * Validation: Check if content contains unmasked PII
 * Returns array of detected PII types
 */
export function detectUnmaskedPII(content) {
    const detected = [];
    // Simple heuristics - should be replaced with proper PII detection
    if (/\b\d{3}-\d{3}-\d{3}\b/.test(content)) {
        detected.push('Possible SIN');
    }
    if (/\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr)\b/i.test(content)) {
        detected.push('Possible address');
    }
    if (/\b(?:cancer|diabetes|HIV|depression|anxiety|prescription)\b/i.test(content)) {
        detected.push('Possible health information');
    }
    return detected;
}
/**
 * Mask PII in content before sending to LLM
 * This is a basic implementation - should be enhanced with proper NER
 */
export function maskPII(content) {
    let masked = content;
    // Mask SIN patterns (XXX-XXX-XXX)
    masked = masked.replace(/\b\d{3}-\d{3}-\d{3}\b/g, '[SIN]');
    // Mask email addresses
    masked = masked.replace(/\b[\w._%+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[EMAIL]');
    // Mask phone numbers
    masked = masked.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
    // Mask addresses (simple pattern)
    masked = masked.replace(/\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr)\b/gi, '[ADDRESS]');
    return masked;
}
//# sourceMappingURL=constraints.js.map