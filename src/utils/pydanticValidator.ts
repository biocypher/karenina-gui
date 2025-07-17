import type { PydanticFieldDefinition, PydanticClassDefinition } from '../types';

export interface ValidationError {
  type: 'error' | 'warning' | 'info';
  field?: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: ValidationError[];
}

/**
 * Python reserved keywords that cannot be used as field names
 */
const PYTHON_KEYWORDS = [
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
];

/**
 * Pydantic/BaseModel reserved attributes that should be avoided
 */
const PYDANTIC_RESERVED = [
  'model_config',
  'model_fields',
  'model_computed_fields',
  'model_extra',
  'model_fields_set',
  'model_dump',
  'model_dump_json',
  'model_copy',
  'model_validate',
  'model_validate_json',
  'model_json_schema',
  'model_parametrized_name',
  'model_rebuild',
  'model_post_init',
];

/**
 * BaseAnswer specific reserved attributes from the Karenina system
 */
const BASE_ANSWER_RESERVED = ['id', 'correct', 'set_question_id', 'verify', 'verify_granular'];

/**
 * Common field names that might cause confusion
 */
const POTENTIALLY_CONFUSING = ['type', 'class', 'self', 'cls', 'dict', 'list', 'set', 'str', 'int', 'float', 'bool'];

/**
 * Validate a Python identifier according to PEP 8 and Python syntax rules
 */
export function validatePythonIdentifier(name: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const suggestions: ValidationError[] = [];

  // Check if empty
  if (!name || name.trim() === '') {
    errors.push({
      type: 'error',
      message: 'Field name cannot be empty',
      suggestion: 'Enter a descriptive field name using snake_case',
    });
    return { isValid: false, errors, warnings, suggestions };
  }

  const trimmedName = name.trim();

  // Check basic Python identifier rules
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
    errors.push({
      type: 'error',
      message: 'Field name must be a valid Python identifier',
      suggestion: 'Use only letters, numbers, and underscores. Must start with letter or underscore',
    });
  }

  // Check if it starts with a number
  if (/^[0-9]/.test(trimmedName)) {
    errors.push({
      type: 'error',
      message: 'Field name cannot start with a number',
      suggestion: 'Start with a letter or underscore',
    });
  }

  // Check for Python keywords
  if (PYTHON_KEYWORDS.includes(trimmedName)) {
    errors.push({
      type: 'error',
      message: `"${trimmedName}" is a Python reserved keyword`,
      suggestion: `Use "${trimmedName}_field" or "${trimmedName}_value" instead`,
    });
  }

  // Check for Pydantic reserved attributes
  if (PYDANTIC_RESERVED.includes(trimmedName)) {
    errors.push({
      type: 'error',
      message: `"${trimmedName}" is reserved by Pydantic`,
      suggestion: `Use a different name like "${trimmedName}_data" or rename to avoid conflicts`,
    });
  }

  // Check for BaseAnswer reserved attributes
  if (BASE_ANSWER_RESERVED.includes(trimmedName)) {
    errors.push({
      type: 'error',
      message: `"${trimmedName}" is reserved by BaseAnswer class`,
      suggestion:
        trimmedName === 'id'
          ? 'The id field is automatically managed'
          : trimmedName === 'correct'
            ? 'The correct field is set in model_post_init'
            : `Use a different name to avoid conflicts with ${trimmedName}`,
    });
  }

  // Check for potentially confusing names
  if (POTENTIALLY_CONFUSING.includes(trimmedName)) {
    warnings.push({
      type: 'warning',
      message: `"${trimmedName}" might be confusing as it shadows a built-in type`,
      suggestion: `Consider using "${trimmedName}_value" or a more specific name`,
    });
  }

  // PEP 8 style checks
  if (trimmedName.includes('__')) {
    warnings.push({
      type: 'warning',
      message: 'Double underscores are typically reserved for special methods',
      suggestion: 'Use single underscores for word separation',
    });
  }

  if (trimmedName !== trimmedName.toLowerCase()) {
    warnings.push({
      type: 'warning',
      message: 'Field names should be lowercase with underscores (snake_case)',
      suggestion: `Consider using "${toSnakeCase(trimmedName)}"`,
    });
  }

  if (trimmedName.length > 50) {
    warnings.push({
      type: 'warning',
      message: 'Field name is very long',
      suggestion: 'Consider using a shorter, more concise name',
    });
  }

  if (trimmedName.length === 1) {
    suggestions.push({
      type: 'info',
      message: 'Single character field names are hard to understand',
      suggestion: 'Consider using a more descriptive name',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Validate a field type and its configuration
 */
export function validateFieldType(field: PydanticFieldDefinition): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const suggestions: ValidationError[] = [];

  // Validate literal type
  if (field.type === 'literal') {
    if (!field.literalValues || field.literalValues.length === 0) {
      errors.push({
        type: 'error',
        field: field.name,
        message: 'Literal fields must have at least one possible value',
        suggestion: 'Add one or more literal values',
      });
    } else {
      // Check for duplicate literal values
      const duplicates = field.literalValues.filter((value, index) => field.literalValues!.indexOf(value) !== index);
      if (duplicates.length > 0) {
        warnings.push({
          type: 'warning',
          field: field.name,
          message: `Duplicate literal values: ${duplicates.join(', ')}`,
          suggestion: 'Remove duplicate values',
        });
      }

      // Check for empty literal values
      const emptyValues = field.literalValues.filter((v) => !v.trim());
      if (emptyValues.length > 0) {
        warnings.push({
          type: 'warning',
          field: field.name,
          message: 'Empty literal values will be ignored',
          suggestion: 'Remove empty values or provide meaningful content',
        });
      }

      // Check for very long literal values
      const longValues = field.literalValues.filter((v) => v.length > 100);
      if (longValues.length > 0) {
        suggestions.push({
          type: 'info',
          field: field.name,
          message: 'Some literal values are very long',
          suggestion: 'Consider shorter, more concise values',
        });
      }
    }
  }

  // Validate list/set types
  if (field.type === 'list' || field.type === 'set') {
    if (!field.listItemType) {
      warnings.push({
        type: 'warning',
        field: field.name,
        message: 'List/Set item type not specified, defaulting to string',
        suggestion: 'Specify the item type for better type safety',
      });
    }
  }

  // Validate union types
  if (field.type === 'union') {
    if (!field.unionTypes || field.unionTypes.length < 2) {
      errors.push({
        type: 'error',
        field: field.name,
        message: 'Union types must have at least 2 types',
        suggestion: 'Add more types or use a different field type',
      });
    } else if (field.unionTypes.includes('None') && field.required) {
      warnings.push({
        type: 'warning',
        field: field.name,
        message: 'Union with None should typically be optional',
        suggestion: 'Consider making this field optional or remove None from union',
      });
    }
  }

  // Validate field description
  if (field.description) {
    if (field.description.length < 10) {
      suggestions.push({
        type: 'info',
        field: field.name,
        message: 'Field description is quite short',
        suggestion: 'Consider adding more detail about what this field represents',
      });
    }
    if (field.description.length > 200) {
      suggestions.push({
        type: 'info',
        field: field.name,
        message: 'Field description is very long',
        suggestion: 'Consider using a more concise description',
      });
    }
  } else {
    suggestions.push({
      type: 'info',
      field: field.name,
      message: 'Field has no description',
      suggestion: 'Add a description to help users understand this field',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Validate an entire Pydantic class definition
 */
export function validatePydanticClassDefinition(classDef: PydanticClassDefinition): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const suggestions: ValidationError[] = [];

  // Validate class name
  const classNameValidation = validatePythonIdentifier(classDef.className);
  if (!classNameValidation.isValid) {
    errors.push(...classNameValidation.errors.map((e) => ({ ...e, field: 'className' })));
  }
  warnings.push(...classNameValidation.warnings.map((w) => ({ ...w, field: 'className' })));

  // Check if class name follows PascalCase convention
  if (classDef.className && classDef.className !== toPascalCase(classDef.className)) {
    suggestions.push({
      type: 'info',
      field: 'className',
      message: 'Class names should use PascalCase',
      suggestion: `Consider using "${toPascalCase(classDef.className)}"`,
    });
  }

  // Validate fields
  const fieldNames = new Set<string>();
  for (const field of classDef.fields) {
    // Validate field name
    const nameValidation = validatePythonIdentifier(field.name);
    errors.push(...nameValidation.errors);
    warnings.push(...nameValidation.warnings);
    suggestions.push(...nameValidation.suggestions);

    // Check for duplicate field names
    if (fieldNames.has(field.name)) {
      errors.push({
        type: 'error',
        field: field.name,
        message: `Duplicate field name: ${field.name}`,
        suggestion: 'Use unique field names',
      });
    } else {
      fieldNames.add(field.name);
    }

    // Validate field type
    const typeValidation = validateFieldType(field);
    errors.push(...typeValidation.errors);
    warnings.push(...typeValidation.warnings);
    suggestions.push(...typeValidation.suggestions);
  }

  // Validate field count
  if (classDef.fields.length === 0) {
    warnings.push({
      type: 'warning',
      message: 'Class has no fields',
      suggestion: 'Add at least one field to make the class useful',
    });
  }

  if (classDef.fields.length > 20) {
    suggestions.push({
      type: 'info',
      message: 'Class has many fields',
      suggestion: 'Consider breaking this into smaller, more focused classes',
    });
  }

  // Validate required methods
  const methodNames = classDef.methods.map((m) => m.name);
  if (!methodNames.includes('model_post_init')) {
    errors.push({
      type: 'error',
      message: 'Missing required method: model_post_init',
      suggestion: 'Enable auto-generation or manually add this method',
    });
  }

  if (!methodNames.includes('verify')) {
    errors.push({
      type: 'error',
      message: 'Missing required method: verify',
      suggestion: 'Enable auto-generation or manually add this method',
    });
  }

  // Check verify_granular for multiple fields
  if (classDef.fields.length > 1 && !methodNames.includes('verify_granular')) {
    warnings.push({
      type: 'warning',
      message: 'verify_granular method recommended for multiple fields',
      suggestion: 'Enable auto-generation or manually add this method for granular scoring',
    });
  }

  // Check field diversity
  const fieldTypes = classDef.fields.map((f) => f.type);
  const uniqueTypes = new Set(fieldTypes);
  if (uniqueTypes.size === 1 && classDef.fields.length > 3) {
    suggestions.push({
      type: 'info',
      message: 'All fields have the same type',
      suggestion: 'Consider if some fields could use more specific types',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Get validation suggestions for improving a field definition
 */
export function getFieldImprovementSuggestions(field: PydanticFieldDefinition): string[] {
  const suggestions: string[] = [];

  // Type-specific suggestions
  switch (field.type) {
    case 'str':
      if (!field.validationRules?.minLength && !field.validationRules?.maxLength) {
        suggestions.push('Consider adding string length validation (min/max length)');
      }
      if (!field.validationRules?.pattern) {
        suggestions.push('Consider adding a regex pattern if the string has a specific format');
      }
      break;

    case 'int':
    case 'float':
      if (field.validationRules?.min === undefined && field.validationRules?.max === undefined) {
        suggestions.push('Consider adding numeric range validation (min/max values)');
      }
      break;

    case 'literal':
      if (field.literalValues && field.literalValues.length > 10) {
        suggestions.push('Consider using a string field with validation if there are many options');
      }
      break;

    case 'list':
      suggestions.push('Consider if a Set type would be more appropriate to prevent duplicates');
      break;
  }

  // General suggestions
  if (!field.description || field.description.length < 20) {
    suggestions.push('Add a detailed description explaining what this field represents');
  }

  if (field.name.length < 3) {
    suggestions.push('Use a more descriptive field name');
  }

  return suggestions;
}

/**
 * Utility functions
 */

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

function toPascalCase(str: string): string {
  return str
    .split(/[_\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Quick validation function for real-time feedback
 */
export function quickValidateField(field: PydanticFieldDefinition): {
  hasErrors: boolean;
  hasWarnings: boolean;
  errorCount: number;
  warningCount: number;
} {
  const nameValidation = validatePythonIdentifier(field.name);
  const typeValidation = validateFieldType(field);

  const totalErrors = nameValidation.errors.length + typeValidation.errors.length;
  const totalWarnings = nameValidation.warnings.length + typeValidation.warnings.length;

  return {
    hasErrors: totalErrors > 0,
    hasWarnings: totalWarnings > 0,
    errorCount: totalErrors,
    warningCount: totalWarnings,
  };
}
