/**
 * Checkpoint Converter - Main Entry Point
 * Converts between v2.0 UnifiedCheckpoint and JSON-LD formats
 */

import type {
  UnifiedCheckpoint,
  JsonLdCheckpoint,
  SchemaOrgDataFeedItem,
  SchemaOrgQuestion,
  SchemaOrgRating,
  SchemaOrgPropertyValue,
  CheckpointItem,
  Rubric,
  RegexTrait,
  CallableTrait,
  MetricRubricTrait,
  DatasetMetadata,
  SchemaOrgPerson,
  SchemaOrgCreativeWork,
} from '../../types';
import { logger } from '../logger';
import { CheckpointConversionError, DEFAULT_CONVERSION_OPTIONS, schemaOrgContext } from './types';
import type { ConversionOptions } from './types';
import { generateQuestionId } from './idGenerator';
import { validateJsonLdCheckpoint } from './validators';
import {
  convertRubricTraitToRating,
  convertRegexTraitToRating,
  convertCallableTraitToRating,
  convertMetricTraitToRating,
  convertRatingToRubricTrait,
  convertRatingToRegexTrait,
  convertRatingToCallableTrait,
  convertRatingToMetricTrait,
} from './traitConverters';

// Re-export types and constants for backward compatibility
export { CheckpointConversionError, DEFAULT_CONVERSION_OPTIONS };
export type { ConversionOptions };
export { validateJsonLdCheckpoint } from './validators';
export { isJsonLdCheckpoint, isV2Checkpoint } from './validators';
export { generateQuestionId } from './idGenerator';
export type { schemaOrgContext };

/**
 * Converts a v2.0 UnifiedCheckpoint to JSON-LD format
 * @param checkpoint - The v2.0 checkpoint to convert
 * @param options - Conversion options
 * @returns A JSON-LD checkpoint
 */
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
          // Include few-shot examples as JSON string if present
          ...(item.few_shot_examples && item.few_shot_examples.length > 0
            ? [
                {
                  '@type': 'PropertyValue' as const,
                  name: 'few_shot_examples',
                  value: JSON.stringify(item.few_shot_examples),
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
        // Convert LLM traits
        if (item.question_rubric.llm_traits && item.question_rubric.llm_traits.length > 0) {
          item.question_rubric.llm_traits.forEach((trait) => {
            const rating = convertRubricTraitToRating(trait, 'question-specific');
            ratings.push(rating);
          });
        }

        // Convert regex traits to Rating objects
        if (item.question_rubric.regex_traits && item.question_rubric.regex_traits.length > 0) {
          item.question_rubric.regex_traits.forEach((trait) => {
            const rating = convertRegexTraitToRating(trait, 'question-specific');
            ratings.push(rating);
          });
        }

        // Convert callable traits to Rating objects
        if (item.question_rubric.callable_traits && item.question_rubric.callable_traits.length > 0) {
          item.question_rubric.callable_traits.forEach((trait) => {
            const rating = convertCallableTraitToRating(trait, 'question-specific');
            ratings.push(rating);
          });
        }

        // Convert metric traits to Rating objects
        if (item.question_rubric.metric_traits && item.question_rubric.metric_traits.length > 0) {
          item.question_rubric.metric_traits.forEach((trait) => {
            const rating = convertMetricTraitToRating(trait, 'question-specific');
            ratings.push(rating);
          });
        }
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
        keywords: item.keywords,
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
    const globalRatings: SchemaOrgRating[] = [];

    // Convert LLM traits
    if (checkpoint.global_rubric?.llm_traits && checkpoint.global_rubric.llm_traits.length > 0) {
      const llmRatings = checkpoint.global_rubric.llm_traits.map((trait) =>
        convertRubricTraitToRating(trait, 'global')
      );
      globalRatings.push(...llmRatings);
    }

    // Convert regex traits to Rating objects
    if (checkpoint.global_rubric?.regex_traits && checkpoint.global_rubric.regex_traits.length > 0) {
      const regexRatings = checkpoint.global_rubric.regex_traits.map((trait) =>
        convertRegexTraitToRating(trait, 'global')
      );
      globalRatings.push(...regexRatings);
    }

    // Convert callable traits to Rating objects
    if (checkpoint.global_rubric?.callable_traits && checkpoint.global_rubric.callable_traits.length > 0) {
      const callableRatings = checkpoint.global_rubric.callable_traits.map((trait) =>
        convertCallableTraitToRating(trait, 'global')
      );
      globalRatings.push(...callableRatings);
    }

    // Convert metric traits to Rating objects
    if (checkpoint.global_rubric?.metric_traits && checkpoint.global_rubric.metric_traits.length > 0) {
      const metricRatings = checkpoint.global_rubric.metric_traits.map((trait) =>
        convertMetricTraitToRating(trait, 'global')
      );
      globalRatings.push(...metricRatings);
    }

    // Add conversion metadata if requested (after globalRatings is defined)
    if (options.includeMetadata) {
      const globalRatingCount = globalRatings.length;
      const questionRatingCount = dataFeedItems.reduce((sum, item) => sum + (item.item.rating?.length || 0), 0);

      const metadata = {
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
      rating: globalRatings.length > 0 ? globalRatings : undefined, // Global rubric traits as Rating objects
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

/**
 * Converts a JSON-LD checkpoint to v2.0 UnifiedCheckpoint format
 * @param jsonLdCheckpoint - The JSON-LD checkpoint to convert
 * @returns A v2.0 UnifiedCheckpoint
 */
export function jsonLdToV2(
  jsonLdCheckpoint: JsonLdCheckpoint
  // _options: ConversionOptions = DEFAULT_CONVERSION_OPTIONS
): UnifiedCheckpoint {
  try {
    // Extract global rubric from Dataset rating array
    let globalRubric: Rubric | null = null;
    if (jsonLdCheckpoint.rating && jsonLdCheckpoint.rating.length > 0) {
      // Filter for different trait types
      const globalLLMRatings = jsonLdCheckpoint.rating.filter(
        (rating) => rating.additionalType === 'GlobalRubricTrait'
      );
      const globalRegexRatings = jsonLdCheckpoint.rating.filter(
        (rating) => rating.additionalType === 'GlobalRegexTrait'
      );
      const globalCallableRatings = jsonLdCheckpoint.rating.filter(
        (rating) => rating.additionalType === 'GlobalCallableTrait'
      );

      // Convert LLM traits
      const llmTraits = globalLLMRatings.length > 0 ? globalLLMRatings.map(convertRatingToRubricTrait) : [];
      // Normalize legacy "binary" kind to "boolean"
      llmTraits.forEach((trait) => {
        if ((trait.kind as string) === 'binary') {
          trait.kind = 'boolean';
        }
      });

      // Convert regex traits
      const regexTraits = globalRegexRatings.length > 0 ? globalRegexRatings.map(convertRatingToRegexTrait) : [];

      // Convert callable traits
      const callableTraits =
        globalCallableRatings.length > 0 ? globalCallableRatings.map(convertRatingToCallableTrait) : [];

      if (llmTraits.length > 0 || regexTraits.length > 0 || callableTraits.length > 0) {
        globalRubric = {
          llm_traits: llmTraits,
          ...(regexTraits.length > 0 && { regex_traits: regexTraits }),
          ...(callableTraits.length > 0 && { callable_traits: callableTraits }),
        };
      }
    }

    // Extract global regex_traits from additionalProperty (legacy format)
    let globalRegexTraits: RegexTrait[] | undefined;
    const globalRegexTraitsProp = jsonLdCheckpoint.additionalProperty?.find(
      (prop) => prop.name === 'global_regex_rubric_traits'
    );
    if (globalRegexTraitsProp && typeof globalRegexTraitsProp.value === 'string') {
      try {
        globalRegexTraits = JSON.parse(globalRegexTraitsProp.value);
        // Normalize legacy "invert" field to "invert_result"
        globalRegexTraits?.forEach((trait: RegexTrait & { invert?: boolean }) => {
          if (trait.invert !== undefined && trait.invert_result === undefined) {
            trait.invert_result = trait.invert;
            delete trait.invert;
          }
        });
      } catch {
        // Invalid JSON, ignore regex traits
      }
    }

    // Merge regex_traits into global rubric (legacy format)
    if (globalRegexTraits && globalRegexTraits.length > 0) {
      if (globalRubric) {
        globalRubric.regex_traits = [...(globalRubric.regex_traits || []), ...globalRegexTraits];
      } else {
        globalRubric = { llm_traits: [], regex_traits: globalRegexTraits };
      }
    }

    // Extract global callable_traits from additionalProperty (legacy format)
    let globalCallableTraits: CallableTrait[] | undefined;
    const globalCallableTraitsProp = jsonLdCheckpoint.additionalProperty?.find(
      (prop) => prop.name === 'global_callable_rubric_traits'
    );
    if (globalCallableTraitsProp && typeof globalCallableTraitsProp.value === 'string') {
      try {
        globalCallableTraits = JSON.parse(globalCallableTraitsProp.value);
      } catch {
        // Invalid JSON, ignore callable traits
      }
    }

    // Merge callable_traits into global rubric (legacy format)
    if (globalCallableTraits && globalCallableTraits.length > 0) {
      if (globalRubric) {
        globalRubric.callable_traits = [...(globalRubric.callable_traits || []), ...globalCallableTraits];
      } else {
        globalRubric = { llm_traits: [], callable_traits: globalCallableTraits };
      }
    }

    // Extract global metric_traits from additionalProperty
    let globalMetricTraits: MetricRubricTrait[] | undefined;
    const globalMetricTraitsProp = jsonLdCheckpoint.additionalProperty?.find(
      (prop) => prop.name === 'global_metric_rubric_traits'
    );
    if (globalMetricTraitsProp && typeof globalMetricTraitsProp.value === 'string') {
      try {
        globalMetricTraits = JSON.parse(globalMetricTraitsProp.value);
      } catch {
        // Invalid JSON, ignore metric traits
      }
    }

    // Merge metric_traits into global rubric
    if (globalMetricTraits && globalMetricTraits.length > 0) {
      if (globalRubric) {
        globalRubric.metric_traits = globalMetricTraits;
      } else {
        globalRubric = { llm_traits: [], metric_traits: globalMetricTraits };
      }
    }

    // Convert DataFeedItem objects back to CheckpointItem
    const checkpoint: { [key: string]: CheckpointItem } = {};

    (jsonLdCheckpoint.dataFeedElement || []).forEach((dataFeedItem, index) => {
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
      const fewShotProp = question.additionalProperty?.find((prop) => prop.name === 'few_shot_examples');

      // Parse schema.org enhanced metadata
      let author: SchemaOrgPerson | undefined;
      let sources: SchemaOrgCreativeWork[] | undefined;
      let fewShotExamples: Array<{ question: string; answer: string }> | undefined;

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

      if (fewShotProp && typeof fewShotProp.value === 'string') {
        try {
          fewShotExamples = JSON.parse(fewShotProp.value);
        } catch {
          // Invalid JSON, ignore few-shot examples
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
        // Filter for different trait types
        const questionLLMRatings = question.rating.filter(
          (rating) => rating.additionalType === 'QuestionSpecificRubricTrait'
        );
        const questionRegexRatings = question.rating.filter(
          (rating) => rating.additionalType === 'QuestionSpecificRegexTrait'
        );
        const questionCallableRatings = question.rating.filter(
          (rating) => rating.additionalType === 'QuestionSpecificCallableTrait'
        );
        const questionMetricRatings = question.rating.filter(
          (rating) => rating.additionalType === 'QuestionSpecificMetricRubricTrait'
        );

        // Convert LLM traits
        const llmTraits = questionLLMRatings.length > 0 ? questionLLMRatings.map(convertRatingToRubricTrait) : [];
        // Normalize legacy "binary" kind to "boolean"
        llmTraits.forEach((trait) => {
          if ((trait.kind as string) === 'binary') {
            trait.kind = 'boolean';
          }
        });

        // Convert regex traits
        const regexTraits = questionRegexRatings.length > 0 ? questionRegexRatings.map(convertRatingToRegexTrait) : [];

        // Convert callable traits
        const callableTraits =
          questionCallableRatings.length > 0 ? questionCallableRatings.map(convertRatingToCallableTrait) : [];

        // Convert metric traits
        const metricTraits =
          questionMetricRatings.length > 0 ? questionMetricRatings.map(convertRatingToMetricTrait) : [];

        // Debug logging
        if (questionCallableRatings.length > 0 || callableTraits.length > 0) {
          logger.debugLog('CHECKPOINT_CONVERTER', 'Question callable traits', 'checkpoint-converter', {
            questionId: question['@id'],
            callableRatingsCount: questionCallableRatings.length,
            callableTraitsCount: callableTraits.length,
            callableTraits,
          });
        }

        if (llmTraits.length > 0 || regexTraits.length > 0 || callableTraits.length > 0 || metricTraits.length > 0) {
          questionRubric = {
            llm_traits: llmTraits,
            ...(regexTraits.length > 0 && { regex_traits: regexTraits }),
            ...(callableTraits.length > 0 && { callable_traits: callableTraits }),
            ...(metricTraits.length > 0 && { metric_traits: metricTraits }),
          };
        }
      }

      // Log final question rubric state
      if (questionRubric) {
        logger.debugLog(
          'CHECKPOINT_CONVERTER',
          `Final question rubric for: ${question.text.substring(0, 50)}...`,
          'checkpoint-converter',
          {
            hasLLMTraits: !!questionRubric.llm_traits && questionRubric.llm_traits.length > 0,
            llmTraitsCount: questionRubric.llm_traits?.length || 0,
            hasRegexTraits: !!questionRubric.regex_traits && questionRubric.regex_traits.length > 0,
            regexTraitsCount: questionRubric.regex_traits?.length || 0,
            hasCallableTraits: !!questionRubric.callable_traits && questionRubric.callable_traits.length > 0,
            callableTraitsCount: questionRubric.callable_traits?.length || 0,
            hasMetricTraits: !!questionRubric.metric_traits && questionRubric.metric_traits.length > 0,
            metricTraitsCount: questionRubric.metric_traits?.length || 0,
            questionRubric,
          }
        );
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
        few_shot_examples: fewShotExamples,
        keywords: dataFeedItem.keywords,
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
