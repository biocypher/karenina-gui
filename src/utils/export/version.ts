/**
 * Export Version Utilities
 * Manages application version for export metadata
 */

import { logger } from '../logger';

/**
 * Cache for the application version to avoid repeated imports
 */
let cachedVersion: string | null = null;

/**
 * Preload version when module loads (non-blocking)
 */
preloadVersion().catch(() => {
  // Fallback version already handled in getVersionSync
});

/**
 * Preload version asynchronously
 */
async function preloadVersion(): Promise<void> {
  cachedVersion = await getAppVersion();
}

/**
 * Get the application version from package.json
 * Uses dynamic import to access package.json at runtime
 */
async function getAppVersion(): Promise<string> {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // Dynamic import of package.json - Vite supports this
    const pkg = await import('../../../package.json?url');
    // Use fetch to get the JSON content
    const response = await fetch(pkg.default);
    const data = await response.json();
    cachedVersion = data.version || '0.0.0';
    return cachedVersion;
  } catch (error) {
    logger.warning('EXPORT', 'Failed to load version from package.json, using fallback', 'version', { error });
    return '0.0.0';
  }
}

/**
 * Get current version (sync, may use fallback during initial load)
 */
export function getCurrentVersion(): string {
  return cachedVersion || '0.1.0';
}

/**
 * Force reload version from package.json
 */
export async function reloadVersion(): Promise<string> {
  cachedVersion = null;
  return getAppVersion();
}
