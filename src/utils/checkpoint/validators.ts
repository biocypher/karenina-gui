/**
 * Checkpoint Validation Utilities
 * Validation functions for checkpoint data
 */

import type { JsonLdCheckpoint } from '../../types';
import { CheckpointConversionError } from './types';

/**
 * Validates a JSON-LD checkpoint structure
 * @param checkpoint - The checkpoint to validate
 * @throws CheckpointConversionError if validation fails
 */
export function validateJsonLdCheckpoint(checkpoint: JsonLdCheckpoint): void {
  const errors: string[] = [];

  // Validate required fields
  if (!checkpoint['@type'] || checkpoint['@type'] !== 'DataFeed') {
    errors.push('Root object must be of type "DataFeed"');
  }

  // Version field represents dataset content version, not checkpoint format version
  // No specific format requirements - user can use any versioning scheme

  if (!checkpoint.dataFeedElement || !Array.isArray(checkpoint.dataFeedElement)) {
    errors.push('dataFeedElement must be an array of DataFeedItem objects');
  }

  // Validate DataFeedItem objects
  checkpoint.dataFeedElement.forEach((item, index) => {
    if (item['@type'] !== 'DataFeedItem') {
      errors.push(`Item ${index} must be of type "DataFeedItem"`);
    }

    if (!item.item || item.item['@type'] !== 'Question') {
      errors.push(`Item ${index} must contain a Question object`);
    }

    const question = item.item;
    if (!question.text || !question.acceptedAnswer || !question.hasPart) {
      errors.push(`Question ${index} missing required fields (text, acceptedAnswer, hasPart)`);
    }

    if (question.hasPart['@type'] !== 'SoftwareSourceCode') {
      errors.push(`Question ${index} hasPart must be SoftwareSourceCode`);
    }

    // Validate ratings
    if (question.rating) {
      question.rating.forEach((rating, ratingIndex) => {
        if (rating['@type'] !== 'Rating') {
          errors.push(`Question ${index} rating ${ratingIndex} must be of type "Rating"`);
        }

        if (typeof rating.bestRating !== 'number' || typeof rating.worstRating !== 'number') {
          errors.push(`Question ${index} rating ${ratingIndex} must have numeric bestRating and worstRating`);
        }

        const validAdditionalTypes = [
          'GlobalRubricTrait',
          'QuestionSpecificRubricTrait',
          'GlobalRegexTrait',
          'QuestionSpecificRegexTrait',
          'GlobalCallableTrait',
          'QuestionSpecificCallableTrait',
          'GlobalMetricRubricTrait',
          'QuestionSpecificMetricRubricTrait',
        ];

        if (!rating.additionalType || !validAdditionalTypes.includes(rating.additionalType)) {
          errors.push(
            `Question ${index} rating ${ratingIndex} must have valid additionalType (got: ${rating.additionalType})`
          );
        }
      });
    }
  });

  if (errors.length > 0) {
    throw new CheckpointConversionError(`JSON-LD validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Type guard to check if data is a JSON-LD checkpoint
 * @param data - The data to check
 * @returns True if the data is a valid JSON-LD checkpoint
 */
export function isJsonLdCheckpoint(data: unknown): data is JsonLdCheckpoint {
  return !!(
    (
      typeof data === 'object' &&
      data !== null &&
      '@type' in data &&
      data['@type'] === 'DataFeed' &&
      '@context' in data &&
      'dataFeedElement' in data &&
      Array.isArray((data as JsonLdCheckpoint).dataFeedElement) &&
      'version' in data &&
      typeof (data as JsonLdCheckpoint).version === 'string'
    )
    // Note: version field is dataset content version, not format version
    // Format detection relies on @context and @type fields
  );
}

/**
 * Type guard to check if data is a v2.0 checkpoint
 * @param data - The data to check
 * @returns True if the data is a valid v2.0 checkpoint
 */
export function isV2Checkpoint(data: unknown): data is import('../../types').UnifiedCheckpoint {
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    (data as { version: string }).version === '2.0' &&
    'checkpoint' in data &&
    typeof (data as { checkpoint: unknown }).checkpoint === 'object' &&
    (data as { checkpoint: unknown }).checkpoint !== null
  );
}
