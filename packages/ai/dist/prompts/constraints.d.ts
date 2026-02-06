/**
 * AI Constraints for Union Eyes
 *
 * These constraints MUST be followed by all AI features to ensure
 * responsible, secure, and privacy-respecting AI implementation.
 */
/**
 * Core constraint applied to all search prompts
 */
export declare const MUST_CITE_SOURCES: string;
/**
 * Neutrality constraint for legal research
 */
export declare const REMAIN_NEUTRAL: string;
/**
 * Privacy constraint - always mask PII before sending to LLM
 */
export declare const PROTECT_PRIVACY: string;
/**
 * Assistive-only constraint - never automate final decisions
 */
export declare const ASSISTIVE_ONLY: string;
/**
 * Combine all constraints into a single system message
 */
export declare function buildSystemConstraints(): string;
/**
 * Validation: Check if content contains unmasked PII
 * Returns array of detected PII types
 */
export declare function detectUnmaskedPII(content: string): string[];
/**
 * Mask PII in content before sending to LLM
 * This is a basic implementation - should be enhanced with proper NER
 */
export declare function maskPII(content: string): string;
//# sourceMappingURL=constraints.d.ts.map