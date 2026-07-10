import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const apiProxyTarget = process.env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:8080';

// https://vitejs.dev/config/
export default defineConfig({
  // Keep the production build same-origin friendly. The packaged FastAPI
  // server mounts static files at /assets and API routes at /api, so the
  // built app must not bake in a localhost API origin.
  base: '/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  assetsInclude: ['**/*.md'],
  server: {
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: apiProxyTarget,
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
