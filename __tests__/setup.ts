/**
 * Vitest Test Setup
 * 
 * Global setup for all tests including:
 * - React 18 testing library configuration
 * - Global mocks for Clerk, fetch, etc.
 * - Custom matchers
 * - Environment variable loading from .env.local
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local for tests
config({ path: path.resolve(process.cwd(), '.env.local') });

// Make React available globally for JSX
globalThis.React = React;

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: vi.fn().mockResolvedValue('test-token'),
  })),
  useUser: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      publicMetadata: { tenantId: 'test-tenant', role: 'admin' },
    },
  })),
  useOrganization: vi.fn(() => ({
    isLoaded: true,
    organization: { id: 'test-org-id', name: 'Test Org' },
  })),
  SignedIn: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  SignedOut: ({ children }: { children: React.ReactNode }) => null,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({
    userId: 'test-user-id',
    orgId: 'test-org-id',
  }),
  currentUser: vi.fn().mockResolvedValue({
    id: 'test-user-id',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    publicMetadata: { tenantId: 'test-tenant', role: 'admin' },
    privateMetadata: {},
    imageUrl: null,
  }),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/dashboard'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock PointerEvent for Radix UI
class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;
  pointerId: number;

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.button = props.button ?? 0;
    this.ctrlKey = props.ctrlKey ?? false;
    this.pointerType = props.pointerType ?? 'mouse';
    this.pointerId = props.pointerId ?? 1;
  }
}

// @ts-ignore
window.PointerEvent = MockPointerEvent;

// Mock hasPointerCapture/setPointerCapture for Radix UI
Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock HTMLElement.offsetHeight, offsetWidth for layout calculations
Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: {
    get() { return 100; },
  },
  offsetWidth: {
    get() { return 100; },
  },
  offsetParent: {
    get() { return document.body; },
  },
});

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
  width: 100,
  height: 50,
  top: 0,
  left: 0,
  bottom: 50,
  right: 100,
  x: 0,
  y: 0,
  toJSON: () => {},
});

// Suppress console errors for expected test failures
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress React 18 hydration warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
     args[0].includes('Warning: An update to') ||
     args[0].includes('act(...)') ||
     args[0].includes('Not implemented: navigation'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
