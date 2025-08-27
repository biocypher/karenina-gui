import {
  UnifiedCheckpoint,
  JsonLdCheckpoint,
  SchemaOrgDataFeedItem,
  SchemaOrgQuestion,
  SchemaOrgRating,
  SchemaOrgPropertyValue,
  CheckpointItem,
  RubricTrait,
  Rubric,
  CheckpointConversionMetadata,
  SchemaOrgPerson,
  SchemaOrgCreativeWork,
  DatasetMetadata,
} from '../types/index';
// Import context as JSON (TypeScript doesn't handle .jsonld extension)
const schemaOrgContext = {
  '@context': {
    '@version': 1.1,
    '@vocab': 'http://schema.org/',
    DataFeed: 'DataFeed',
    DataFeedItem: 'DataFeedItem',
    Question: 'Question',
    Answer: 'Answer',
    SoftwareSourceCode: 'SoftwareSourceCode',
    Rating: 'Rating',
    PropertyValue: 'PropertyValue',
    version: 'version',
    name: 'name',
    description: 'description',
    creator: 'creator',
    dateCreated: 'dateCreated',
    dateModified: 'dateModified',
    dataFeedElement: { '@id': 'dataFeedElement', '@container': '@set' },
    item: { '@id': 'item', '@type': '@id' },
    text: 'text',
    acceptedAnswer: { '@id': 'acceptedAnswer', '@type': '@id' },
    programmingLanguage: 'programmingLanguage',
    codeRepository: 'codeRepository',
    rating: { '@id': 'rating', '@container': '@set' },
    bestRating: 'bestRating',
    worstRating: 'worstRating',
    ratingExplanation: 'ratingExplanation',
    additionalType: 'additionalType',
    additionalProperty: { '@id': 'additionalProperty', '@container': '@set' },
    value: 'value',
    url: 'url',
    identifier: 'identifier',
  },
};

export class CheckpointConversionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'CheckpointConversionError';
  }
}

export interface ConversionOptions {
  preserveIds?: boolean; // Whether to preserve question IDs in URN format
  includeMetadata?: boolean; // Whether to include conversion metadata
  validateOutput?: boolean; // Whether to validate the converted output
  isCreation?: boolean; // Whether this is a new checkpoint creation vs. modification
}

export const DEFAULT_CONVERSION_OPTIONS: ConversionOptions = {
  preserveIds: true,
  includeMetadata: true,
  validateOutput: true,
  isCreation: false, // Default to update behavior (preserve existing dateCreated)
};

export function generateQuestionId(questionText: string): string {
  // Create a deterministic ID based on question text
  const hash = questionText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);

  // Add a simple hash suffix for uniqueness
  const simpleHash = Math.abs(
    questionText.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0)
  ).toString(16);

  return `urn:uuid:question-${hash}-${simpleHash}`;
}

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

export function convertRubricTraitToRating(
  trait: RubricTrait,
  rubricType: 'global' | 'question-specific'
): SchemaOrgRating {
  const additionalType = rubricType === 'global' ? 'GlobalRubricTrait' : 'QuestionSpecificRubricTrait';

  if (trait.kind === 'boolean') {
    return {
      '@type': 'Rating',
      '@id': `urn:uuid:rating-${trait.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: trait.name,
      description: trait.description,
      bestRating: 1,
      worstRating: 0,
      additionalType,
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
      '@type': 'Rating',
      '@id': `urn:uuid:rating-${trait.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: trait.name,
      description: trait.description,
      bestRating: maxScore,
      worstRating: minScore,
      additionalType,
    };
  }
}

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

  return {
    name: rating.name,
    description: rating.description,
    kind: isBoolean ? 'boolean' : 'score',
    min_score: isBoolean ? undefined : rating.worstRating,
    max_score: isBoolean ? undefined : rating.bestRating,
  };
}

export function v2ToJsonLd(
  checkpoint: UnifiedCheckpoint,
  options: ConversionOptions = DEFAULT_CONVERSION_OPTIONS
): JsonLdCheckpoint {
  try {
    const timestamp = new Date().toISOString();
    const questionIds = Object.keys(checkpoint.checkpoint);

    // Convert checkpoint items to DataFeedItem objects
    const dataFeedItems: SchemaOrgDataFeedItem[] = questionIds.map((questionId) => {
      const item = checkpoint.checkpoint[questionId];

      // Create the Question object
      const question: SchemaOrgQuestion = {
        '@type': 'Question',
        '@id': options.preserveIds ? generateQuestionId(item.question) : undefined,
        text: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          '@id': options.preserveIds ? `urn:uuid:answer-${questionId}` : undefined,
          text: item.raw_answer,
        },
        hasPart: {
          '@type': 'SoftwareSourceCode',
          '@id': options.preserveIds ? `urn:uuid:template-${questionId}` : undefined,
          name: `${item.question.substring(0, 30)}... Answer Template`,
          text: item.answer_template,
          programmingLanguage: 'Python',
          codeRepository: 'karenina-benchmarks',
        },
        additionalProperty: [
          {
            '@type': 'PropertyValue',
            name: 'finished',
            value: item.finished,
          },
          {
            '@type': 'PropertyValue',
            name: 'original_answer_template',
            value: item.original_answer_template,
          },
          // Include author as JSON string if present
          ...(item.author
            ? [
                {
                  '@type': 'PropertyValue' as const,
                  name: 'author',
                  value: JSON.stringify(item.author),
                },
              ]
            : []),
          // Include sources as JSON string if present
          ...(item.sources && item.sources.length > 0
            ? [
                {
                  '@type': 'PropertyValue' as const,
                  name: 'sources',
                  value: JSON.stringify(item.sources),
                },
              ]
            : []),
          // Include custom metadata if present
          ...(item.custom_metadata
            ? Object.entries(item.custom_metadata).map(([key, value]) => ({
                '@type': 'PropertyValue' as const,
                name: `custom_${key}`, // Prefix to distinguish from system properties
                value: value,
              }))
            : []),
        ],
      };

      // Convert only question-specific rubric traits to Rating objects
      const ratings: SchemaOrgRating[] = [];

      // Add only question-specific rubric traits (global traits will be stored at Dataset level)
      if (item.question_rubric) {
        item.question_rubric.traits.forEach((trait) => {
          const rating = convertRubricTraitToRating(trait, 'question-specific');
          ratings.push(rating);
        });
      }

      if (ratings.length > 0) {
        question.rating = ratings;
      }

      return {
        '@type': 'DataFeedItem',
        '@id': options.preserveIds ? `urn:uuid:${questionId}` : undefined,
        dateCreated: item.date_created || item.last_modified, // Use date_created if available, fallback to last_modified
        dateModified: item.last_modified,
        item: question,
      };
    });

    // Create additional properties for metadata
    const additionalProperties: SchemaOrgPropertyValue[] = [
      {
        '@type': 'PropertyValue',
        name: 'checkpoint_format_version',
        value: '3.0.0-jsonld',
      },
    ];

    // Global rubric traits will be stored as Rating objects at Dataset level (removed JSON string version)

    // Use dataset metadata if available, otherwise fallback to defaults
    const datasetMeta = checkpoint.dataset_metadata;
    const defaultName = 'Karenina LLM Benchmark Checkpoint';
    const defaultDescription = `Checkpoint containing ${questionIds.length} benchmark questions with answer templates and rubric evaluations`;
    const defaultCreator = 'Karenina Benchmarking System';

    // Handle timestamp logic based on context and existing metadata
    let dateCreated: string;
    let dateModified: string;

    if (datasetMeta?.dateCreated) {
      // Always preserve existing dateCreated - it should never change once set
      dateCreated = datasetMeta.dateCreated;
    } else {
      // No existing dateCreated - this is a new checkpoint, use current time
      dateCreated = timestamp;
    }

    if (datasetMeta?.dateModified && !options.isCreation) {
      // For pure format conversions, preserve existing dateModified
      dateModified = datasetMeta.dateModified;
    } else {
      // No existing dateModified OR this is a creation/modification - use current timestamp
      dateModified = timestamp;
    }

    // Convert global rubric traits to Rating objects for Dataset level
    let globalRatings: SchemaOrgRating[] | undefined;
    if (checkpoint.global_rubric) {
      globalRatings = checkpoint.global_rubric.traits.map((trait) => convertRubricTraitToRating(trait, 'global'));
    }

    // Add conversion metadata if requested (after globalRatings is defined)
    if (options.includeMetadata) {
      const globalRatingCount = globalRatings ? globalRatings.length : 0;
      const questionRatingCount = dataFeedItems.reduce((sum, item) => sum + (item.item.rating?.length || 0), 0);

      const metadata: CheckpointConversionMetadata = {
        originalVersion: checkpoint.version,
        convertedAt: timestamp,
        totalQuestions: questionIds.length,
        totalRatings: globalRatingCount + questionRatingCount,
      };

      additionalProperties.push({
        '@type': 'PropertyValue',
        name: 'conversion_metadata',
        value: JSON.stringify(metadata),
      });
    }

    // Create the final JSON-LD document
    const jsonLdCheckpoint: JsonLdCheckpoint = {
      '@context': schemaOrgContext['@context'],
      '@type': 'DataFeed',
      '@id': options.preserveIds ? `urn:uuid:karenina-checkpoint-${Date.now()}` : undefined,
      name: datasetMeta?.name || defaultName,
      description: datasetMeta?.description || defaultDescription,
      version: datasetMeta?.version || '0.1.0',
      creator: datasetMeta?.creator?.name || defaultCreator,
      dateCreated: dateCreated,
      dateModified: dateModified,
      rating: globalRatings, // Global rubric traits as Rating objects
      dataFeedElement: dataFeedItems,
      additionalProperty: additionalProperties,
    };

    // Validate output if requested
    if (options.validateOutput) {
      validateJsonLdCheckpoint(jsonLdCheckpoint);
    }

    return jsonLdCheckpoint;
  } catch (error) {
    throw new CheckpointConversionError(
      `Failed to convert v2.0 checkpoint to JSON-LD: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

export function jsonLdToV2(
  jsonLdCheckpoint: JsonLdCheckpoint
  // _options: ConversionOptions = DEFAULT_CONVERSION_OPTIONS
): UnifiedCheckpoint {
  try {
    // Extract global rubric from Dataset rating array
    let globalRubric: Rubric | null = null;
    if (jsonLdCheckpoint.rating && jsonLdCheckpoint.rating.length > 0) {
      // Filter for global rubric traits
      const globalRatings = jsonLdCheckpoint.rating.filter((rating) => rating.additionalType === 'GlobalRubricTrait');

      if (globalRatings.length > 0) {
        const traits = globalRatings.map(convertRatingToRubricTrait);
        globalRubric = { traits };
      }
    }

    // Convert DataFeedItem objects back to CheckpointItem
    const checkpoint: { [key: string]: CheckpointItem } = {};

    jsonLdCheckpoint.dataFeedElement.forEach((dataFeedItem, index) => {
      const question = dataFeedItem.item;

      // Generate a question ID (use index if no ID preserved)
      const questionId = dataFeedItem['@id']?.replace('urn:uuid:', '') || `question_${index}`;

      // Extract additional properties
      const finishedProp = question.additionalProperty?.find((prop) => prop.name === 'finished');
      const originalTemplateProp = question.additionalProperty?.find(
        (prop) => prop.name === 'original_answer_template'
      );
      const authorProp = question.additionalProperty?.find((prop) => prop.name === 'author');
      const sourcesProp = question.additionalProperty?.find((prop) => prop.name === 'sources');

      // Parse schema.org enhanced metadata
      let author: SchemaOrgPerson | undefined;
      let sources: SchemaOrgCreativeWork[] | undefined;

      if (authorProp && typeof authorProp.value === 'string') {
        try {
          author = JSON.parse(authorProp.value);
        } catch {
          // Invalid JSON, ignore author
        }
      }

      if (sourcesProp && typeof sourcesProp.value === 'string') {
        try {
          sources = JSON.parse(sourcesProp.value);
        } catch {
          // Invalid JSON, ignore sources
        }
      }

      // Extract custom metadata (properties with custom_ prefix)
      const customMetadata: { [key: string]: string } = {};
      question.additionalProperty
        ?.filter((prop) => prop.name.startsWith('custom_'))
        .forEach((prop) => {
          const key = prop.name.replace('custom_', ''); // Remove the custom_ prefix
          customMetadata[key] = prop.value as string;
        });

      // Convert ratings back to question-specific rubric
      let questionRubric: Rubric | undefined;
      if (question.rating && question.rating.length > 0) {
        const questionSpecificRatings = question.rating.filter(
          (rating) => rating.additionalType === 'QuestionSpecificRubricTrait'
        );

        if (questionSpecificRatings.length > 0) {
          questionRubric = {
            traits: questionSpecificRatings.map(convertRatingToRubricTrait),
          };
        }
      }

      const checkpointItem: CheckpointItem = {
        question: question.text,
        raw_answer: question.acceptedAnswer.text,
        original_answer_template: (originalTemplateProp?.value as string) || '',
        answer_template: question.hasPart.text,
        date_created: dataFeedItem.dateCreated, // Preserve DataFeedItem's dateCreated
        last_modified: dataFeedItem.dateModified,
        finished: (finishedProp?.value as boolean) || false,
        question_rubric: questionRubric,
        // Include custom metadata if any were found
        custom_metadata: Object.keys(customMetadata).length > 0 ? customMetadata : undefined,
        // Include schema.org enhanced metadata
        author: author,
        sources: sources,
      };

      checkpoint[questionId] = checkpointItem;
    });

    // Extract dataset metadata from the JSON-LD dataset properties
    // Always preserve the metadata that was explicitly saved in the checkpoint
    const datasetMetadata: DatasetMetadata = {
      name: jsonLdCheckpoint.name || undefined,
      description: jsonLdCheckpoint.description || undefined,
      version: jsonLdCheckpoint.version || undefined,
      dateCreated: jsonLdCheckpoint.dateCreated,
      dateModified: jsonLdCheckpoint.dateModified,
      creator:
        typeof jsonLdCheckpoint.creator === 'string'
          ? ({
              '@type': 'Person',
              name: jsonLdCheckpoint.creator,
            } as SchemaOrgPerson)
          : undefined,
    };

    // Include dataset metadata if any fields are present
    const hasCustomMetadata =
      datasetMetadata.name ||
      datasetMetadata.description ||
      datasetMetadata.version ||
      datasetMetadata.dateCreated ||
      datasetMetadata.dateModified ||
      datasetMetadata.creator;

    const result: UnifiedCheckpoint = {
      version: '2.0',
      global_rubric: globalRubric,
      dataset_metadata: hasCustomMetadata ? datasetMetadata : undefined,
      checkpoint,
    };

    return result;
  } catch (error) {
    throw new CheckpointConversionError(
      `Failed to convert JSON-LD checkpoint to v2.0: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

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

        if (
          !rating.additionalType ||
          (rating.additionalType !== 'GlobalRubricTrait' && rating.additionalType !== 'QuestionSpecificRubricTrait')
        ) {
          errors.push(`Question ${index} rating ${ratingIndex} must have valid additionalType`);
        }
      });
    }
  });

  if (errors.length > 0) {
    throw new CheckpointConversionError(`JSON-LD validation failed:\n${errors.join('\n')}`);
  }
}

export function isJsonLdCheckpoint(data: unknown): data is JsonLdCheckpoint {
  return !!(
    (
      typeof data === 'object' &&
      data !== null &&
      '@type' in data &&
      data['@type'] === 'DataFeed' &&
      '@context' in data &&
      'dataFeedElement' in data &&
      Array.isArray(data.dataFeedElement) &&
      'version' in data &&
      typeof data.version === 'string'
    )
    // Note: version field is dataset content version, not format version
    // Format detection relies on @context and @type fields
  );
}

export function isV2Checkpoint(data: unknown): data is UnifiedCheckpoint {
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    data.version === '2.0' &&
    'checkpoint' in data &&
    typeof data.checkpoint === 'object' &&
    data.checkpoint !== null
  );
}
