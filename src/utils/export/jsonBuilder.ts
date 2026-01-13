/**
 * JSON Export Builder
 * Constructs JSON export format with v2.0 unified export structure
 */

import type { Rubric, VerificationConfig } from '../../types';
import type {
  ExportMetadata,
  ExportableResult,
  ExportVerificationConfig,
  JobSummaryMetadata,
  UnifiedExportFormat,
} from '../../types/export';
import { getCurrentVersion } from './version';

/**
 * Converts results to JSON format with v2.0 unified export structure (matches backend format)
 *
 * v2.0 format optimizations:
 * - format_version: "2.0" marker for version detection
 * - shared_data.rubric_definition: Rubric stored once (not per-result)
 * - evaluation_input at result root level (shared by template/rubric)
 */
export function exportToJSON(
  results: ExportableResult[],
  selectedFields?: string[],
  jobId?: string,
  verificationConfig?: VerificationConfig,
  jobSummary?: JobSummaryMetadata,
  globalRubric?: Rubric
): string {
  // Process results (handle abstention display)
  const processedResults = processResults(results, selectedFields);

  // Build verification config metadata
  const exportVerificationConfig = buildVerificationConfig(verificationConfig);

  // Build rubric definition for shared_data (v2.0 optimization)
  const rubricDefinition = buildRubricDefinition(globalRubric);

  // Build unified export structure (v2.0 format)
  const unifiedExport: UnifiedExportFormat = {
    format_version: '2.0',
    metadata: buildExportMetadata(jobId, exportVerificationConfig, jobSummary),
    shared_data: {
      rubric_definition: rubricDefinition,
    },
    results: processedResults,
  };

  return JSON.stringify(unifiedExport, null, 2);
}

/**
 * Process results for export (handle abstention display and field filtering)
 */
function processResults(results: ExportableResult[], selectedFields?: string[]): ExportableResult[] {
  return results.map((result) => {
    // Replace completed_without_errors boolean with "abstained" string when abstention is detected
    const completedWithoutErrorsValue =
      result.template?.abstention_detected && result.template?.abstention_override_applied
        ? 'abstained'
        : result.metadata.completed_without_errors;

    const processedResult = {
      ...result,
      metadata: {
        ...result.metadata,
        completed_without_errors: completedWithoutErrorsValue,
      },
    };

    if (selectedFields) {
      const filteredResult: Record<string, unknown> = {};
      selectedFields.forEach((field) => {
        if (field in processedResult) {
          filteredResult[field] = processedResult[field as keyof typeof processedResult];
        }
      });
      return filteredResult as ExportableResult;
    }

    return processedResult;
  });
}

/**
 * Build verification config for export metadata
 */
function buildVerificationConfig(verificationConfig?: VerificationConfig): ExportVerificationConfig | undefined {
  if (
    !verificationConfig ||
    verificationConfig.answering_models.length === 0 ||
    verificationConfig.parsing_models.length === 0
  ) {
    return undefined;
  }

  return {
    answering_model: {
      provider: verificationConfig.answering_models[0].model_provider,
      name: verificationConfig.answering_models[0].model_name,
      temperature: verificationConfig.answering_models[0].temperature,
      interface: verificationConfig.answering_models[0].interface,
    },
    parsing_model: {
      provider: verificationConfig.parsing_models[0].model_provider,
      name: verificationConfig.parsing_models[0].model_name,
      temperature: verificationConfig.parsing_models[0].temperature,
      interface: verificationConfig.parsing_models[0].interface,
    },
  };
}

/**
 * Build rubric definition for shared_data (v2.0 optimization)
 * Store rubric once instead of per-result
 */
function buildRubricDefinition(globalRubric?: Rubric): Record<string, unknown> | undefined {
  if (!globalRubric) {
    return undefined;
  }

  return {
    llm_traits: globalRubric.llm_traits || globalRubric.traits,
    regex_traits: globalRubric.regex_traits,
    callable_traits: globalRubric.callable_traits,
    metric_traits: globalRubric.metric_traits,
  };
}

/**
 * Build export metadata with timestamp and version
 */
function buildExportMetadata(
  jobId?: string,
  verificationConfig?: ExportVerificationConfig,
  jobSummary?: JobSummaryMetadata
): ExportMetadata {
  return {
    export_timestamp: new Date()
      .toISOString()
      .replace('T', ' ')
      .replace(/\.\d{3}Z$/, ' UTC'),
    karenina_version: getCurrentVersion(),
    job_id: jobId,
    verification_config: verificationConfig,
    job_summary: jobSummary,
  };
}
