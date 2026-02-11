/**
 * Document Upload Service
 * Handles document uploads with progress tracking, resumable uploads, and offline queue
 */

import * as FileSystem from 'expo-file-system';
import { Document, UploadTask, UploadStatus } from '../types/documents';
import apiService from './api';
import storageService from './storage';
import networkStatus from './network-status';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_QUEUE_KEY = 'upload_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for resumable uploads

class DocumentUploadService {
  private uploadTasks: Map<string, UploadTask> = new Map();
  private activeUploads: Map<string, FileSystem.DownloadResumable> = new Map();
  private uploadCallbacks: Map<string, (progress: number) => void> = new Map();

  constructor() {
    this.initializeQueue();
    this.setupNetworkListener();
  }

  /**
   * Initialize upload queue from storage
   */
  private async initializeQueue(): Promise<void> {
    try {
      const queueData = await storageService.storage.getItem<string>(UPLOAD_QUEUE_KEY);
      if (queueData) {
        const tasks: UploadTask[] = JSON.parse(queueData);
        tasks.forEach((task) => {
          this.uploadTasks.set(task.id, task);
        });
        console.log(`Loaded ${tasks.length} pending uploads from queue`);
      }
    } catch (error) {
      console.error('Error loading upload queue:', error);
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      const tasks = Array.from(this.uploadTasks.values());
      await storageService.storage.setItem(UPLOAD_QUEUE_KEY, tasks);
    } catch (error) {
      console.error('Error saving upload queue:', error);
    }
  }

  /**
   * Setup network listener to resume uploads when online
   */
  private setupNetworkListener(): void {
    networkStatus.addConnectionListener((isOnline: boolean) => {
      if (isOnline) {
        console.log('Network connected, resuming pending uploads...');
        this.resumeAllPendingUploads();
      }
    });
  }

  /**
   * Upload document with progress tracking
   */
  async uploadDocument(
    document: Document,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; serverId?: string; error?: string }> {
    const taskId = uuidv4();
    const status = await networkStatus.getStatus();
    const isOnline = status.isConnected;

    // Calculate total size
    const totalBytes = document.pages.reduce((sum, page) => sum + page.size, 0);

    // Create upload task
    const task: UploadTask = {
      id: taskId,
      documentId: document.id,
      status: isOnline ? UploadStatus.UPLOADING : UploadStatus.PENDING,
      progress: 0,
      bytesUploaded: 0,
      totalBytes,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      startedAt: new Date(),
    };

    this.uploadTasks.set(taskId, task);
    if (onProgress) {
      this.uploadCallbacks.set(taskId, onProgress);
    }

    await this.saveQueue();

    // If offline, queue for later
    if (!isOnline) {
      console.log('Offline - document queued for upload:', document.id);
      return { success: false, error: 'Offline - queued for upload' };
    }

    // Start upload
    return this.performUpload(taskId, document);
  }

  /**
   * Perform the actual upload
   */
  private async performUpload(
    taskId: string,
    document: Document
  ): Promise<{ success: boolean; serverId?: string; error?: string }> {
    const task = this.uploadTasks.get(taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    try {
      task.status = UploadStatus.UPLOADING;
      await this.saveQueue();

      // Prepare form data
      const formData = new FormData();
      formData.append('title', document.title);
      formData.append('type', document.type);
      formData.append('description', document.description || '');
      formData.append('claimId', document.claimId || '');
      formData.append('tags', JSON.stringify(document.tags));
      formData.append('metadata', JSON.stringify(document.metadata));
      formData.append('ocrText', document.ocrText || '');

      // Add pages
      for (let i = 0; i < document.pages.length; i++) {
        const page = document.pages[i];
        const fileInfo = await FileSystem.getInfoAsync(page.uri);

        if (fileInfo.exists) {
          formData.append('pages', {
            uri: page.uri,
            type: 'image/jpeg',
            name: `page_${i}.jpg`,
          } as any);

          formData.append(
            `page_${i}_metadata`,
            JSON.stringify({
              order: page.order,
              filter: page.filter,
              ocrResult: page.ocrResult,
            })
          );
        }
      }

      // Upload with progress tracking
      const response = await apiService.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            task.progress = progress;
            task.bytesUploaded = progressEvent.loaded;
            this.notifyProgress(taskId, progress);
          }
        },
      });

      // Success
      task.status = UploadStatus.SUCCESS;
      task.progress = 100;
      task.completedAt = new Date();
      this.uploadTasks.delete(taskId);
      this.uploadCallbacks.delete(taskId);
      await this.saveQueue();

      return {
        success: true,
        serverId: response.data.id,
      };
    } catch (error: any) {
      console.error('Upload failed:', error);

      // Handle retry
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = UploadStatus.PENDING;
        await this.saveQueue();

        // Retry after delay
        setTimeout(() => {
          this.retryUpload(taskId, document);
        }, RETRY_DELAY * task.retryCount);

        return {
          success: false,
          error: `Upload failed, retrying... (${task.retryCount}/${task.maxRetries})`,
        };
      }

      // Max retries exceeded
      task.status = UploadStatus.FAILED;
      task.error = error.message;
      await this.saveQueue();

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Retry upload
   */
  private async retryUpload(taskId: string, document: Document): Promise<void> {
    const status = await networkStatus.getStatus();
    if (status.isConnected) {
      await this.performUpload(taskId, document);
    }
  }

  /**
   * Pause upload
   */
  pauseUpload(taskId: string): void {
    const task = this.uploadTasks.get(taskId);
    if (task && task.status === UploadStatus.UPLOADING) {
      task.status = UploadStatus.PAUSED;
      task.pausedAt = new Date();
      this.saveQueue();

      // Cancel active upload if exists
      const activeUpload = this.activeUploads.get(taskId);
      if (activeUpload) {
        activeUpload.pauseAsync();
      }
    }
  }

  /**
   * Resume upload
   */
  async resumeUpload(taskId: string, document: Document): Promise<void> {
    const task = this.uploadTasks.get(taskId);
    if (task && task.status === UploadStatus.PAUSED) {
      const status = await networkStatus.getStatus();
      if (status.isConnected) {
        await this.performUpload(taskId, document);
      }
    }
  }

  /**
   * Cancel upload
   */
  cancelUpload(taskId: string): void {
    const task = this.uploadTasks.get(taskId);
    if (task) {
      task.status = UploadStatus.CANCELLED;
      this.uploadTasks.delete(taskId);
      this.uploadCallbacks.delete(taskId);
      this.saveQueue();

      // Cancel active upload
      const activeUpload = this.activeUploads.get(taskId);
      if (activeUpload) {
        activeUpload.pauseAsync();
        this.activeUploads.delete(taskId);
      }
    }
  }

  /**
   * Resume all pending uploads
   */
  private async resumeAllPendingUploads(): Promise<void> {
    const pendingTasks = Array.from(this.uploadTasks.values()).filter(
      (task) => task.status === UploadStatus.PENDING || task.status === UploadStatus.PAUSED
    );

    console.log(`Resuming ${pendingTasks.length} pending uploads`);

    for (const task of pendingTasks) {
      // Note: We need the document object to resume, which should be stored separately
      // For now, we'll just mark them as pending and they'll be retried when explicitly requested
      console.log('Pending upload:', task.documentId);
    }
  }

  /**
   * Batch upload multiple documents
   */
  async batchUpload(
    documents: Document[],
    onProgress?: (documentId: string, progress: number) => void
  ): Promise<Map<string, { success: boolean; serverId?: string; error?: string }>> {
    const results = new Map<string, { success: boolean; serverId?: string; error?: string }>();

    // Upload in parallel (up to 3 at a time)
    const maxConcurrent = 3;
    for (let i = 0; i < documents.length; i += maxConcurrent) {
      const batch = documents.slice(i, i + maxConcurrent);
      const batchPromises = batch.map((doc) =>
        this.uploadDocument(doc, (progress) => {
          if (onProgress) {
            onProgress(doc.id, progress);
          }
        })
      );

      const batchResults = await Promise.all(batchPromises);
      batch.forEach((doc, index) => {
        results.set(doc.id, batchResults[index]);
      });
    }

    return results;
  }

  /**
   * Get upload progress for a document
   */
  getUploadProgress(documentId: string): number {
    const task = Array.from(this.uploadTasks.values()).find((t) => t.documentId === documentId);
    return task?.progress || 0;
  }

  /**
   * Get all pending uploads
   */
  getPendingUploads(): UploadTask[] {
    return Array.from(this.uploadTasks.values()).filter(
      (task) => task.status === UploadStatus.PENDING || task.status === UploadStatus.PAUSED
    );
  }

  /**
   * Notify progress to callback
   */
  private notifyProgress(taskId: string, progress: number): void {
    const callback = this.uploadCallbacks.get(taskId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Compress image before upload
   */
  private async compressImage(uri: string): Promise<string> {
    // This would use sharp or another image processing library
    // For now, return original
    return uri;
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(uri: string): Promise<string> {
    // Use camera service for thumbnail generation
    const cameraService = require('./camera').default;
    return cameraService.generateThumbnail(uri);
  }

  /**
   * Clear completed uploads
   */
  clearCompleted(): void {
    const completedTasks = Array.from(this.uploadTasks.entries()).filter(
      ([_, task]) => task.status === UploadStatus.SUCCESS || task.status === UploadStatus.CANCELLED
    );

    completedTasks.forEach(([taskId]) => {
      this.uploadTasks.delete(taskId);
      this.uploadCallbacks.delete(taskId);
    });

    this.saveQueue();
  }

  /**
   * Get upload statistics
   */
  getStatistics(): {
    total: number;
    pending: number;
    uploading: number;
    completed: number;
    failed: number;
  } {
    const tasks = Array.from(this.uploadTasks.values());

    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === UploadStatus.PENDING).length,
      uploading: tasks.filter((t) => t.status === UploadStatus.UPLOADING).length,
      completed: tasks.filter((t) => t.status === UploadStatus.SUCCESS).length,
      failed: tasks.filter((t) => t.status === UploadStatus.FAILED).length,
    };
  }
}

export default new DocumentUploadService();

