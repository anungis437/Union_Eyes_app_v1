export const APP_NAME = 'UnionEyes';
export const APP_VERSION = '1.0.0';

export const API_CONFIG = {
  BASE_URL: process.env.API_URL || 'https://api.unioneyes.com',
  TIMEOUT: parseInt(process.env.API_TIMEOUT || '30000', 10),
};

export const CLERK_CONFIG = {
  PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
};

export const COLORS = {
  primary: '#1e40af',
  secondary: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  background: '#F9FAFB',
  surface: '#ffffff',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const CLAIM_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const DOCUMENT_TYPES = {
  PDF: 'pdf',
  IMAGE: 'image',
  OTHER: 'other',
} as const;

export const NOTIFICATION_TYPES = {
  CLAIM: 'claim',
  DOCUMENT: 'document',
  SYSTEM: 'system',
} as const;

