/**
 * Comprehensive Claims Types for UnionEyes Mobile App
 * Supports offline-first architecture with complete type safety
 */

export type ClaimStatus =
  | 'draft'
  | 'submitted'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'appealed'
  | 'withdrawn'
  | 'closed';

export type ClaimType =
  | 'grievance'
  | 'safety'
  | 'leave'
  | 'overtime'
  | 'benefits'
  | 'discrimination'
  | 'harassment'
  | 'wage'
  | 'other';

export type ClaimPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ActivityType =
  | 'created'
  | 'updated'
  | 'submitted'
  | 'status_change'
  | 'comment'
  | 'document_upload'
  | 'assignee_change'
  | 'appeal'
  | 'withdrawn';

export interface ClaimDocument {
  id: string;
  claimId: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
  uploadedBy: string;
  status: 'pending' | 'uploaded' | 'failed';
  localUri?: string; // For offline support
}

export interface ClaimComment {
  id: string;
  claimId: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  isEdited: boolean;
  mentions?: string[];
  attachments?: string[];
  isPending?: boolean; // For offline comments
}

export interface ClaimWitness {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  statement?: string;
}

export interface ClaimActivity {
  id: string;
  claimId: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: Date;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
}

export interface Claim {
  id: string;
  claimNumber: string;
  type: ClaimType;
  title: string;
  description: string;
  status: ClaimStatus;
  priority: ClaimPriority;

  // Incident details
  incidentDate?: Date;
  incidentTime?: string;
  incidentLocation?: string;

  // Parties involved
  submittedBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  witnesses?: ClaimWitness[];

  // Metadata
  amount?: number;
  currency?: string;
  department?: string;
  shift?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  resolvedAt?: Date;

  // Relations
  documents?: ClaimDocument[];
  comments?: ClaimComment[];
  activities?: ClaimActivity[];

  // Counts
  documentCount: number;
  commentCount: number;
  unreadCount?: number;

  // Offline support
  isDraft?: boolean;
  isPending?: boolean; // Pending sync
  lastSyncedAt?: Date;
  localId?: string; // For offline-first support
}

export interface ClaimListItem {
  id: string;
  claimNumber: string;
  type: ClaimType;
  title: string;
  status: ClaimStatus;
  priority: ClaimPriority;
  submittedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  unreadCount?: number;
  documentCount: number;
  commentCount: number;
  isDraft?: boolean;
  isPending?: boolean;
}

export interface ClaimFormData {
  type: ClaimType;
  title: string;
  description: string;
  incidentDate?: Date;
  incidentTime?: string;
  incidentLocation?: string;
  amount?: number;
  department?: string;
  shift?: string;
  witnesses?: Omit<ClaimWitness, 'id'>[];
  documents?: File[] | { uri: string; name: string; type: string }[];
  priority?: ClaimPriority;
}

export interface ClaimFilters {
  status?: ClaimStatus[];
  type?: ClaimType[];
  priority?: ClaimPriority[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  assignedToMe?: boolean;
  submittedByMe?: boolean;
  hasDrafts?: boolean;
}

export interface ClaimSortOption {
  field: 'createdAt' | 'updatedAt' | 'submittedAt' | 'priority' | 'status';
  direction: 'asc' | 'desc';
}

export interface ClaimsPaginatedResponse {
  items: ClaimListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ClaimStatsResponse {
  total: number;
  byStatus: Record<ClaimStatus, number>;
  byType: Record<ClaimType, number>;
  byPriority: Record<ClaimPriority, number>;
  avgResolutionTime?: number; // in days
  pendingCount: number;
  draftCount: number;
}

// API Request/Response Types
export interface CreateClaimRequest {
  type: ClaimType;
  title: string;
  description: string;
  incidentDate?: string;
  incidentTime?: string;
  incidentLocation?: string;
  amount?: number;
  priority?: ClaimPriority;
  witnesses?: Omit<ClaimWitness, 'id'>[];
  isDraft?: boolean;
}

export interface UpdateClaimRequest extends Partial<CreateClaimRequest> {
  status?: ClaimStatus;
  assignedTo?: string;
}

export interface AddCommentRequest {
  claimId: string;
  content: string;
  mentions?: string[];
}

export interface UpdateCommentRequest {
  content: string;
}

export interface ClaimActionRequest {
  action: 'submit' | 'approve' | 'reject' | 'appeal' | 'withdraw' | 'close';
  reason?: string;
  notes?: string;
}

// Voice-to-text integration
export interface VoiceTranscription {
  text: string;
  confidence: number;
  language: string;
  duration: number;
}

// Export types
export interface ClaimExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeDocuments?: boolean;
  includeComments?: boolean;
  includeTimeline?: boolean;
}

