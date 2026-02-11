import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    exclude: ['**/dist/**', '**/.next/**', '**/node_modules/**', '**/build/**'],
    // Run tests sequentially to avoid RLS session variable conflicts
    pool: 'threads',
    threads: {
      singleThread: true,
    },
    // Disable file parallelism for RLS test isolation
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '*.config.*',
        'dist/',
        '**/dist/**',
        '.next/',
        'build/',
      ],
      // Coverage thresholds - enforce minimum coverage
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      // Report uncovered lines
      reportOnFailure: true,
      all: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/db': path.resolve(__dirname, './db'),
      '@/database': path.resolve(__dirname, './db'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/services': path.resolve(__dirname, './services'),
      '@/components': path.resolve(__dirname, './components'),
      '@/types': path.resolve(__dirname, './types'),
    },
  },
});
