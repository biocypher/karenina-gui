import { QuestionData } from '../types';
import { logger } from './logger';

// DEPRECATED: Default data loading is disabled
// Users should start with Question Extractor or manually upload data through File Manager
export const loadQuestionData = async (): Promise<QuestionData> => {
  logger.warning(
    'DEPRECATED',
    'loadQuestionData() is deprecated. Use Question Extractor or File Manager to load data.',
    'dataLoader'
  );
  return {};
};

// DEPRECATED: Default data file has been removed
// Use Question Extractor or File Manager to load data
export const loadDefaultQuestionData = async (): Promise<QuestionData> => {
  logger.warning(
    'DEPRECATED',
    'Default graphical_data.json file has been removed. Use Question Extractor or File Manager to load data.',
    'dataLoader'
  );
  return {};
};

export const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Generate a unique session ID for dev mode display
 */
export const generateSessionId = (): string => {
  return `karenina_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Force clear any lingering browser storage (for reset buttons)
 * Note: With pure state management, this is mainly for cleanup of any old data
 */
export const forceResetAllData = (): void => {
  logger.debugLog('STORAGE', 'forceResetAllData: Clearing any lingering browser storage', 'dataLoader');

  try {
    // Clear any localStorage items that might exist from previous versions
    const keysToRemove = ['extractedQuestions', 'generatedTemplates', 'checkpoint', 'generated_templates_session'];

    keysToRemove.forEach((key) => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        logger.debugLog('STORAGE', `Cleared localStorage: ${key}`, 'dataLoader');
      }
    });

    // Clear any sessionStorage items
    const sessionKeysToRemove = ['generated_templates_session', 'karenina_session_active', 'karenina_current_session'];

    sessionKeysToRemove.forEach((key) => {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        logger.debugLog('STORAGE', `Cleared sessionStorage: ${key}`, 'dataLoader');
      }
    });

    logger.debugLog('STORAGE', 'Force reset complete - any lingering browser data cleared', 'dataLoader');
  } catch (error) {
    logger.error('STORAGE', 'Error during force reset', 'dataLoader', { error });
  }
};
