import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { authService } from './auth';

const SESSION_TIMEOUT_KEY = 'session_timeout';
const LAST_ACTIVITY_KEY = 'last_activity';
const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export interface SessionConfig {
  timeout?: number; // in milliseconds
  autoLogout?: boolean;
  trackActivity?: boolean;
  onSessionExpired?: () => void;
}

class SessionManager {
  private config: Required<SessionConfig>;
  private activityTimer?: NodeJS.Timeout;
  private appStateSubscription?: any;
  private lastActivity: number = Date.now();

  constructor(config: SessionConfig = {}) {
    this.config = {
      timeout: config.timeout || DEFAULT_TIMEOUT,
      autoLogout: config.autoLogout !== false,
      trackActivity: config.trackActivity !== false,
      onSessionExpired: config.onSessionExpired || (() => {}),
    };
  }

  /**
   * Initialize session manager
   */
  async initialize(): Promise<void> {
    try {
      // Load last activity
      const lastActivityStr = await SecureStore.getItemAsync(LAST_ACTIVITY_KEY);
      if (lastActivityStr) {
        this.lastActivity = parseInt(lastActivityStr, 10);
      }

      // Check if session expired
      if (this.isSessionExpired()) {
        await this.handleSessionExpired();
        return;
      }

      // Start tracking
      this.startTracking();
    } catch (error) {
      console.error('Error initializing session manager:', error);
    }
  }

  /**
   * Start tracking user activity and app state
   */
  startTracking(): void {
    if (!this.config.trackActivity) {
      return;
    }

    // Track app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    // Start activity timer
    this.resetActivityTimer();
  }

  /**
   * Stop tracking
   */
  stopTracking(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }

  /**
   * Update last activity timestamp
   */
  async updateActivity(): Promise<void> {
    this.lastActivity = Date.now();

    try {
      await SecureStore.setItemAsync(LAST_ACTIVITY_KEY, this.lastActivity.toString());
    } catch (error) {
      console.error('Error updating activity:', error);
    }

    this.resetActivityTimer();
  }

  /**
   * Reset activity timer
   */
  private resetActivityTimer(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    if (this.config.autoLogout) {
      this.activityTimer = setTimeout(() => {
        this.handleSessionExpired();
      }, this.config.timeout);
    }
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    if (nextAppState === 'active') {
      // App came to foreground
      if (this.isSessionExpired()) {
        await this.handleSessionExpired();
      } else {
        await this.updateActivity();
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background
      await this.updateActivity();
    }
  };

  /**
   * Check if session is expired
   */
  isSessionExpired(): boolean {
    const now = Date.now();
    const elapsed = now - this.lastActivity;
    return elapsed > this.config.timeout;
  }

  /**
   * Get time until session expires (in milliseconds)
   */
  getTimeUntilExpiry(): number {
    const elapsed = Date.now() - this.lastActivity;
    const remaining = this.config.timeout - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Handle session expiration
   */
  private async handleSessionExpired(): Promise<void> {
    this.stopTracking();

    try {
      await authService.signOut();
      this.config.onSessionExpired();
    } catch (error) {
      console.error('Error handling session expiration:', error);
    }
  }

  /**
   * Extend session
   */
  async extendSession(): Promise<void> {
    await this.updateActivity();
  }

  /**
   * Get session info
   */
  getSessionInfo(): {
    lastActivity: number;
    timeUntilExpiry: number;
    isExpired: boolean;
  } {
    return {
      lastActivity: this.lastActivity,
      timeUntilExpiry: this.getTimeUntilExpiry(),
      isExpired: this.isSessionExpired(),
    };
  }

  /**
   * Update session timeout
   */
  updateTimeout(timeout: number): void {
    this.config.timeout = timeout;
    this.resetActivityTimer();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopTracking();
  }
}

export const sessionManager = new SessionManager();
