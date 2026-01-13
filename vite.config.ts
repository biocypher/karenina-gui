import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  assetsInclude: ['**/*.md'],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    teardownTimeout: 5000,
    include: [
      // New three-tier test structure
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}',
      // Legacy test locations (during migration)
      'src/**/*.test.{ts,tsx}',
      '__tests__/**/*.test.{ts,tsx}',
    ],
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**', 'playwright/**', '**/*.e2e.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'tests/e2e/**',
        'playwright/**',
      ],
    },
  },
});
