/**
 * Rubric Trait Conversion Utilities
 * Converts between rubric traits and Schema.org Rating objects
 */

import type {
  RubricTrait,
  RegexTrait,
  CallableTrait,
  MetricRubricTrait,
  SchemaOrgRating,
  SchemaOrgPropertyValue,
} from '../../types';
import { CheckpointConversionError } from './types';

/**
 * Validates and normalizes score values for rubric traits
 * @param value - The score value to validate (can be null, undefined, or number)
 * @param defaultValue - Default value to use if score is null/undefined
 * @param fieldName - Name of the field for error messages ('min_score' or 'max_score')
 * @param traitName - Name of the trait for error messages
 * @returns Validated score value
 */
function validateScoreValue(
  value: number | null | undefined,
  defaultValue: number,
  fieldName: string,
  traitName: string
): number {
  // Use default if value is null or undefined
  if (value === null || value === undefined) {
    return defaultValue;
  }

  // Validate that it's a number
  if (typeof value !== 'number' || isNaN(value)) {
    throw new CheckpointConversionError(
      `Invalid ${fieldName} for trait "${traitName}": expected number, got ${typeof value}`
    );
  }

  // Validate reasonable range (allow negative scores for flexibility)
  if (!isFinite(value)) {
    throw new CheckpointConversionError(
      `Invalid ${fieldName} for trait "${traitName}": value must be finite, got ${value}`
    );
  }

  return value;
}

/**
 * Higher Is Better Property
 * Common additional property for all trait types
 */
function createHigherIsBetterProperty(higherIsBetter: boolean | undefined): SchemaOrgPropertyValue {
  return {
    '@type': 'PropertyValue',
    name: 'higher_is_better',
    value: higherIsBetter ?? true,
  };
}

/**
 * Deep Judgment Fields
 * Additional properties for LLM traits with deep judgment enabled
 */
function createDeepJudgmentProperties(trait: {
  deep_judgment_enabled?: boolean;
  deep_judgment_excerpt_enabled?: boolean;
  deep_judgment_max_excerpts?: number;
  deep_judgment_fuzzy_match_threshold?: number;
  deep_judgment_excerpt_retry_attempts?: number;
  deep_judgment_search_enabled?: boolean;
}): Record<string, unknown> {
  if (!trait.deep_judgment_enabled) {
    return {};
  }

  return {
    deep_judgment_enabled: trait.deep_judgment_enabled,
    deep_judgment_excerpt_enabled: trait.deep_judgment_excerpt_enabled,
    deep_judgment_max_excerpts: trait.deep_judgment_max_excerpts,
    deep_judgment_fuzzy_match_threshold: trait.deep_judgment_fuzzy_match_threshold,
    deep_judgment_excerpt_retry_attempts: trait.deep_judgment_excerpt_retry_attempts,
    deep_judgment_search_enabled: trait.deep_judgment_search_enabled,
  };
}

/**
 * Converts a rubric trait to a Schema.org Rating object
 * @param trait - The rubric trait to convert
 * @param rubricType - Whether this is a global or question-specific trait
 * @returns A Schema.org Rating object
 */
export function convertRubricTraitToRating(
  trait: RubricTrait,
  rubricType: 'global' | 'question-specific'
): SchemaOrgRating {
  const additionalType = rubricType === 'global' ? 'GlobalRubricTrait' : 'QuestionSpecificRubricTrait';

  // Base rating object
  const baseRating = {
    '@type': 'Rating' as const,
    '@id': `urn:uuid:rating-${trait.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: trait.name,
    description: trait.description,
    additionalType,
  };

  // Add deep judgment configuration if present (for LLM traits)
  const deepJudgmentFields = createDeepJudgmentProperties(trait);

  // Add higher_is_better to additionalProperty
  const additionalProperty: SchemaOrgPropertyValue[] = [createHigherIsBetterProperty(trait.higher_is_better)];

  if (trait.kind === 'boolean') {
    return {
      ...baseRating,
      bestRating: 1,
      worstRating: 0,
      additionalProperty,
      ...deepJudgmentFields,
    };
  } else {
    // Score trait - validate and handle score ranges
    const minScore = validateScoreValue(trait.min_score, 1, 'min_score', trait.name);
    const maxScore = validateScoreValue(trait.max_score, 5, 'max_score', trait.name);

    // Validate that min <= max
    if (minScore >= maxScore) {
      throw new CheckpointConversionError(
        `Invalid score range for trait "${trait.name}": min_score (${minScore}) must be less than max_score (${maxScore})`
      );
    }

    return {
      ...baseRating,
      bestRating: maxScore,
      worstRating: minScore,
      additionalProperty,
      ...deepJudgmentFields,
    };
  }
}

/**
 * Converts a regex trait to a Schema.org Rating object
 * @param trait - The regex trait to convert
 * @param rubricType - Whether this is a global or question-specific trait
 * @returns A Schema.org Rating object
 */
export function convertRegexTraitToRating(
  trait: RegexTrait,
  rubricType: 'global' | 'question-specific'
): SchemaOrgRating {
  const additionalType = rubricType === 'global' ? 'GlobalRegexTrait' : 'QuestionSpecificRegexTrait';

  return {
    '@type': 'Rating' as const,
    '@id': `urn:uuid:rating-${trait.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: trait.name,
    description: trait.description,
    additionalType,
    bestRating: 1,
    worstRating: 0,
    additionalProperty: [
      {
        '@type': 'PropertyValue' as const,
        name: 'pattern',
        value: trait.pattern,
      },
      {
        '@type': 'PropertyValue' as const,
        name: 'case_sensitive',
        value: trait.case_sensitive ?? true,
      },
      {
        '@type': 'PropertyValue' as const,
        name: 'invert_result',
        value: trait.invert_result ?? false,
      },
      createHigherIsBetterProperty(trait.higher_is_better),
    ],
  };
}

/**
 * Converts a callable trait to a Schema.org Rating object
 * @param trait - The callable trait to convert
 * @param rubricType - Whether this is a global or question-specific trait
 * @returns A Schema.org Rating object
 */
export function convertCallableTraitToRating(
  trait: CallableTrait,
  rubricType: 'global' | 'question-specific'
): SchemaOrgRating {
  const additionalType = rubricType === 'global' ? 'GlobalCallableTrait' : 'QuestionSpecificCallableTrait';

  const additionalProperties: SchemaOrgPropertyValue[] = [
    {
      '@type': 'PropertyValue' as const,
      name: 'callable_code',
      value: trait.callable_code,
    },
    {
      '@type': 'PropertyValue' as const,
      name: 'kind',
      value: trait.kind,
    },
    {
      '@type': 'PropertyValue' as const,
      name: 'invert_result',
      value: trait.invert_result ?? false,
    },
    createHigherIsBetterProperty(trait.higher_is_better),
  ];

  // Add min_score and max_score for score-based callables
  if (trait.min_score !== undefined) {
    additionalProperties.push({
      '@type': 'PropertyValue' as const,
      name: 'min_score',
      value: trait.min_score,
    });
  }

  if (trait.max_score !== undefined) {
    additionalProperties.push({
      '@type': 'PropertyValue' as const,
      name: 'max_score',
      value: trait.max_score,
    });
  }

  return {
    '@type': 'Rating' as const,
    '@id': `urn:uuid:rating-${trait.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: trait.name,
    description: trait.description,
    additionalType,
    bestRating: trait.kind === 'boolean' ? 1 : (trait.max_score ?? 5),
    worstRating: trait.kind === 'boolean' ? 0 : (trait.min_score ?? 1),
    additionalProperty: additionalProperties,
  };
}

/**
 * Converts a metric trait to a Schema.org Rating object
 * @param trait - The metric trait to convert
 * @param rubricType - Whether this is a global or question-specific trait
 * @returns A Schema.org Rating object
 */
export function convertMetricTraitToRating(
  trait: MetricRubricTrait,
  rubricType: 'global' | 'question-specific'
): SchemaOrgRating {
  const additionalType = rubricType === 'global' ? 'GlobalMetricRubricTrait' : 'QuestionSpecificMetricRubricTrait';

  return {
    '@type': 'Rating' as const,
    '@id': `urn:uuid:rating-${trait.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: trait.name,
    description: trait.description,
    additionalType,
    bestRating: 1, // Metric traits produce metric dictionaries, not simple scores
    worstRating: 0,
    additionalProperty: [
      {
        '@type': 'PropertyValue' as const,
        name: 'evaluation_mode',
        value: trait.evaluation_mode,
      },
      {
        '@type': 'PropertyValue' as const,
        name: 'metrics',
        value: trait.metrics,
      },
      {
        '@type': 'PropertyValue' as const,
        name: 'tp_instructions',
        value: trait.tp_instructions,
      },
      {
        '@type': 'PropertyValue' as const,
        name: 'tn_instructions',
        value: trait.tn_instructions ?? [],
      },
      {
        '@type': 'PropertyValue' as const,
        name: 'repeated_extraction',
        value: trait.repeated_extraction ?? false,
      },
    ],
  };
}

/**
 * Helper to extract a property value from additionalProperty array
 */
function extractProperty(rating: SchemaOrgRating, propertyName: string): unknown {
  return rating.additionalProperty?.find((prop) => prop.name === propertyName)?.value;
}

/**
 * Converts a Schema.org Rating object to a rubric trait
 * @param rating - The Rating object to convert
 * @returns A rubric trait
 */
export function convertRatingToRubricTrait(rating: SchemaOrgRating): RubricTrait {
  // Validate rating object
  if (!rating || typeof rating !== 'object') {
    throw new CheckpointConversionError('Invalid rating object: rating must be a valid object');
  }

  if (typeof rating.name !== 'string' || !rating.name.trim()) {
    throw new CheckpointConversionError('Invalid rating object: name is required and must be a non-empty string');
  }

  if (typeof rating.bestRating !== 'number' || typeof rating.worstRating !== 'number') {
    throw new CheckpointConversionError(
      `Invalid rating object "${rating.name}": bestRating and worstRating must be numbers`
    );
  }

  // Determine if it's a boolean trait (standard 0-1 range)
  const isBoolean = rating.bestRating === 1 && rating.worstRating === 0;

  // Validate score range for non-boolean traits
  if (!isBoolean && rating.worstRating >= rating.bestRating) {
    throw new CheckpointConversionError(
      `Invalid rating object "${rating.name}": worstRating (${rating.worstRating}) must be less than bestRating (${rating.bestRating})`
    );
  }

  // Extract higher_is_better from additionalProperty (default true for legacy)
  const higherIsBetter = (extractProperty(rating, 'higher_is_better') as boolean) ?? true;

  // Restore deep judgment configuration if present
  const trait: RubricTrait = {
    name: rating.name,
    description: rating.description,
    kind: isBoolean ? 'boolean' : 'score',
    min_score: isBoolean ? undefined : rating.worstRating,
    max_score: isBoolean ? undefined : rating.bestRating,
    higher_is_better: higherIsBetter,
  };

  // Add deep judgment fields if they were saved
  if (rating.deep_judgment_enabled !== undefined) {
    trait.deep_judgment_enabled = rating.deep_judgment_enabled;
    trait.deep_judgment_excerpt_enabled = rating.deep_judgment_excerpt_enabled;
    trait.deep_judgment_max_excerpts = rating.deep_judgment_max_excerpts;
    trait.deep_judgment_fuzzy_match_threshold = rating.deep_judgment_fuzzy_match_threshold;
    trait.deep_judgment_excerpt_retry_attempts = rating.deep_judgment_excerpt_retry_attempts;
    trait.deep_judgment_search_enabled = rating.deep_judgment_search_enabled;
  }

  return trait;
}

/**
 * Converts a Schema.org Rating object to a regex trait
 * @param rating - The Rating object to convert
 * @returns A regex trait
 */
export function convertRatingToRegexTrait(rating: SchemaOrgRating): RegexTrait {
  // Validate rating object
  if (!rating || typeof rating !== 'object') {
    throw new CheckpointConversionError('Invalid rating object: rating must be a valid object');
  }

  if (typeof rating.name !== 'string' || !rating.name.trim()) {
    throw new CheckpointConversionError('Invalid rating object: name is required and must be a non-empty string');
  }

  const pattern = extractProperty(rating, 'pattern') as string | undefined;
  const caseSensitive = extractProperty(rating, 'case_sensitive') as boolean | undefined;
  const invertResult = extractProperty(rating, 'invert_result') as boolean | undefined;
  const higherIsBetter = (extractProperty(rating, 'higher_is_better') as boolean | undefined) ?? true;

  if (!pattern) {
    throw new CheckpointConversionError(`Invalid regex trait "${rating.name}": pattern is required`);
  }

  return {
    name: rating.name,
    description: rating.description,
    pattern,
    case_sensitive: caseSensitive ?? true,
    invert_result: invertResult ?? false,
    higher_is_better: higherIsBetter,
  };
}

/**
 * Converts a Schema.org Rating object to a callable trait
 * @param rating - The Rating object to convert
 * @returns A callable trait
 */
export function convertRatingToCallableTrait(rating: SchemaOrgRating): CallableTrait {
  // Validate rating object
  if (!rating || typeof rating !== 'object') {
    throw new CheckpointConversionError('Invalid rating object: rating must be a valid object');
  }

  if (typeof rating.name !== 'string' || !rating.name.trim()) {
    throw new CheckpointConversionError('Invalid rating object: name is required and must be a non-empty string');
  }

  const callableCode = extractProperty(rating, 'callable_code') as string | undefined;
  const kind = extractProperty(rating, 'kind') as 'boolean' | 'score' | undefined;
  const minScore = extractProperty(rating, 'min_score') as number | undefined;
  const maxScore = extractProperty(rating, 'max_score') as number | undefined;
  const invertResult = extractProperty(rating, 'invert_result') as boolean | undefined;
  const higherIsBetter = (extractProperty(rating, 'higher_is_better') as boolean | undefined) ?? true;

  if (!callableCode) {
    throw new CheckpointConversionError(`Invalid callable trait "${rating.name}": callable_code is required`);
  }

  if (!kind || (kind !== 'boolean' && kind !== 'score')) {
    throw new CheckpointConversionError(`Invalid callable trait "${rating.name}": kind must be 'boolean' or 'score'`);
  }

  return {
    name: rating.name,
    description: rating.description,
    callable_code: callableCode,
    kind,
    ...(minScore !== undefined && { min_score: minScore }),
    ...(maxScore !== undefined && { max_score: maxScore }),
    invert_result: invertResult ?? false,
    higher_is_better: higherIsBetter,
  };
}

/**
 * Converts a Schema.org Rating object to a metric trait
 * @param rating - The Rating object to convert
 * @returns A metric trait
 */
export function convertRatingToMetricTrait(rating: SchemaOrgRating): MetricRubricTrait {
  // Validate rating object
  if (!rating || typeof rating !== 'object') {
    throw new CheckpointConversionError('Invalid rating object: rating must be a valid object');
  }

  if (typeof rating.name !== 'string' || !rating.name.trim()) {
    throw new CheckpointConversionError('Invalid rating object: name is required and must be a non-empty string');
  }

  const evaluationMode = extractProperty(rating, 'evaluation_mode') as 'tp_only' | 'tn_only' | 'tp_and_tn' | undefined;
  const metrics = extractProperty(rating, 'metrics') as string[] | undefined;
  const tpInstructions = extractProperty(rating, 'tp_instructions') as string[] | undefined;
  const tnInstructions = extractProperty(rating, 'tn_instructions') as string[] | undefined;
  const repeatedExtraction = extractProperty(rating, 'repeated_extraction') as boolean | undefined;

  if (!evaluationMode || !['tp_only', 'tn_only', 'tp_and_tn'].includes(evaluationMode)) {
    throw new CheckpointConversionError(
      `Invalid metric trait "${rating.name}": evaluation_mode must be 'tp_only', 'tn_only', or 'tp_and_tn'`
    );
  }

  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    throw new CheckpointConversionError(`Invalid metric trait "${rating.name}": metrics array is required`);
  }

  if (!tpInstructions || !Array.isArray(tpInstructions)) {
    throw new CheckpointConversionError(`Invalid metric trait "${rating.name}": tp_instructions array is required`);
  }

  return {
    name: rating.name,
    description: rating.description,
    evaluation_mode: evaluationMode,
    metrics,
    tp_instructions: tpInstructions,
    tn_instructions: tnInstructions ?? [],
    repeated_extraction: repeatedExtraction ?? false,
  };
}
