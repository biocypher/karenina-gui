/**
 * CSV Export Builder
 * Constructs CSV export format with proper field mapping and escaping
 */

import type { Rubric, RubricTrait } from '../../types';
import type { ExportableResult } from '../../types/export';
import { getAllExportFields, extractFieldValue, RUBRIC_TRAIT_FIELDS } from '../../types/exportFields';

/**
 * Escapes CSV field content
 */
function escapeCSVField(field: unknown): string {
  if (field == null) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts results to CSV format
 *
 * Uses field definitions from types/exportFields.ts as single source of truth.
 * When adding new fields to VerificationResult, add them to exportFields.ts only.
 */
export function exportToCSV(results: ExportableResult[], globalRubric?: Rubric, selectedFields?: string[]): string {
  // Get all static field definitions (single source of truth)
  const allFields = getAllExportFields();
  const staticHeaders = allFields.map((field) => field.key);

  // Extract dynamic rubric trait names from results
  const allRubricTraitNames = extractAllRubricTraitNames(results);

  // Determine global vs question-specific rubrics
  const { globalTraits, questionSpecificTraits } = separateRubricTraits(allRubricTraitNames, globalRubric);

  // Create dynamic rubric headers
  const globalRubricHeaders = globalTraits.map((trait) => `rubric_${trait}`);
  const hasQuestionSpecificTraits = questionSpecificTraits.length > 0;

  // Combine static and dynamic headers
  const allHeaders = [
    ...staticHeaders,
    ...globalRubricHeaders,
    ...(hasQuestionSpecificTraits ? ['question_specific_rubrics'] : []),
  ];

  // Filter headers based on selected fields if provided
  const headers = selectedFields ? allHeaders.filter((header) => selectedFields.includes(header)) : allHeaders;

  const csvRows = [headers.join(',')];

  // Build rows using field definitions
  results.forEach((result, index) => {
    const rowData: Record<string, string> = {};

    // Extract values using field definitions (single source of truth)
    for (const field of allFields) {
      const value = extractFieldValue(result, field, index);
      if (field.isJson && value !== '' && value !== undefined) {
        rowData[field.key] = escapeCSVField(JSON.stringify(value));
      } else {
        rowData[field.key] = escapeCSVField(value ?? field.defaultValue ?? '');
      }
    }

    // Add global rubric values (dynamic fields)
    const dynamicTraits = RUBRIC_TRAIT_FIELDS.extractor(result);
    globalTraits.forEach((traitName) => {
      const value = dynamicTraits[traitName];
      rowData[`rubric_${traitName}`] = escapeCSVField(value !== undefined ? value : '');
    });

    // Add question-specific rubrics as combined JSON if they exist
    if (hasQuestionSpecificTraits) {
      rowData['question_specific_rubrics'] = buildQuestionSpecificRubricsJson(questionSpecificTraits, dynamicTraits);
    }

    // Build row based on selected headers
    const row = headers.map((header) => rowData[header] ?? '');
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Extract all rubric trait names from results
 */
function extractAllRubricTraitNames(results: ExportableResult[]): Set<string> {
  const allRubricTraitNames = new Set<string>();
  results.forEach((result) => {
    const dynamicTraits = RUBRIC_TRAIT_FIELDS.extractor(result);
    Object.keys(dynamicTraits).forEach((traitName) => {
      allRubricTraitNames.add(traitName);
    });
  });
  return allRubricTraitNames;
}

/**
 * Separate rubric traits into global and question-specific
 */
function separateRubricTraits(
  allRubricTraitNames: Set<string>,
  globalRubric?: Rubric
): { globalTraits: string[]; questionSpecificTraits: string[] } {
  const globalTraitNames = new Set<string>();
  if (globalRubric) {
    extractTraitNames(globalRubric).forEach((name) => globalTraitNames.add(name));
  }

  const globalTraits = Array.from(allRubricTraitNames)
    .filter((trait) => globalTraitNames.has(trait))
    .sort();
  const questionSpecificTraits = Array.from(allRubricTraitNames)
    .filter((trait) => !globalTraitNames.has(trait))
    .sort();

  return { globalTraits, questionSpecificTraits };
}

/**
 * Extract all trait names from a rubric
 */
function extractTraitNames(rubric: Rubric): string[] {
  const names: string[] = [];

  // Support both old traits and new llm_traits structure
  if (rubric.traits) {
    rubric.traits.forEach((trait: RubricTrait) => names.push(trait.name));
  }
  if (rubric.llm_traits) {
    rubric.llm_traits.forEach((trait: RubricTrait) => names.push(trait.name));
  }
  if (rubric.regex_traits) {
    rubric.regex_traits.forEach((trait) => names.push(trait.name));
  }
  if (rubric.callable_traits) {
    rubric.callable_traits.forEach((trait) => names.push(trait.name));
  }
  if (rubric.metric_traits) {
    rubric.metric_traits.forEach((trait) => names.push(trait.name));
  }

  return names;
}

/**
 * Build JSON string for question-specific rubrics
 */
function buildQuestionSpecificRubricsJson(
  questionSpecificTraits: string[],
  dynamicTraits: Record<string, unknown>
): string {
  const questionSpecificRubrics: Record<string, unknown> = {};
  questionSpecificTraits.forEach((trait) => {
    if (trait in dynamicTraits) {
      questionSpecificRubrics[trait] = dynamicTraits[trait];
    }
  });
  return escapeCSVField(JSON.stringify(questionSpecificRubrics));
}
