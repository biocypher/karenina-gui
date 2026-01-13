/**
 * Global setup for E2E tests
 *
 * Starts the karenina-server before any E2E tests run.
 * The server runs in E2E mode with LLM calls mocked via fixtures.
 */

import { startServer, getServerInstance } from './server/server-manager';

export default async function globalSetup(): Promise<void> {
  console.log('\n[E2E Global Setup] Starting server...');

  try {
    const server = await startServer();

    // Make server info available to tests via environment
    process.env.VITE_E2E_API_BASE_URL = server.baseUrl;
    process.env.VITE_E2E_WS_BASE_URL = server.wsUrl;

    console.log(`[E2E Global Setup] Server ready at ${server.baseUrl}`);
  } catch (error) {
    console.error('[E2E Global Setup] Failed to start server:', error);
    throw error;
  }
}

// Export for use in tests that need server info
export { getServerInstance };
