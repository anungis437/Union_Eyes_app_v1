import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.API_URL || 'https://api.unioneyes.com';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000', 10);

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
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

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - refresh token or logout
          await SecureStore.deleteItemAsync('auth_token');
        }
        return Promise.reject(error);
      }
    );
  }

  // Claims
  async getClaims(params?: { status?: string; limit?: number; offset?: number }) {
    const response = await this.client.get('/claims', { params });
    return response.data;
  }

  async getClaimById(id: string) {
    const response = await this.client.get(`/claims/${id}`);
    return response.data;
  }

  async createClaim(data: any) {
    const response = await this.client.post('/claims', data);
    return response.data;
  }

  async updateClaim(id: string, data: any) {
    const response = await this.client.patch(`/claims/${id}`, data);
    return response.data;
  }

  // Documents
  async getDocuments(params?: { limit?: number; offset?: number }) {
    const response = await this.client.get('/documents', { params });
    return response.data;
  }

  async uploadDocument(formData: FormData) {
    const response = await this.client.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteDocument(id: string) {
    const response = await this.client.delete(`/documents/${id}`);
    return response.data;
  }

  // Profile
  async getProfile() {
    const response = await this.client.get('/profile');
    return response.data;
  }

  async updateProfile(data: any) {
    const response = await this.client.patch('/profile', data);
    return response.data;
  }

  // Notifications
  async getNotifications(params?: { limit?: number; offset?: number; unread?: boolean }) {
    const response = await this.client.get('/notifications', { params });
    return response.data;
  }

  async markNotificationAsRead(id: string) {
    const response = await this.client.patch(`/notifications/${id}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.post('/notifications/mark-all-read');
    return response.data;
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: any): Promise<{ data: T }> {
    return await this.client.get(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> {
    return await this.client.post(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> {
    return await this.client.patch(url, data, config);
  }

  async delete<T = any>(url: string, config?: any): Promise<{ data: T }> {
    return await this.client.delete(url, config);
  }
}

export const apiService = new ApiService();
export default apiService;
