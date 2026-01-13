/**
 * Vitest configuration for E2E tests
 *
 * E2E tests run against a real karenina-server with only LLM calls mocked.
 * This is a standalone config that does NOT merge with the base config
 * to ensure only E2E tests are run.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // ONLY run E2E tests - no inheritance from base config
    include: ['tests/e2e/**/*.e2e.test.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      // Explicitly exclude all non-E2E tests
      'tests/unit/**',
      'tests/integration/**',
      'src/**/*.test.{ts,tsx}',
      '__tests__/**',
    ],

    // Longer timeouts for E2E tests
    testTimeout: 60000, // 60s per test
    hookTimeout: 120000, // 2min for server startup/teardown

    // Use forks for process isolation
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Share server across tests in same file
      },
    },

    // Global setup starts/stops the server
    globalSetup: './tests/e2e/global-setup.ts',
    globalTeardown: './tests/e2e/global-teardown.ts',

    // Use jsdom for React components
    environment: 'jsdom',
    setupFiles: ['./tests/e2e/setup.ts'],
    globals: true,
    css: true,

    // E2E-specific coverage
    coverage: {
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage-e2e',
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'tests/unit/**',
        'tests/integration/**',
      ],
    },
  },
});
