/**
 * Claims API Client
 * Type-safe API wrapper with error handling, retry logic, and request cancellation
 */

import axios, { AxiosInstance, AxiosError, CancelTokenSource } from 'axios';
import * as SecureStore from 'expo-secure-store';
import {
  Claim,
  ClaimListItem,
  ClaimsPaginatedResponse,
  ClaimStatsResponse,
  CreateClaimRequest,
  UpdateClaimRequest,
  AddCommentRequest,
  UpdateCommentRequest,
  ClaimActionRequest,
  ClaimComment,
  ClaimDocument,
  ClaimFilters,
  ClaimSortOption,
} from '@/types/claims';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.unioneyes.com';
const API_TIMEOUT = 30000;
const MAX_RETRIES = 3;

export class ClaimsApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ClaimsApiError';
  }
}

class ClaimsApiClient {
  private client: AxiosInstance;
  private cancelTokens: Map<string, CancelTokenSource> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          await SecureStore.deleteItemAsync('auth_token');
        }

        const apiError = new ClaimsApiError(
          error.response?.status || 500,
          (error.response?.data as any)?.message || error.message,
          error.response?.data
        );

        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Get paginated list of claims
   */
  async getClaims(params?: {
    page?: number;
    pageSize?: number;
    filters?: ClaimFilters;
    sort?: ClaimSortOption;
  }): Promise<ClaimsPaginatedResponse> {
    const { page = 1, pageSize = 20, filters, sort } = params || {};

    const queryParams: any = {
      page,
      pageSize,
      ...filters,
      sortField: sort?.field,
      sortDirection: sort?.direction,
    };

    // Clean up undefined values
    Object.keys(queryParams).forEach(
      (key) => queryParams[key] === undefined && delete queryParams[key]
    );

    const response = await this.client.get<ClaimsPaginatedResponse>('/claims', {
      params: queryParams,
    });

    return response.data;
  }

  /**
   * Get claim by ID with full details
   */
  async getClaimById(id: string): Promise<Claim> {
    const response = await this.client.get<Claim>(`/claims/${id}`);
    return response.data;
  }

  /**
   * Create a new claim
   */
  async createClaim(data: CreateClaimRequest): Promise<Claim> {
    const response = await this.client.post<Claim>('/claims', data);
    return response.data;
  }

  /**
   * Update an existing claim
   */
  async updateClaim(id: string, data: UpdateClaimRequest): Promise<Claim> {
    const response = await this.client.patch<Claim>(`/claims/${id}`, data);
    return response.data;
  }

  /**
   * Delete a claim (only drafts)
   */
  async deleteClaim(id: string): Promise<void> {
    await this.client.delete(`/claims/${id}`);
  }

  /**
   * Perform action on claim (submit, approve, reject, etc.)
   */
  async performClaimAction(id: string, action: ClaimActionRequest): Promise<Claim> {
    const response = await this.client.post<Claim>(`/claims/${id}/actions`, action);
    return response.data;
  }

  /**
   * Get claim statistics
   */
  async getClaimStats(): Promise<ClaimStatsResponse> {
    const response = await this.client.get<ClaimStatsResponse>('/claims/stats');
    return response.data;
  }

  /**
   * Search claims with debounce support
   */
  async searchClaims(
    query: string,
    options?: {
      page?: number;
      pageSize?: number;
    }
  ): Promise<ClaimsPaginatedResponse> {
    const cancelToken = this.getCancelToken('search');

    const response = await this.client.get<ClaimsPaginatedResponse>('/claims/search', {
      params: {
        q: query,
        page: options?.page || 1,
        pageSize: options?.pageSize || 20,
      },
      cancelToken: cancelToken.token,
    });

    return response.data;
  }

  // ==================== Comments ====================

  /**
   * Get comments for a claim
   */
  async getClaimComments(
    claimId: string,
    params?: {
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ items: ClaimComment[]; total: number }> {
    const response = await this.client.get(`/claims/${claimId}/comments`, {
      params: params || { page: 1, pageSize: 50 },
    });
    return response.data;
  }

  /**
   * Add a comment to a claim
   */
  async addClaimComment(claimId: string, data: AddCommentRequest): Promise<ClaimComment> {
    const response = await this.client.post<ClaimComment>(`/claims/${claimId}/comments`, data);
    return response.data;
  }

  /**
   * Update a comment
   */
  async updateClaimComment(
    claimId: string,
    commentId: string,
    data: UpdateCommentRequest
  ): Promise<ClaimComment> {
    const response = await this.client.patch<ClaimComment>(
      `/claims/${claimId}/comments/${commentId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a comment
   */
  async deleteClaimComment(claimId: string, commentId: string): Promise<void> {
    await this.client.delete(`/claims/${claimId}/comments/${commentId}`);
  }

  // ==================== Documents ====================

  /**
   * Get documents for a claim
   */
  async getClaimDocuments(claimId: string): Promise<ClaimDocument[]> {
    const response = await this.client.get<ClaimDocument[]>(`/claims/${claimId}/documents`);
    return response.data;
  }

  /**
   * Upload document to a claim
   */
  async uploadClaimDocument(
    claimId: string,
    file: { uri: string; name: string; type: string }
  ): Promise<ClaimDocument> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const response = await this.client.post<ClaimDocument>(
      `/claims/${claimId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // Longer timeout for uploads
      }
    );

    return response.data;
  }

  /**
   * Delete a document
   */
  async deleteClaimDocument(claimId: string, documentId: string): Promise<void> {
    await this.client.delete(`/claims/${claimId}/documents/${documentId}`);
  }

  /**
   * Download document
   */
  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await this.client.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // ==================== Export ====================

  /**
   * Export claim as PDF
   */
  async exportClaimPDF(
    claimId: string,
    options?: {
      includeDocuments?: boolean;
      includeComments?: boolean;
    }
  ): Promise<Blob> {
    const response = await this.client.get(`/claims/${claimId}/export/pdf`, {
      params: options,
      responseType: 'blob',
    });
    return response.data;
  }

  // ==================== Utilities ====================

  /**
   * Get or create cancel token for a request key
   */
  private getCancelToken(key: string): CancelTokenSource {
    // Cancel previous request with same key
    const existing = this.cancelTokens.get(key);
    if (existing) {
      existing.cancel('Request superseded');
    }

    // Create new cancel token
    const source = axios.CancelToken.source();
    this.cancelTokens.set(key, source);
    return source;
  }

  /**
   * Cancel a specific request
   */
  cancelRequest(key: string) {
    const source = this.cancelTokens.get(key);
    if (source) {
      source.cancel('Request cancelled by user');
      this.cancelTokens.delete(key);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests() {
    this.cancelTokens.forEach((source) => {
      source.cancel('All requests cancelled');
    });
    this.cancelTokens.clear();
  }

  /**
   * Retry a failed request
   */
  async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries = MAX_RETRIES,
    delay = 1000
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (retries === 0) throw error;

      // Don't retry on client errors (4xx)
      if (error instanceof ClaimsApiError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff
      return this.retryRequest(requestFn, retries - 1, delay * 2);
    }
  }
}

// Export singleton instance
export const claimsApi = new ClaimsApiClient();
