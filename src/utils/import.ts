import type { VerificationResult } from '../types';
import type { ExportableResult, UnifiedExportFormat, ExportMetadata } from './export';

/**
 * Result of parsing and validating an uploaded verification results file
 */
export interface ParsedImportResult {
  results: Record<string, VerificationResult>;
  metadata?: ExportMetadata;
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
  if (
    typeof metadata.question_id !== 'string' ||
    typeof metadata.question_text !== 'string' ||
    typeof metadata.answering_model !== 'string' ||
    typeof metadata.parsing_model !== 'string'
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
 * Format: {question_id}_{answering_model}_{parsing_model}_{answering_replicate}_{parsing_replicate}_{timestamp}
 */
function generateResultId(result: ExportableResult, index: number): string {
  const { metadata } = result;

  // Clean model names (remove slashes, spaces)
  const cleanAnsweringModel = metadata.answering_model.replace(/[/\s]/g, '_');
  const cleanParsingModel = metadata.parsing_model.replace(/[/\s]/g, '_');

  // Use replicates if available, otherwise use index
  const answeringReplicate = metadata.answering_replicate !== undefined ? metadata.answering_replicate : index;
  const parsingReplicate = metadata.parsing_replicate !== undefined ? metadata.parsing_replicate : index;

  // Use timestamp if available, otherwise use current time
  const timestamp = metadata.timestamp || new Date().toISOString();

  return `${metadata.question_id}_${cleanAnsweringModel}_${cleanParsingModel}_${answeringReplicate}_${parsingReplicate}_${timestamp}`;
}

/**
 * Parses and validates uploaded verification results JSON
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

  // Detect format: Unified (with metadata wrapper) vs legacy array
  const parsedObj = parsed as Record<string, unknown>;

  if ('metadata' in parsedObj && 'results' in parsedObj) {
    // Unified format with metadata wrapper
    const unified = parsedObj as Partial<UnifiedExportFormat>;

    if (!Array.isArray(unified.results)) {
      throw new ImportValidationError('Expected "results" to be an array in unified format');
    }

    resultsArray = unified.results;
    metadata = unified.metadata as ExportMetadata;

    console.log('Detected unified export format with metadata wrapper');
  } else if (Array.isArray(parsed)) {
    // Legacy array format (old frontend exports)
    resultsArray = parsed;
    console.log('Detected legacy array export format');
  } else {
    throw new ImportValidationError(
      'Unrecognized format. Expected either unified format {metadata, results} or legacy array format'
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
    models.add(validResult.metadata.answering_model);
  });

  return {
    results: transformedResults,
    metadata,
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
