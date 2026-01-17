/**
 * Checkpoint types
 * Data structures for checkpoint management and conversion
 */

import type { Rubric, SchemaOrgPerson, SchemaOrgCreativeWork } from './index';

export interface CheckpointItem {
  // Original question data
  question: string;
  raw_answer: string;
  original_answer_template: string;

  // Progress data
  answer_template: string;
  date_created?: string; // When the question was first added to the checkpoint
  last_modified: string;
  finished: boolean;

  // Question-specific rubric
  question_rubric?: Rubric;

  // Few-shot examples for improved prompting
  few_shot_examples?: Array<{ question: string; answer: string }>;

  // Custom metadata properties
  custom_metadata?: { [key: string]: string };

  // Schema.org enhanced metadata
  author?: SchemaOrgPerson;
  sources?: SchemaOrgCreativeWork[];
  keywords?: string[];
}

export interface Checkpoint {
  [key: string]: CheckpointItem;
}

// Dataset-level metadata interface
export interface DatasetMetadata {
  // Basic dataset information
  name?: string;
  description?: string;
  version?: string;
  license?: string;
  keywords?: string[];

  // Schema.org compliance
  creator?: SchemaOrgPerson | import('./index').SchemaOrgOrganization;
  publisher?: import('./index').SchemaOrgOrganization;
  datePublished?: string;
  dateCreated?: string;
  dateModified?: string;

  // Custom properties
  custom_properties?: { [key: string]: string };
}

// Unified checkpoint structure that includes global rubric and dataset metadata
export interface UnifiedCheckpoint {
  version: '2.0';
  global_rubric: Rubric | null;
  dataset_metadata?: DatasetMetadata;
  checkpoint: Checkpoint;
}

// Duplicate resolution types
export interface DuplicateQuestionInfo {
  question_id: string;
  question_text: string;
  old_version: CheckpointItem & { last_modified: string };
  new_version: CheckpointItem & { last_modified: string };
}

export type DuplicateResolution = 'keep_old' | 'keep_new';

export interface DuplicateResolutions {
  [question_id: string]: DuplicateResolution;
}

// JSON-LD Checkpoint Types (schema.org vocabulary)
export interface JsonLdContext {
  '@context': {
    '@version': number;
    '@vocab': string;
    [key: string]: unknown;
  };
}

export interface SchemaOrgRating {
  '@type': 'Rating';
  '@id'?: string;
  name: string;
  description?: string;
  bestRating: number;
  worstRating: number;
  additionalType:
    | 'GlobalRubricTrait'
    | 'QuestionSpecificRubricTrait'
    | 'GlobalLLMRubricTrait' // For literal kind traits
    | 'QuestionSpecificLLMRubricTrait' // For literal kind traits
    | 'GlobalRegexTrait'
    | 'QuestionSpecificRegexTrait'
    | 'GlobalCallableTrait'
    | 'QuestionSpecificCallableTrait'
    | 'GlobalMetricRubricTrait'
    | 'QuestionSpecificMetricRubricTrait';
  ratingExplanation?: string;
  // Deep Judgment configuration (for LLM traits only)
  deep_judgment_enabled?: boolean;
  deep_judgment_excerpt_enabled?: boolean;
  deep_judgment_max_excerpts?: number;
  deep_judgment_fuzzy_match_threshold?: number;
  deep_judgment_excerpt_retry_attempts?: number;
  deep_judgment_search_enabled?: boolean;
  // Additional properties for storing trait-specific fields (regex, callable, metric)
  additionalProperty?: SchemaOrgPropertyValue[];
}

export interface SchemaOrgPropertyValue {
  '@type': 'PropertyValue';
  name: string;
  value: unknown;
}

export interface SchemaOrgAnswer {
  '@type': 'Answer';
  '@id'?: string;
  text: string;
}

export interface SchemaOrgSoftwareSourceCode {
  '@type': 'SoftwareSourceCode';
  '@id'?: string;
  name?: string;
  text: string; // The Pydantic template code
  programmingLanguage: 'Python';
  codeRepository?: string;
}

export interface SchemaOrgQuestion {
  '@type': 'Question';
  '@id'?: string;
  text: string; // Question text
  acceptedAnswer: SchemaOrgAnswer;
  hasPart: SchemaOrgSoftwareSourceCode; // Pydantic template
  rating?: SchemaOrgRating[]; // Rubric trait evaluations
  additionalProperty?: SchemaOrgPropertyValue[]; // metadata like finished, original_template
}

export interface SchemaOrgDataFeedItem {
  '@type': 'DataFeedItem';
  '@id'?: string;
  dateCreated?: string;
  dateModified: string; // last_modified from v2.0
  item: SchemaOrgQuestion;
  keywords?: string[];
}

export interface SchemaOrgDataFeed extends JsonLdContext {
  '@type': 'DataFeed';
  '@id'?: string;
  name: string;
  description?: string;
  version: string; // '3.0.0-jsonld'
  creator?: string;
  dateCreated?: string;
  dateModified?: string;
  rating?: SchemaOrgRating[]; // Global rubric traits as Rating objects
  dataFeedElement: SchemaOrgDataFeedItem[];
  additionalProperty?: SchemaOrgPropertyValue[]; // format version, conversion metadata
}

// Type alias for the complete JSON-LD checkpoint
export type JsonLdCheckpoint = SchemaOrgDataFeed;

// Conversion mapping types
export interface RubricTraitToRatingMapping {
  rubricTrait: import('./index').LLMRubricTrait;
  ratingValue?: number; // Set when trait is evaluated
  isEvaluated: boolean;
}

export interface CheckpointConversionMetadata {
  originalVersion: string;
  convertedAt: string;
  totalQuestions: number;
  totalRatings: number;
}
