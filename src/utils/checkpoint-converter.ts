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
} from '../types/index';
// Import context as JSON (TypeScript doesn't handle .jsonld extension)
const schemaOrgContext = {
  '@context': {
    '@version': 1.1,
    '@vocab': 'http://schema.org/',
    Dataset: 'Dataset',
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
    hasPart: { '@id': 'hasPart', '@container': '@set' },
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
}

export const DEFAULT_CONVERSION_OPTIONS: ConversionOptions = {
  preserveIds: true,
  includeMetadata: true,
  validateOutput: true,
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
    // Score trait
    const minScore = trait.min_score || 1;
    const maxScore = trait.max_score || 5;
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
  const isBoolean = rating.bestRating === 1 && rating.worstRating === 0;

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
        ],
      };

      // Convert rubric traits to Rating objects
      const ratings: SchemaOrgRating[] = [];

      // Add global rubric traits
      if (checkpoint.global_rubric) {
        checkpoint.global_rubric.traits.forEach((trait) => {
          const rating = convertRubricTraitToRating(trait, 'global');
          ratings.push(rating);
        });
      }

      // Add question-specific rubric traits
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

    // Add global rubric serialization
    if (checkpoint.global_rubric) {
      additionalProperties.push({
        '@type': 'PropertyValue',
        name: 'global_rubric_traits',
        value: JSON.stringify(checkpoint.global_rubric.traits),
      });
    }

    // Add conversion metadata if requested
    if (options.includeMetadata) {
      const metadata: CheckpointConversionMetadata = {
        originalVersion: checkpoint.version,
        convertedAt: timestamp,
        totalQuestions: questionIds.length,
        totalRatings: dataFeedItems.reduce((sum, item) => sum + (item.item.rating?.length || 0), 0),
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
      '@type': 'Dataset',
      '@id': options.preserveIds ? `urn:uuid:karenina-checkpoint-${Date.now()}` : undefined,
      name: 'Karenina LLM Benchmark Checkpoint',
      description: `Checkpoint containing ${questionIds.length} benchmark questions with answer templates and rubric evaluations`,
      version: '3.0.0-jsonld',
      creator: 'Karenina Benchmarking System',
      dateCreated: timestamp,
      dateModified: timestamp,
      hasPart: dataFeedItems,
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
    // Extract global rubric from additional properties
    let globalRubric: Rubric | null = null;
    const globalRubricProperty = jsonLdCheckpoint.additionalProperty?.find(
      (prop) => prop.name === 'global_rubric_traits'
    );

    if (globalRubricProperty && typeof globalRubricProperty.value === 'string') {
      try {
        const traits = JSON.parse(globalRubricProperty.value) as RubricTrait[];
        globalRubric = { traits };
      } catch {
        // Invalid JSON, ignore global rubric
      }
    }

    // Convert DataFeedItem objects back to CheckpointItem
    const checkpoint: { [key: string]: CheckpointItem } = {};

    jsonLdCheckpoint.hasPart.forEach((dataFeedItem, index) => {
      const question = dataFeedItem.item;

      // Generate a question ID (use index if no ID preserved)
      const questionId = dataFeedItem['@id']?.replace('urn:uuid:', '') || `question_${index}`;

      // Extract additional properties
      const finishedProp = question.additionalProperty?.find((prop) => prop.name === 'finished');
      const originalTemplateProp = question.additionalProperty?.find(
        (prop) => prop.name === 'original_answer_template'
      );

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
        last_modified: dataFeedItem.dateModified,
        finished: (finishedProp?.value as boolean) || false,
        question_rubric: questionRubric,
      };

      checkpoint[questionId] = checkpointItem;
    });

    const result: UnifiedCheckpoint = {
      version: '2.0',
      global_rubric: globalRubric,
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
  if (!checkpoint['@type'] || checkpoint['@type'] !== 'Dataset') {
    errors.push('Root object must be of type "Dataset"');
  }

  if (!checkpoint.version || !checkpoint.version.includes('jsonld')) {
    errors.push('Version must include "jsonld" identifier');
  }

  if (!checkpoint.hasPart || !Array.isArray(checkpoint.hasPart)) {
    errors.push('hasPart must be an array of DataFeedItem objects');
  }

  // Validate DataFeedItem objects
  checkpoint.hasPart.forEach((item, index) => {
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
    typeof data === 'object' &&
    data !== null &&
    '@type' in data &&
    data['@type'] === 'Dataset' &&
    '@context' in data &&
    'hasPart' in data &&
    Array.isArray(data.hasPart) &&
    'version' in data &&
    typeof data.version === 'string' &&
    data.version.includes('jsonld')
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
