/**
 * Question Data Validation Utilities
 * Validation functions for loaded question data
 */

import type { QuestionData } from '../types';
import { logger } from './logger';
import { isPlaceholderTemplate, TEMPLATE_VALIDATION_ERRORS } from '../constants/templates';

/**
 * Result of question data validation
 */
export interface QuestionDataValidationResult {
  isValid: boolean;
  errorMessage: string | null;
  firstQuestionId: string | null;
}

/**
 * Validates loaded question data before loading into the store.
 * Checks for:
 * - Empty data
 * - Missing answer templates
 * - Placeholder templates (which should not be present in loaded data)
 *
 * @param data - The question data to validate
 * @returns Validation result with error details
 */
export function validateLoadedQuestionData(data: QuestionData): QuestionDataValidationResult {
  // Check for empty data
  const questionIds = Object.keys(data);
  if (questionIds.length === 0) {
    return {
      isValid: false,
      errorMessage: 'No questions found in the loaded data.',
      firstQuestionId: null,
    };
  }

  const firstQuestionId = questionIds[0];
  const firstQuestion = data[firstQuestionId];

  // Check for missing answer templates
  if (!firstQuestion?.answer_template) {
    return {
      isValid: false,
      errorMessage: "Error: These questions don't have answer templates. Please use the Template Generator first.",
      firstQuestionId: null,
    };
  }

  // Check for placeholder templates (should not be present in loaded data)
  const isGenericTemplate = isPlaceholderTemplate(firstQuestion.answer_template);
  if (isGenericTemplate) {
    logger.error('VALIDATION', 'Detected placeholder templates! This should not happen.', 'questionValidator');
    return {
      isValid: false,
      errorMessage: `Error: ${TEMPLATE_VALIDATION_ERRORS.PLACEHOLDER_DETECTED}`,
      firstQuestionId: null,
    };
  }

  // Valid data with generated templates
  logger.debugLog(
    'VALIDATION',
    'Questions validated with GENERATED templates (specific descriptions)',
    'questionValidator',
    { questionCount: questionIds.length }
  );

  return {
    isValid: true,
    errorMessage: null,
    firstQuestionId,
  };
}

/**
 * Validates that a question exists in the question data.
 * @param questionData - The question data to check
 * @param questionId - The question ID to validate
 * @returns True if the question exists
 */
export function questionExists(questionData: QuestionData, questionId: string): boolean {
  return questionId in questionData && !!questionData[questionId];
}

/**
 * Validates keywords array, filtering out invalid entries.
 * @param keywords - The keywords array to validate
 * @returns Filtered array of valid keyword strings
 */
export function validateKeywords(keywords?: unknown): string[] | undefined {
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return undefined;
  }
  const validKeywords = keywords.filter((k) => typeof k === 'string' && k.trim().length > 0);
  return validKeywords.length > 0 ? validKeywords : undefined;
}

/**
 * Validates a generated template string.
 * @param template - The template to validate
 * @returns Validated trimmed template or undefined if invalid
 */
export function validateGeneratedTemplate(template?: unknown): string | undefined {
  if (typeof template === 'string' && template.trim().length > 0) {
    return template.trim();
  }
  return undefined;
}
