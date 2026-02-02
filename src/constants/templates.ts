/**
 * Template validation constants
 *
 * These constants are used to validate and detect template patterns.
 * Moving them here makes the validation more maintainable and less fragile.
 */

/**
 * String that indicates a placeholder/template template that should be replaced
 * with a proper generated template.
 */
export const PLACEHOLDER_TEMPLATE_MARKER = 'Answer to the question:';

/**
 * Checks if a template is a placeholder template (not yet filled in).
 *
 * @param template - The template string to check
 * @returns true if the template appears to be a placeholder
 */
export function isPlaceholderTemplate(template: string): boolean {
  return template.includes(PLACEHOLDER_TEMPLATE_MARKER);
}

/**
 * Validation error messages
 */
export const TEMPLATE_VALIDATION_ERRORS = {
  PLACEHOLDER_DETECTED:
    'The loaded data contains placeholder templates. Please use the Template Generator to create proper templates.',
  EMPTY_TEMPLATE: 'Template cannot be empty.',
  INVALID_PYTHON: 'Template is not valid Python code.',
} as const;

/**
 * Basic template structure patterns
 * These can be used for more robust validation in the future.
 */
export const TEMPLATE_PATTERNS = {
  REQUIRED_IMPORTS: ['from karenina.schemas.answer_class import BaseAnswer', 'from pydantic import Field'],
  REQUIRED_CLASS_DECLARATION: 'class Answer(BaseAnswer):',
  REQUIRED_DOCSTRING_PREFIX: '"""Answer to the question:',
} as const;

/**
 * Validates if a template has the basic structure required
 *
 * @param template - The template string to validate
 * @returns true if the template appears to have valid structure
 */
export function hasValidTemplateStructure(template: string): boolean {
  if (!template || template.trim().length === 0) {
    return false;
  }

  const trimmed = template.trim();

  // Check for required imports
  const hasRequiredImports = TEMPLATE_PATTERNS.REQUIRED_IMPORTS.some((imp) => trimmed.includes(imp));

  // Check for class declaration
  const hasClassDeclaration = trimmed.includes(TEMPLATE_PATTERNS.REQUIRED_CLASS_DECLARATION);

  return hasRequiredImports && hasClassDeclaration;
}

/**
 * Generates a basic default Pydantic template for a question.
 * This is used as a fallback when no LLM-generated template is available.
 *
 * @param questionPreview - A preview of the question (max 50 chars)
 * @returns A basic Pydantic template string
 *
 * @example
 * ```ts
 * const template = generateBasicTemplate("What is the capital of France?");
 * // Returns a basic template with imports, class definition, and answer field
 * ```
 */
export function generateBasicTemplate(questionPreview: string): string {
  const preview = questionPreview.length > 50 ? questionPreview.substring(0, 50) + '...' : questionPreview;
  return `from karenina.schemas.answer_class import BaseAnswer
from pydantic import Field

class Answer(BaseAnswer):
    """${PLACEHOLDER_TEMPLATE_MARKER} ${preview}"""
    answer: str = Field(description="The answer to the question")`;
}
