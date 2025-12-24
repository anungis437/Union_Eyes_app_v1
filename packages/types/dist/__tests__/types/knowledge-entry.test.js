/**
 * @fileoverview KnowledgeEntry Type Tests
 * Testing knowledge management type definitions
 */
describe('KnowledgeEntry Type Tests', () => {
    describe('KnowledgeEntry Interface Validation', () => {
        it('should validate KnowledgeEntry interface structure', () => {
            const mockKnowledgeEntry = {
                id: 'knowledge-123',
                title: 'Contract Law Precedent Analysis',
                content: 'Detailed analysis of recent contract law precedents affecting commercial transactions...',
                entry_type: 'Legal Principle',
                tags: ['contract', 'commercial', 'precedent', 'analysis'],
                legal_topics: ['Contract Law', 'Commercial Transactions', 'Precedent Analysis'],
                source_document_ids: ['doc-456', 'doc-789'],
                source_query_ids: ['query-101', 'query-202'],
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-20T14:45:00Z',
            };
            // Validate required properties
            expect(mockKnowledgeEntry.id).toBeDefined();
            expect(mockKnowledgeEntry.title).toBeTruthy();
            expect(mockKnowledgeEntry.content).toBeTruthy();
            expect(mockKnowledgeEntry.entry_type).toBeDefined();
            expect(Array.isArray(mockKnowledgeEntry.tags)).toBe(true);
            expect(Array.isArray(mockKnowledgeEntry.legal_topics)).toBe(true);
            expect(Array.isArray(mockKnowledgeEntry.source_document_ids)).toBe(true);
            expect(Array.isArray(mockKnowledgeEntry.source_query_ids)).toBe(true);
            expect(mockKnowledgeEntry.created_at).toBeTruthy();
            expect(mockKnowledgeEntry.updated_at).toBeTruthy();
        });
        it('should validate entry_type union type values', () => {
            const validEntryTypes = [
                'Legal Principle',
                'Case Strategy',
                'Research Note',
                'Other',
            ];
            validEntryTypes.forEach(entryType => {
                const mockEntry = {
                    id: 'test-id',
                    title: 'Test Title',
                    content: 'Test content',
                    entry_type: entryType,
                    tags: [],
                    legal_topics: [],
                    source_document_ids: [],
                    source_query_ids: [],
                    created_at: '2024-01-15T10:30:00Z',
                    updated_at: '2024-01-15T10:30:00Z',
                };
                expect(mockEntry.entry_type).toBe(entryType);
            });
        });
        it('should validate Legal Principle entry type', () => {
            const legalPrincipleEntry = {
                id: 'legal-principle-001',
                title: 'Doctrine of Consideration in Contract Formation',
                content: 'The doctrine of consideration requires that both parties provide something of value in a contract...',
                entry_type: 'Legal Principle',
                tags: ['consideration', 'contract', 'formation', 'doctrine'],
                legal_topics: ['Contract Law', 'Legal Principles', 'Contract Formation'],
                source_document_ids: ['case-smith-v-jones', 'statute-contract-act'],
                source_query_ids: ['query-consideration-doctrine'],
                created_at: '2024-01-10T09:00:00Z',
                updated_at: '2024-01-10T09:00:00Z',
            };
            expect(legalPrincipleEntry.entry_type).toBe('Legal Principle');
            expect(legalPrincipleEntry.legal_topics).toContain('Contract Law');
            expect(legalPrincipleEntry.tags).toContain('consideration');
            expect(legalPrincipleEntry.source_document_ids).toHaveLength(2);
        });
        it('should validate Case Strategy entry type', () => {
            const caseStrategyEntry = {
                id: 'strategy-001',
                title: 'Employment Termination Defense Strategy',
                content: 'When defending wrongful termination claims, focus on documented performance issues and establish a clear defense strategy...',
                entry_type: 'Case Strategy',
                tags: ['employment', 'termination', 'defense', 'strategy'],
                legal_topics: ['Employment Law', 'Termination', 'Litigation Strategy'],
                source_document_ids: ['precedent-employment-cases'],
                source_query_ids: ['query-termination-defense'],
                created_at: '2024-01-12T11:15:00Z',
                updated_at: '2024-01-12T11:15:00Z',
            };
            expect(caseStrategyEntry.entry_type).toBe('Case Strategy');
            expect(caseStrategyEntry.legal_topics).toContain('Employment Law');
            expect(caseStrategyEntry.tags).toContain('strategy');
            expect(caseStrategyEntry.content).toContain('strategy');
        });
        it('should validate Research Note entry type', () => {
            const researchNoteEntry = {
                id: 'research-note-001',
                title: 'Recent Changes to Family Law Regulations',
                content: 'Research findings on the 2024 amendments to family law regulations affecting custody arrangements...',
                entry_type: 'Research Note',
                tags: ['family-law', 'regulations', '2024', 'custody', 'amendments'],
                legal_topics: ['Family Law', 'Child Custody', 'Regulatory Changes'],
                source_document_ids: ['regulation-2024-fl-amendments', 'government-notice-custody'],
                source_query_ids: ['query-family-law-changes', 'query-custody-2024'],
                created_at: '2024-01-18T16:20:00Z',
                updated_at: '2024-01-19T10:30:00Z',
            };
            expect(researchNoteEntry.entry_type).toBe('Research Note');
            expect(researchNoteEntry.legal_topics).toContain('Family Law');
            expect(researchNoteEntry.tags).toContain('2024');
            expect(researchNoteEntry.source_query_ids).toHaveLength(2);
        });
        it('should validate Other entry type', () => {
            const otherEntry = {
                id: 'other-001',
                title: 'Court Filing Checklist for Commercial Disputes',
                content: 'Comprehensive checklist for filing commercial dispute cases in Ontario Superior Court...',
                entry_type: 'Other',
                tags: ['checklist', 'filing', 'commercial', 'ontario', 'superior-court'],
                legal_topics: ['Civil Procedure', 'Commercial Litigation', 'Court Filing'],
                source_document_ids: ['rules-of-civil-procedure', 'superior-court-guidelines'],
                source_query_ids: ['query-filing-requirements'],
                created_at: '2024-01-05T08:45:00Z',
                updated_at: '2024-01-05T08:45:00Z',
            };
            expect(otherEntry.entry_type).toBe('Other');
            expect(otherEntry.legal_topics).toContain('Civil Procedure');
            expect(otherEntry.tags).toContain('checklist');
            expect(otherEntry.content).toContain('checklist');
        });
    });
    describe('Array Property Validation', () => {
        it('should handle empty arrays properly', () => {
            const entryWithEmptyArrays = {
                id: 'empty-arrays-001',
                title: 'Test Entry with Empty Arrays',
                content: 'This entry has empty arrays for testing purposes',
                entry_type: 'Other',
                tags: [],
                legal_topics: [],
                source_document_ids: [],
                source_query_ids: [],
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
            };
            expect(Array.isArray(entryWithEmptyArrays.tags)).toBe(true);
            expect(entryWithEmptyArrays.tags).toHaveLength(0);
            expect(Array.isArray(entryWithEmptyArrays.legal_topics)).toBe(true);
            expect(entryWithEmptyArrays.legal_topics).toHaveLength(0);
            expect(Array.isArray(entryWithEmptyArrays.source_document_ids)).toBe(true);
            expect(entryWithEmptyArrays.source_document_ids).toHaveLength(0);
            expect(Array.isArray(entryWithEmptyArrays.source_query_ids)).toBe(true);
            expect(entryWithEmptyArrays.source_query_ids).toHaveLength(0);
        });
        it('should handle populated arrays properly', () => {
            const entryWithPopulatedArrays = {
                id: 'populated-arrays-001',
                title: 'Entry with Multiple Array Items',
                content: 'This entry demonstrates multiple items in each array property',
                entry_type: 'Legal Principle',
                tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
                legal_topics: ['Topic A', 'Topic B', 'Topic C'],
                source_document_ids: ['doc1', 'doc2', 'doc3', 'doc4'],
                source_query_ids: ['query1', 'query2'],
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
            };
            expect(entryWithPopulatedArrays.tags).toHaveLength(5);
            expect(entryWithPopulatedArrays.legal_topics).toHaveLength(3);
            expect(entryWithPopulatedArrays.source_document_ids).toHaveLength(4);
            expect(entryWithPopulatedArrays.source_query_ids).toHaveLength(2);
            // Validate array content types
            entryWithPopulatedArrays.tags.forEach(tag => {
                expect(typeof tag).toBe('string');
            });
            entryWithPopulatedArrays.legal_topics.forEach(topic => {
                expect(typeof topic).toBe('string');
            });
            entryWithPopulatedArrays.source_document_ids.forEach(docId => {
                expect(typeof docId).toBe('string');
            });
            entryWithPopulatedArrays.source_query_ids.forEach(queryId => {
                expect(typeof queryId).toBe('string');
            });
        });
    });
    describe('Date String Validation', () => {
        it('should handle ISO date strings', () => {
            const entryWithIsoDates = {
                id: 'iso-dates-001',
                title: 'Entry with ISO Date Strings',
                content: 'Testing ISO 8601 date string format',
                entry_type: 'Research Note',
                tags: ['testing', 'dates'],
                legal_topics: ['Testing'],
                source_document_ids: [],
                source_query_ids: [],
                created_at: '2024-01-15T10:30:00.000Z',
                updated_at: '2024-01-20T14:45:30.123Z',
            };
            expect(entryWithIsoDates.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            expect(entryWithIsoDates.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            // Validate they can be parsed as dates
            const createdDate = new Date(entryWithIsoDates.created_at);
            const updatedDate = new Date(entryWithIsoDates.updated_at);
            expect(createdDate).toBeInstanceOf(Date);
            expect(updatedDate).toBeInstanceOf(Date);
            expect(updatedDate.getTime()).toBeGreaterThan(createdDate.getTime());
        });
        it('should handle simple date strings', () => {
            const entryWithSimpleDates = {
                id: 'simple-dates-001',
                title: 'Entry with Simple Date Format',
                content: 'Testing simple date string format',
                entry_type: 'Case Strategy',
                tags: ['testing'],
                legal_topics: ['Testing'],
                source_document_ids: [],
                source_query_ids: [],
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
            };
            expect(typeof entryWithSimpleDates.created_at).toBe('string');
            expect(typeof entryWithSimpleDates.updated_at).toBe('string');
            expect(entryWithSimpleDates.created_at).toBeTruthy();
            expect(entryWithSimpleDates.updated_at).toBeTruthy();
        });
    });
    describe('Content Validation', () => {
        it('should handle various content lengths', () => {
            const shortContentEntry = {
                id: 'short-content',
                title: 'Brief Note',
                content: 'Short content.',
                entry_type: 'Other',
                tags: ['brief'],
                legal_topics: ['Testing'],
                source_document_ids: [],
                source_query_ids: [],
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
            };
            const longContentEntry = {
                id: 'long-content',
                title: 'Comprehensive Analysis',
                content: 'This is a very long content entry that contains detailed analysis, multiple paragraphs, and extensive information about legal principles, case law, statutory interpretation, and practical considerations for legal practitioners. It demonstrates that the content field can handle substantial amounts of text without any issues. The content includes references to various legal authorities, procedural requirements, and strategic considerations that would be valuable for legal research and case preparation.',
                entry_type: 'Legal Principle',
                tags: ['comprehensive', 'detailed', 'analysis'],
                legal_topics: ['Legal Research', 'Case Law', 'Statutory Interpretation'],
                source_document_ids: ['comprehensive-case-study'],
                source_query_ids: ['detailed-analysis-query'],
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
            };
            expect(shortContentEntry.content.length).toBeGreaterThan(0);
            expect(longContentEntry.content.length).toBeGreaterThan(100);
            expect(typeof shortContentEntry.content).toBe('string');
            expect(typeof longContentEntry.content).toBe('string');
        });
        it('should handle special characters in content', () => {
            const specialCharEntry = {
                id: 'special-chars',
                title: 'Entry with Special Characters',
                content: 'Content with special characters: §, ©, ®, ™, €, £, ¥, "smart quotes", apostrophes, em-dashes, and legal symbols like § 123(a)(1).',
                entry_type: 'Research Note',
                tags: ['special-characters', 'formatting'],
                legal_topics: ['Legal Writing', 'Formatting'],
                source_document_ids: [],
                source_query_ids: [],
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
            };
            expect(specialCharEntry.content).toContain('§');
            expect(specialCharEntry.content).toContain('©');
            expect(specialCharEntry.content).toContain('"');
            expect(specialCharEntry.content).toContain('apostrophes');
            expect(specialCharEntry.content).toContain('em-dashes');
            expect(typeof specialCharEntry.content).toBe('string');
        });
    });
    describe('Type Safety Validation', () => {
        it('should enforce type safety for entry_type', () => {
            const validEntry = {
                id: 'type-safety-test',
                title: 'Type Safety Test',
                content: 'Testing type safety',
                entry_type: 'Legal Principle', // Valid type
                tags: [],
                legal_topics: [],
                source_document_ids: [],
                source_query_ids: [],
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
            };
            expect(validEntry.entry_type).toBe('Legal Principle');
            // The following would cause TypeScript compilation errors:
            // entry_type: 'Invalid Type' // TypeScript error
            // entry_type: 123 // TypeScript error
            // entry_type: null // TypeScript error
        });
        it('should enforce array types for array properties', () => {
            const typedArrayEntry = {
                id: 'typed-arrays',
                title: 'Typed Arrays Test',
                content: 'Testing array type enforcement',
                entry_type: 'Other',
                tags: ['string', 'array'], // Must be string[]
                legal_topics: ['Legal Topic'], // Must be string[]
                source_document_ids: ['doc-id'], // Must be string[]
                source_query_ids: ['query-id'], // Must be string[]
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
            };
            expect(Array.isArray(typedArrayEntry.tags)).toBe(true);
            expect(Array.isArray(typedArrayEntry.legal_topics)).toBe(true);
            expect(Array.isArray(typedArrayEntry.source_document_ids)).toBe(true);
            expect(Array.isArray(typedArrayEntry.source_query_ids)).toBe(true);
            // The following would cause TypeScript compilation errors:
            // tags: 'not an array' // TypeScript error
            // tags: [123, 456] // TypeScript error - not string[]
            // legal_topics: null // TypeScript error
        });
    });
    describe('Real-world Knowledge Entry Examples', () => {
        it('should validate a real legal principle entry', () => {
            const legalPrincipleExample = {
                id: 'principle-reasonable-notice',
                title: 'Reasonable Notice in Employment Termination',
                content: 'In Canadian employment law, employees are entitled to reasonable notice of termination unless terminated for just cause. The period of reasonable notice is determined by factors including length of service, age, position, and availability of similar employment. The Bardal factors, established in Bardal v. Globe & Mail Ltd., provide the framework for determining reasonable notice periods.',
                entry_type: 'Legal Principle',
                tags: ['employment', 'termination', 'reasonable-notice', 'bardal-factors', 'canadian-law'],
                legal_topics: ['Employment Law', 'Termination Law', 'Notice Periods', 'Canadian Jurisprudence'],
                source_document_ids: ['bardal-v-globe-mail', 'employment-standards-act-on', 'common-law-notice-cases'],
                source_query_ids: ['reasonable-notice-calculation', 'bardal-factors-analysis'],
                created_at: '2024-01-10T09:00:00Z',
                updated_at: '2024-01-15T14:30:00Z',
            };
            expect(legalPrincipleExample.entry_type).toBe('Legal Principle');
            expect(legalPrincipleExample.legal_topics).toContain('Employment Law');
            expect(legalPrincipleExample.tags).toContain('bardal-factors');
            expect(legalPrincipleExample.content).toContain('Bardal');
            expect(legalPrincipleExample.source_document_ids).toContain('bardal-v-globe-mail');
        });
        it('should validate a real case strategy entry', () => {
            const caseStrategyExample = {
                id: 'strategy-contract-breach',
                title: 'Contract Breach Litigation Strategy',
                content: 'When pursuing a breach of contract claim, establish: (1) existence of valid contract, (2) performance by plaintiff, (3) breach by defendant, (4) damages flowing from breach. Focus on documentary evidence of contract terms, correspondence showing breach, and quantifiable damages. Consider mitigation arguments from defendant.',
                entry_type: 'Case Strategy',
                tags: ['contract', 'breach', 'litigation', 'damages', 'evidence', 'strategy'],
                legal_topics: ['Contract Law', 'Litigation Strategy', 'Evidence Law', 'Damages'],
                source_document_ids: ['contract-law-textbook', 'breach-precedents', 'damages-calculation-guide'],
                source_query_ids: ['contract-breach-elements', 'damages-quantification'],
                created_at: '2024-01-12T11:15:00Z',
                updated_at: '2024-01-18T16:45:00Z',
            };
            expect(caseStrategyExample.entry_type).toBe('Case Strategy');
            expect(caseStrategyExample.legal_topics).toContain('Litigation Strategy');
            expect(caseStrategyExample.tags).toContain('strategy');
            expect(caseStrategyExample.content).toContain('establish');
            expect(caseStrategyExample.source_document_ids).toContain('breach-precedents');
        });
    });
});
export {};
//# sourceMappingURL=knowledge-entry.test.js.map