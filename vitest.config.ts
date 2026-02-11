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
      // Istanbul provider for industry-standard coverage analysis
      provider: 'istanbul',
      // Multiple reporters for different use cases
      reporter: ['text', 'text-summary', 'json', 'json-summary', 'html', 'lcov'],
      // Exclude non-testable files and directories
      exclude: [
        // Dependencies
        'node_modules/',
        '**/node_modules/**',
        // Build outputs
        'dist/',
        '**/dist/**',
        '.next/',
        '**/.next/**',
        'build/',
        '**/build/**',
        '.turbo/',
        '**/.turbo/**',
        'out/',
        // Test files
        '__tests__/',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        // Config files
        '*.config.*',
        '**/*.config.*',
        '**/vitest.config.*',
        '**/next.config.*',
        '**/tailwind.config.*',
        '**/postcss.config.*',
        '**/eslint.config.*',
        // Build and setup files
        '**/setup.ts',
        '**/instrumentation.ts',
        '**/instrumentation-*.ts',
        '**/middleware.ts',
        // Type definitions
        '**/*.d.ts',
        '**/global.d.ts',
        // Coverage output
        'coverage/',
        '**/coverage/**',
        // Archive and docs
        'archive/',
        '**/archive/**',
        'docs/',
        // Scripts
        'scripts/',
        '**/scripts/**',
        // Database migrations
        'database/migrations/',
        '**/migrations/**',
        // Remotion
        '**/remotion/**',
        // Generated files
        'drizzle/',
        '**/drizzle/**',
      ],
      // Coverage thresholds - balanced for large codebase
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
      // Report uncovered lines and show all files
      reportOnFailure: true,
      all: true,
      // Clean coverage directory before each run
      clean: true,
      // Show coverage summary in console
      skipFull: false,
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
