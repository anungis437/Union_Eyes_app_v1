/**
 * Claims Form Validation with Zod
 * Comprehensive validation schemas for all claims-related forms
 */

import { z } from 'zod';

// Base schemas
export const claimTypeSchema = z.enum([
  'grievance',
  'safety',
  'leave',
  'overtime',
  'benefits',
  'discrimination',
  'harassment',
  'wage',
  'other',
]);

export const claimPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const claimStatusSchema = z.enum([
  'draft',
  'submitted',
  'pending',
  'under_review',
  'approved',
  'rejected',
  'appealed',
  'withdrawn',
  'closed',
]);

// Witness schema
export const witnessSchema = z.object({
  name: z
    .string()
    .min(2, 'Witness name must be at least 2 characters')
    .max(100, 'Witness name must be less than 100 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[\d\s\-+()]+$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  statement: z.string().max(1000, 'Statement must be less than 1000 characters').optional(),
});

// Document schema
export const documentUploadSchema = z.object({
  uri: z.string(),
  name: z.string().min(1, 'Document name is required'),
  type: z.string(),
  size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
});

// Create claim schema (multi-step form)
export const createClaimStepOneSchema = z.object({
  type: claimTypeSchema,
});

export const createClaimStepTwoSchema = z.object({
  incidentDate: z.date({
    required_error: 'Incident date is required',
    invalid_type_error: 'Invalid date',
  }),
  incidentTime: z.string().optional(),
  incidentLocation: z
    .string()
    .min(2, 'Location must be at least 2 characters')
    .max(200, 'Location must be less than 200 characters'),
});

export const createClaimStepThreeSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must be less than 5000 characters'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount seems unreasonably high')
    .optional(),
  department: z.string().max(100).optional(),
  shift: z.string().max(50).optional(),
});

export const createClaimStepFourSchema = z.object({
  witnesses: z.array(witnessSchema).max(10, 'Maximum 10 witnesses allowed').optional(),
});

export const createClaimStepFiveSchema = z.object({
  documents: z.array(documentUploadSchema).max(20, 'Maximum 20 documents allowed').optional(),
});

// Complete create claim schema
export const createClaimSchema = z.object({
  type: claimTypeSchema,
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must be less than 5000 characters'),
  incidentDate: z.date().optional(),
  incidentTime: z.string().optional(),
  incidentLocation: z.string().max(200, 'Location must be less than 200 characters').optional(),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount seems unreasonably high')
    .optional(),
  department: z.string().max(100).optional(),
  shift: z.string().max(50).optional(),
  priority: claimPrioritySchema.optional(),
  witnesses: z.array(witnessSchema).max(10, 'Maximum 10 witnesses allowed').optional(),
  documents: z.array(documentUploadSchema).max(20, 'Maximum 20 documents allowed').optional(),
  isDraft: z.boolean().optional(),
});

// Update claim schema
export const updateClaimSchema = createClaimSchema.partial();

// Comment schemas
export const addCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be less than 2000 characters'),
  mentions: z.array(z.string()).optional(),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be less than 2000 characters'),
});

// Claim action schemas
export const claimActionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'appeal', 'withdraw', 'close']),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

// Filter schema
export const claimFiltersSchema = z.object({
  status: z.array(claimStatusSchema).optional(),
  type: z.array(claimTypeSchema).optional(),
  priority: z.array(claimPrioritySchema).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  search: z.string().max(200).optional(),
  assignedToMe: z.boolean().optional(),
  submittedByMe: z.boolean().optional(),
  hasDrafts: z.boolean().optional(),
});

// Sort schema
export const claimSortSchema = z.object({
  field: z.enum(['createdAt', 'updatedAt', 'submittedAt', 'priority', 'status']),
  direction: z.enum(['asc', 'desc']),
});

// Export types from schemas
export type CreateClaimFormData = z.infer<typeof createClaimSchema>;
export type UpdateClaimFormData = z.infer<typeof updateClaimSchema>;
export type AddCommentFormData = z.infer<typeof addCommentSchema>;
export type UpdateCommentFormData = z.infer<typeof updateCommentSchema>;
export type ClaimActionFormData = z.infer<typeof claimActionSchema>;
export type ClaimFiltersFormData = z.infer<typeof claimFiltersSchema>;
export type WitnessFormData = z.infer<typeof witnessSchema>;

// Validation helper functions
export const validateClaimStep = (step: number, data: any): { success: boolean; errors?: any } => {
  try {
    switch (step) {
      case 0:
        createClaimStepOneSchema.parse(data);
        break;
      case 1:
        createClaimStepTwoSchema.parse(data);
        break;
      case 2:
        createClaimStepThreeSchema.parse(data);
        break;
      case 3:
        createClaimStepFourSchema.parse(data);
        break;
      case 4:
        createClaimStepFiveSchema.parse(data);
        break;
      default:
        return { success: false, errors: { message: 'Invalid step' } };
    }
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten().fieldErrors };
    }
    return { success: false, errors: { message: 'Validation failed' } };
  }
};

// Field-level validators for real-time validation
export const fieldValidators = {
  title: (value: string) => {
    if (value.length < 5) return 'Title must be at least 5 characters';
    if (value.length > 200) return 'Title must be less than 200 characters';
    return null;
  },
  description: (value: string) => {
    if (value.length < 20) return 'Description must be at least 20 characters';
    if (value.length > 5000) return 'Description must be less than 5000 characters';
    return null;
  },
  amount: (value: number) => {
    if (value <= 0) return 'Amount must be positive';
    if (value > 1000000) return 'Amount seems unreasonably high';
    return null;
  },
  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Invalid email address';
    return null;
  },
  phone: (value: string) => {
    const phoneRegex = /^[\d\s\-+()]+$/;
    if (!phoneRegex.test(value)) return 'Invalid phone number';
    return null;
  },
};
