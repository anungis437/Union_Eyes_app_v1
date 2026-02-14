import { useSignIn, useSignUp, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import {
  User,
  AuthTokens,
  AuthSession,
  SignInCredentials,
  SignUpData,
  ForgotPasswordData,
  ResetPasswordData,
  AuthError,
} from '@/types/auth';
import { biometricService } from './biometric';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const SESSION_KEY = 'auth_session';

export interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: AuthTokens;
  error?: {
    code: AuthError;
    message: string;
  };
}

class AuthService {
  private refreshTimer?: NodeJS.Timeout;
  private sessionValidationTimer?: NodeJS.Timeout;

  /**
   * Sign in with email and password
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    try {
      // This will be implemented with Clerk's useSignIn hook in components
      // For now, this is a placeholder structure
      throw new Error('signIn should be called from component using useSignIn hook');
    } catch (error: unknown) {
      return {
        success: false,
        error: {
          code: AuthError.INVALID_CREDENTIALS,
          message: error.message || 'Failed to sign in',
        },
      };
    }
  }

  /**
   * Sign in with biometric
   */
  async signInWithBiometric(): Promise<AuthResult> {
    try {
      const result = await biometricService.signInWithBiometric();

      if (!result.success || !result.credentials) {
        return {
          success: false,
          error: {
            code: AuthError.BIOMETRIC_FAILED,
            message: result.error || 'Biometric authentication failed',
          },
        };
      }

      // Get session from stored token
      const session = await this.getStoredSession();

      if (!session) {
        return {
          success: false,
          error: {
            code: AuthError.SESSION_EXPIRED,
            message: 'Session expired. Please sign in again.',
          },
        };
      }

      return {
        success: true,
        user: session.user,
        tokens: session.tokens,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: {
          code: AuthError.BIOMETRIC_FAILED,
          message: error.message || 'Biometric authentication failed',
        },
      };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      // This will be implemented with Clerk's useSignUp hook in components
      throw new Error('signUp should be called from component using useSignUp hook');
    } catch (error: unknown) {
      return {
        success: false,
        error: {
          code: AuthError.UNKNOWN_ERROR,
          message: error.message || 'Failed to sign up',
        },
      };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      // Clear timers
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }
      if (this.sessionValidationTimer) {
        clearTimeout(this.sessionValidationTimer);
      }

      // Clear stored tokens
      await this.clearTokens();

      // Disable biometric if needed
      // Note: We keep biometric credentials to allow quick re-login
    } catch (error) {
      throw error;
    }
  }

  /**
   * Store authentication tokens
   */
  async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, tokens.accessToken);

      if (tokens.refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
      }

      // Schedule token refresh
      this.scheduleTokenRefresh(tokens);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get stored access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Get stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Clear stored tokens
   */
  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch {
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<AuthTokens | null> {
    try {
      const refreshToken = await this.getRefreshToken();

      if (!refreshToken) {
        return null;
      }

      // Implement token refresh logic with your backend or Clerk
      // For now, this is a placeholder
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(tokens: AuthTokens): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!tokens.expiresAt) {
      return;
    }

    // Refresh 5 minutes before expiry
    const refreshIn = tokens.expiresAt - Date.now() - 5 * 60 * 1000;

    if (refreshIn > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, refreshIn);
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();

      if (!token) {
        return false;
      }

      // Implement session validation logic
      // For now, just check if token exists
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Store session data
   */
  async storeSession(session: AuthSession): Promise<void> {
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get stored session
   */
  async getStoredSession(): Promise<AuthSession | null> {
    try {
      const sessionStr = await SecureStore.getItemAsync(SESSION_KEY);

      if (!sessionStr) {
        return null;
      }

      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(
    email: string,
    token: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    return await biometricService.enrollBiometric(email, token);
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    await biometricService.disableBiometric();
  }

  /**
   * Check if biometric is available and enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    return await biometricService.isBiometricEnabled();
  }
}

export const authService = new AuthService();

