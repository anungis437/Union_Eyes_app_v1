import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { MMKV } from 'react-native-mmkv';

// Fast storage for non-sensitive data
export const mmkvStorage = new MMKV();

// AsyncStorage wrapper (for larger data, less sensitive)
export const storage = {
  async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
      throw error;
    }
  },

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error reading from AsyncStorage:', error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from AsyncStorage:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
      throw error;
    }
  },

  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys];
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },
};

// Secure storage wrapper (for sensitive data like tokens)
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error saving to SecureStore:', error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error reading from SecureStore:', error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing from SecureStore:', error);
      throw error;
    }
  },
};

// MMKV wrapper (for fast, synchronous storage)
export const fastStorage = {
  setString(key: string, value: string): void {
    mmkvStorage.set(key, value);
  },

  getString(key: string): string | undefined {
    return mmkvStorage.getString(key);
  },

  setNumber(key: string, value: number): void {
    mmkvStorage.set(key, value);
  },

  getNumber(key: string): number | undefined {
    return mmkvStorage.getNumber(key);
  },

  setBoolean(key: string, value: boolean): void {
    mmkvStorage.set(key, value);
  },

  getBoolean(key: string): boolean | undefined {
    return mmkvStorage.getBoolean(key);
  },

  delete(key: string): void {
    mmkvStorage.delete(key);
  },

  clearAll(): void {
    mmkvStorage.clearAll();
  },

  getAllKeys(): string[] {
    return mmkvStorage.getAllKeys();
  },
};

// Storage keys constants
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  CLAIMS_CACHE: 'claims_cache',
  DOCUMENTS_CACHE: 'documents_cache',
  SETTINGS: 'settings',
  OFFLINE_QUEUE: 'offline_queue',
  LAST_SYNC: 'last_sync',
};

// Default export
const storageService = {
  storage,
  secureStorage,
  fastStorage,
  STORAGE_KEYS,
};

export default storageService;
