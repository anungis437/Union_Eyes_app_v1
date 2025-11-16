import { aiOrchestrator } from '../core/orchestrator';
import logger from '../utils/logger';
import pdfParse from 'pdf-parse';
import { z } from 'zod';

/**
 * Document Analysis Types
 */
export interface DocumentAnalysisResult {
  summary: string;
  keyPoints: string[];
  entities: {
    people: string[];
    organizations: string[];
    dates: string[];
    amounts: string[];
  };
  sentiment: 'positive' | 'negative' | 'neutral';
  category: string;
  legalIssues: string[];
  suggestedActions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

export interface ContractAnalysisResult {
  clauses: Array<{
    type: string;
    text: string;
    page: number;
    riskLevel: 'low' | 'medium' | 'high';
    concerns: string[];
  }>;
  missingClauses: string[];
  recommendations: string[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Legal Document Analysis Engine
 * Powered by advanced AI models for legal text understanding
 */
export class DocumentAnalysisEngine {
  /**
   * Analyze general legal document
   */
  async analyzeDocument(
    documentText: string,
    documentType?: string
  ): Promise<DocumentAnalysisResult> {
    try {
      logger.info('Starting document analysis', {
        textLength: documentText.length,
        documentType,
      });

      const systemPrompt = `You are an expert legal analyst specializing in labor law and union matters. 
Analyze the following document and provide structured insights.`;

      const userPrompt = `Analyze this ${documentType || 'legal'} document:

${documentText}

Provide a comprehensive analysis in JSON format with:
1. summary: A concise 2-3 sentence summary
2. keyPoints: Array of 5-10 key points
3. entities: Extract people, organizations, dates, and monetary amounts
4. sentiment: Overall sentiment (positive/negative/neutral)
5. category: Document category (grievance, contract, memo, etc.)
6. legalIssues: Array of identified legal issues
7. suggestedActions: Array of recommended next steps
8. riskLevel: Overall risk assessment (low/medium/high/critical)
9. confidence: Confidence score (0-1)

Respond ONLY with valid JSON.`;

      const response = await aiOrchestrator.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3, // Lower temperature for consistency
          maxTokens: 2000,
        }
      );

      // Parse JSON response
      const analysis = JSON.parse(response.content);

      logger.info('Document analysis complete', {
        riskLevel: analysis.riskLevel,
        confidence: analysis.confidence,
        tokensUsed: response.tokensUsed,
      });

      return analysis;
    } catch (error) {
      logger.error('Document analysis failed', { error });
      throw new Error('Failed to analyze document');
    }
  }

  /**
   * Analyze contract clauses
   */
  async analyzeContract(contractText: string): Promise<ContractAnalysisResult> {
    try {
      logger.info('Starting contract analysis', {
        textLength: contractText.length,
      });

      const systemPrompt = `You are an expert contract lawyer specializing in employment and labor contracts.
Analyze contracts for risks, missing clauses, and provide recommendations.`;

      const userPrompt = `Analyze this employment/labor contract:

${contractText}

Provide a comprehensive analysis in JSON format with:
1. clauses: Array of important clauses with:
   - type: Clause type (termination, compensation, non-compete, etc.)
   - text: Relevant excerpt
   - page: Page number (estimate if unknown)
   - riskLevel: Risk level (low/medium/high)
   - concerns: Array of specific concerns
2. missingClauses: Array of important missing clauses
3. recommendations: Array of recommended changes or additions
4. overallRisk: Overall contract risk (low/medium/high/critical)

Respond ONLY with valid JSON.`;

      const response = await aiOrchestrator.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.2, // Very low for legal consistency
          maxTokens: 3000,
        }
      );

      const analysis = JSON.parse(response.content);

      logger.info('Contract analysis complete', {
        clausesFound: analysis.clauses.length,
        overallRisk: analysis.overallRisk,
        tokensUsed: response.tokensUsed,
      });

      return analysis;
    } catch (error) {
      logger.error('Contract analysis failed', { error });
      throw new Error('Failed to analyze contract');
    }
  }

  /**
   * Extract text from PDF
   */
  async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(pdfBuffer);
      return data.text;
    } catch (error) {
      logger.error('PDF text extraction failed', { error });
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Summarize long document with context preservation
   */
  async summarizeDocument(
    documentText: string,
    maxLength: number = 500
  ): Promise<string> {
    try {
      const systemPrompt = `You are an expert at summarizing legal documents while preserving key information.`;

      const userPrompt = `Summarize this document in approximately ${maxLength} words, preserving all critical legal points:

${documentText}`;

      const response = await aiOrchestrator.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3,
          maxTokens: Math.ceil(maxLength * 1.5),
        }
      );

      return response.content;
    } catch (error) {
      logger.error('Document summarization failed', { error });
      throw new Error('Failed to summarize document');
    }
  }

  /**
   * Compare two documents
   */
  async compareDocuments(
    document1: string,
    document2: string,
    comparisonType: 'differences' | 'similarities' | 'both' = 'both'
  ): Promise<{
    differences: string[];
    similarities: string[];
    summary: string;
  }> {
    try {
      logger.info('Comparing documents', { comparisonType });

      const systemPrompt = `You are an expert at comparing legal documents and identifying key differences and similarities.`;

      const userPrompt = `Compare these two documents and identify ${comparisonType}:

DOCUMENT 1:
${document1}

DOCUMENT 2:
${document2}

Provide analysis in JSON format with:
1. differences: Array of key differences
2. similarities: Array of key similarities
3. summary: Brief comparison summary

Respond ONLY with valid JSON.`;

      const response = await aiOrchestrator.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 2000,
        }
      );

      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Document comparison failed', { error });
      throw new Error('Failed to compare documents');
    }
  }

  /**
   * Extract specific information using natural language query
   */
  async extractInformation(
    documentText: string,
    query: string
  ): Promise<string> {
    try {
      const systemPrompt = `You are an expert at extracting specific information from legal documents.
Provide accurate, concise answers based only on the document content.`;

      const userPrompt = `Document:
${documentText}

Question: ${query}

Provide a clear, accurate answer based on the document. If the information is not in the document, say "Information not found in document."`;

      const response = await aiOrchestrator.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.1, // Very low for factual extraction
          maxTokens: 500,
        }
      );

      return response.content;
    } catch (error) {
      logger.error('Information extraction failed', { error });
      throw new Error('Failed to extract information');
    }
  }

  /**
   * Identify legal precedents relevant to document
   */
  async findRelevantPrecedents(
    documentText: string,
    topK: number = 5
  ): Promise<
    Array<{
      caseId: string;
      caseName: string;
      relevance: number;
      summary: string;
    }>
  > {
    try {
      logger.info('Searching for relevant precedents');

      // Search vector database for similar cases
      const similarDocs = await aiOrchestrator.searchSimilarDocuments(
        documentText,
        topK,
        { documentType: 'precedent' }
      );

      // Enhance results with AI analysis
      const precedents = await Promise.all(
        similarDocs.map(async (doc) => ({
          caseId: doc.id,
          caseName: doc.metadata.caseName || 'Unknown',
          relevance: doc.score,
          summary: doc.metadata.summary || '',
        }))
      );

      return precedents;
    } catch (error) {
      logger.error('Precedent search failed', { error });
      throw new Error('Failed to find relevant precedents');
    }
  }
}

// Singleton instance
export const documentAnalysisEngine = new DocumentAnalysisEngine();
