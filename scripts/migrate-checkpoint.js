#!/usr/bin/env node

/**
 * Karenina Checkpoint Migration Script
 *
 * Converts legacy v2.0 checkpoint files to new JSON-LD format.
 *
 * Usage:
 *   node scripts/migrate-checkpoint.js input.json output.jsonld
 *   npm run migrate:checkpoint input.json output.jsonld
 *
 * Features:
 * - Validates input format
 * - Converts v2.0 to JSON-LD using schema.org vocabulary
 * - Preserves all data including rubrics and progress
 * - Validates output format
 * - Provides detailed conversion report
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the conversion utilities
// Note: In a real implementation, we'd need to build the TypeScript first
// For now, we'll implement the core conversion logic here

class MigrationError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'MigrationError';
    this.cause = cause;
  }
}

// Core conversion logic (simplified version of the TypeScript utils)
function isV2Checkpoint(data) {
  return (
    typeof data === 'object' &&
    data !== null &&
    data.version === '2.0' &&
    typeof data.checkpoint === 'object' &&
    data.checkpoint !== null
  );
}

function generateQuestionId(questionText) {
  const hash = questionText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);

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
 * @param {number|null|undefined} value - The score value to validate
 * @param {number} defaultValue - Default value to use if score is null/undefined
 * @param {string} fieldName - Name of the field for error messages
 * @param {string} traitName - Name of the trait for error messages
 * @returns {number} Validated score value
 */
function validateScoreValue(value, defaultValue, fieldName, traitName) {
  // Use default if value is null or undefined
  if (value === null || value === undefined) {
    return defaultValue;
  }

  // Validate that it's a number
  if (typeof value !== 'number' || isNaN(value)) {
    throw new MigrationError(`Invalid ${fieldName} for trait "${traitName}": expected number, got ${typeof value}`);
  }

  // Validate reasonable range (allow negative scores for flexibility)
  if (!isFinite(value)) {
    throw new MigrationError(`Invalid ${fieldName} for trait "${traitName}": value must be finite, got ${value}`);
  }

  return value;
}

function convertRubricTraitToRating(trait, ratingValue, rubricType = 'Global Rubric') {
  let actualRatingValue;
  let bestRating;
  let worstRating;

  if (trait.kind === 'boolean') {
    actualRatingValue = ratingValue !== undefined ? (ratingValue ? 1 : 0) : 0;
    bestRating = 1;
    worstRating = 0;
  } else {
    // Score trait - validate and handle score ranges
    const minScore = validateScoreValue(trait.min_score, 1, 'min_score', trait.name);
    const maxScore = validateScoreValue(trait.max_score, 5, 'max_score', trait.name);

    // Validate that min <= max
    if (minScore >= maxScore) {
      throw new MigrationError(
        `Invalid score range for trait "${trait.name}": min_score (${minScore}) must be less than max_score (${maxScore})`
      );
    }

    actualRatingValue = ratingValue !== undefined ? ratingValue : minScore;
    bestRating = maxScore;
    worstRating = minScore;
  }

  // Determine additionalType based on rubricType parameter
  const additionalType = rubricType === 'Global Rubric' ? 'GlobalRubricTrait' : 'QuestionSpecificRubricTrait';

  return {
    '@type': 'Rating',
    '@id': `urn:uuid:rating-${trait.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: trait.name,
    description: trait.description,
    ratingValue: actualRatingValue,
    bestRating,
    worstRating,
    additionalType,
  };
}

function v2ToJsonLd(checkpoint) {
  const timestamp = new Date().toISOString();
  const questionIds = Object.keys(checkpoint.checkpoint);

  const schemaOrgContext = {
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
    dataFeedElement: { '@id': 'dataFeedElement', '@container': '@set' },
    item: { '@id': 'item', '@type': '@id' },
    text: 'text',
    acceptedAnswer: { '@id': 'acceptedAnswer', '@type': '@id' },
    programmingLanguage: 'programmingLanguage',
    codeRepository: 'codeRepository',
    rating: { '@id': 'rating', '@container': '@set' },
    ratingValue: 'ratingValue',
    bestRating: 'bestRating',
    worstRating: 'worstRating',
    ratingExplanation: 'ratingExplanation',
    author: 'author',
    additionalProperty: { '@id': 'additionalProperty', '@container': '@set' },
    value: 'value',
    url: 'url',
    identifier: 'identifier',
  };

  // Convert checkpoint items to DataFeedItem objects
  const dataFeedItems = questionIds.map((questionId) => {
    const item = checkpoint.checkpoint[questionId];

    const question = {
      '@type': 'Question',
      '@id': generateQuestionId(item.question),
      text: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        '@id': `urn:uuid:answer-${questionId}`,
        text: item.raw_answer,
      },
      hasPart: {
        '@type': 'SoftwareSourceCode',
        '@id': `urn:uuid:template-${questionId}`,
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

    // Convert only question-specific rubric traits to Rating objects
    // (global rubrics will be stored at Dataset level)
    const ratings = [];

    if (item.question_rubric) {
      item.question_rubric.traits.forEach((trait) => {
        const rating = convertRubricTraitToRating(trait, undefined, 'Question-Specific Rubric');
        ratings.push(rating);
      });
    }

    if (ratings.length > 0) {
      question.rating = ratings;
    }

    return {
      '@type': 'DataFeedItem',
      '@id': `urn:uuid:${questionId}`,
      dateCreated: item.date_created || item.last_modified, // Use date_created if available, fallback to last_modified
      dateModified: item.last_modified,
      item: question,
    };
  });

  // Create additional properties
  const additionalProperties = [
    {
      '@type': 'PropertyValue',
      name: 'checkpoint_format_version',
      value: '3.0.0-jsonld',
    },
  ];

  // Global rubric traits will be stored as Rating objects at Dataset level (removed JSON string version)

  // Handle timestamp logic - for migrations from legacy files, we need to handle existing dataset metadata if present
  const datasetMeta = checkpoint.dataset_metadata;
  let dateCreated, dateModified;

  if (datasetMeta?.dateCreated) {
    // Preserve existing dateCreated if it exists in the legacy file
    dateCreated = datasetMeta.dateCreated;
  } else {
    // For legacy files without metadata, this is effectively a "creation" from migration perspective
    dateCreated = timestamp;
  }

  if (datasetMeta?.dateModified) {
    // Preserve existing dateModified if it exists
    dateModified = datasetMeta.dateModified;
  } else {
    // For legacy files, migration counts as a "modification"
    dateModified = timestamp;
  }

  // Convert global rubric traits to Rating objects for Dataset level
  let globalRatings;
  if (checkpoint.global_rubric) {
    globalRatings = checkpoint.global_rubric.traits.map((trait) =>
      convertRubricTraitToRating(trait, undefined, 'Global Rubric')
    );
  }

  // Add conversion metadata
  // Count all ratings: global ratings + question-level ratings
  const globalRatingCount = globalRatings ? globalRatings.length : 0;
  const questionRatingCount = dataFeedItems.reduce((sum, item) => sum + (item.item.rating?.length || 0), 0);
  const totalRatings = globalRatingCount + questionRatingCount;

  additionalProperties.push({
    '@type': 'PropertyValue',
    name: 'conversion_metadata',
    value: JSON.stringify({
      originalVersion: checkpoint.version,
      convertedAt: timestamp,
      totalQuestions: questionIds.length,
      totalRatings: totalRatings,
      globalRatings: globalRatingCount,
      questionRatings: questionRatingCount,
    }),
  });

  return {
    '@context': schemaOrgContext,
    '@type': 'DataFeed',
    '@id': `urn:uuid:karenina-checkpoint-${Date.now()}`,
    name: datasetMeta?.name || 'Karenina LLM Benchmark Checkpoint',
    description:
      datasetMeta?.description ||
      `Migrated checkpoint containing ${questionIds.length} benchmark questions with answer templates and rubric evaluations`,
    version: datasetMeta?.version || '0.1.0',
    creator: datasetMeta?.creator?.name || 'Karenina Benchmarking System',
    dateCreated: dateCreated,
    dateModified: dateModified,
    rating: globalRatings, // Global rubric traits as Rating objects
    dataFeedElement: dataFeedItems,
    additionalProperty: additionalProperties,
  };
}

async function validateFile(filePath, expectedFormat) {
  try {
    await fs.access(filePath);
  } catch {
    throw new MigrationError(`File not found: ${filePath}`);
  }

  const stats = await fs.stat(filePath);
  if (!stats.isFile()) {
    throw new MigrationError(`Path is not a file: ${filePath}`);
  }

  if (expectedFormat === 'json' && !filePath.endsWith('.json')) {
    console.warn(`⚠️  Warning: Input file doesn't have .json extension`);
  }
}

async function loadCheckpoint(filePath) {
  console.log(`📂 Loading checkpoint from: ${filePath}`);

  const content = await fs.readFile(filePath, 'utf-8');

  let data;
  try {
    data = JSON.parse(content);
  } catch (parseError) {
    throw new MigrationError(`Invalid JSON in file: ${filePath}`, parseError);
  }

  if (!isV2Checkpoint(data)) {
    throw new MigrationError(
      `File is not a valid v2.0 checkpoint. ` +
        `Expected version "2.0" with checkpoint object, got: ${JSON.stringify({ version: data.version, hasCheckpoint: !!data.checkpoint })}`
    );
  }

  console.log(`✅ Valid v2.0 checkpoint loaded with ${Object.keys(data.checkpoint).length} questions`);

  if (data.global_rubric) {
    console.log(`📊 Global rubric found with ${data.global_rubric.traits.length} traits`);
  }

  return data;
}

async function saveJsonLd(jsonLdData, outputPath) {
  console.log(`💾 Saving JSON-LD to: ${outputPath}`);

  const jsonContent = JSON.stringify(jsonLdData, null, 2);
  await fs.writeFile(outputPath, jsonContent, 'utf-8');

  const stats = await fs.stat(outputPath);
  console.log(`✅ JSON-LD file saved (${Math.round(stats.size / 1024)}KB)`);
}

function generateReport(v2Data, jsonLdData) {
  const originalQuestions = Object.keys(v2Data.checkpoint).length;
  const convertedQuestions = jsonLdData.dataFeedElement.length;
  const globalRatings = jsonLdData.rating ? jsonLdData.rating.length : 0;
  const questionRatings = jsonLdData.dataFeedElement.reduce((sum, item) => sum + (item.item.rating?.length || 0), 0);
  const totalRatings = globalRatings + questionRatings;

  const finishedQuestions = Object.values(v2Data.checkpoint).filter((item) => item.finished).length;

  const hasGlobalRubric = !!v2Data.global_rubric;
  const questionSpecificRubrics = Object.values(v2Data.checkpoint).filter((item) => item.question_rubric).length;

  return {
    migration: {
      originalFormat: 'v2.0',
      targetFormat: 'JSON-LD v3.0',
      success: true,
    },
    data: {
      originalQuestions,
      convertedQuestions,
      finishedQuestions,
      totalRatings,
      globalRatings,
      questionRatings,
      hasGlobalRubric,
      questionSpecificRubrics,
    },
    validation: {
      dataIntegrity: originalQuestions === convertedQuestions,
      formatValid: jsonLdData['@type'] === 'DataFeed',
      contextValid: !!jsonLdData['@context'],
    },
  };
}

async function migrateCheckpoint(inputPath, outputPath) {
  console.log('🚀 Starting checkpoint migration...\n');

  try {
    // Validate input
    await validateFile(inputPath, 'json');

    // Load v2.0 checkpoint
    const v2Data = await loadCheckpoint(inputPath);

    // Convert to JSON-LD
    console.log('\n📊 Converting to JSON-LD format...');
    const jsonLdData = v2ToJsonLd(v2Data);

    // Save JSON-LD file
    console.log('\n💾 Saving converted file...');
    await saveJsonLd(jsonLdData, outputPath);

    // Generate report
    const report = generateReport(v2Data, jsonLdData);

    console.log('\n📋 Migration Report:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Migration: ${report.migration.originalFormat} → ${report.migration.targetFormat}`);
    console.log(`📊 Questions: ${report.data.originalQuestions} → ${report.data.convertedQuestions}`);
    console.log(`🏁 Finished: ${report.data.finishedQuestions}/${report.data.originalQuestions}`);
    console.log(
      `⭐ Ratings: ${report.data.totalRatings} total (${report.data.globalRatings} global + ${report.data.questionRatings} question-specific)`
    );
    console.log(`🌐 Global Rubric: ${report.data.hasGlobalRubric ? '✅' : '❌'}`);
    console.log(`📝 Question Rubrics: ${report.data.questionSpecificRubrics}`);
    console.log(`🔍 Data Integrity: ${report.validation.dataIntegrity ? '✅' : '❌'}`);
    console.log(`📄 Format Valid: ${report.validation.formatValid ? '✅' : '❌'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (report.validation.dataIntegrity && report.validation.formatValid) {
      console.log('\n🎉 Migration completed successfully!');
      console.log(`📁 Output: ${outputPath}`);
      console.log(`🌐 Format: JSON-LD with schema.org vocabulary`);
      console.log(`💡 Tip: You can now use this file with semantic web tools`);
    } else {
      throw new MigrationError('Migration validation failed');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    if (error.cause) {
      console.error('Cause:', error.cause.message);
    }
    process.exit(1);
  }
}

// CLI handling
function showUsage() {
  console.log(`
🔄 Karenina Checkpoint Migration Tool

Converts legacy v2.0 checkpoint files to new JSON-LD format.

Usage:
  node scripts/migrate-checkpoint.js <input.json> <output.jsonld>

Examples:
  node scripts/migrate-checkpoint.js old_checkpoint.json new_checkpoint.jsonld
  npm run migrate:checkpoint checkpoint_2024.json checkpoint_2024.jsonld

Features:
  ✅ Validates input v2.0 format
  🔄 Converts to JSON-LD with schema.org vocabulary  
  📊 Preserves all data (questions, rubrics, progress)
  🌐 Enables semantic web compatibility
  📋 Provides detailed migration report

For more information, see the migration guide in the documentation.
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    showUsage();
    process.exit(1);
  }

  const [inputPath, outputPath] = args;

  if (!inputPath || !outputPath) {
    console.error('❌ Error: Both input and output file paths are required');
    showUsage();
    process.exit(1);
  }

  await migrateCheckpoint(inputPath, outputPath);
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { migrateCheckpoint, v2ToJsonLd, isV2Checkpoint };
