export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  phoneNumber?: string;
  unionId?: string;
  memberNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  amount?: number;
  currency?: string;
  category?: string;
  submittedAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  documents?: Document[];
}

export interface Document {
  id: string;
  userId: string;
  claimId?: string;
  name: string;
  type: 'pdf' | 'image' | 'other';
  size: number;
  url: string;
  uploadedAt: string;
  mimeType?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'claim' | 'document' | 'system';
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

// ==================== Sync & Offline Types ====================

export interface SyncMetadata {
  syncedAt?: number;
  lastModified: number;
  version: number;
  conflicted: boolean;
  pendingSync: boolean;
}

export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CONFLICT = 'conflict',
}

export enum OperationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  QUEUED = 'queued',
}

export interface OfflineOperation {
  id: string;
  entity: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  status: OperationStatus;
  retryCount: number;
  error?: string;
}

export interface ConflictInfo {
  id: string;
  entity: string;
  entityId: string;
  localData: any;
  serverData: any;
  timestamp: number;
  resolved: boolean;
  resolution?: 'local' | 'server' | 'merged';
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown';
  quality: 'excellent' | 'good' | 'poor' | 'offline';
}

export interface SyncProgress {
  entity: string;
  phase: 'push' | 'pull' | 'resolve';
  current: number;
  total: number;
  percentage: number;
}

export interface EntityWithMetadata<T> extends Record<string, any> {
  id: string;
  _metadata?: {
    id: string;
    entity: string;
    createdAt: number;
    updatedAt: number;
    syncedAt?: number;
    version: number;
    deleted?: boolean;
  };
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  memberNumber: string;
  unionId: string;
  status: 'active' | 'inactive' | 'suspended';
  joinedAt: string;
  updatedAt: string;
}

export interface SyncStats {
  totalSynced: number;
  pendingSync: number;
  conflicts: number;
  lastSyncAt?: number;
  byEntity: Record<
    string,
    {
      synced: number;
      pending: number;
      conflicts: number;
    }
  >;
}
