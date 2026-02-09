export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  phoneNumber?: string;
  organizationId?: string;
  organizationName?: string;
  role?: string;
  permissions?: string[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  memberCount?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
  organization?: Organization;
  lastActivity: number;
  createdAt: number;
}

export interface BiometricSettings {
  enabled: boolean;
  type?: 'fingerprint' | 'face' | 'iris';
  enrolledAt?: number;
}

export enum AuthError {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  BIOMETRIC_NOT_AVAILABLE = 'BIOMETRIC_NOT_AVAILABLE',
  BIOMETRIC_NOT_ENROLLED = 'BIOMETRIC_NOT_ENROLLED',
  BIOMETRIC_FAILED = 'BIOMETRIC_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface SignInCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
  phoneNumber?: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  code: string;
  password: string;
}

export interface VerifyEmailData {
  code: string;
}
