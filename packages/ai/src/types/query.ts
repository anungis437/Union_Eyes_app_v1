import { z } from 'zod';

/**
 * AI Query schema - represents a user query and AI response
 */
export const AiQuerySchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  user_id: z.string(),
  query_text: z.string(),
  query_hash: z.string(),
  filters: z.record(z.unknown()).default({}),
  answer: z.string().nullable(),
  sources: z.array(z.unknown()).default([]),
  status: z.enum(['pending', 'success', 'error']),
  latency_ms: z.number().int().nullable(),
  created_at: z.string().datetime(),
});

export type AiQuery = z.infer<typeof AiQuerySchema>;

/**
 * AI Source - reference to a document that supports the answer
 */
export const AiSourceSchema = z.object({
  document_id: z.string().uuid(),
  chunk_id: z.string().uuid(),
  title: z.string(),
  snippet: z.string(),
  relevance_score: z.number().min(0).max(1),
  case_id: z.string().optional(),
  citation: z.string().optional(),
});

export type AiSource = z.infer<typeof AiSourceSchema>;

/**
 * AI Answer - complete response with citations
 */
export const AiAnswerSchema = z.object({
  answer: z.string(),
  sources: z.array(AiSourceSchema),
  confidence: z.enum(['high', 'medium', 'low']),
  filters_applied: z.record(z.unknown()).optional(),
});

export type AiAnswer = z.infer<typeof AiAnswerSchema>;

/**
 * Search request from user
 */
export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  filters: z.object({
    employer: z.string().optional(),
    arbitrator: z.string().optional(),
    date_range: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    }).optional(),
    issue_type: z.string().optional(),
  }).optional(),
  max_sources: z.number().int().min(1).max(20).default(5),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

/**
 * AI Feedback schema
 */
export const AiFeedbackSchema = z.object({
  id: z.string().uuid(),
  query_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  user_id: z.string(),
  rating: z.enum(['good', 'bad']),
  comment: z.string().nullable(),
  created_at: z.string().datetime(),
});

export type AiFeedback = z.infer<typeof AiFeedbackSchema>;

/**
 * Feedback submission
 */
export const FeedbackSubmissionSchema = z.object({
  query_id: z.string().uuid(),
  rating: z.enum(['good', 'bad']),
  comment: z.string().max(1000).optional(),
});

export type FeedbackSubmission = z.infer<typeof FeedbackSubmissionSchema>;
