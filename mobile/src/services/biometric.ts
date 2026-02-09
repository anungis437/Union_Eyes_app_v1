import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export interface BiometricCapability {
  isAvailable: boolean;
  type: 'fingerprint' | 'face' | 'iris' | 'none';
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

export interface BiometricCredentials {
  email: string;
  encryptedToken: string;
  enrolledAt: number;
}

class BiometricService {
  /**
   * Check if device supports biometric authentication
   */
  async checkCapability(): Promise<BiometricCapability> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();

      if (!hasHardware) {
        return {
          isAvailable: false,
          type: 'none',
          isEnrolled: false,
          supportedTypes: [],
        };
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let type: BiometricCapability['type'] = 'none';

      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        type = 'face';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        type = 'fingerprint';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        type = 'iris';
      }

      return {
        isAvailable: hasHardware && isEnrolled,
        type,
        isEnrolled,
        supportedTypes,
      };
    } catch (error) {
      console.error('Error checking biometric capability:', error);
      return {
        isAvailable: false,
        type: 'none',
        isEnrolled: false,
        supportedTypes: [],
      };
    }
  }

  /**
   * Get user-friendly biometric type name
   */
  async getBiometricTypeName(): Promise<string> {
    const capability = await this.checkCapability();

    if (!capability.isAvailable) {
      return 'Biometric';
    }

    switch (capability.type) {
      case 'face':
        return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      case 'iris':
        return 'Iris Scanner';
      default:
        return 'Biometric';
    }
  }

  /**
   * Authenticate user with biometric
   */
  async authenticate(reason?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const capability = await this.checkCapability();

      if (!capability.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available',
        };
      }

      const biometricType = await this.getBiometricTypeName();
      const defaultReason = `Use ${biometricType} to sign in`;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || defaultReason,
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Authentication failed',
        };
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  }

  /**
   * Enroll biometric authentication (save credentials)
   */
  async enrollBiometric(
    email: string,
    token: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const capability = await this.checkCapability();

      if (!capability.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available',
        };
      }

      // Authenticate first before saving
      const authResult = await this.authenticate('Authenticate to enable biometric sign-in');

      if (!authResult.success) {
        return authResult;
      }

      // Save credentials securely
      const credentials: BiometricCredentials = {
        email,
        encryptedToken: token,
        enrolledAt: Date.now(),
      };

      await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(credentials));

      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

      return { success: true };
    } catch (error: any) {
      console.error('Error enrolling biometric:', error);
      return {
        success: false,
        error: error.message || 'Failed to enroll biometric',
      };
    }
  }

  /**
   * Get saved biometric credentials
   */
  async getBiometricCredentials(): Promise<BiometricCredentials | null> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);

      if (enabled !== 'true') {
        return null;
      }

      const credentialsStr = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);

      if (!credentialsStr) {
        return null;
      }

      return JSON.parse(credentialsStr);
    } catch (error) {
      console.error('Error getting biometric credentials:', error);
      return null;
    }
  }

  /**
   * Check if biometric is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    } catch (error) {
      console.error('Error disabling biometric:', error);
      throw error;
    }
  }

  /**
   * Sign in with biometric
   */
  async signInWithBiometric(): Promise<{
    success: boolean;
    credentials?: BiometricCredentials;
    error?: string;
  }> {
    try {
      const enabled = await this.isBiometricEnabled();

      if (!enabled) {
        return {
          success: false,
          error: 'Biometric authentication is not enabled',
        };
      }

      // Authenticate with biometric
      const authResult = await this.authenticate('Sign in with biometric');

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error,
        };
      }

      // Get saved credentials
      const credentials = await this.getBiometricCredentials();

      if (!credentials) {
        return {
          success: false,
          error: 'No saved credentials found',
        };
      }

      return {
        success: true,
        credentials,
      };
    } catch (error: any) {
      console.error('Error signing in with biometric:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign in with biometric',
      };
    }
  }
}

export const biometricService = new BiometricService();
