/**
 * @fileoverview Session Manager
 * 
 * Manages JWT tokens and cross-application session persistence.
 * Ensures users stay authenticated across all 17 CourtLens applications.
 */

import { Session } from '@supabase/supabase-js';
import { logger } from '../src/utils/logger';
import { logger } from '@/lib/logger';

// =========================================================================
// CONSTANTS
// =========================================================================

const SESSION_STORAGE_KEY = 'courtlens_session';
const SESSION_EXPIRY_KEY = 'courtlens_session_expiry';
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

// =========================================================================
// SESSION MANAGER CLASS
// =========================================================================

export class SessionManager {
  private static instance: SessionManager;
  private session: Session | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.loadSession();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Store session in localStorage
   */
  public storeSession(session: Session): void {
    try {
      this.session = session;
      
      // Store session data
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      
      // Store expiry time
      if (session.expires_at) {
        localStorage.setItem(SESSION_EXPIRY_KEY, session.expires_at.toString());
      }

      // Set up refresh timer
      this.scheduleSessionRefresh(session);
    } catch (error) {
      logger.error('Error storing session:', error);
    }
  }

  /**
   * Load session from localStorage
   */
  public loadSession(): Session | null {
    try {
      const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      
      if (!storedSession) {
        return null;
      }

      const session = JSON.parse(storedSession) as Session;
      
      // Check if session is expired
      if (this.isSessionExpired(session)) {
        this.clearSession();
        return null;
      }

      this.session = session;
      this.scheduleSessionRefresh(session);
      
      return session;
    } catch (error) {
      logger.error('Error loading session:', error);
      return null;
    }
  }

  /**
   * Clear session from storage
   */
  public clearSession(): void {
    try {
      this.session = null;
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_EXPIRY_KEY);
      
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
    } catch (error) {
      logger.error('Error clearing session:', error);
    }
  }

  /**
   * Get current session
   */
  public getSession(): Session | null {
    return this.session;
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: Session): boolean {
    if (!session.expires_at) {
      return false;
    }

    const expiryTime = typeof session.expires_at === 'number' 
      ? session.expires_at * 1000 
      : new Date(session.expires_at).getTime();
    
    return Date.now() >= expiryTime;
  }

  /**
   * Check if session needs refresh
   */
  public needsRefresh(session: Session): boolean {
    if (!session.expires_at) {
      return false;
    }

    const expiryTime = typeof session.expires_at === 'number' 
      ? session.expires_at * 1000 
      : new Date(session.expires_at).getTime();
    
    const timeUntilExpiry = expiryTime - Date.now();
    
    return timeUntilExpiry < REFRESH_THRESHOLD;
  }

  /**
   * Schedule automatic session refresh
   */
  private scheduleSessionRefresh(session: Session): void {
    if (!session.expires_at) {
      return;
    }

    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const expiryTime = typeof session.expires_at === 'number' 
      ? session.expires_at * 1000 
      : new Date(session.expires_at).getTime();
    
    const timeUntilRefresh = expiryTime - Date.now() - REFRESH_THRESHOLD;

    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(() => {
        // Emit event for components to refresh
        window.dispatchEvent(new CustomEvent('session-refresh-needed'));
      }, timeUntilRefresh);
    }
  }

  /**
   * Get access token
   */
  public getAccessToken(): string | null {
    return this.session?.access_token || null;
  }

  /**
   * Get refresh token
   */
  public getRefreshToken(): string | null {
    return this.session?.refresh_token || null;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.session !== null && !this.isSessionExpired(this.session);
  }

  /**
   * Get session metadata
   */
  public getSessionMetadata(): {
    expiresAt: Date | null;
    timeRemaining: number;
    needsRefresh: boolean;
  } {
    if (!this.session || !this.session.expires_at) {
      return {
        expiresAt: null,
        timeRemaining: 0,
        needsRefresh: false,
      };
    }

    const expiryTime = typeof this.session.expires_at === 'number' 
      ? this.session.expires_at * 1000 
      : new Date(this.session.expires_at).getTime();
    
    const timeRemaining = Math.max(0, expiryTime - Date.now());

    return {
      expiresAt: new Date(expiryTime),
      timeRemaining,
      needsRefresh: this.needsRefresh(this.session),
    };
  }
}

// =========================================================================
// EXPORTS
// =========================================================================

export default SessionManager;
