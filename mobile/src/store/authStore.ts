import { create } from 'zustand';
import { storage, secureStorage, STORAGE_KEYS } from '@services/storage';
import { User, Organization, BiometricSettings } from '@/types/auth';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  biometricSettings: BiometricSettings;
  rememberMe: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setOrganization: (organization: Organization | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setBiometricSettings: (settings: BiometricSettings) => void;
  setRememberMe: (remember: boolean) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  biometricSettings: {
    enabled: false,
  },
  rememberMe: false,

  setUser: async (user) => {
    if (user) {
      await storage.setItem(STORAGE_KEYS.USER_DATA, user);
    } else {
      await storage.removeItem(STORAGE_KEYS.USER_DATA);
    }
    set({ user });
  },

  setOrganization: async (organization) => {
    if (organization) {
      await storage.setItem('organization_data', organization);
    } else {
      await storage.removeItem('organization_data');
    }
    set({ organization });
  },

  setToken: async (token) => {
    if (token) {
      await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
    set({ token });
  },

  setRefreshToken: async (refreshToken) => {
    if (refreshToken) {
      await secureStorage.setItem('refresh_token', refreshToken);
    } else {
      await secureStorage.removeItem('refresh_token');
    }
    set({ refreshToken });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setBiometricSettings: async (biometricSettings) => {
    await storage.setItem('biometric_settings', biometricSettings);
    set({ biometricSettings });
  },

  setRememberMe: async (rememberMe) => {
    await storage.setItem('remember_me', rememberMe);
    set({ rememberMe });
  },

  logout: async () => {
    await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await secureStorage.removeItem('refresh_token');
    await storage.removeItem(STORAGE_KEYS.USER_DATA);
    await storage.removeItem('organization_data');
    set({
      user: null,
      organization: null,
      token: null,
      refreshToken: null,
    });
  },

  initialize: async () => {
    try {
      const token = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const refreshToken = await secureStorage.getItem('refresh_token');
      const user = await storage.getItem<User>(STORAGE_KEYS.USER_DATA);
      const organization = await storage.getItem<Organization>('organization_data');
      const biometricSettings = await storage.getItem<BiometricSettings>('biometric_settings');
      const rememberMe = await storage.getItem<boolean>('remember_me');

      set({
        token,
        refreshToken,
        user,
        organization,
        biometricSettings: biometricSettings || { enabled: false },
        rememberMe: rememberMe || false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isLoading: false });
    }
  },
}));

