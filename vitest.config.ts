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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/db': path.resolve(__dirname, './db'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/services': path.resolve(__dirname, './services'),
      '@/components': path.resolve(__dirname, './components'),
      '@/types': path.resolve(__dirname, './types'),
    },
  },
});
