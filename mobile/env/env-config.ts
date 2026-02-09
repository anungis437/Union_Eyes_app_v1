/**
 * Environment Configuration Loader
 *
 * Loads environment-specific configuration based on APP_ENV
 */

import Constants from 'expo-constants';

export type Environment = 'development' | 'preview' | 'production';

interface Config {
  env: Environment;
  apiUrl: string;
  apiTimeout: number;
  clerkPublishableKey: string;
  sentryDsn: string;
  sentryEnvironment: string;
  amplitudeApiKey: string;
  enableDevMenu: boolean;
  enableDebugMode: boolean;
  enableMockData: boolean;
  enableOfflineMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableNetworkLogging: boolean;
  appName: string;
  appScheme: string;
  storageEncryptionKey: string;
  easUpdateChannel: string;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  enablePerformanceMonitoring: boolean;
  authApiUrl: string;
  claimsApiUrl: string;
  documentsApiUrl: string;
  notificationsApiUrl: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  ocrProvider: 'tesseract' | 'cloud';
  ocrConfidenceThreshold: number;
  enableReactDevTools: boolean;
  enableReduxDevTools: boolean;
  enableInspector: boolean;
  enableSSLPinning?: boolean;
  enableRootDetection?: boolean;
  enableJailbreakDetection?: boolean;
}

/**
 * Get current environment
 */
export const getEnvironment = (): Environment => {
  const env = process.env.APP_ENV || Constants.expoConfig?.extra?.APP_ENV || 'development';
  return env as Environment;
};

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean => {
  return getEnvironment() === 'development';
};

/**
 * Check if running in preview/staging
 */
export const isPreview = (): boolean => {
  return getEnvironment() === 'preview';
};

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return getEnvironment() === 'production';
};

/**
 * Load environment configuration
 */
const loadConfig = (): Config => {
  const env = getEnvironment();

  // Base configuration
  const config: Config = {
    env,
    apiUrl: process.env.API_URL || '',
    apiTimeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
    sentryDsn: process.env.SENTRY_DSN || '',
    sentryEnvironment: process.env.SENTRY_ENVIRONMENT || env,
    amplitudeApiKey: process.env.AMPLITUDE_API_KEY || '',
    enableDevMenu: process.env.ENABLE_DEV_MENU === 'true',
    enableDebugMode: process.env.ENABLE_DEBUG_MODE === 'true',
    enableMockData: process.env.ENABLE_MOCK_DATA === 'true',
    enableOfflineMode: process.env.ENABLE_OFFLINE_MODE === 'true',
    logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',
    enableNetworkLogging: process.env.ENABLE_NETWORK_LOGGING === 'true',
    appName: process.env.APP_NAME || 'UnionEyes',
    appScheme: process.env.APP_SCHEME || 'unioneyes',
    storageEncryptionKey: process.env.STORAGE_ENCRYPTION_KEY || '',
    easUpdateChannel: process.env.EAS_UPDATE_CHANNEL || 'production',
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    enableCrashReporting: process.env.ENABLE_CRASH_REPORTING === 'true',
    enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
    authApiUrl: process.env.AUTH_API_URL || '',
    claimsApiUrl: process.env.CLAIMS_API_URL || '',
    documentsApiUrl: process.env.DOCUMENTS_API_URL || '',
    notificationsApiUrl: process.env.NOTIFICATIONS_API_URL || '',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || '').split(','),
    ocrProvider: (process.env.OCR_PROVIDER as Config['ocrProvider']) || 'tesseract',
    ocrConfidenceThreshold: parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD || '0.8'),
    enableReactDevTools: process.env.ENABLE_REACT_DEVTOOLS === 'true',
    enableReduxDevTools: process.env.ENABLE_REDUX_DEVTOOLS === 'true',
    enableInspector: process.env.ENABLE_INSPECTOR === 'true',
  };

  // Production-specific settings
  if (isProduction()) {
    config.enableSSLPinning = process.env.ENABLE_SSL_PINNING === 'true';
    config.enableRootDetection = process.env.ENABLE_ROOT_DETECTION === 'true';
    config.enableJailbreakDetection = process.env.ENABLE_JAILBREAK_DETECTION === 'true';
  }

  return config;
};

/**
 * Validate required environment variables
 */
const validateConfig = (config: Config): void => {
  const required: (keyof Config)[] = ['apiUrl', 'clerkPublishableKey', 'sentryDsn'];

  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;

    if (isProduction()) {
      throw new Error(message);
    } else {
      console.warn(message);
    }
  }
};

// Load and export configuration
const config = loadConfig();
validateConfig(config);

export default config;

/**
 * Get API endpoint URL
 */
export const getApiUrl = (endpoint: string): string => {
  return `${config.apiUrl}${endpoint}`;
};

/**
 * Get service-specific API URL
 */
export const getServiceUrl = (
  service: 'auth' | 'claims' | 'documents' | 'notifications'
): string => {
  const serviceUrls = {
    auth: config.authApiUrl,
    claims: config.claimsApiUrl,
    documents: config.documentsApiUrl,
    notifications: config.notificationsApiUrl,
  };

  return serviceUrls[service] || config.apiUrl;
};

/**
 * Print configuration (for debugging)
 */
export const printConfig = (): void => {
  if (isDevelopment()) {
    console.log('=== Environment Configuration ===');
    console.log(JSON.stringify(config, null, 2));
    console.log('================================');
  }
};
