import type { VerificationResult } from '../types';
import type { ExportableResult, UnifiedExportFormat, ExportMetadata } from './export';
import { formatModelIdentityDisplay } from '../types/verification';
import { logger } from './logger';

/**
 * Result of parsing and validating an uploaded verification results file
 */
export interface ParsedImportResult {
  results: Record<string, VerificationResult>;
  metadata?: ExportMetadata;
  /** Shared rubric definition from v2.0 format (stored once, not per-result) */
  sharedRubricDefinition?: Record<string, unknown>;
  /**
   * Per-scenario outcome_results, flattened across runs.
   * Present only when the source file includes the runs-format `scenario_outcomes` key.
   */
  scenarioOutcomes?: Record<string, Record<string, boolean | number>>;
  stats: {
    totalResults: number;
    questions: Set<string>;
    models: Set<string>;
  };
}

/**
 * Error thrown when import validation fails
 */
export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportValidationError';
  }
}

/**
 * Validates that an object has the expected structure of a VerificationResult
 */
function validateResultStructure(result: unknown): result is ExportableResult {
  if (!result || typeof result !== 'object') {
    return false;
  }

  const r = result as Record<string, unknown>;

  // Must have metadata subclass
  if (!r.metadata || typeof r.metadata !== 'object') {
    return false;
  }

  const metadata = r.metadata as Record<string, unknown>;

  // Validate required metadata fields
  const answering = metadata.answering as Record<string, unknown> | undefined;
  const parsing = metadata.parsing as Record<string, unknown> | undefined;
  if (
    typeof metadata.question_id !== 'string' ||
    typeof metadata.question_text !== 'string' ||
    !answering ||
    typeof answering.model_name !== 'string' ||
    typeof answering.interface !== 'string' ||
    !parsing ||
    typeof parsing.model_name !== 'string' ||
    typeof parsing.interface !== 'string'
  ) {
    return false;
  }

  // Optional subclasses should be objects if present
  if (r.template !== undefined && typeof r.template !== 'object') {
    return false;
  }
  if (r.rubric !== undefined && typeof r.rubric !== 'object') {
    return false;
  }
  if (r.deep_judgment !== undefined && typeof r.deep_judgment !== 'object') {
    return false;
  }
  if (r.deep_judgment_rubric !== undefined && typeof r.deep_judgment_rubric !== 'object') {
    return false;
  }

  return true;
}

/**
 * Generates a unique result ID from VerificationResult metadata
 * Format: {question_id}_{answering_display}_{parsing_display}_{replicate}_{timestamp}
 */
function generateResultId(result: ExportableResult, index: number): string {
  const { metadata } = result;

  // Clean model display strings (remove slashes, spaces, colons)
  const cleanAnsweringModel = formatModelIdentityDisplay(metadata.answering).replace(/[/\s:]/g, '_');
  const cleanParsingModel = formatModelIdentityDisplay(metadata.parsing).replace(/[/\s:]/g, '_');

  // Use replicate if available, otherwise use index
  const replicate = metadata.replicate !== undefined ? metadata.replicate : index;

  // Use timestamp if available, otherwise use current time
  const timestamp = metadata.timestamp || new Date().toISOString();

  return `${metadata.question_id}_${cleanAnsweringModel}_${cleanParsingModel}_${replicate}_${timestamp}`;
}

/**
 * Shared data structure in v2.0 format (rubric stored once, not per-result)
 */
interface SharedData {
  rubric_definition?: Record<string, unknown>;
}

/**
 * Parses and validates uploaded verification results JSON
 *
 * Supports multiple formats:
 * - v2.0 format: {format_version: "2.0", metadata, shared_data, results}
 *   - Optimized format with rubric definition stored once in shared_data
 *   - Trace filtering fields at result root level (not duplicated per template/rubric)
 * - Unified format: {metadata, results} without version marker (legacy v1.x)
 * - Legacy array format: [result1, result2, ...]
 *
 * @param jsonString - Raw JSON string from uploaded file
 * @returns Parsed results with metadata and statistics
 * @throws ImportValidationError if validation fails
 */
export function parseVerificationResultsJSON(jsonString: string): ParsedImportResult {
  let parsed: unknown;

  // Parse JSON
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new ImportValidationError(`Invalid JSON format: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new ImportValidationError('JSON must be an object or array');
  }

  let resultsArray: unknown[];
  let metadata: ExportMetadata | undefined;
  let sharedData: SharedData | undefined;
  let scenarioOutcomes: Record<string, Record<string, boolean | number>> | undefined;

  // Detect format: v2.0, Unified (legacy), or legacy array
  const parsedObj = parsed as Record<string, unknown>;

  if (parsedObj.format_version === '2.0') {
    // v2.0 format - optimized with shared_data for rubric definition
    if (!Array.isArray(parsedObj.results)) {
      throw new ImportValidationError('Expected "results" to be an array in v2.0 format');
    }

    resultsArray = parsedObj.results;
    metadata = parsedObj.metadata as ExportMetadata;
    sharedData = parsedObj.shared_data as SharedData | undefined;

    logger.debugLog('IMPORT', 'Detected v2.0 export format with shared_data optimization', 'import.ts');
    if (sharedData?.rubric_definition) {
      logger.debugLog('IMPORT', 'Found shared rubric_definition in shared_data', 'import.ts');
    }
  } else if ('metadata' in parsedObj && 'results' in parsedObj) {
    // Legacy unified format with metadata wrapper (v1.x)
    const unified = parsedObj as Partial<UnifiedExportFormat>;

    if (!Array.isArray(unified.results)) {
      throw new ImportValidationError('Expected "results" to be an array in unified format');
    }

    resultsArray = unified.results;
    metadata = unified.metadata as ExportMetadata;

    logger.debugLog('IMPORT', 'Detected legacy unified export format with metadata wrapper', 'import.ts');
  } else if (parsedObj.runs && typeof parsedObj.runs === 'object' && !Array.isArray(parsedObj.runs)) {
    // Runs format: { runs: { run_name: [VerificationResult, ...], ... }, scenario_outcomes?: {...} }
    const runs = parsedObj.runs as Record<string, unknown>;
    const runNames = Object.keys(runs);

    // Validate each run value is an array and flatten
    const allResults: unknown[] = [];
    for (const [runName, runResults] of Object.entries(runs)) {
      if (!Array.isArray(runResults)) {
        throw new ImportValidationError(`Run "${runName}" must be an array of results, got ${typeof runResults}`);
      }
      allResults.push(...runResults);
    }

    resultsArray = allResults;
    metadata = {
      job_id: runNames.join(', '),
      karenina_version: 'unknown',
    } as ExportMetadata;

    // Flatten optional per-run scenario_outcomes into a single scenario_id -> outcomes map
    const rawOutcomes = parsedObj.scenario_outcomes;
    if (rawOutcomes && typeof rawOutcomes === 'object' && !Array.isArray(rawOutcomes)) {
      const flat: Record<string, Record<string, boolean | number>> = {};
      for (const [, perScenario] of Object.entries(rawOutcomes as Record<string, unknown>)) {
        if (!perScenario || typeof perScenario !== 'object') continue;
        for (const [scenarioId, outcomes] of Object.entries(perScenario as Record<string, unknown>)) {
          if (!outcomes || typeof outcomes !== 'object') continue;
          const cleaned: Record<string, boolean | number> = {};
          for (const [name, value] of Object.entries(outcomes as Record<string, unknown>)) {
            if (typeof value === 'boolean' || typeof value === 'number') {
              cleaned[name] = value;
            }
          }
          if (Object.keys(cleaned).length > 0) {
            flat[scenarioId] = cleaned;
          }
        }
      }
      if (Object.keys(flat).length > 0) {
        scenarioOutcomes = flat;
      }
    }

    logger.debugLog(
      'IMPORT',
      `Detected runs format with ${runNames.length} run(s): ${runNames.join(', ')}`,
      'import.ts'
    );
  } else if (Array.isArray(parsed)) {
    // Legacy array format (old frontend exports)
    resultsArray = parsed;
    logger.debugLog('IMPORT', 'Detected legacy array export format', 'import.ts');
  } else {
    throw new ImportValidationError(
      'Unrecognized format. Expected v2.0 format {format_version: "2.0", ...}, unified format {metadata, results}, runs format {runs: {...}}, or legacy array format'
    );
  }

  if (resultsArray.length === 0) {
    throw new ImportValidationError('No results found in file');
  }

  // Validate and transform results
  const transformedResults: Record<string, VerificationResult> = {};
  const questions = new Set<string>();
  const models = new Set<string>();

  resultsArray.forEach((result, index) => {
    // Validate structure
    if (!validateResultStructure(result)) {
      throw new ImportValidationError(
        `Invalid result structure at index ${index}. Missing required fields or incorrect types.`
      );
    }

    const validResult = result as ExportableResult;

    // Generate unique result ID
    const resultId = generateResultId(validResult, index);

    // Store result
    transformedResults[resultId] = validResult as VerificationResult;

    // Collect stats
    questions.add(validResult.metadata.question_id);
    models.add(formatModelIdentityDisplay(validResult.metadata.answering));
  });

  return {
    results: transformedResults,
    metadata,
    // Include shared rubric definition from v2.0 format if available
    sharedRubricDefinition: sharedData?.rubric_definition,
    scenarioOutcomes,
    stats: {
      totalResults: resultsArray.length,
      questions,
      models,
    },
  };
}

/**
 * Merges uploaded results with existing results
 *
 * @param existing - Current verification results
 * @param uploaded - Newly uploaded verification results
 * @param strategy - 'replace' = uploaded overwrites conflicts, 'keep' = existing takes precedence
 * @returns Merged results
 */
export function mergeVerificationResults(
  existing: Record<string, VerificationResult>,
  uploaded: Record<string, VerificationResult>,
  strategy: 'replace' | 'keep' = 'replace'
): Record<string, VerificationResult> {
  if (strategy === 'replace') {
    // Uploaded data overwrites existing on conflict
    return {
      ...existing,
      ...uploaded,
    };
  } else {
    // Existing data takes precedence
    return {
      ...uploaded,
      ...existing,
    };
  }
}

/**
 * Calculates merge statistics
 *
 * @param existing - Current verification results
 * @param uploaded - Newly uploaded verification results
 * @returns Statistics about the merge operation
 */
export function calculateMergeStats(
  existing: Record<string, VerificationResult>,
  uploaded: Record<string, VerificationResult>
): {
  existingCount: number;
  uploadedCount: number;
  conflictCount: number;
  totalAfterMerge: number;
} {
  const existingKeys = new Set(Object.keys(existing));
  const uploadedKeys = new Set(Object.keys(uploaded));

  const conflicts = Array.from(uploadedKeys).filter((key) => existingKeys.has(key));

  return {
    existingCount: existingKeys.size,
    uploadedCount: uploadedKeys.size,
    conflictCount: conflicts.length,
    totalAfterMerge: new Set([...existingKeys, ...uploadedKeys]).size,
  };
}
