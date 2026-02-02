/**
 * Checkpoint Converter Module
 * Exports all checkpoint conversion utilities
 *
 * This module provides conversion between v2.0 UnifiedCheckpoint and JSON-LD formats.
 * The original checkpoint-converter.ts has been split into focused modules:
 * - types.ts: Type definitions and constants
 * - idGenerator.ts: Question ID generation
 * - validators.ts: Validation functions and type guards
 * - traitConverters.ts: Conversion between rubric traits and Rating objects
 * - converter.ts: Main conversion orchestration
 */

// Main conversion functions
export { v2ToJsonLd, jsonLdToV2, CheckpointConversionError, DEFAULT_CONVERSION_OPTIONS } from './converter';
export type { ConversionOptions } from './converter';

// Validation and type guards
export { validateJsonLdCheckpoint, isJsonLdCheckpoint, isV2Checkpoint } from './validators';

// ID generation
export { generateQuestionId } from './idGenerator';

// Trait converters (for advanced use cases)
export {
  convertRubricTraitToRating,
  convertRegexTraitToRating,
  convertCallableTraitToRating,
  convertMetricTraitToRating,
  convertRatingToRubricTrait,
  convertRatingToRegexTrait,
  convertRatingToCallableTrait,
  convertRatingToMetricTrait,
} from './traitConverters';
