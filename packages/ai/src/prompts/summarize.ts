import { buildSystemConstraints, maskPII } from './constraints';

/**
 * Summary prompt template for case summarization
 */
export function buildSummaryPrompt(
  caseContent: string,
  caseMetadata?: Record<string, unknown>
): string {
  // Mask PII before including in prompt
  const maskedContent = maskPII(caseContent);
  
  const metadata = caseMetadata
    ? `\nCASE METADATA: ${JSON.stringify(caseMetadata, null, 2)}`
    : '';

  return `
You are assisting with case preparation for a union grievance.

${buildSystemConstraints()}

CASE FILE:
${maskedContent}
${metadata}

TASK:
Generate a structured summary with these sections:

## 1. Facts
Key events, dates, parties involved (use masked identifiers like [NAME], [EMPLOYER])

## 2. Issues
Legal or contractual questions at stake

## 3. Arguments
**Union Position:**
- Key arguments in favour of the grievance

**Employer Position:**
- Key arguments against the grievance (if mentioned in the file)

## 4. Relevant Precedents
Similar cases, arbitration awards, or policy clauses (if any are referenced in the case file)

## 5. Recommended Next Steps
Suggested actions for case preparation (subject to human review)

IMPORTANT REMINDERS:
- Label your output as "AI-Generated Draft – Requires Human Review"
- Use masked identifiers for personal information
- Do NOT make final recommendations on filing, settling, or dropping the case
- Present both sides of the argument neutrally

Generate the summary now.
`.trim();
}

/**
 * Build a prompt for brief/talking points generation
 */
export function buildBriefDraftPrompt(
  caseContent: string,
  purpose: 'arbitration' | 'negotiation' | 'internal'
): string {
  const maskedContent = maskPII(caseContent);
  
  const purposeGuidance = {
    arbitration: 'formal arbitration hearing (structured legal arguments)',
    negotiation: 'settlement negotiation (persuasive talking points)',
    internal: 'internal union discussion (key points for review)',
  }[purpose];

  return `
You are assisting with brief preparation for a union grievance.

${buildSystemConstraints()}

CASE FILE:
${maskedContent}

PURPOSE:
This draft is for ${purposeGuidance}

TASK:
Generate a draft brief with these sections:

## Opening Statement
Brief overview of the grievance and what the union is seeking

## Key Facts
Chronological summary of relevant events (use masked identifiers)

## Legal/Contractual Basis
Specific contract clauses, policies, or legal principles that support the union's position

## Argument
Point-by-point case for why the grievance should be upheld

## Conclusion
Summary of requested remedy or outcome

FORMATTING:
- Use clear headings and bullet points
- Include "[AI DRAFT]" watermark at the top
- Add "[NEEDS CITATION]" where specific case law should be referenced by a human
- Use "[NAME]", "[EMPLOYER]", etc. for masked personal information

IMPORTANT:
- This is a DRAFT ONLY – requires human review and editing
- Do not make final strategic recommendations
- Present the union's case strongly but honestly

Generate the draft now.
`.trim();
}

/**
 * Validation: Check if summary contains required sections
 */
export function validateSummaryStructure(summary: string): {
  valid: boolean;
  missingSections: string[];
} {
  const requiredSections = ['Facts', 'Issues', 'Arguments', 'Next Steps'];
  const missingSections: string[] = [];
  
  for (const section of requiredSections) {
    if (!summary.toLowerCase().includes(section.toLowerCase())) {
      missingSections.push(section);
    }
  }
  
  return {
    valid: missingSections.length === 0,
    missingSections,
  };
}
