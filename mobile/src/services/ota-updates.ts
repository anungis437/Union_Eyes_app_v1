/**
 * Over-the-Air (OTA) Updates Service
 *
 * Handles checking, downloading, and applying OTA updates
 */

import * as Updates from 'expo-updates';
import { Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';
import config from '../../env/env-config';

export interface UpdateInfo {
  isAvailable: boolean;
  manifestString?: string;
  createdAt?: Date;
  isRollBackToEmbedded?: boolean;
}

export interface UpdateCheckResult {
  isAvailable: boolean;
  update?: Updates.UpdateCheckResult;
}

/**
 * Check if updates are enabled
 */
export const isUpdateEnabled = (): boolean => {
  return !__DEV__ && Updates.isEnabled && config.enableOfflineMode;
};

/**
 * Get current update ID
 */
export const getCurrentUpdateId = (): string | null => {
  try {
    return Updates.updateId || null;
  } catch {
    return null;
  }
};

/**
 * Get update channel
 */
export const getUpdateChannel = (): string => {
  return config.easUpdateChannel;
};

/**
 * Check for available updates
 */
export const checkForUpdates = async (): Promise<UpdateCheckResult> => {
  if (!isUpdateEnabled()) {
    return { isAvailable: false };
  }

  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      Sentry.addBreadcrumb({
        category: 'update',
        message: 'Update available',
        level: 'info',
      });
    }

    return {
      isAvailable: update.isAvailable,
      update: update.isAvailable ? update : undefined,
    };
  } catch (error) {
    Sentry.captureException(error);
    return { isAvailable: false };
  }
};

/**
 * Download and install update
 */
export const downloadAndInstallUpdate = async (): Promise<boolean> => {
  if (!isUpdateEnabled()) {
    return false;
  }

  try {
    const result = await Updates.fetchUpdateAsync();

    if (result.isNew) {
      Sentry.addBreadcrumb({
        category: 'update',
        message: 'Update downloaded',
        level: 'info',
      });
      return true;
    }

    return false;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
};

/**
 * Reload app to apply update
 */
export const reloadApp = async (): Promise<void> => {
  try {
    await Updates.reloadAsync();
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
};

/**
 * Check for updates and prompt user
 */
export const checkAndPromptForUpdate = async (): Promise<void> => {
  if (!isUpdateEnabled()) {
    return;
  }

  try {
    const { isAvailable } = await checkForUpdates();

    if (isAvailable) {
      Alert.alert(
        'Update Available',
        'A new version of UnionEyes is available. Would you like to update now?',
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => {},
          },
          {
            text: 'Update',
            onPress: async () => {
              try {
                await downloadAndInstallUpdate();
                Alert.alert(
                  'Update Ready',
                  'The update has been downloaded. The app will restart now.',
                  [
                    {
                      text: 'OK',
                      onPress: () => reloadApp(),
                    },
                  ],
                  { cancelable: false }
                );
              } catch (error) {
                Alert.alert(
                  'Update Failed',
                  'Failed to download the update. Please try again later.'
                );
              }
            },
          },
        ]
      );
    }
  } catch (error) {
    Sentry.captureException(error);
  }
};

/**
 * Check for updates silently and download in background
 */
export const checkAndDownloadSilently = async (): Promise<boolean> => {
  if (!isUpdateEnabled()) {
    return false;
  }

  try {
    const { isAvailable } = await checkForUpdates();

    if (isAvailable) {
      const success = await downloadAndInstallUpdate();

      if (success) {
        return true;
      }
    }

    return false;
  } catch (error) {
    Sentry.captureException(error);
    return false;
  }
};

/**
 * Force check for critical updates
 * Use this for mandatory updates that must be installed immediately
 */
export const checkForCriticalUpdate = async (): Promise<void> => {
  if (!isUpdateEnabled()) {
    return;
  }

  try {
    const { isAvailable } = await checkForUpdates();

    if (isAvailable) {
      // Force update without option to decline
      Alert.alert(
        'Critical Update Required',
        'A critical update is available and must be installed to continue using the app.',
        [
          {
            text: 'Update Now',
            onPress: async () => {
              try {
                await downloadAndInstallUpdate();
                await reloadApp();
              } catch (error) {
                Alert.alert(
                  'Update Failed',
                  'Failed to install the critical update. Please check your internet connection and try again.',
                  [{ text: 'Retry', onPress: () => checkForCriticalUpdate() }]
                );
              }
            },
          },
        ],
        { cancelable: false }
      );
    }
  } catch (error) {
    Sentry.captureException(error);
  }
};

/**
 * Get update event listener
 * Use this to show update progress UI
 * Note: expo-updates API has changed, listener functionality may need updates
 */
export const addUpdateEventListener = (callback: (event: any) => void): any => {
  // expo-updates API changed - addListener may not be available
  // return Updates.addListener?.(callback);
  return { remove: () => {} };
};

/**
 * Check if running the latest update
 */
export const isRunningLatestUpdate = async (): Promise<boolean> => {
  if (!isUpdateEnabled()) {
    return true;
  }

  try {
    const { isAvailable } = await checkForUpdates();
    return !isAvailable;
  } catch {
    return true; // Assume latest if check fails
  }
};

/**
 * Initialize update service
 * Call this when app starts
 */
export const initializeUpdateService = async (): Promise<void> => {
  if (!isUpdateEnabled()) {
    return;
  }

  // Check for updates on app start (silent background download)
  setTimeout(() => {
    checkAndDownloadSilently();
  }, 5000); // Wait 5 seconds after app start
};

/**
 * OTA Update Hook
 * Use this in your root component to handle updates
 */
export const useOTAUpdates = () => {
  const [isCheckingForUpdate, setIsCheckingForUpdate] = React.useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);

  const checkForUpdate = React.useCallback(async () => {
    setIsCheckingForUpdate(true);
    try {
      const result = await checkForUpdates();
      setIsUpdateAvailable(result.isAvailable);
      return result;
    } finally {
      setIsCheckingForUpdate(false);
    }
  }, []);

  const downloadUpdate = React.useCallback(async () => {
    setIsDownloading(true);
    try {
      const success = await downloadAndInstallUpdate();
      if (success) {
        // Update downloaded, ready to reload
        return true;
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const applyUpdate = React.useCallback(async () => {
    await reloadApp();
  }, []);

  React.useEffect(() => {
    initializeUpdateService();
  }, []);

  return {
    isCheckingForUpdate,
    isUpdateAvailable,
    isDownloading,
    checkForUpdate,
    downloadUpdate,
    applyUpdate,
  };
};

// Import React for the hook
import * as React from 'react';

export default {
  isUpdateEnabled,
  getCurrentUpdateId,
  getUpdateChannel,
  checkForUpdates,
  downloadAndInstallUpdate,
  reloadApp,
  checkAndPromptForUpdate,
  checkAndDownloadSilently,
  checkForCriticalUpdate,
  addUpdateEventListener,
  isRunningLatestUpdate,
  initializeUpdateService,
  useOTAUpdates,
};

