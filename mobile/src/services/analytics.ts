/**
 * Analytics Service
 *
 * Centralized analytics tracking for user actions, screen views, and events
 */

import * as Sentry from '@sentry/react-native';
import { Amplitude, Identify } from '@amplitude/react-native';
import config, { isProduction } from '../../env/env-config';

// Initialize Amplitude
const amplitude = Amplitude.getInstance();

/**
 * Initialize analytics services
 */
export const initializeAnalytics = async (): Promise<void> => {
  if (!config.enableAnalytics) {
    console.log('[Analytics] Analytics disabled');
    return;
  }

  try {
    // Initialize Amplitude
    if (config.amplitudeApiKey) {
      amplitude.init(config.amplitudeApiKey);
      console.log('[Analytics] Amplitude initialized');
    }

    // Initialize Sentry (already initialized in app entry)
    if (config.enableCrashReporting && config.sentryDsn) {
      console.log('[Analytics] Sentry initialized');
    }

    console.log('[Analytics] Analytics services initialized');
  } catch (error) {
    console.error('[Analytics] Error initializing analytics:', error);
  }
};

/**
 * Set user properties
 */
export const setUser = (userId: string, properties?: Record<string, any>): void => {
  if (!config.enableAnalytics) return;

  try {
    // Set user in Amplitude
    amplitude.setUserId(userId);
    if (properties) {
      amplitude.setUserProperties(properties);
    }

    // Set user in Sentry
    Sentry.setUser({
      id: userId,
      ...properties,
    });

    console.log('[Analytics] User set:', userId);
  } catch (error) {
    console.error('[Analytics] Error setting user:', error);
  }
};

/**
 * Clear user data (on logout)
 */
export const clearUser = (): void => {
  if (!config.enableAnalytics) return;

  try {
    // Clear Amplitude user
    amplitude.setUserId(null);
    amplitude.clearUserProperties();

    // Clear Sentry user
    Sentry.setUser(null);

    console.log('[Analytics] User cleared');
  } catch (error) {
    console.error('[Analytics] Error clearing user:', error);
  }
};

/**
 * Track screen view
 */
export const trackScreenView = (screenName: string, properties?: Record<string, any>): void => {
  if (!config.enableAnalytics) return;

  try {
    const eventName = `Screen Viewed: ${screenName}`;

    amplitude.logEvent(eventName, {
      screen_name: screenName,
      ...properties,
    });

    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Screen: ${screenName}`,
      level: 'info',
      data: properties,
    });

    console.log('[Analytics] Screen view:', screenName);
  } catch (error) {
    console.error('[Analytics] Error tracking screen view:', error);
  }
};

/**
 * Track custom event
 */
export const trackEvent = (eventName: string, properties?: Record<string, any>): void => {
  if (!config.enableAnalytics) return;

  try {
    amplitude.logEvent(eventName, properties);

    Sentry.addBreadcrumb({
      category: 'user-action',
      message: eventName,
      level: 'info',
      data: properties,
    });

    console.log('[Analytics] Event:', eventName, properties);
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
};

/**
 * Track user action
 */
export const trackAction = (
  action: string,
  category: string,
  properties?: Record<string, any>
): void => {
  trackEvent(`${category}: ${action}`, {
    action,
    category,
    ...properties,
  });
};

/**
 * Track error
 */
export const trackError = (error: Error, context?: Record<string, any>): void => {
  if (!config.enableCrashReporting) return;

  try {
    Sentry.captureException(error, {
      extra: context,
    });

    // Also track in Amplitude
    if (config.enableAnalytics) {
      amplitude.logEvent('Error Occurred', {
        error_message: error.message,
        error_stack: error.stack,
        ...context,
      });
    }

    console.error('[Analytics] Error tracked:', error);
  } catch (trackingError) {
    console.error('[Analytics] Error tracking error:', trackingError);
  }
};

/**
 * Track API call
 */
export const trackAPICall = (
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  error?: string
): void => {
  if (!config.enableAnalytics) return;

  try {
    trackEvent('API Call', {
      endpoint,
      method,
      status_code: statusCode,
      duration_ms: duration,
      success: statusCode >= 200 && statusCode < 300,
      error,
    });
  } catch (trackingError) {
    console.error('[Analytics] Error tracking API call:', trackingError);
  }
};

/**
 * Track feature usage
 */
export const trackFeatureUsage = (feature: string, properties?: Record<string, any>): void => {
  trackEvent(`Feature Used: ${feature}`, {
    feature,
    ...properties,
  });
};

/**
 * Track claim submission
 */
export const trackClaimSubmission = (claimType: string, properties?: Record<string, any>): void => {
  trackEvent('Claim Submitted', {
    claim_type: claimType,
    ...properties,
  });
};

/**
 * Track document upload
 */
export const trackDocumentUpload = (
  documentType: string,
  fileSize: number,
  properties?: Record<string, any>
): void => {
  trackEvent('Document Uploaded', {
    document_type: documentType,
    file_size_bytes: fileSize,
    ...properties,
  });
};

/**
 * Track OCR scan
 */
export const trackOCRScan = (
  success: boolean,
  confidence: number,
  properties?: Record<string, any>
): void => {
  trackEvent('OCR Scan', {
    success,
    confidence,
    ...properties,
  });
};

/**
 * Track authentication
 */
export const trackAuthentication = (
  method: 'email' | 'biometric' | 'social',
  success: boolean,
  properties?: Record<string, any>
): void => {
  trackEvent(success ? 'Login Success' : 'Login Failed', {
    auth_method: method,
    success,
    ...properties,
  });
};

/**
 * Track app launch
 */
export const trackAppLaunch = (isFirstLaunch: boolean): void => {
  trackEvent('App Launched', {
    is_first_launch: isFirstLaunch,
    environment: config.env,
  });
};

/**
 * Track app foreground/background
 */
export const trackAppState = (state: 'active' | 'background' | 'inactive'): void => {
  trackEvent('App State Changed', {
    app_state: state,
  });
};

/**
 * Set user property
 */
export const setUserProperty = (property: string, value: any): void => {
  if (!config.enableAnalytics) return;

  try {
    amplitude.setUserProperties({
      [property]: value,
    });

    Sentry.setContext('user_properties', {
      [property]: value,
    });

    console.log('[Analytics] User property set:', property, value);
  } catch (error) {
    console.error('[Analytics] Error setting user property:', error);
  }
};

/**
 * Increment user property
 */
export const incrementUserProperty = (property: string, amount: number = 1): void => {
  if (!config.enableAnalytics) return;

  try {
    const identify = new Identify();
    identify.add(property, amount);
    amplitude.identify(identify);

    console.log('[Analytics] User property incremented:', property, amount);
  } catch (error) {
    console.error('[Analytics] Error incrementing user property:', error);
  }
};

/**
 * Track revenue (for in-app purchases, if applicable)
 */
export const trackRevenue = (
  amount: number,
  productId: string,
  properties?: Record<string, any>
): void => {
  if (!config.enableAnalytics) return;

  try {
    // Use logEvent for revenue tracking as Revenue class is not available
    amplitude.logEvent('revenue', {
      productId,
      amount,
      ...properties,
    });

    console.log('[Analytics] Revenue tracked:', amount, productId);
  } catch (error) {
    console.error('[Analytics] Error tracking revenue:', error);
  }
};

/**
 * Track timing
 */
export const trackTiming = (
  category: string,
  name: string,
  duration: number,
  properties?: Record<string, any>
): void => {
  trackEvent('Timing', {
    timing_category: category,
    timing_name: name,
    duration_ms: duration,
    ...properties,
  });
};

/**
 * Start timing
 */
const timers: Record<string, number> = {};

export const startTiming = (timerName: string): void => {
  timers[timerName] = Date.now();
};

export const endTiming = (
  timerName: string,
  category: string,
  properties?: Record<string, any>
): void => {
  if (!timers[timerName]) {
    console.warn(`[Analytics] Timer not found: ${timerName}`);
    return;
  }

  const duration = Date.now() - timers[timerName];
  delete timers[timerName];

  trackTiming(category, timerName, duration, properties);
};

/**
 * Flush analytics (send immediately)
 */
export const flushAnalytics = (): void => {
  if (!config.enableAnalytics) return;

  try {
    amplitude.uploadEvents();
    console.log('[Analytics] Analytics flushed');
  } catch (error) {
    console.error('[Analytics] Error flushing analytics:', error);
  }
};

/**
 * Opt out of analytics
 */
export const optOutOfAnalytics = (): void => {
  try {
    amplitude.setOptOut(true);
    console.log('[Analytics] User opted out of analytics');
  } catch (error) {
    console.error('[Analytics] Error opting out:', error);
  }
};

/**
 * Opt in to analytics
 */
export const optInToAnalytics = (): void => {
  try {
    amplitude.setOptOut(false);
    console.log('[Analytics] User opted in to analytics');
  } catch (error) {
    console.error('[Analytics] Error opting in:', error);
  }
};

/**
 * Analytics hook for React components
 */
export const useAnalytics = () => {
  return {
    trackScreenView,
    trackEvent,
    trackAction,
    trackError,
    trackFeatureUsage,
    trackClaimSubmission,
    trackDocumentUpload,
    trackOCRScan,
    trackAuthentication,
    setUserProperty,
    incrementUserProperty,
    startTiming,
    endTiming,
  };
};

export default {
  initializeAnalytics,
  setUser,
  clearUser,
  trackScreenView,
  trackEvent,
  trackAction,
  trackError,
  trackAPICall,
  trackFeatureUsage,
  trackClaimSubmission,
  trackDocumentUpload,
  trackOCRScan,
  trackAuthentication,
  trackAppLaunch,
  trackAppState,
  setUserProperty,
  incrementUserProperty,
  trackRevenue,
  trackTiming,
  startTiming,
  endTiming,
  flushAnalytics,
  optOutOfAnalytics,
  optInToAnalytics,
  useAnalytics,
};

