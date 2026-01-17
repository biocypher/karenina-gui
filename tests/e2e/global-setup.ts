/**
 * Global setup for E2E tests
 *
 * Starts the karenina-server before any E2E tests run.
 * The server runs in E2E mode with LLM calls mocked via fixtures.
 */

import { startServer, stopServer, stopServerSync, getServerInstance } from './server/server-manager';

// Track if we've registered cleanup handlers
let cleanupRegistered = false;

export default async function globalSetup(): Promise<void> {
  console.log('\n[E2E Global Setup] Starting server...');

  try {
    const server = await startServer();

    // Make server info available to tests via environment
    process.env.VITE_E2E_API_BASE_URL = server.baseUrl;
    process.env.VITE_E2E_WS_BASE_URL = server.wsUrl;

    // Register cleanup handlers to ensure server stops even if teardown doesn't run
    // This handles cases where Vitest exits unexpectedly or forks pool doesn't call teardown
    if (!cleanupRegistered) {
      cleanupRegistered = true;

      // Use synchronous cleanup on exit - async handlers don't work reliably
      process.on('exit', () => {
        stopServerSync();
      });

      // For signals, we can do async cleanup before exiting
      process.on('SIGINT', async () => {
        await stopServer();
        process.exit(130);
      });

      process.on('SIGTERM', async () => {
        await stopServer();
        process.exit(143);
      });
    }

    console.log(`[E2E Global Setup] Server ready at ${server.baseUrl}`);
  } catch (error) {
    console.error('[E2E Global Setup] Failed to start server:', error);
    throw error;
  }
}

// Export for use in tests that need server info
export { getServerInstance };
