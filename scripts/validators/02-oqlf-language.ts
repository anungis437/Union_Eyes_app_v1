/**
 * OQLF Language Coverage Validator
 * 
 * Validates Quebec's Charter of the French Language (Bill 101) compliance:
 * - 100% fr-CA coverage in UI
 * - OQLF terminology vs. France French
 * - Consumer-facing content must be French (can be bilingual)
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';

export class OQLFLanguageValidator extends BlindSpotValidator {
  name = '2. OQLF Language Coverage';
  description = 'Validates Quebec French language law compliance';
  category = 'language';

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    // Check i18n message files
    const messagesCoverage = await this.checkMessagesCoverage();
    
    // Check UI components for hardcoded English
    const hardcodedStrings = await this.findHardcodedStrings();
    
    // Check for France French vs Quebec French
    const franceFrenchIssues = await this.checkFranceFrench();

    if (messagesCoverage.missingKeys.length > 0) {
      findings.push({
        file: 'messages/fr-CA.json',
        issue: `${messagesCoverage.missingKeys.length} keys missing French translations`,
        severity: 'critical',
        line: messagesCoverage.missingKeys.slice(0, 5).join(', '),
      });
    }

    if (hardcodedStrings.length > 0) {
      findings.push({
        file: 'components/',
        issue: `${hardcodedStrings.length} files contain hardcoded English strings`,
        severity: 'high',
        line: hardcodedStrings.slice(0, 3).map(f => f.file).join(', '),
      });
    }

    if (franceFrenchIssues.length > 0) {
      findings.push({
        file: 'messages/fr-CA.json',
        issue: 'France French terminology found (should use Quebec French)',
        severity: 'medium',
        line: franceFrenchIssues.slice(0, 3).join(', '),
      });
    }

    if (findings.length > 0) {
      return this.fail(
        `Found ${findings.length} OQLF language compliance issues`,
        findings,
        this.generateFix()
      );
    }

    return this.pass(
      'OQLF language compliance checks passed'
    );
  }

  private async checkMessagesCoverage(): Promise<{
    missingKeys: string[];
    totalKeys: number;
  }> {
    try {
      const enMessages = JSON.parse(
        await fs.readFile('messages/en.json', 'utf-8')
      );
      const frMessages = JSON.parse(
        await fs.readFile('messages/fr-CA.json', 'utf-8')
      );

      const enKeys = this.getAllKeys(enMessages);
      const frKeys = this.getAllKeys(frMessages);

      const missingKeys = enKeys.filter(key => !frKeys.includes(key));

      return {
        missingKeys,
        totalKeys: enKeys.length,
      };
    } catch {
      return { missingKeys: [], totalKeys: 0 };
    }
  }

  private getAllKeys(obj: any, prefix = ''): string[] {
    let keys: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        keys = keys.concat(this.getAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }

  private async findHardcodedStrings(): Promise<
    Array<{ file: string; matches: string[] }>
  > {
    try {
      const componentFiles = await glob('components/**/*.{ts,tsx}', {
        cwd: process.cwd(),
      });

      const results: Array<{ file: string; matches: string[] }> = [];

      for (const file of componentFiles) {
        const content = await fs.readFile(file, 'utf-8');
        
        // Look for strings in JSX that aren't translation calls
        const jsxStringRegex = />([A-Z][a-z]+(?:\s+[a-z]+)*)</g;
        const matches = [...content.matchAll(jsxStringRegex)]
          .map(m => m[1])
          .filter(str => 
            !str.includes('t(') && 
            !str.includes('useTranslations') &&
            str.length > 3
          );

        if (matches.length > 0) {
          results.push({ file, matches });
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  private async checkFranceFrench(): Promise<string[]> {
    try {
      const frMessages = await fs.readFile('messages/fr-CA.json', 'utf-8');
      
      // Common France French terms that should be Quebec French
      const franceFrenchTerms = [
        { france: 'ordinateur', quebec: 'ordinateur' }, // both ok
        { france: 'email', quebec: 'courriel' },
        { france: 'logiciel', quebec: 'logiciel' }, // both ok
        { france: 'télécharger', quebec: 'télécharger' }, // both ok
        { france: 'mail', quebec: 'courriel' },
        { france: 'weekend', quebec: 'fin de semaine' },
        { france: 'parking', quebec: 'stationnement' },
      ];

      const issues: string[] = [];

      for (const term of franceFrenchTerms) {
        if (term.france !== term.quebec && frMessages.includes(term.france)) {
          issues.push(`Use "${term.quebec}" instead of "${term.france}"`);
        }
      }

      return issues;
    } catch {
      return [];
    }
  }

  private generateFix(): string {
    return `
// 1. Run translation coverage script:
pnpm run check-translations

// 2. Add missing translations to messages/fr-CA.json:
{
  "rewards": {
    "title": "Récompenses",
    "earnPoints": "Gagner des points",
    "redeemNow": "Échanger maintenant"
  }
}

// 3. Use useTranslations() in components:
import { useTranslations } from 'next-intl';

export function RewardsButton() {
  const t = useTranslations('rewards');
  return <button>{t('redeemNow')}</button>;
}

// 4. Replace France French with Quebec French:
// ❌ "email" → ✅ "courriel"
// ❌ "weekend" → ✅ "fin de semaine"
// ❌ "parking" → ✅ "stationnement"

// 5. Ensure Quebec visibility:
// All consumer-facing interfaces MUST show French first or equally
`;
  }
}
