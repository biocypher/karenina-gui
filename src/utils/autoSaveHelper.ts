/**
 * Auto-save Utilities
 * Wrappers for database auto-save with consistent error handling
 */

import type { Checkpoint } from '../types';
import { autoSaveToDatabase } from './databaseAutoSave';
import { logger } from './logger';

/**
 * Performs auto-save to database with consistent error handling.
 * Wraps the autoSaveToDatabase function and returns the error message
 * for the caller to handle as needed.
 *
 * @param checkpoint - The checkpoint to save
 * @param context - Context description for logging (e.g., "template save", "rubric update")
 * @returns Promise that resolves to null on success, or error message on failure
 */
export async function performAutoSave(checkpoint: Checkpoint, context: string = 'checkpoint'): Promise<string | null> {
  try {
    await autoSaveToDatabase(checkpoint);
    logger.debugLog('DATABASE', `Successfully saved to database after ${context}`, 'autoSave');
    return null;
  } catch (err) {
    logger.error('DATABASE', `Failed to auto-save to database after ${context}`, 'autoSave', { error: err });
    return `Failed to save to database: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}

/**
 * Performs silent auto-save to database (no error return).
 * Use this for operations where auto-save failure should not interrupt the user.
 *
 * @param checkpoint - The checkpoint to save
 * @param context - Context description for logging
 */
export async function performSilentAutoSave(checkpoint: Checkpoint, context: string = 'checkpoint'): Promise<void> {
  try {
    await autoSaveToDatabase(checkpoint);
  } catch (err) {
    // Log warning but don't throw - this is for background saves
    logger.warning('DATABASE', `Failed to auto-save to database after ${context}`, 'autoSave', { error: err });
  }
}
