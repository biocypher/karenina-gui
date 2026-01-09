/**
 * Single source of truth for exportable result fields.
 *
 * This file defines all exportable fields from the ExportableResult type.
 * When adding new fields to VerificationResult/ExportableResult:
 * 1. Add the field definition to the appropriate field group below
 * 2. The CSV export and custom export dialog will automatically include it
 *
 * See: .agents/dev/adding-verification-fields.md
 */

import type { ExportableResult } from './export';

/**
 * Field definition for exportable result fields
 */
export interface ExportFieldDefinition {
  /** Unique key identifying this field (must match ExportableResult path) */
  key: string;
  /** Human-readable label for UI display */
  label: string;
  /** Optional description explaining what this field contains */
  description?: string;
  /** Path to access the field in ExportableResult (e.g., 'metadata.question_id') */
  path: string;
  /** Whether this field contains JSON data that should be stringified */
  isJson?: boolean;
  /** Default value to use when field is undefined */
  defaultValue?: unknown;
  /** For special handling: function to extract value from result */
  extractor?: (result: ExportableResult, index: number) => unknown;
}

/**
 * Group of related export fields for organization in UI
 */
export interface ExportFieldGroup {
  name: string;
  fields: ExportFieldDefinition[];
}

/**
 * Special fields that are added dynamically at runtime
 */
export interface DynamicFieldConfig {
  /** Prefix for dynamic field keys */
  prefix: string;
  /** Function to extract dynamic field values from a result */
  extractor: (result: ExportableResult) => Record<string, unknown>;
}

/**
 * Dynamic rubric trait fields - added based on actual traits in results
 */
export const RUBRIC_TRAIT_FIELDS: DynamicFieldConfig = {
  prefix: 'rubric_',
  extractor: (result: ExportableResult) => {
    const mergedTraits: Record<string, number | boolean | Record<string, number>> = {};
    if (result.rubric) {
      if (result.rubric.llm_trait_scores) Object.assign(mergedTraits, result.rubric.llm_trait_scores);
      if (result.rubric.regex_trait_scores) Object.assign(mergedTraits, result.rubric.regex_trait_scores);
      if (result.rubric.callable_trait_scores) Object.assign(mergedTraits, result.rubric.callable_trait_scores);
      if (result.rubric.metric_trait_scores) Object.assign(mergedTraits, result.rubric.metric_trait_scores);
    }
    return mergedTraits;
  },
};

/**
 * Core metadata fields - basic identification and tracking information
 */
export const METADATA_FIELDS: ExportFieldDefinition[] = [
  {
    key: 'row_index',
    label: 'Row Index',
    description: 'Sequential row number',
    path: 'row_index',
    extractor: (_result, index) => index + 1,
  },
  {
    key: 'question_id',
    label: 'Question ID',
    description: 'Unique identifier for the question',
    path: 'metadata.question_id',
  },
  {
    key: 'question_text',
    label: 'Question Text',
    description: 'The original question',
    path: 'metadata.question_text',
  },
  {
    key: 'raw_answer',
    label: 'Raw Answer',
    description: 'Ground truth answer from original data',
    path: 'raw_answer',
    defaultValue: '',
  },
  {
    key: 'answering_model',
    label: 'Answering Model',
    description: 'Model used for answering',
    path: 'metadata.answering_model',
  },
  {
    key: 'parsing_model',
    label: 'Parsing Model',
    description: 'Model used for parsing',
    path: 'metadata.parsing_model',
  },
  {
    key: 'replicate',
    label: 'Replicate',
    description: 'Replicate number',
    path: 'metadata.replicate',
    defaultValue: '',
  },
  {
    key: 'completed_without_errors',
    label: 'Success Status',
    description: 'Whether verification completed without errors',
    path: 'completed_without_errors',
    extractor: (result) =>
      result.template?.abstention_detected && result.template?.abstention_override_applied
        ? 'abstained'
        : result.metadata.completed_without_errors,
  },
  {
    key: 'error',
    label: 'Error Message',
    description: 'Error details if verification failed',
    path: 'metadata.error',
    defaultValue: '',
  },
  {
    key: 'execution_time',
    label: 'Execution Time',
    description: 'Time taken to process',
    path: 'metadata.execution_time',
  },
  {
    key: 'timestamp',
    label: 'Timestamp',
    description: 'When the verification was run',
    path: 'metadata.timestamp',
  },
  {
    key: 'run_name',
    label: 'Run Name',
    description: 'Name of the verification run',
    path: 'metadata.run_name',
    defaultValue: '',
  },
  {
    key: 'job_id',
    label: 'Job ID',
    description: 'Unique job identifier',
    path: 'metadata.job_id',
    defaultValue: '',
  },
];

/**
 * Template fields - answer generation and verification data
 */
export const TEMPLATE_FIELDS: ExportFieldDefinition[] = [
  {
    key: 'raw_llm_response',
    label: 'Raw LLM Response',
    description: 'Original response from the LLM',
    path: 'template.raw_llm_response',
    defaultValue: '',
  },
  {
    key: 'parsed_gt_answer',
    label: 'Ground Truth Answer',
    description: 'Expected response from the "correct" field',
    path: 'template.parsed_gt_response',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'parsed_llm_answer',
    label: 'LLM Extracted Answer',
    description: 'Structured data extracted by the parsing model',
    path: 'template.parsed_llm_response',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'template_verification_performed',
    label: 'Template Verification Performed',
    description: 'Whether template-based verification was performed',
    path: 'template.template_verification_performed',
    defaultValue: '',
  },
  {
    key: 'verify_result',
    label: 'Verify Result',
    description: 'Basic verification outcome',
    path: 'template.verify_result',
    isJson: true,
    defaultValue: 'N/A',
  },
  {
    key: 'verify_granular_result',
    label: 'Granular Result',
    description: 'Detailed verification breakdown',
    path: 'template.verify_granular_result',
    isJson: true,
    defaultValue: 'N/A',
  },
  {
    key: 'answering_system_prompt',
    label: 'Answering System Prompt',
    description: 'System prompt used for answering',
    path: 'template.answering_system_prompt',
    defaultValue: '',
  },
  {
    key: 'parsing_system_prompt',
    label: 'Parsing System Prompt',
    description: 'System prompt used for parsing',
    path: 'template.parsing_system_prompt',
    defaultValue: '',
  },
];

/**
 * Embedding check fields - similarity-based verification
 */
export const EMBEDDING_FIELDS: ExportFieldDefinition[] = [
  {
    key: 'embedding_check_performed',
    label: 'Embedding Check Performed',
    description: 'Whether embedding similarity check was attempted',
    path: 'template.embedding_check_performed',
    defaultValue: false,
  },
  {
    key: 'embedding_similarity_score',
    label: 'Embedding Similarity Score',
    description: 'Cosine similarity score (0.0 to 1.0)',
    path: 'template.embedding_similarity_score',
    defaultValue: '',
  },
  {
    key: 'embedding_override_applied',
    label: 'Embedding Override Applied',
    description: 'Whether embedding check overrode verification result',
    path: 'template.embedding_override_applied',
    defaultValue: false,
  },
  {
    key: 'embedding_model_used',
    label: 'Embedding Model Used',
    description: 'Name of the sentence transformer model',
    path: 'template.embedding_model_used',
    defaultValue: '',
  },
];

/**
 * Abstention detection fields - AI abstention handling
 */
export const ABSTENTION_FIELDS: ExportFieldDefinition[] = [
  {
    key: 'abstention_check_performed',
    label: 'Abstention Check Performed',
    description: 'Whether abstention detection was attempted',
    path: 'template.abstention_check_performed',
    defaultValue: false,
  },
  {
    key: 'abstention_detected',
    label: 'Abstention Detected',
    description: 'Whether AI abstained from answering',
    path: 'template.abstention_detected',
    defaultValue: '',
  },
  {
    key: 'abstention_override_applied',
    label: 'Abstention Override Applied',
    description: 'Whether abstention override was used',
    path: 'template.abstention_override_applied',
    defaultValue: false,
  },
  {
    key: 'abstention_reasoning',
    label: 'Abstention Reasoning',
    description: 'AI reasoning for abstaining',
    path: 'template.abstention_reasoning',
    defaultValue: '',
  },
];

/**
 * MCP server fields - Model Context Protocol integration
 */
export const MCP_FIELDS: ExportFieldDefinition[] = [
  {
    key: 'answering_mcp_servers',
    label: 'Answering MCP Servers',
    description: 'MCP servers attached to answering model',
    path: 'template.answering_mcp_servers',
    isJson: true,
    defaultValue: '',
  },
];

/**
 * Usage tracking fields - token usage and agent metrics
 */
export const USAGE_FIELDS: ExportFieldDefinition[] = [
  {
    key: 'usage_metadata',
    label: 'Usage Metadata',
    description: 'Token usage statistics per model call',
    path: 'template.usage_metadata',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'agent_metrics',
    label: 'Agent Metrics',
    description: 'Agent tool call statistics',
    path: 'template.agent_metrics',
    isJson: true,
    defaultValue: '',
  },
];

/**
 * Rubric evaluation fields - trait-based evaluation results
 */
export const RUBRIC_FIELDS: ExportFieldDefinition[] = [
  {
    key: 'rubric_evaluation_performed',
    label: 'Rubric Evaluation Performed',
    description: 'Whether rubric trait evaluation was performed',
    path: 'rubric.rubric_evaluation_performed',
    defaultValue: '',
  },
  {
    key: 'rubric_summary',
    label: 'Rubric Summary',
    description: 'Summary of rubric evaluation (e.g., "5/10 traits passed")',
    path: 'rubric_summary',
    extractor: (result) => {
      const mergedTraits: Record<string, number | boolean | Record<string, number>> = {};
      if (result.rubric) {
        if (result.rubric.llm_trait_scores) Object.assign(mergedTraits, result.rubric.llm_trait_scores);
        if (result.rubric.regex_trait_scores) Object.assign(mergedTraits, result.rubric.regex_trait_scores);
        if (result.rubric.callable_trait_scores) Object.assign(mergedTraits, result.rubric.callable_trait_scores);
        if (result.rubric.metric_trait_scores) Object.assign(mergedTraits, result.rubric.metric_trait_scores);
      }
      if (Object.keys(mergedTraits).length > 0) {
        const traits = Object.entries(mergedTraits);
        const passedTraits = traits.filter(([, value]) =>
          typeof value === 'boolean' ? value : typeof value === 'number' ? value && value >= 3 : false
        ).length;
        return `${passedTraits}/${traits.length}`;
      }
      return '';
    },
  },
  {
    key: 'metric_trait_confusion_lists',
    label: 'Metric Trait Confusion Lists',
    description: 'Confusion matrix data (tp, tn, fp, fn) for each metric trait',
    path: 'rubric.metric_trait_confusion_lists',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'metric_trait_metrics',
    label: 'Metric Trait Metrics',
    description: 'Computed metrics (precision, recall, f1, etc.) for each metric trait',
    path: 'rubric.metric_trait_scores',
    isJson: true,
    defaultValue: '',
  },
];

/**
 * Deep-judgment fields - multi-stage parsing with excerpts
 */
export const DEEP_JUDGMENT_FIELDS: ExportFieldDefinition[] = [
  {
    key: 'deep_judgment_enabled',
    label: 'Deep-Judgment Enabled',
    description: 'Whether deep-judgment multi-stage parsing was enabled',
    path: 'deep_judgment.deep_judgment_enabled',
    defaultValue: false,
  },
  {
    key: 'deep_judgment_performed',
    label: 'Deep-Judgment Performed',
    description: 'Whether deep-judgment parsing was actually performed',
    path: 'deep_judgment.deep_judgment_performed',
    defaultValue: false,
  },
  {
    key: 'extracted_excerpts',
    label: 'Extracted Excerpts',
    description: 'Verbatim text excerpts with confidence scores',
    path: 'deep_judgment.extracted_excerpts',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'attribute_reasoning',
    label: 'Attribute Reasoning',
    description: 'Reasoning traces for excerpt-to-attribute mapping',
    path: 'deep_judgment.attribute_reasoning',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'deep_judgment_stages_completed',
    label: 'Stages Completed',
    description: 'List of pipeline stages completed',
    path: 'deep_judgment.deep_judgment_stages_completed',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'deep_judgment_model_calls',
    label: 'Model Calls',
    description: 'Number of LLM invocations for deep-judgment',
    path: 'deep_judgment.deep_judgment_model_calls',
    defaultValue: 0,
  },
  {
    key: 'deep_judgment_excerpt_retry_count',
    label: 'Excerpt Retry Count',
    description: 'Number of retry attempts for excerpt matching',
    path: 'deep_judgment.deep_judgment_excerpt_retry_count',
    defaultValue: 0,
  },
  {
    key: 'attributes_without_excerpts',
    label: 'Attributes Without Excerpts',
    description: 'Attributes that could not be supported with excerpts',
    path: 'deep_judgment.attributes_without_excerpts',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'deep_judgment_search_enabled',
    label: 'Search Enhancement Enabled',
    description: 'Whether external search validation was enabled',
    path: 'deep_judgment.deep_judgment_search_enabled',
    defaultValue: false,
  },
  {
    key: 'hallucination_risk_assessment',
    label: 'Hallucination Risk Assessment',
    description: 'Per-attribute risk assessment from search validation',
    path: 'deep_judgment.hallucination_risk_assessment',
    isJson: true,
    defaultValue: '',
  },
];

/**
 * Deep-judgment rubric fields - enhanced rubric evaluation with excerpts
 */
export const DEEP_JUDGMENT_RUBRIC_FIELDS: ExportFieldDefinition[] = [
  {
    key: 'deep_judgment_rubric_performed',
    label: 'Deep-Judgment Rubric Performed',
    description: 'Whether deep-judgment rubric evaluation was performed',
    path: 'deep_judgment_rubric.deep_judgment_rubric_performed',
    defaultValue: false,
  },
  {
    key: 'deep_judgment_rubric_scores',
    label: 'Deep-Judgment Rubric Scores',
    description: 'Rubric trait scores from deep-judgment evaluation',
    path: 'deep_judgment_rubric.deep_judgment_rubric_scores',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'rubric_trait_reasoning',
    label: 'Rubric Trait Reasoning',
    description: 'Reasoning for rubric trait evaluations',
    path: 'deep_judgment_rubric.rubric_trait_reasoning',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'extracted_rubric_excerpts',
    label: 'Extracted Rubric Excerpts',
    description: 'Excerpts supporting rubric trait evaluations',
    path: 'deep_judgment_rubric.extracted_rubric_excerpts',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'trait_metadata',
    label: 'Trait Metadata',
    description: 'Metadata for each trait evaluation',
    path: 'deep_judgment_rubric.trait_metadata',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'traits_without_valid_excerpts',
    label: 'Traits Without Valid Excerpts',
    description: 'Traits that could not be supported with valid excerpts',
    path: 'deep_judgment_rubric.traits_without_valid_excerpts',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'rubric_hallucination_risk_assessment',
    label: 'Rubric Hallucination Risk Assessment',
    description: 'Hallucination risk per trait from excerpt validation',
    path: 'deep_judgment_rubric.rubric_hallucination_risk_assessment',
    isJson: true,
    defaultValue: '',
  },
  {
    key: 'total_deep_judgment_model_calls',
    label: 'Total Deep-Judgment Model Calls',
    description: 'Total model calls for deep-judgment rubric',
    path: 'deep_judgment_rubric.total_deep_judgment_model_calls',
    defaultValue: 0,
  },
  {
    key: 'total_traits_evaluated',
    label: 'Total Traits Evaluated',
    description: 'Number of traits evaluated with deep-judgment',
    path: 'deep_judgment_rubric.total_traits_evaluated',
    defaultValue: 0,
  },
  {
    key: 'total_excerpt_retries',
    label: 'Total Excerpt Retries',
    description: 'Total retry attempts for excerpt validation',
    path: 'deep_judgment_rubric.total_excerpt_retries',
    defaultValue: 0,
  },
];

/**
 * All field groups for export dialog organization
 */
export const EXPORT_FIELD_GROUPS: ExportFieldGroup[] = [
  { name: 'Basic Information', fields: METADATA_FIELDS },
  { name: 'LLM Response Data', fields: TEMPLATE_FIELDS },
  { name: 'Verification Results', fields: RUBRIC_FIELDS },
  {
    name: 'System Prompts',
    fields: [
      { ...TEMPLATE_FIELDS[6], description: 'System prompt used for answering' },
      { ...TEMPLATE_FIELDS[7], description: 'System prompt used for parsing' },
    ],
  },
  { name: 'Embedding Check Results', fields: EMBEDDING_FIELDS },
  { name: 'Abstention Detection', fields: ABSTENTION_FIELDS },
  { name: 'MCP Integration', fields: MCP_FIELDS },
  { name: 'Usage Tracking', fields: USAGE_FIELDS },
  { name: 'Deep-Judgment Analysis', fields: DEEP_JUDGMENT_FIELDS },
  { name: 'Deep-Judgment Rubric', fields: DEEP_JUDGMENT_RUBRIC_FIELDS },
];

/**
 * Get all field definitions as a flat array
 */
export function getAllExportFields(): ExportFieldDefinition[] {
  return EXPORT_FIELD_GROUPS.flatMap((group) => group.fields);
}

/**
 * Get all field keys for CSV headers
 */
export function getAllExportFieldKeys(): string[] {
  return getAllExportFields().map((field) => field.key);
}

/**
 * Get field definition by key
 */
export function getFieldByKey(key: string): ExportFieldDefinition | undefined {
  return getAllExportFields().find((field) => field.key === key);
}

/**
 * Extract value from result using field definition
 */
export function extractFieldValue(result: ExportableResult, field: ExportFieldDefinition, index: number): unknown {
  if (field.extractor) {
    return field.extractor(result, index);
  }

  // Navigate the path to get the value
  const pathParts = field.path.split('.');
  let value: unknown = result;

  for (const part of pathParts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      value = field.defaultValue;
      break;
    }
  }

  return value;
}
