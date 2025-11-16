import { aiOrchestrator } from '../core/orchestrator';
import logger from '../utils/logger';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

/**
 * Natural Language Query Engine
 * Converts natural language questions into database queries and provides answers
 */
export class NLQueryEngine {
  private supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

  /**
   * Process natural language query
   */
  async query(
    question: string,
    tenantId: string,
    context?: Record<string, any>
  ): Promise<{
    answer: string;
    data?: any;
    sql?: string;
    confidence: number;
    sources: string[];
  }> {
    try {
      logger.info('Processing NL query', { question, tenantId });

      // Step 1: Understand intent
      const intent = await this.classifyIntent(question);

      // Step 2: Generate SQL or direct answer
      if (intent.requiresData) {
        return await this.answerWithData(question, tenantId, context);
      } else {
        return await this.answerDirect(question, context);
      }
    } catch (error) {
      logger.error('NL query failed', { error });
      throw new Error('Failed to process natural language query');
    }
  }

  /**
   * Classify query intent
   */
  private async classifyIntent(question: string): Promise<{
    type: 'analytical' | 'informational' | 'procedural';
    requiresData: boolean;
    entities: string[];
  }> {
    const systemPrompt = `You are an expert at classifying user queries and determining data requirements.`;

    const userPrompt = `Classify this question:

"${question}"

Provide classification in JSON format with:
1. type: analytical (data analysis), informational (general info), or procedural (how-to)
2. requiresData: true if requires database query, false otherwise
3. entities: Array of entities mentioned (claims, members, deadlines, etc.)

Respond ONLY with valid JSON.`;

    const response = await aiOrchestrator.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.2,
        maxTokens: 300,
      }
    );

    return JSON.parse(response.content);
  }

  /**
   * Answer question using database data
   */
  private async answerWithData(
    question: string,
    tenantId: string,
    context?: Record<string, any>
  ): Promise<{
    answer: string;
    data?: any;
    sql?: string;
    confidence: number;
    sources: string[];
  }> {
    // Generate SQL query from natural language
    const sqlQuery = await this.generateSQL(question, tenantId);

    logger.debug('Generated SQL', { sql: sqlQuery });

    // Execute query
    const { data, error } = await this.supabase.rpc('execute_dynamic_query', {
      query: sqlQuery,
      tenant_id: tenantId,
    });

    if (error) {
      logger.error('SQL execution failed', { error });
      throw new Error('Failed to execute query');
    }

    // Generate natural language answer from data
    const answer = await this.generateAnswerFromData(question, data);

    return {
      answer,
      data,
      sql: sqlQuery,
      confidence: 0.85,
      sources: ['database'],
    };
  }

  /**
   * Answer question directly without data
   */
  private async answerDirect(
    question: string,
    context?: Record<string, any>
  ): Promise<{
    answer: string;
    data?: any;
    sql?: string;
    confidence: number;
    sources: string[];
  }> {
    const systemPrompt = `You are an expert assistant for union management and labor law.
Provide accurate, helpful answers to procedural and informational questions.`;

    const contextStr = context ? `\n\nContext: ${JSON.stringify(context)}` : '';

    const userPrompt = `${question}${contextStr}`;

    const response = await aiOrchestrator.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.5,
        maxTokens: 800,
      }
    );

    return {
      answer: response.content,
      confidence: 0.75,
      sources: ['knowledge_base'],
    };
  }

  /**
   * Generate SQL from natural language
   */
  private async generateSQL(question: string, tenantId: string): Promise<string> {
    const systemPrompt = `You are an expert at converting natural language questions into PostgreSQL queries.

Available tables:
- claims (id, tenant_id, title, description, type, status, created_at, resolved_at, assigned_to)
- members (id, tenant_id, name, email, position, department, status)
- deadlines (id, tenant_id, claim_id, type, due_date, status)
- users (id, tenant_id, name, email, role)

IMPORTANT:
- Always filter by tenant_id = '${tenantId}'
- Use proper JOIN syntax
- Return only SELECT queries (no INSERT/UPDATE/DELETE)
- Use safe SQL practices`;

    const userPrompt = `Convert this question to SQL:

"${question}"

Respond with ONLY the SQL query, no explanation.`;

    const response = await aiOrchestrator.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.1,
        maxTokens: 500,
      }
    );

    // Clean up response
    let sql = response.content.trim();
    sql = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '');

    return sql;
  }

  /**
   * Generate natural language answer from data
   */
  private async generateAnswerFromData(
    question: string,
    data: any
  ): Promise<string> {
    const systemPrompt = `You are an expert at explaining data insights in clear, natural language.
Provide concise, accurate answers based on the data provided.`;

    const userPrompt = `Question: "${question}"

Data: ${JSON.stringify(data)}

Provide a clear, natural language answer based on this data.`;

    const response = await aiOrchestrator.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.4,
        maxTokens: 500,
      }
    );

    return response.content;
  }

  /**
   * Get suggested follow-up questions
   */
  async getSuggestedQuestions(
    currentQuestion: string,
    answer: string
  ): Promise<string[]> {
    const systemPrompt = `You are an expert at suggesting relevant follow-up questions.`;

    const userPrompt = `Based on this Q&A, suggest 3-5 relevant follow-up questions:

Question: ${currentQuestion}
Answer: ${answer}

Respond with JSON array of questions only.`;

    const response = await aiOrchestrator.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.6,
        maxTokens: 300,
      }
    );

    return JSON.parse(response.content);
  }

  /**
   * Generate report from natural language specification
   */
  async generateReport(
    specification: string,
    tenantId: string
  ): Promise<{
    title: string;
    sections: Array<{
      heading: string;
      content: string;
      data?: any;
    }>;
  }> {
    try {
      logger.info('Generating report from NL specification', { tenantId });

      const systemPrompt = `You are an expert at generating structured reports based on natural language specifications.`;

      const userPrompt = `Generate a report based on this specification:

"${specification}"

Tenant ID: ${tenantId}

Provide report structure in JSON format with:
1. title: Report title
2. sections: Array of sections with heading, content, and data queries

Respond ONLY with valid JSON.`;

      const response = await aiOrchestrator.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.4,
          maxTokens: 2000,
        }
      );

      const reportStructure = JSON.parse(response.content);

      // Execute data queries for each section
      for (const section of reportStructure.sections) {
        if (section.dataQuery) {
          const { data } = await this.supabase.rpc('execute_dynamic_query', {
            query: section.dataQuery,
            tenant_id: tenantId,
          });
          section.data = data;
        }
      }

      return reportStructure;
    } catch (error) {
      logger.error('Report generation failed', { error });
      throw new Error('Failed to generate report');
    }
  }

  /**
   * Explain complex query results
   */
  async explainResults(
    query: string,
    results: any,
    audience: 'technical' | 'non-technical' = 'non-technical'
  ): Promise<string> {
    const systemPrompt = `You are an expert at explaining data and query results to ${audience} audiences.`;

    const userPrompt = `Explain these query results:

Query: ${query}
Results: ${JSON.stringify(results)}

Provide a clear explanation suitable for a ${audience} audience.`;

    const response = await aiOrchestrator.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.5,
        maxTokens: 800,
      }
    );

    return response.content;
  }
}

// Singleton instance
export const nlQueryEngine = new NLQueryEngine();
