/**
 * TypeScript type definitions for the template builder GUI.
 *
 * These types mirror the Python TemplateSpec model and provide
 * the client-side representation of template fields, verification
 * primitives, composition strategies, and the overall template spec.
 */

/** Serialized verification primitive with type discriminator and parameters. */
export interface VerificationPrimitive {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/** A single field in the template spec. */
export interface TemplateField {
  name: string;
  type: 'bool' | 'str' | 'int' | 'float' | 'list_str' | 'literal' | 'date';
  description: string;
  extraction_hint?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ground_truth: any;
  literal_values?: string[] | null;
  verify_with: VerificationPrimitive;
  weight: number;
  is_trace: boolean;
}

/** Recursive composition strategy node. */
export interface VerifyStrategy {
  type: 'all_of' | 'any_of' | 'at_least_n' | 'field_check';
  n?: number | null;
  field_name?: string | null;
  conditions: VerifyStrategy[];
}

/** Complete template specification (JSON interchange format). */
export interface TemplateSpec {
  fields: TemplateField[];
  verify_strategy: VerifyStrategy | null;
  class_name: string;
}

/** Information about an available verification primitive. */
export interface PrimitiveInfo {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters: Record<string, any>;
  applies_to: string[];
  is_trace: boolean;
}

/** Default field values for creating new fields. */
export const DEFAULT_FIELD: TemplateField = {
  name: '',
  type: 'str',
  description: '',
  extraction_hint: null,
  ground_truth: '',
  literal_values: null,
  verify_with: { type: 'ExactMatch' },
  weight: 1.0,
  is_trace: false,
};

/** Default primitives for each field type. */
export const DEFAULT_PRIMITIVES: Record<string, VerificationPrimitive> = {
  bool: { type: 'BooleanMatch' },
  str: { type: 'ExactMatch' },
  int: { type: 'NumericExact' },
  float: { type: 'NumericTolerance', tolerance: 0.05 },
  list_str: { type: 'SetContainment' },
  literal: { type: 'LiteralMatch' },
  date: { type: 'DateMatch' },
};

/** Template classification mode based on field composition. */
export type TemplateMode = 'verified' | 'classic' | 'mixed' | 'unknown';

/** Result of parsing template source code into a spec. */
export interface TemplateParseResult {
  success: boolean;
  mode: TemplateMode;
  spec: TemplateSpec | null;
  error: string | null;
}

/** Result of validating generated template code. */
export interface TemplateValidateResult {
  success: boolean;
  valid: boolean;
  errors: string[];
  ground_truth_check: boolean | null;
  verify_check: boolean | null;
}

/** Result of test-running template against a sample response. */
export interface TemplateTestResult {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsed_fields: Record<string, any> | null;
  verify_result: boolean | null;
  verify_granular: number | null;
  field_results: Record<string, boolean> | null;
  error: string | null;
}
