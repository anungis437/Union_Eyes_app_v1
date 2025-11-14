import { z } from 'zod';
/**
 * AI Query schema - represents a user query and AI response
 */
export declare const AiQuerySchema: z.ZodObject<{
    id: z.ZodString;
    organization_id: z.ZodString;
    user_id: z.ZodString;
    query_text: z.ZodString;
    query_hash: z.ZodString;
    filters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    answer: z.ZodNullable<z.ZodString>;
    sources: z.ZodDefault<z.ZodArray<z.ZodUnknown, "many">>;
    status: z.ZodEnum<["pending", "success", "error"]>;
    latency_ms: z.ZodNullable<z.ZodNumber>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    organization_id: string;
    status: "pending" | "success" | "error";
    created_at: string;
    user_id: string;
    query_text: string;
    query_hash: string;
    filters: Record<string, unknown>;
    answer: string | null;
    sources: unknown[];
    latency_ms: number | null;
}, {
    id: string;
    organization_id: string;
    status: "pending" | "success" | "error";
    created_at: string;
    user_id: string;
    query_text: string;
    query_hash: string;
    answer: string | null;
    latency_ms: number | null;
    filters?: Record<string, unknown> | undefined;
    sources?: unknown[] | undefined;
}>;
export type AiQuery = z.infer<typeof AiQuerySchema>;
/**
 * AI Source - reference to a document that supports the answer
 */
export declare const AiSourceSchema: z.ZodObject<{
    document_id: z.ZodString;
    chunk_id: z.ZodString;
    title: z.ZodString;
    snippet: z.ZodString;
    relevance_score: z.ZodNumber;
    case_id: z.ZodOptional<z.ZodString>;
    citation: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    document_id: string;
    chunk_id: string;
    snippet: string;
    relevance_score: number;
    case_id?: string | undefined;
    citation?: string | undefined;
}, {
    title: string;
    document_id: string;
    chunk_id: string;
    snippet: string;
    relevance_score: number;
    case_id?: string | undefined;
    citation?: string | undefined;
}>;
export type AiSource = z.infer<typeof AiSourceSchema>;
/**
 * AI Answer - complete response with citations
 */
export declare const AiAnswerSchema: z.ZodObject<{
    answer: z.ZodString;
    sources: z.ZodArray<z.ZodObject<{
        document_id: z.ZodString;
        chunk_id: z.ZodString;
        title: z.ZodString;
        snippet: z.ZodString;
        relevance_score: z.ZodNumber;
        case_id: z.ZodOptional<z.ZodString>;
        citation: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        document_id: string;
        chunk_id: string;
        snippet: string;
        relevance_score: number;
        case_id?: string | undefined;
        citation?: string | undefined;
    }, {
        title: string;
        document_id: string;
        chunk_id: string;
        snippet: string;
        relevance_score: number;
        case_id?: string | undefined;
        citation?: string | undefined;
    }>, "many">;
    confidence: z.ZodEnum<["high", "medium", "low"]>;
    filters_applied: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    answer: string;
    sources: {
        title: string;
        document_id: string;
        chunk_id: string;
        snippet: string;
        relevance_score: number;
        case_id?: string | undefined;
        citation?: string | undefined;
    }[];
    confidence: "high" | "medium" | "low";
    filters_applied?: Record<string, unknown> | undefined;
}, {
    answer: string;
    sources: {
        title: string;
        document_id: string;
        chunk_id: string;
        snippet: string;
        relevance_score: number;
        case_id?: string | undefined;
        citation?: string | undefined;
    }[];
    confidence: "high" | "medium" | "low";
    filters_applied?: Record<string, unknown> | undefined;
}>;
export type AiAnswer = z.infer<typeof AiAnswerSchema>;
/**
 * Search request from user
 */
export declare const SearchRequestSchema: z.ZodObject<{
    query: z.ZodString;
    filters: z.ZodOptional<z.ZodObject<{
        employer: z.ZodOptional<z.ZodString>;
        arbitrator: z.ZodOptional<z.ZodString>;
        date_range: z.ZodOptional<z.ZodObject<{
            start: z.ZodOptional<z.ZodString>;
            end: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            start?: string | undefined;
            end?: string | undefined;
        }, {
            start?: string | undefined;
            end?: string | undefined;
        }>>;
        issue_type: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        employer?: string | undefined;
        arbitrator?: string | undefined;
        date_range?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        issue_type?: string | undefined;
    }, {
        employer?: string | undefined;
        arbitrator?: string | undefined;
        date_range?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        issue_type?: string | undefined;
    }>>;
    max_sources: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    max_sources: number;
    filters?: {
        employer?: string | undefined;
        arbitrator?: string | undefined;
        date_range?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        issue_type?: string | undefined;
    } | undefined;
}, {
    query: string;
    filters?: {
        employer?: string | undefined;
        arbitrator?: string | undefined;
        date_range?: {
            start?: string | undefined;
            end?: string | undefined;
        } | undefined;
        issue_type?: string | undefined;
    } | undefined;
    max_sources?: number | undefined;
}>;
export type SearchRequest = z.infer<typeof SearchRequestSchema>;
/**
 * AI Feedback schema
 */
export declare const AiFeedbackSchema: z.ZodObject<{
    id: z.ZodString;
    query_id: z.ZodString;
    organization_id: z.ZodString;
    user_id: z.ZodString;
    rating: z.ZodEnum<["good", "bad"]>;
    comment: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    organization_id: string;
    created_at: string;
    user_id: string;
    query_id: string;
    rating: "good" | "bad";
    comment: string | null;
}, {
    id: string;
    organization_id: string;
    created_at: string;
    user_id: string;
    query_id: string;
    rating: "good" | "bad";
    comment: string | null;
}>;
export type AiFeedback = z.infer<typeof AiFeedbackSchema>;
/**
 * Feedback submission
 */
export declare const FeedbackSubmissionSchema: z.ZodObject<{
    query_id: z.ZodString;
    rating: z.ZodEnum<["good", "bad"]>;
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    query_id: string;
    rating: "good" | "bad";
    comment?: string | undefined;
}, {
    query_id: string;
    rating: "good" | "bad";
    comment?: string | undefined;
}>;
export type FeedbackSubmission = z.infer<typeof FeedbackSubmissionSchema>;
//# sourceMappingURL=query.d.ts.map