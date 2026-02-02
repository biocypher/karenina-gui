/**
 * Checkpoint Converter - Backward Compatibility Entry Point
 *
 * This file now serves as a re-export layer for the modularized checkpoint converter.
 * The actual implementation has been split into focused modules in utils/checkpoint/:
 * - types.ts: Type definitions and constants
 * - idGenerator.ts: Question ID generation
 * - validators.ts: Validation functions and type guards
 * - traitConverters.ts: Conversion between rubric traits and Rating objects
 * - converter.ts: Main conversion orchestration
 *
 * @deprecated Import directly from utils/checkpoint instead for new code.
 *             This file is maintained for backward compatibility.
 */

export {
  v2ToJsonLd,
  jsonLdToV2,
  CheckpointConversionError,
  DEFAULT_CONVERSION_OPTIONS,
  validateJsonLdCheckpoint,
  isJsonLdCheckpoint,
  isV2Checkpoint,
  generateQuestionId,
  convertRubricTraitToRating,
  convertRegexTraitToRating,
  convertCallableTraitToRating,
  convertMetricTraitToRating,
  convertRatingToRubricTrait,
  convertRatingToRegexTrait,
  convertRatingToCallableTrait,
  convertRatingToMetricTrait,
} from './checkpoint';

export type { ConversionOptions } from './checkpoint';
