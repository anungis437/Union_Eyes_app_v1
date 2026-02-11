import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '@services/storage';

interface Settings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
  offlineMode: boolean;
}

interface SettingsState extends Settings {
  setTheme: (theme: Settings['theme']) => void;
  setLanguage: (language: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setOfflineMode: (enabled: boolean) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  theme: 'auto',
  language: 'en',
  notificationsEnabled: true,
  biometricEnabled: false,
  offlineMode: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaultSettings,

  setTheme: (theme) => {
    set({ theme });
    get().saveSettings();
  },

  setLanguage: (language) => {
    set({ language });
    get().saveSettings();
  },

  setNotificationsEnabled: (notificationsEnabled) => {
    set({ notificationsEnabled });
    get().saveSettings();
  },

  setBiometricEnabled: (biometricEnabled) => {
    set({ biometricEnabled });
    get().saveSettings();
  },

  setOfflineMode: (offlineMode) => {
    set({ offlineMode });
    get().saveSettings();
  },

  loadSettings: async () => {
    try {
      const settings = await storage.getItem<Settings>(STORAGE_KEYS.SETTINGS);
      if (settings) {
        set(settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  saveSettings: async () => {
    const { theme, language, notificationsEnabled, biometricEnabled, offlineMode } = get();
    try {
      await storage.setItem(STORAGE_KEYS.SETTINGS, {
        theme,
        language,
        notificationsEnabled,
        biometricEnabled,
        offlineMode,
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },
}));

