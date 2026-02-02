/**
 * Global teardown for E2E tests
 *
 * Stops the karenina-server after all E2E tests complete.
 */

import { stopServer } from './server/server-manager';

export default async function globalTeardown(): Promise<void> {
  console.log('\n[E2E Global Teardown] Stopping server...');

  try {
    await stopServer();
    console.log('[E2E Global Teardown] Server stopped successfully');
  } catch (error) {
    console.error('[E2E Global Teardown] Error stopping server:', error);
    // Don't throw - teardown should be best-effort
  }
}
