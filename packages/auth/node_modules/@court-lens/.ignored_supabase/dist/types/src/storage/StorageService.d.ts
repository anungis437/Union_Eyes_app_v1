/**
 * Supabase Storage Service with RLS
 *
 * Secure document storage service leveraging Supabase Pro Storage features:
 * - Row-Level Security (RLS) for tenant isolation
 * - Document versioning and history
 * - Secure file sharing with access controls
 * - Large file support (up to 5GB with Pro)
 * - Image transformations and optimization
 * - Automatic virus scanning (Pro feature)
 *
 * @module StorageService
 */
import { SupabaseClient } from '@supabase/supabase-js';
export interface DocumentMetadata {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    bucketName: string;
    organizationId: string;
    matterId?: string;
    clientId?: string;
    uploadedBy: string;
    uploadedAt: string;
    version: number;
    isLatestVersion: boolean;
    tags?: string[];
    description?: string;
    accessLevel: 'private' | 'organization' | 'matter_team' | 'client_accessible';
    downloadCount: number;
    lastAccessedAt?: string;
}
export interface DocumentVersion {
    id: string;
    documentId: string;
    version: number;
    path: string;
    size: number;
    uploadedBy: string;
    uploadedAt: string;
    changeNotes?: string;
    isActive: boolean;
}
export interface UploadOptions {
    matterId?: string;
    clientId?: string;
    description?: string;
    tags?: string[];
    accessLevel?: 'private' | 'organization' | 'matter_team' | 'client_accessible';
    allowVersioning?: boolean;
    changeNotes?: string;
}
export interface DownloadOptions {
    version?: number;
    transformations?: {
        width?: number;
        height?: number;
        quality?: number;
        format?: 'webp' | 'avif' | 'jpeg' | 'png';
    };
    expiresIn?: number;
}
export interface ShareOptions {
    expiresIn?: number;
    allowDownload?: boolean;
    allowView?: boolean;
    password?: string;
    accessLevel?: 'view' | 'download' | 'edit';
}
export declare class StorageService {
    private supabase;
    private defaultBucket;
    constructor(supabase: SupabaseClient<any>);
    /**
     * Initialize storage buckets with proper RLS policies
     */
    initializeBuckets(organizationId: string): Promise<void>;
    /**
     * Upload a document with metadata and versioning support
     */
    uploadDocument(file: File, organizationId: string, userId: string, options?: UploadOptions): Promise<DocumentMetadata>;
    /**
     * Upload multiple documents in batch
     */
    uploadMultipleDocuments(files: File[], organizationId: string, userId: string, options?: UploadOptions): Promise<DocumentMetadata[]>;
    /**
     * Get document download URL with access control
     */
    getDocumentUrl(documentId: string, organizationId: string, userId: string, options?: DownloadOptions): Promise<string>;
    /**
     * Get document metadata by ID
     */
    getDocumentMetadata(documentId: string, version?: number): Promise<DocumentMetadata | null>;
    /**
     * List documents with filtering and pagination
     */
    listDocuments(organizationId: string, userId: string, filters?: {
        matterId?: string;
        clientId?: string;
        tags?: string[];
        mimeType?: string;
        accessLevel?: string;
        uploadedBy?: string;
        uploadedAfter?: string;
        uploadedBefore?: string;
    }, pagination?: {
        page?: number;
        limit?: number;
        sortBy?: 'uploadedAt' | 'filename' | 'size';
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        documents: DocumentMetadata[];
        totalCount: number;
        hasMore: boolean;
    }>;
    /**
     * Create secure sharing link for document
     */
    createShareLink(documentId: string, organizationId: string, userId: string, options?: ShareOptions): Promise<{
        shareId: string;
        shareUrl: string;
        expiresAt: string;
    }>;
    /**
     * Access document via share link
     */
    accessSharedDocument(shareId: string, password?: string): Promise<{
        document: DocumentMetadata;
        downloadUrl: string;
        accessLevel: string;
    }>;
    /**
     * Get all versions of a document
     */
    getDocumentVersions(documentId: string): Promise<DocumentVersion[]>;
    /**
     * Restore a previous version of a document
     */
    restoreDocumentVersion(documentId: string, version: number, userId: string): Promise<DocumentMetadata>;
    /**
     * Verify user has access to document based on RLS policies
     */
    verifyDocumentAccess(documentId: string, userId: string, organizationId: string): Promise<boolean>;
    /**
     * Update document access level
     */
    updateDocumentAccess(documentId: string, accessLevel: 'private' | 'organization' | 'matter_team' | 'client_accessible', userId: string): Promise<void>;
    private getBucketName;
    private generateSecureFilename;
    private generateFilePath;
    private findDocumentByOriginalName;
    private saveDocumentMetadata;
    private updateDocumentVersion;
    private trackDocumentAccess;
    private createShareRecord;
    private getShareRecord;
    private getDocumentVersion;
    private createVersionFromExisting;
}
export default StorageService;
//# sourceMappingURL=StorageService.d.ts.map